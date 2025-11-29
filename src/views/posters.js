const d3 = window.d3;
import { appState, dom } from '../state.js';
import { DATA_PREFIX } from '../config.js';

let data = [];
let svg = null;
let circles = null;

export function initPosters(payload) {
  data = payload.postersData;
  const chart = document.getElementById('chart');
  if (!chart) return;

  svg = createSVG();
  circles = createCircles(svg, data);
  appState.bounceControls = animateBouncing(circles, data);
  setupEventHandlers(svg, circles, data);

  chart.innerHTML = '';
  chart.appendChild(svg.node());

  // Handle window resize for responsive scaling
  window.addEventListener('resize', () => {
    appState.width = window.innerWidth || 928;
    appState.height = window.innerHeight || 500;
    appState.radius = Math.min(appState.width, appState.height) / 20;
    appState.step = appState.radius * 3.2;

    // Preserve visited state
    const visitedMap = new Map(data.map(d => [d.restaurant.restaurant_name, d.visited]));

    // Recalculate layout
    const newData = layoutSpiral(payload.restaurants, appState.width, appState.height, appState.radius, appState.step);

    // Restore visited
    newData.forEach(d => {
      d.visited = visitedMap.get(d.restaurant.restaurant_name) || false;
    });

    // Update data array
    data.length = 0;
    data.push(...newData);

    // Separate any overlapping circles after resize
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const d1 = data[i], d2 = data[j];
        const dx = d1.x - d2.x, dy = d1.y - d2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2 * appState.radius) {
          const n = { x: dx / dist, y: dy / dist };
          const overlap = 2 * appState.radius - dist;
          d1.x += n.x * overlap / 2;
          d1.y += n.y * overlap / 2;
          d2.x -= n.x * overlap / 2;
          d2.y -= n.y * overlap / 2;
        }
      }
    }

    // Update circles
    circles.data(data)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', appState.radius);

    // Update patterns
    svg.selectAll('pattern').each(function(d, i) {
      d3.select(this)
        .select('image')
        .attr('width', appState.radius * 2)
        .attr('height', appState.radius * 2);
    });

    // Update viewBox
    svg.attr('viewBox', [0, 0, appState.width, appState.height]);
  });
}

export function renderPosters() {
  if (appState.bounceControls) {
    appState.bounceControls.start();
  }
}

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

function createSVG() {
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, appState.width, appState.height])
    .style("cursor", "pointer");

  svg.append("g");
  const defs = svg.append("defs");

  defs.append("filter")
    .attr("id", "grayscale")
    .append("feColorMatrix")
    .attr("type", "saturate")
    .attr("values", "0");

  return svg;
}

function createCircles(svg, data) {
  const defs = svg.select("defs");

  data.forEach((d, i) => {
    const pattern = defs.append("pattern")
      .attr("id", `pattern-${i}`)
      .attr("patternUnits", "objectBoundingBox")
      .attr("width", 1)
      .attr("height", 1);

    pattern.append("image")
      .attr("href", `${DATA_PREFIX}/${d.restaurant.image_filename}`)
      .attr("width", appState.radius * 2)
      .attr("height", appState.radius * 2)
      .attr("preserveAspectRatio", "xMidYMid slice");
  });

  return svg.select("g").selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", appState.radius)
    .attr("fill", (d, i) => `url(#pattern-${i})`)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("filter", d => d.visited ? "url(#grayscale)" : null)
    .style("cursor", "pointer");
}

