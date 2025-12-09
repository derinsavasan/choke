import { appState, dom } from './state.js';
import { initPosters, renderPosters, hideCard } from './views/posters.js';
import { initMap, renderMap } from './views/map.js';
import { initMatrix } from './views/matrix.js';
import { hideTooltipsAndCompare } from './helpers/overlays.js';
import { hideMatrixPreview } from './views/matrix.js';

export function setupWelcome() {
  const welcome = document.getElementById('welcome-message');
  const backdrop = document.getElementById('welcome-backdrop');
  if (welcome && backdrop) {
    welcome.classList.add('show');
    backdrop.classList.add('show');
    const dismissWelcome = () => {
      welcome.classList.remove('show');
      backdrop.classList.remove('show');
      document.removeEventListener('click', dismissWelcome);
    };
    document.addEventListener('click', dismissWelcome);
  }
  if (dom.mapInfo) {
    dom.mapInfo.style.transition = 'opacity 0.6s ease';
  }
}

export function setupViewToggle(data) {
  const buttons = document.querySelectorAll('#view-toggle button');
  const chart = document.getElementById('chart');
  const mapEl = document.getElementById('map');
  const matrixEl = dom.matrixView;
  const matrixReset = document.getElementById('matrix-reset');
  const togglePill = document.querySelector('#view-toggle .toggle-pill');
  const views = ['bubbles', 'map', 'matrix'];
  let mapInitialized = false;

  if (!chart || !mapEl || !buttons.length) return;

  const setActive = (view) => {
    buttons.forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
    if (mapEl) mapEl.setAttribute('aria-hidden', view === 'bubbles');
    const toggle = document.getElementById('view-toggle');
    if (toggle) toggle.setAttribute('data-active', view);
    if (togglePill) {
      const idx = views.indexOf(view);
      if (idx >= 0) togglePill.style.left = `calc(${idx * 33.333}% + 4px)`;
    }
  };

  const switchView = (view) => {
    if (view === appState.currentView) return;
    appState.currentView = view;

    if (view === 'map') {
      if (dom.mapInfo) dom.mapInfo.style.transition = 'none';
      chart.style.display = 'none';
      mapEl.style.display = 'block';
      if (matrixEl) matrixEl.style.display = 'none';
      if (matrixReset) matrixReset.style.display = 'none';
      if (appState.bounceControls) appState.bounceControls.stop();
      hideCard();
      hideMatrixPreview();
      if (!mapInitialized) {
        initMap(data);
        mapInitialized = true;
      }
      requestAnimationFrame(() => {
        renderMap();
        requestAnimationFrame(() => {
          if (dom.mapInfo) dom.mapInfo.style.transition = '';
        });
      });
    } else if (view === 'matrix') {
      chart.style.display = 'none';
      mapEl.style.display = 'none';
      if (matrixEl) matrixEl.style.display = 'block';
      if (matrixReset) matrixReset.style.display = 'inline-flex';
      if (appState.bounceControls) appState.bounceControls.start();
      hideTooltipsAndCompare();
      hideMatrixPreview();
      initMatrix({ restaurants: data.restaurants, postersData: data.postersData });
    } else {
      mapEl.style.display = 'none';
      chart.style.display = 'block';
      if (matrixEl) matrixEl.style.display = 'none';
      if (matrixReset) matrixReset.style.display = 'none';
      if (appState.bounceControls) appState.bounceControls.start();
      hideTooltipsAndCompare();
      hideMatrixPreview();
    }
    setActive(view);
  };

  buttons.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  setActive(appState.currentView);

  // initialize default view
  initPosters(data);
  renderPosters();
}
