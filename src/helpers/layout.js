import { appState } from '../state.js';

// Phyllotaxis (sunflower) spiral layout, centered and scaled to fit the viewport.
// Returns one node per restaurant with a position and a small random velocity
// used by the bouncing-bubbles animation.
export function layoutSpiral(restaurants, w, h, r, s) {
  const spiralCenterX = w / 2;
  const spiralCenterY = h / 2;

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