function animateBouncing(circles, data) {
  let frameId = null;
  let paused = false;

  function step() {
    if (paused) {
      frameId = null;
      return;
    }

    data.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;

      if (d.x - appState.radius < 0) { d.x = appState.radius; d.vx *= -1; }
      if (d.x + appState.radius > appState.width) { d.x = appState.width - appState.radius; d.vx *= -1; }
      if (d.y - appState.radius < 0) { d.y = appState.radius; d.vy *= -1; }
      if (d.y + appState.radius > appState.height) { d.y = appState.height - appState.radius; d.vy *= -1; }
    });

    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const d1 = data[i], d2 = data[j];
        const dx = d1.x - d2.x, dy = d1.y - d2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2 * appState.radius) {
          const n = { x: dx / dist, y: dy / dist };
          const dot = (d1.vx - d2.vx) * n.x + (d1.vy - d2.vy) * n.y;
          d1.vx -= dot * n.x;
          d1.vy -= dot * n.y;
          d2.vx += dot * n.x;
          d2.vy += dot * n.y;

          const overlap = 2 * appState.radius - dist;
          d1.x += n.x * overlap / 2;
          d1.y += n.y * overlap / 2;
          d2.x -= n.x * overlap / 2;
          d2.y -= n.y * overlap / 2;
        }
      }
    }

    circles.attr("cx", d => d.x).attr("cy", d => d.y);
    frameId = requestAnimationFrame(step);
  }

  function start() {
    if (!paused && frameId) return;
    paused = false;
    if (!frameId) frameId = requestAnimationFrame(step);
  }

  function stop() {
    if (paused && !frameId) return;
    paused = true;
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  start();
  return { start, stop };
}

function setupEventHandlers(svg, circles, data) {
  circles.on("click", (event, d) => {
    event.stopPropagation();
    if (d3.select("#corner-image").style("display") === "block") {
      hideCard();
    } else {
      d.visited = true;
      circles.attr("filter", d => d.visited ? "url(#grayscale)" : null);
      showCard(d.restaurant);
    }
  });

  svg.on("click", hideCard);
}

export function hideCard() {
  d3.select("#corner-image").style("display", "none");
  d3.select("#corner-info").style("display", "none");
  d3.select("#chart").classed("dimmed", false);
}

export function showCard(restaurant) {
  d3.select("#corner-img").attr("src", `${DATA_PREFIX}/${restaurant.image_filename}`);
  d3.select("#corner-image").style("display", "block");

  d3.select("#corner-title").text(restaurant.restaurant_name);
  d3.select("#corner-borough").text(restaurant.borough || "N/A");
  d3.select("#corner-neighborhood").text(restaurant.neighborhood || "N/A");
  d3.select("#corner-cuisine").text(restaurant.cuisine);
  d3.select("#corner-style").text(restaurant.style);
  d3.select("#corner-position").text(restaurant.position);
  d3.select("#corner-info").style("display", "block");
  applyCardAccent('#111');
  const thisAccentToken = ++appState.cardAccentToken;
  getVibrantColor(restaurant.image_filename).then(color => {
    if (thisAccentToken !== appState.cardAccentToken) return;
    applyCardAccent(color);
  });

  d3.select("#chart").classed("dimmed", true);
}

function applyCardAccent(color) {
  const accent = color || '#111';
  d3.select("#corner-title").style("color", accent);
  d3.selectAll("#corner-info b").style("color", accent);
}

function getVibrantColor(imageFilename) {
  const safeFilename = imageFilename || 'heimlich.png';
  if (appState.colorCache.has(safeFilename)) {
    return Promise.resolve(appState.colorCache.get(safeFilename));
  }
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const finalize = color => {
      const fallback = color || '#111';
      appState.colorCache.set(safeFilename, fallback);
      resolve(fallback);
    };
    img.onload = () => {
      try {
        const size = 80;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let bestSat = -1;
        let bestColor = [17, 17, 17];
        let avgR = 0, avgG = 0, avgB = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 150) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          avgR += r;
          avgG += g;
          avgB += b;
          count++;
          const rn = r / 255;
          const gn = g / 255;
          const bn = b / 255;
          const maxN = Math.max(rn, gn, bn);
          const minN = Math.min(rn, gn, bn);
          const delta = maxN - minN;
          if (delta < 0.08) continue;
          const lightness = (maxN + minN) / 2;
          if (lightness > 0.85 || lightness < 0.15) continue;
          const denom = 1 - Math.abs(2 * lightness - 1);
          const saturation = denom ? delta / denom : 0;
          if (saturation > bestSat) {
            bestSat = saturation;
            bestColor = [r, g, b];
          }
        }
        let color = '#111';
        if (bestSat > 0) {
          color = `rgb(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]})`;
        } else if (count) {
          color = `rgb(${Math.round(avgR / count)}, ${Math.round(avgG / count)}, ${Math.round(avgB / count)})`;
        }
        finalize(color);
      } catch (err) {
        finalize('#111');
      }
    };
    img.onerror = () => finalize('#111');
    img.src = `${DATA_PREFIX}/${safeFilename}`;
  });
}
