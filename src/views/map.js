const d3 = window.d3;
const L = window.L;
import { appState, dom } from '../state.js';
import { DATA_PREFIX } from '../config.js';

let restaurants = [];
let plottedRestaurants = [];
let mapElement;
let leafletMap;

export function initMap(payload) {
  mapElement = document.getElementById('map');
  if (!mapElement) return;

  // Avoid re-initializing the same container
  if (leafletMap) return;
  if (mapElement._leaflet_id) {
    try { L.map(mapElement).remove(); } catch (e) {}
    mapElement._leaflet_id = null;
  }

  restaurants = payload.restaurantsWithCoords;
  mapElement.innerHTML = '';

  const boroughFeatures = (payload.boroughsGeo?.features || []).filter(feature => {
    const boro = feature?.properties?.boro_name;
    return boro === 'Manhattan' || boro === 'Brooklyn';
  });
  if (!boroughFeatures.length) return;

  const tooltip = d3.select('#map-tooltip');
  const tooltipTitle = tooltip.select('.tooltip-title');
  const tooltipDetails = tooltip.select('.tooltip-details');

  leafletMap = L.map(mapElement, {
    zoomControl: false,
    minZoom: 11,
    maxZoom: 19,
    scrollWheelZoom: true,
    doubleClickZoom: false,
    preferCanvas: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18
  }).addTo(leafletMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 18,
    zIndex: 100
  }).addTo(leafletMap);

  const boroughLayer = L.geoJSON({
    type: 'FeatureCollection',
    features: boroughFeatures
  }, {
    style: {
      color: '#111',
      weight: 2,
      fillColor: '#f7f8fb',
      fillOpacity: 0.08
    }
  }).addTo(leafletMap);

  const markerLayer = L.layerGroup().addTo(leafletMap);

  plottedRestaurants = restaurants
    .filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
    .map(r => ({ ...r, latLng: L.latLng(r.latitude, r.longitude) }));

  const CLUSTER_ZOOM_THRESHOLD = 14;
  const CLUSTER_PIXEL_THRESHOLD = 48;

  function updateTooltip(event, d) {
    if (d.type === 'cluster') {
      hideTooltip();
      hideMapCompare();
      return;
    }
    tooltipTitle.text(d.restaurant_name || 'Unknown');
    const metaParts = [d.cuisine, d.style, d.position].map(v => (v || '').trim()).filter(Boolean);
    tooltipDetails.text(metaParts.join(' \u00b7 ') || '');
    tooltip
      .style('display', 'block')
      .style('left', `${event.clientX + 16}px`)
      .style('top', `${event.clientY + 16}px`);
  }

  function hideTooltip() {
    tooltip.style('display', 'none');
  }

  function hideMapCompare() {
    if (dom.mapCompare) {
      dom.mapCompare.classList.remove('visible');
      dom.mapCompare.setAttribute('aria-hidden', 'true');
    }
  }

  function buildClusters(points, thresholdPx) {
    const clusters = [];
    const cellSize = thresholdPx;
    const grid = new Map();
    const keyFor = (x, y) => `${Math.floor(x / cellSize)}-${Math.floor(y / cellSize)}`;
    points.forEach(pt => {
      const key = keyFor(pt._screenX, pt._screenY);
      let cluster = grid.get(key);
      if (!cluster) {
        cluster = {
          type: 'cluster',
          x: pt._screenX,
          y: pt._screenY,
          latLng: pt.latLng,
          count: 1
        };
        grid.set(key, cluster);
        clusters.push(cluster);
      } else {
        cluster.count += 1;
        cluster.x += (pt._screenX - cluster.x) / cluster.count;
        cluster.y += (pt._screenY - cluster.y) / cluster.count;
      }
    });
    return clusters;
  }

  function applyDuplicateOffsets(points) {
    const groups = new Map();
    points.forEach(pt => {
      const key = `${pt.latLng.lat.toFixed(4)}-${pt.latLng.lng.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(pt);
    });
    const result = [];
    groups.forEach(list => {
      if (list.length === 1) {
        result.push(list[0]);
        return;
      }
      const radius = 10;
      const basePoint = leafletMap.latLngToLayerPoint(list[0].latLng);
      list.forEach((pt, idx) => {
        const angle = (idx / list.length) * Math.PI * 2;
        result.push({
          ...pt,
          _screenX: basePoint.x + Math.cos(angle) * radius,
          _screenY: basePoint.y + Math.sin(angle) * radius
        });
      });
    });
    return result;
  }

  function positionMarkers() {
    if (!plottedRestaurants.length) return;

    const showClusters = (leafletMap.getZoom() || CLUSTER_ZOOM_THRESHOLD) < CLUSTER_ZOOM_THRESHOLD;
    if (dom.mapInfo) {
      const shouldShowInfo = appState.currentView === 'map' && showClusters;
      dom.mapInfo.classList.toggle('visible', shouldShowInfo);
      dom.mapInfo.setAttribute('aria-hidden', shouldShowInfo ? 'false' : 'true');
    }
    if (dom.mapCompare && showClusters) hideMapCompare();

    const pointsWithScreen = plottedRestaurants.map(pt => {
      const coords = leafletMap.latLngToLayerPoint(pt.latLng);
      return { ...pt, _screenX: coords.x, _screenY: coords.y };
    });

    const displayNodes = showClusters
      ? buildClusters(pointsWithScreen, CLUSTER_PIXEL_THRESHOLD)
      : applyDuplicateOffsets(pointsWithScreen).map(pt => ({ ...pt, type: 'point' }));

    markerLayer.clearLayers();

    displayNodes.forEach(node => {
      if (node.type === 'cluster') {
        const clusterMarker = L.circleMarker(node.latLng, {
          radius: Math.min(18, 8 + Math.log2(node.count) * 3),
          color: '#fff',
          weight: 1.4,
          fillColor: '#111',
          fillOpacity: 1
        }).addTo(markerLayer);
        clusterMarker.on('click', () => {
          leafletMap.flyTo(node.latLng, Math.min((leafletMap.getZoom() || 12) + 2, 18), { duration: 0.35 });
        });
      } else {
        const marker = L.circleMarker(node.latLng, {
          radius: 6,
          color: '#fff',
          weight: 1,
          fillColor: '#0f0f10',
          fillOpacity: 1
        }).addTo(markerLayer);

        marker.on('mouseover', (e) => {
          if (showClusters) return;
          e.originalEvent?.stopPropagation();
          marker.setStyle({ fillColor: '#d11a2a' });
          updateTooltip(e.originalEvent || e, { ...node, type: 'point' });
          if (dom.mapCompare && appState.currentView === 'map') {
            const posterSrc = node.image_filename ? `${DATA_PREFIX}/${node.image_filename}` : '';
            dom.mapCompareRestaurantImg?.setAttribute('src', posterSrc);
            dom.mapCompareRestaurantImg?.setAttribute('alt', node.restaurant_name || 'Restaurant poster');
            if (dom.mapCompareRestaurantCaption) {
              dom.mapCompareRestaurantCaption.textContent = node.restaurant_name || '';
            }
            dom.mapCompare.classList.add('visible');
            dom.mapCompare.setAttribute('aria-hidden', 'false');
          }
        });

        marker.on('mousemove', (e) => {
          if (showClusters) return;
          if (tooltip.style('display') === 'block') {
            tooltip
              .style('left', `${(e.originalEvent?.clientX || 0) + 16}px`)
              .style('top', `${(e.originalEvent?.clientY || 0) + 16}px`);
          }
        });

        marker.on('mouseout', () => {
          marker.setStyle({ fillColor: '#0f0f10' });
          hideTooltip();
          hideMapCompare();
        });
      }
    });
  }

  const bounds = boroughLayer.getBounds().pad(0.2);
  leafletMap.fitBounds(bounds);
  positionMarkers();

  leafletMap.on('zoomend moveend', () => {
    hideTooltip();
    positionMarkers();
  });

  window.addEventListener('resize', () => {
    hideTooltip();
    leafletMap.invalidateSize();
    positionMarkers();
  });

  appState.map.render = () => {
    hideTooltip();
    leafletMap.invalidateSize();
    positionMarkers();
  };

  d3.select(mapElement).on('click', () => {
    hideTooltip();
    if (dom.mapCompare) {
      dom.mapCompare.classList.remove('visible');
      dom.mapCompare.setAttribute('aria-hidden', 'true');
    }
  });
}

export function renderMap() {
  if (appState.map.render) appState.map.render();
}
