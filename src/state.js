export const appState = {
  width: window.innerWidth || 928,
  height: window.innerHeight || 500,
  radius: null,
  step: null,
  theta: Math.PI * (3 - Math.sqrt(5)),
  bounceControls: null,
  map: { render: null },
  currentView: 'bubbles',
  colorCache: new Map(),
  cardAccentToken: 0,
  matrix: {
    nodes: null,
    size: null,
    svg: null,
    resizeBound: false,
    hintDismissed: false,
    hintListenerAttached: false,
    resetHooked: false
  }
};

export const dom = {
  mapTooltip: document.getElementById('map-tooltip'),
  mapInfo: document.getElementById('map-info'),
  mapCompare: document.getElementById('map-compare'),
  mapCompareRestaurantImg: document.getElementById('map-compare-restaurant'),
  mapCompareRestaurantCaption: document.getElementById('map-compare-restaurant-caption'),
  matrixView: document.getElementById('matrix-view')
};

// Initialize derived sizes
appState.radius = Math.min(appState.width, appState.height) / 20;
appState.step = appState.radius * 3.2;
