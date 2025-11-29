import { DATA_PREFIX } from './config.js';
import { appState, dom } from './state.js';
import { loadAllData } from './dataLoader.js';
import { setupWelcome, setupViewToggle } from './ui.js';
import { initPosters } from './views/posters.js';
import { initMap } from './views/map.js';

async function bootstrap() {
  setupWelcome();

  const { csvRows, metadata, boroughsGeo } = await loadAllData();

  // Build quick lookup of available metadata keys by stem and by full filename
  const availableKeys = new Set(Object.keys(metadata));
  const stemToKey = {};
  Object.keys(metadata).forEach(k => {
    const stem = k.replace(/\.[^/.]+$/, '');
    stemToKey[stem] = k;
  });

  // Resolve CSV rows to restaurant objects (use heimlich.png as placeholder when missing)
  const restaurantsAll = csvRows.map((row, index) => {
    const imgField = (row.image_filename || '').toString().trim();
    let hasAssignedImage = false;
    let filename = null;
    if (!imgField) {
      filename = 'heimlich.png';
    } else if (availableKeys.has(imgField)) {
      filename = imgField;
      hasAssignedImage = true;
    } else if (stemToKey[imgField]) {
      filename = stemToKey[imgField];
      hasAssignedImage = true;
    } else {
      // try common extensions
      const exts = ['.png', '.PNG', '.jpg', '.jpeg'];
      for (const ex of exts) {
        if (availableKeys.has(imgField + ex)) {
          filename = imgField + ex;
          hasAssignedImage = true;
          break;
        }
      }
      if (!filename) filename = 'heimlich.png';
    }
    if (!hasAssignedImage && filename) {
      hasAssignedImage = false;
    }

    const lat = parseFloat(row.latitude);
    const lon = parseFloat(row.longitude);
    const uid = (row.restaurant_name || `restaurant-${index}`).toString().replace(/\s+/g, '-').toLowerCase() + `-${index}`;

    return {
      image_filename: filename,
      restaurant_name: row.restaurant_name || '',
      borough: row.borough || '',
      neighborhood: row.neighborhood || '',
      cuisine: row.cuisine || '',
      style: row.style || '',
      position: row.position || '',
      uid,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
      hasAssignedImage
    };
  });

  const restaurants = restaurantsAll.filter(r => r.hasAssignedImage);
  const postersData = layoutSpiral(restaurants, appState.width, appState.height, appState.radius, appState.step);

  initPosters({ restaurants, postersData });
  initMap({ restaurantsWithCoords: restaurants, boroughsGeo });
  setupViewToggle({ restaurants, postersData, restaurantsWithCoords: restaurants, boroughsGeo });
}

bootstrap();

// Spiral layout reused here for initial posters data
function layoutSpiral(restaurants, w, h, r, s) {
  let spiralCenterX = w / 2;
  let spiralCenterY = h / 2;

  const tempData = restaurants.map((restaurant, i) => {
    const rad = s * Math.sqrt(i + 0.5);
    const a = appState.theta * i;
    return [spiralCenterX + rad * Math.cos(a), spiralCenterY + rad * Math.sin(a)];
  });

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  tempData.forEach(([x, y]) => {
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  });

  const margin = 20;
  const offsetX = (w - (maxX - minX)) / 2 - minX + margin;
  const offsetY = (h - (maxY - minY)) / 2 - minY + margin;

  const zoomFactor = 0.85;
  return restaurants.map((restaurant, i) => {
    const rad = s * Math.sqrt(i + 0.5) * zoomFactor;
    const a = appState.theta * i;
    const x = spiralCenterX + rad * Math.cos(a) + offsetX;
    const y = spiralCenterY + rad * Math.sin(a) + offsetY;
    const vx = (Math.random() - 0.5) * 2.2;
    const vy = (Math.random() - 0.5) * 2.2;
    return { x, y, vx, vy, restaurant, visited: false };
  });
}
