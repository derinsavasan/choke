const d3 = window.d3;
import { DATA_PREFIX } from './config.js';

export async function loadAllData() {
  const [csvRows, metadata, boroughsGeo] = await Promise.all([
    d3.csv(`${DATA_PREFIX}/choke-me.csv`),
    fetch(`${DATA_PREFIX}/metadata.json`).then(r => r.json()),
    fetch(`${DATA_PREFIX}/nyc.geojson`).then(r => r.json())
  ]);
  return { csvRows, metadata, boroughsGeo };
}
