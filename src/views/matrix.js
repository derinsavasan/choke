const d3 = window.d3;
import { appState, dom } from '../state.js';
import { DATA_PREFIX } from '../config.js';

export function initMatrix(payload = {}) {
  const matrixEl = dom.matrixView;
  if (!matrixEl) return;

  const { restaurants = [], postersData = [] } = payload;
  let nodes = appState.matrix.nodes;
  let size = appState.matrix.size;
  const resetBtn = document.getElementById('matrix-reset');
  const hideHint = () => {
    if (appState.matrix.hintDismissed) return;
    appState.matrix.hintDismissed = true;
    const hint = matrixEl.querySelector('.matrix-hint');
    if (hint) {
      hint.classList.add('fade-out');
      setTimeout(() => hint.remove(), 450);
    }
  };
  const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const render = () => {
    const width = matrixEl.clientWidth || window.innerWidth || 800;
    const height = matrixEl.clientHeight || window.innerHeight || 600;
    const prevSize = size;
    size = { width, height };
    const radius = appState.radius;

    const source = (postersData.length ? postersData : restaurants).map(item => ({
      restaurant: item.restaurant || item,
      x: item.x,
      y: item.y
    }));
    const sourceShuffled = shuffle([...source]);

    const sourceById = new Map();
    source.forEach((item, i) => {
      const restaurant = item.restaurant;
      const id = restaurant.uid || `poster-${i}`;
      sourceById.set(id, { restaurant, x: item.x, y: item.y });
    });

    if (!nodes || nodes.length !== source.length) {
      const seed = sourceShuffled;
      nodes = seed.map((item, i) => {
        const restaurant = item.restaurant;
        const baseX = width / 2 + (Math.random() - 0.5) * radius * 0.4;
        const baseY = height / 2 + (Math.random() - 0.5) * radius * 0.4;
        const id = restaurant.uid || `poster-${i}`;
        return {
          id,
          restaurant,
          x: Math.max(radius, Math.min(width - radius, baseX)),
          y: Math.max(radius, Math.min(height - radius, baseY))
        };
      });
    } else if (prevSize) {
      const sx = width / prevSize.width;
      const sy = height / prevSize.height;
      nodes.forEach(n => {
        const updated = sourceById.get(n.id);
        if (updated && updated.restaurant) {
          n.restaurant = updated.restaurant;
        }
        n.x = Math.max(radius, Math.min(width - radius, n.x * sx));
        n.y = Math.max(radius, Math.min(height - radius, n.y * sy));
      });
    } else {
      nodes.forEach(n => {
        const updated = sourceById.get(n.id);
        if (updated && updated.restaurant) {
          n.restaurant = updated.restaurant;
          if (Number.isFinite(updated.x)) n.x = updated.x;
          if (Number.isFinite(updated.y)) n.y = updated.y;
        }
        n.x = Math.max(radius, Math.min(width - radius, n.x));
        n.y = Math.max(radius, Math.min(height - radius, n.y));
      });
    }

    nodes.forEach(n => {
      if (!n.patternId) {
        n.patternId = `matrix-pattern-${(n.id || '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'poster'}`;
      }
    });

    matrixEl.innerHTML = '';
    const svg = d3.select(matrixEl)
      .append('svg')
      .attr('class', 'matrix-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    nodes.forEach(n => {
      const pattern = defs.append('pattern')
        .attr('id', n.patternId)
        .attr('patternUnits', 'objectBoundingBox')
        .attr('width', 1)
        .attr('height', 1);

      pattern.append('image')
        .attr('href', `${DATA_PREFIX}/${n.restaurant.image_filename}`)
        .attr('width', radius * 2)
        .attr('height', radius * 2)
        .attr('preserveAspectRatio', 'xMidYMid slice');
    });

    const centerX = width / 2;
    const centerY = height / 2;

    // Grid
    svg.append('line')
      .attr('x1', centerX)
      .attr('y1', 0)
      .attr('x2', centerX)
      .attr('y2', height)
      .attr('stroke', '#cfcfcf')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6 10')
      .attr('stroke-linecap', 'round');
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', centerY)
      .attr('x2', width)
      .attr('y2', centerY)
      .attr('stroke', '#cfcfcf')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6 10')
      .attr('stroke-linecap', 'round');

    // Axis labels
    svg.append('text')
      .attr('class', 'axis-label axis-left')
      .attr('x', 16)
      .attr('y', centerY - 12)
      .attr('text-anchor', 'start')
      .text('Easy to miss');
    svg.append('text')
      .attr('class', 'axis-label axis-right')
      .attr('x', width - 16)
      .attr('y', centerY - 12)
      .attr('text-anchor', 'end')
      .text('Hard to miss');
    svg.append('text')
      .attr('class', 'axis-label axis-top')
      .attr('x', centerX + 12)
      .attr('y', 26)
      .attr('text-anchor', 'start')
      .text('Taken seriously');
    svg.append('text')
      .attr('class', 'axis-label axis-bottom')
      .attr('x', centerX + 12)
      .attr('y', height - 14)
      .attr('text-anchor', 'start')
      .text('Not taken seriously');

    // Quadrant descriptions
    const quadDesc = [
      {
        key: 'front',
        x: centerX + width * 0.25,
        y: centerY - height * 0.25,
        title: 'Front-of-House Shrine',
        bodyParts: [
          { text: 'Prime real estate. You ' },
          { text: "can't miss it", italic: true },
          { text: ', and staff actually care.' }
        ]
      },
      {
        key: 'gospel',
        x: centerX - width * 0.25,
        y: centerY - height * 0.25,
        title: 'Staff-Only Gospel',
        bodyParts: [
          { text: 'Back-room, behind the prep table, treated like a secret rulebook.' }
        ]
      },
      {
        key: 'mandate',
        x: centerX + width * 0.25,
        y: centerY + height * 0.25,
        title: 'Manager’s Mandate',
        bodyParts: [
          { text: 'Hung eye-level because someone from corporate said so.' }
        ]
      },
      {
        key: 'afterthought',
        x: centerX - width * 0.25,
        y: centerY + height * 0.25,
        title: 'The Afterthought',
        bodyParts: [
          { text: 'Slapped somewhere pointless. No one looks, no one cares.' }
        ]
      }
    ];

    const quadGroups = svg.append('g')
      .attr('class', 'quad-layer')
      .selectAll('g.quad-label')
      .data(quadDesc)
      .join('g')
      .attr('class', d => `quad-label quad-${d.key}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('data-quadrant', (d, i) => i);

    quadGroups.append('text')
      .attr('class', 'quad-title')
      .attr('text-anchor', 'middle')
      .text(d => d.title);
    quadGroups.append('text')
      .attr('class', 'quad-body')
      .attr('y', 32)
      .attr('text-anchor', 'middle')
      .each(function(d) {
        const parts = d.bodyParts || [{ text: d.body || '' }];
        const sel = d3.select(this);
        parts.forEach(part => {
          const t = sel.append('tspan').text(part.text);
          if (part.italic) t.attr('font-style', 'italic');
        });
      });

    const nodeLayer = svg.append('g').attr('class', 'matrix-nodes');
    const drag = d3.drag()
      .on('start', function() {
        d3.select(this).raise();
      })
      .on('drag', function(event, d) {
        d.x = Math.max(radius, Math.min(width - radius, event.x));
        d.y = Math.max(radius, Math.min(height - radius, event.y));
        d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
        updateQuadrantOpacity();
      });

    const nodeSelection = nodeLayer.selectAll('g.matrix-node')
      .data(nodes, d => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'matrix-node')
            .attr('transform', d => `translate(${d.x},${d.y})`);
          g.append('circle')
            .attr('r', radius);
          g.append('title')
            .text(d => d.restaurant.restaurant_name || 'Poster');
          return g;
        },
        update => update
          .attr('transform', d => `translate(${d.x},${d.y})`)
      )
      .call(drag);

    nodeSelection.select('circle')
      .attr('r', radius)
      .attr('fill', d => `url(#${d.patternId})`);
    nodeSelection.select('title')
      .text(d => d.restaurant.restaurant_name || 'Poster');

    appState.matrix.nodes = nodes;
    appState.matrix.size = size;
    appState.matrix.svg = svg;

    function updateQuadrantOpacity() {
      const counts = [0, 0, 0, 0];
      const threshold = radius * 2;
      nodes.forEach(n => {
        const dx = n.x - centerX;
        const dy = n.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= threshold) return; // still in the center pile
        const isLeft = n.x < centerX;
        const isTop = n.y < centerY;
        const idx = isTop ? (isLeft ? 1 : 0) : (isLeft ? 3 : 2);
        counts[idx] += 1;
      });
      quadGroups.each(function(_, i) {
        const hasNode = counts[i] > 0;
        d3.select(this).attr('opacity', hasNode ? 0.22 : 1);
      });
    }

    updateQuadrantOpacity();

    if (!appState.matrix.hintDismissed) {
      const hint = document.createElement('div');
      hint.className = 'matrix-hint';
      hint.textContent = 'Drag each poster into the quadrant where you think it belongs.';
      matrixEl.appendChild(hint);
      if (!appState.matrix.hintListenerAttached) {
        matrixEl.addEventListener('pointerdown', () => {
          hideHint();
        }, { once: true });
        appState.matrix.hintListenerAttached = true;
      }
    }
  };

  render();
  if (resetBtn && !appState.matrix.resetHooked) {
    resetBtn.addEventListener('click', () => {
      nodes = null;
      appState.matrix.nodes = null;
      appState.matrix.hintDismissed = false;
      appState.matrix.hintListenerAttached = false;
      render();
    });
    appState.matrix.resetHooked = true;
  }
  if (!appState.matrix.resizeBound) {
    window.addEventListener('resize', render);
    appState.matrix.resizeBound = true;
  }
}
