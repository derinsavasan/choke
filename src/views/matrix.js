const d3 = window.d3;
import { appState, dom } from '../state.js';

export function initMatrix() {
  const matrixEl = dom.matrixView;
  if (!matrixEl) return;

  const nodeLabels = [
    'Eye Level',
    'Hidden Spot',
    'Hallway Niche',
    'Bathroom Shrine',
    'Counter Zone',
    'Above the Sink',
    'Behind the Drinks',
    'Near Exit Sign'
  ];

  let nodes = appState.matrix.nodes;
  let size = appState.matrix.size;

  const render = () => {
    const width = matrixEl.clientWidth || window.innerWidth || 800;
    const height = matrixEl.clientHeight || window.innerHeight || 600;
    const prevSize = size;
    size = { width, height };

    if (!nodes) {
      nodes = nodeLabels.map(label => ({
        label,
        x: width / 2,
        y: height / 2
      }));
    } else if (prevSize) {
      const sx = width / prevSize.width;
      const sy = height / prevSize.height;
      nodes.forEach(n => {
        n.x *= sx;
        n.y *= sy;
      });
    }

    matrixEl.innerHTML = '';
    const svg = d3.select(matrixEl)
      .append('svg')
      .attr('class', 'matrix-svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const centerX = width / 2;
    const centerY = height / 2;

    // Grid
    svg.append('line')
      .attr('x1', centerX)
      .attr('y1', 0)
      .attr('x2', centerX)
      .attr('y2', height)
      .attr('stroke', '#cfcfcf')
      .attr('stroke-width', 1.5);
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', centerY)
      .attr('x2', width)
      .attr('y2', centerY)
      .attr('stroke', '#cfcfcf')
      .attr('stroke-width', 1.5);

    // Axis labels
    svg.append('text')
      .attr('x', 12)
      .attr('y', centerY - 12)
      .attr('font-size', 14)
      .attr('fill', '#444')
      .text('Easy to ignore');
    svg.append('text')
      .attr('x', width - 12)
      .attr('y', centerY - 12)
      .attr('text-anchor', 'end')
      .attr('font-size', 14)
      .attr('fill', '#444')
      .text('Hard to ignore');
    svg.append('text')
      .attr('x', centerX + 12)
      .attr('y', 18)
      .attr('font-size', 14)
      .attr('fill', '#444')
      .text('Treated seriously');
    svg.append('text')
      .attr('x', centerX + 12)
      .attr('y', height - 8)
      .attr('font-size', 14)
      .attr('fill', '#444')
      .text('No respect');

    // Quadrant descriptions
    const quadDesc = [
      {
        x: centerX + width * 0.18,
        y: centerY - height * 0.18,
        title: 'Official Behavior',
        body: 'Highly visible + culturally respected. Treated as correct.'
      },
      {
        x: centerX - width * 0.18,
        y: centerY - height * 0.18,
        title: 'Private Reverence',
        body: 'Hard to find + taken seriously. Feels intentional.'
      },
      {
        x: centerX + width * 0.18,
        y: centerY + height * 0.18,
        title: 'Forced Compliance',
        body: 'Hard to miss + not respected. Visible out of obligation.'
      },
      {
        x: centerX - width * 0.18,
        y: centerY + height * 0.18,
        title: 'Visual Trash',
        body: 'Easy to ignore + culturally dismissed.'
      }
    ];

    quadDesc.forEach(q => {
      const g = svg.append('g')
        .attr('transform', `translate(${q.x},${q.y})`);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', 16)
        .attr('font-weight', 700)
        .text(q.title);
      g.append('text')
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('fill', '#555')
        .text(q.body);
    });

    const nodeLayer = svg.append('g').attr('class', 'matrix-nodes');
    const drag = d3.drag()
      .on('start', function() {
        d3.select(this).raise();
      })
      .on('drag', function(event, d) {
        d.x = Math.max(20, Math.min(width - 20, event.x));
        d.y = Math.max(20, Math.min(height - 20, event.y));
        d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
      });

    nodeLayer.selectAll('g.matrix-node')
      .data(nodes, d => d.label)
      .join(enter => {
        const g = enter.append('g')
          .attr('class', 'matrix-node')
          .attr('transform', d => `translate(${d.x},${d.y})`)
          .call(drag);
        g.append('circle').attr('r', 18);
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '4')
          .text(d => d.label);
        return g;
      });

    appState.matrix.nodes = nodes;
    appState.matrix.size = size;
    appState.matrix.svg = svg;
  };

  render();
  window.addEventListener('resize', render);
}
