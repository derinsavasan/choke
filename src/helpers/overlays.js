import { dom } from '../state.js';

export function hideTooltipsAndCompare() {
  if (dom.mapTooltip) dom.mapTooltip.style.display = 'none';
  if (dom.mapCompare) {
    dom.mapCompare.classList.remove('visible');
    dom.mapCompare.setAttribute('aria-hidden', 'true');
  }
  if (dom.mapInfo) {
    dom.mapInfo.classList.remove('visible');
    dom.mapInfo.setAttribute('aria-hidden', 'true');
  }
}
