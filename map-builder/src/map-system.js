export const PT = 0.352777778;

export const MAP_TOKENS = {
  fontFamily: "Apple SD Gothic Neo, Noto Sans CJK KR, Helvetica, Arial, sans-serif",
  backgroundDotDiameter: 0.24 * PT,
  pitch: {
    micro: 2.9 * PT,
    mid: 4.8 * PT,
    large: 7.2 * PT
  },
  dotDiameters: {
    large: [2.4 * PT, 3.8 * PT, 5.4 * PT, 7.2 * PT],
    micro: [0.60 * PT, 0.90 * PT, 1.20 * PT, 1.55 * PT],
    mid: [1.20 * PT, 1.80 * PT, 2.50 * PT, 3.30 * PT]
  },
  activation: {
    large: [0.34, 0.43, 0.57, 0.72],
    micro: [0.22, 0.32, 0.46, 0.58],
    mid: [0.28, 0.38, 0.52, 0.66]
  },
  stroke: {
    contextFine: 0.046,
    context: 0.066,
    former: 0.070,
    current: 0.088,
    scale: 0.18
  },
  text: {
    title: 8.2,
    small: 1.85,
    legend: 1.9,
    side: 2.1,
    source: 1.12
  }
};

export const THEMES = {
  white: {
    background: "#FFFFFF",
    foreground: "#000000",
    context: "#000000",
    text: "#000000",
    line: "#000000"
  },
  black: {
    background: "#000000",
    foreground: "#FFFFFF",
    context: "#FFFFFF",
    text: "#FFFFFF",
    line: "#FFFFFF"
  }
};

export const LAYOUT_PRESETS = {
  portrait: {
    id: "portrait",
    name: "Portrait",
    width: 210,
    height: 250,
    field: [12, 6, 186, 238],
    dotSet: "mid",
    pitch: MAP_TOKENS.pitch.mid,
    pitchLabel: "mid 4.8pt",
    dotLabel: "1.2 / 1.8 / 2.5 / 3.3pt",
    densityLabel: "0.28 / 0.38 / 0.52 / 0.66",
    legend: [116, 235.5],
    aralFiles: {
      "1960": "../output/아랄해_1960_210x250_확장.svg",
      "1989": "../output/아랄해_1989_210x250_확장.svg",
      "2014": "../output/아랄해_2014_210x250_확장.svg"
    }
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    width: 480,
    height: 180,
    field: [248, 6, 218, 166],
    dotSet: "micro",
    pitch: MAP_TOKENS.pitch.micro,
    pitchLabel: "left large 7.2pt / right micro 2.9pt",
    dotLabel: "large legend 2.4 / 3.8 / 5.4 / 7.2pt; micro map 0.60 / 0.90 / 1.20 / 1.55pt",
    densityLabel: "left 0.34 / 0.43 / 0.57 / 0.72; right 0.22 / 0.32 / 0.46 / 0.58",
    legend: [202, 12],
    aralFiles: {
      "1960": "../output/아랄해_1960_담수변화.svg",
      "1989": "../output/아랄해_1989_담수변화.svg",
      "2014": "../output/아랄해_2014_담수변화.svg"
    }
  },
  landscape: {
    id: "landscape",
    name: "Landscape",
    width: 420,
    height: 280,
    field: [6, 6, 408, 268],
    dotSet: "mid",
    pitch: MAP_TOKENS.pitch.mid,
    pitchLabel: "mid 4.8pt",
    dotLabel: "1.2 / 1.8 / 2.5 / 3.3pt",
    densityLabel: "0.28 / 0.38 / 0.52 / 0.66",
    legend: [18, 18],
    aralFiles: {
      "1960": "../output/아랄해_1960_중간밀도_오른쪽_420x280.svg",
      "1989": "../output/아랄해_1989_중간밀도_오른쪽_420x280.svg",
      "2014": "../output/아랄해_2014_중간밀도_오른쪽_420x280.svg"
    }
  }
};

export const DATASETS = [];

const outlineCache = new WeakMap();

export function summarizeRecords(records) {
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const numericFields = fields.filter((field) => records.some((record) => Number.isFinite(Number(record[field]))));
  const missing = Object.fromEntries(fields.map((field) => [field, records.filter((record) => record[field] == null || record[field] === "").length]));
  const hasGeometry = records.some((record) => record.geometry);
  const hasXY = records.some((record) => Number.isFinite(Number(record.x)) && Number.isFinite(Number(record.y)));
  const hasLonLat = records.some((record) => Number.isFinite(Number(record.lon ?? record.longitude)) && Number.isFinite(Number(record.lat ?? record.latitude)));
  const spatial = hasGeometry
    ? { detected: true, message: "GeoJSON geometry detected" }
    : hasLonLat
      ? { detected: true, message: "longitude / latitude detected" }
      : hasXY
        ? { detected: true, message: "x / y coordinates detected" }
        : { detected: false, message: "Spatial coordinates not detected" };
  return { fields, numericFields, missing, spatial, metadata: {} };
}

export function detectUnit(field, metadata = {}) {
  if (!field) return "";
  if (metadata[field]?.unit) return metadata[field].unit;
  const name = field.toLowerCase();
  if (/(^|_)km$|km2|_km_|distance_km|retreat_distance_km/.test(name)) return name.includes("km2") ? "km²" : "km";
  if (/km3|km³/.test(name)) return name.includes("year") ? "km³/year" : "km³";
  if (/area.*m2|_m2$/.test(name)) return "m²";
  if (/temperature.*c|_c$|celsius/.test(name)) return "°C";
  if (/percent|pct|share|ratio/.test(name)) return "%";
  if (/pixel/.test(name)) return "px";
  return "";
}

export function classifyEqualInterval(values, unit = "") {
  const finite = values.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;
  const step = max === min ? 1 : (max - min) / 4;
  const bins = Array.from({ length: 4 }, (_, index) => {
    const start = min + step * index;
    const end = index === 3 ? max : min + step * (index + 1);
    return {
      start,
      end,
      label: `${formatRange(start)}-${formatRange(end)}${unit ? ` ${unit}` : ""}`
    };
  });
  return { min, max, bins };
}

export function formatRange(value) {
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Math.abs(value) >= 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 100) / 100);
}

export function renderGenericSvg({ records, contextRecords = [], field, unit, preset, theme, labels, view, extent = "region" }) {
  const values = records.map((record) => Number(record[field])).filter(Number.isFinite);
  const classification = classifyEqualInterval(values, unit);
  const [fx, fy, fw, fh] = preset.field;
  const geometryRecords = records.filter((record) => record.geometry);
  const worldBounds = { minX: -180, minY: -90, maxX: 180, maxY: 90 };
  const bounds = extent === "world" ? worldBounds : spatialBounds(geometryRecords.length ? geometryRecords : records);
  const contextLayers = contextRecords.length ? rasterizeGeometryOutline(contextRecords, preset, bounds) : null;
  const geometryLayers = geometryRecords.length ? rasterizeGeometryRecords(geometryRecords, field, preset, classification, bounds) : null;
  const dots = geometryLayers ? geometryLayers.dots : projectRecords(records, field, preset, classification, bounds);
  const body = [];
  body.push(`<rect x="0" y="0" width="${preset.width}" height="${preset.height}" fill="${theme.background}"/>`);
  if (preset.id === "editorial") {
    body.push(svgText(12, 14, labels.title, MAP_TOKENS.text.title, theme.text));
    body.push(svgText(12, 25, labels.year, MAP_TOKENS.text.title, theme.text));
    body.push(svgText(12, 35.5, labels.description, MAP_TOKENS.text.small, theme.text));
  }
  body.push(...backgroundGrid(preset, theme));
  if (labels.outline !== false) {
    const paths = contextLayers?.contextPaths.length ? contextLayers.contextPaths : geometryLayers?.contextPaths || [];
    body.push(...paths.map((d) => `<path d="${d}" fill="none" stroke="${theme.context}" stroke-width="${MAP_TOKENS.stroke.context.toFixed(3)}" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges"/>`));
  }
  if (view === "data") {
    body.push(`<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="none" stroke="${theme.line}" stroke-width="0.12"/>`);
  }
  body.push(...dots.map((dot) => `<circle cx="${dot.x.toFixed(3)}" cy="${dot.y.toFixed(3)}" r="${dot.r.toFixed(3)}" fill="${theme.foreground}"/>`));
  body.push(...legend(classification, preset, theme));
  if (labels.geographic && preset.id !== "editorial") {
    body.push(svgText(fx + 4, fy + 10, labels.title, MAP_TOKENS.text.small, theme.text));
  }
  body.push(svgText(12, preset.height - 4, labels.source || "Unit not detected", MAP_TOKENS.text.source, theme.text));
  const desc = [
    `preset: ${preset.name}`,
    `field: ${field}`,
    `unit: ${unit || "Unit not detected"}`,
    `classification: Equal Interval / 4 Classes / min ${classification.min} / max ${classification.max}`,
    `extent: ${extent}`,
    `geometry renderer: ${geometryLayers ? "grid occupancy cell-edge contour" : "point coordinates"}`,
    `dot diameters: ${preset.dotLabel}`,
    `grid pitch: ${preset.pitchLabel}`
  ].join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${preset.width}mm" height="${preset.height}mm" viewBox="0 0 ${preset.width} ${preset.height}"><desc>${escapeXml(desc)}</desc>${body.join("")}</svg>`;
}

function rasterizeGeometryOutline(records, preset, bounds) {
  const cacheKey = `${preset.id}:${bounds.minX}:${bounds.minY}:${bounds.maxX}:${bounds.maxY}`;
  const cached = outlineCache.get(records)?.get(cacheKey);
  if (cached) return cached;
  const [fx, fy, width, height] = preset.field;
  const cols = Math.floor(width / preset.pitch);
  const rows = Math.floor(height / preset.pitch);
  const contextPaths = [];
  for (const record of records) {
    if (!record.geometry) continue;
    const active = new Set();
    const bbox = geometryBounds(record.geometry);
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        const cx = fx + (col + 0.5) * preset.pitch;
        const cy = fy + (row + 0.5) * preset.pitch;
        const source = unprojectPoint(cx, cy, preset, bounds);
        if (!pointInBounds(source.x, source.y, bbox)) continue;
        if (pointInGeometry(source.x, source.y, record.geometry)) active.add(`${col},${row}`);
      }
    }
    const path = contourPath(active, preset);
    if (path) contextPaths.push(path);
  }
  const result = { contextPaths };
  if (!outlineCache.has(records)) outlineCache.set(records, new Map());
  outlineCache.get(records).set(cacheKey, result);
  return result;
}

function projectRecords(records, field, preset, classification, bounds = spatialBounds(records)) {
  const [fx, fy, fw, fh] = preset.field;
  const diameters = MAP_TOKENS.dotDiameters[preset.dotSet];
  const spatial = records.map((record, index) => ({
    record,
    index,
    ...recordPoint(record),
    value: Number(record[field])
  })).filter((item) => Number.isFinite(item.value));
  return spatial.map((item) => {
    const xSource = Number.isFinite(item.x) ? item.x : item.index;
    const ySource = Number.isFinite(item.y) ? item.y : stableNoise("row", item.index) * (spatial.length || 1);
    const point = projectPoint(xSource, ySource, preset, bounds);
    const classIndex = Math.min(3, Math.max(0, Math.floor((item.value - classification.min) / ((classification.max - classification.min || 1) / 4))));
    return { x: point.x, y: point.y, r: diameters[classIndex] * 0.5 };
  });
}

function rasterizeGeometryRecords(records, field, preset, classification, bounds) {
  const [fx, fy, width, height] = preset.field;
  const cols = Math.floor(width / preset.pitch);
  const rows = Math.floor(height / preset.pitch);
  const diameters = MAP_TOKENS.dotDiameters[preset.dotSet];
  const contextPaths = [];
  const dots = [];

  for (const [featureIndex, record] of records.entries()) {
    const value = Number(record[field]);
    if (!Number.isFinite(value)) continue;
    const classIndex = Math.min(3, Math.max(0, Math.floor((value - classification.min) / ((classification.max - classification.min || 1) / 4))));
    const active = new Set();
    const bbox = geometryBounds(record.geometry);
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        const cx = fx + (col + 0.5) * preset.pitch;
        const cy = fy + (row + 0.5) * preset.pitch;
        const source = unprojectPoint(cx, cy, preset, bounds);
        if (!pointInBounds(source.x, source.y, bbox)) continue;
        if (!pointInGeometry(source.x, source.y, record.geometry)) continue;
        active.add(`${col},${row}`);
      }
    }
    const path = contourPath(active, preset);
    if (path) contextPaths.push(path);
    const sampled = sampleActiveCells(active, preset, classIndex, featureIndex);
    for (const key of sampled) {
      const [col, row] = key.split(",").map(Number);
      const cx = fx + (col + 0.5) * preset.pitch;
      const cy = fy + (row + 0.5) * preset.pitch;
      dots.push({ x: cx, y: cy, r: diameters[classIndex] * 0.5 });
    }
  }

  return { contextPaths, dots };
}

function sampleActiveCells(active, preset, classIndex, featureIndex) {
  const activation = MAP_TOKENS.activation[preset.dotSet][classIndex];
  return [...active].filter((key) => {
    const [col, row] = key.split(",").map(Number);
    return activationScore(preset.id, featureIndex, col, row) <= activation;
  });
}

function activationScore(layer, featureIndex, col, row) {
  const block = stableNoise("block", layer, featureIndex, Math.floor(col / 3), Math.floor(row / 3));
  const cell = stableNoise("cell", layer, featureIndex, col, row);
  return block * 0.58 + cell * 0.42;
}

function contourPath(active, preset) {
  if (!active.size) return "";
  const [fx, fy, width, height] = preset.field;
  const cols = Math.floor(width / preset.pitch);
  const rows = Math.floor(height / preset.pitch);
  const has = (col, row) => active.has(`${col},${row}`);
  const parts = [];
  for (const key of [...active].sort()) {
    const [col, row] = key.split(",").map(Number);
    const left = fx + col * preset.pitch;
    const right = left + preset.pitch;
    const top = fy + row * preset.pitch;
    const bottom = top + preset.pitch;
    if (!has(col, row - 1) && row !== 0) parts.push(`M ${left.toFixed(3)} ${top.toFixed(3)} L ${right.toFixed(3)} ${top.toFixed(3)}`);
    if (!has(col + 1, row) && col !== cols - 1) parts.push(`M ${right.toFixed(3)} ${top.toFixed(3)} L ${right.toFixed(3)} ${bottom.toFixed(3)}`);
    if (!has(col, row + 1) && row !== rows - 1) parts.push(`M ${right.toFixed(3)} ${bottom.toFixed(3)} L ${left.toFixed(3)} ${bottom.toFixed(3)}`);
    if (!has(col - 1, row) && col !== 0) parts.push(`M ${left.toFixed(3)} ${bottom.toFixed(3)} L ${left.toFixed(3)} ${top.toFixed(3)}`);
  }
  return parts.join(" ");
}

function recordPoint(record) {
  const directX = Number(record.x ?? record.lon ?? record.longitude);
  const directY = Number(record.y ?? record.lat ?? record.latitude);
  if (Number.isFinite(directX) && Number.isFinite(directY)) return { x: directX, y: directY };
  if (!record.geometry) return { x: NaN, y: NaN };
  const points = geometryPoints(record.geometry);
  if (!points.length) return { x: NaN, y: NaN };
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return { x, y };
}

function geometryPoints(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates;
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

function spatialBounds(records) {
  const points = records.flatMap((record) => {
    if (record.geometry) return geometryPoints(record.geometry);
    const point = recordPoint(record);
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? [[point.x, point.y]] : [];
  });
  if (!points.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  const xs = points.map((point) => point[0]).filter(Number.isFinite);
  const ys = points.map((point) => point[1]).filter(Number.isFinite);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function geometryBounds(geometry) {
  const points = geometryPoints(geometry);
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

function projectPoint(x, y, preset, bounds) {
  const [fx, fy, fw, fh] = preset.field;
  const pad = preset.id === "editorial" ? 3 : 5;
  const scale = Math.min((fw - pad * 2) / (bounds.maxX - bounds.minX || 1), (fh - pad * 2) / (bounds.maxY - bounds.minY || 1));
  const usedW = (bounds.maxX - bounds.minX) * scale;
  const usedH = (bounds.maxY - bounds.minY) * scale;
  const ox = fx + (fw - usedW) / 2;
  const oy = fy + (fh - usedH) / 2;
  return {
    x: ox + (x - bounds.minX) * scale,
    y: oy + usedH - (y - bounds.minY) * scale
  };
}

function unprojectPoint(x, y, preset, bounds) {
  const [fx, fy, fw, fh] = preset.field;
  const pad = preset.id === "editorial" ? 3 : 5;
  const scale = Math.min((fw - pad * 2) / (bounds.maxX - bounds.minX || 1), (fh - pad * 2) / (bounds.maxY - bounds.minY || 1));
  const usedW = (bounds.maxX - bounds.minX) * scale;
  const usedH = (bounds.maxY - bounds.minY) * scale;
  const ox = fx + (fw - usedW) / 2;
  const oy = fy + (fh - usedH) / 2;
  return {
    x: bounds.minX + (x - ox) / scale,
    y: bounds.minY + (oy + usedH - y) / scale
  };
}

function pointInBounds(x, y, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function pointInGeometry(x, y, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygonRings(x, y, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((polygon) => pointInPolygonRings(x, y, polygon));
  if (geometry.type === "Point") return Math.abs(geometry.coordinates[0] - x) < 1e-9 && Math.abs(geometry.coordinates[1] - y) < 1e-9;
  return false;
}

function pointInPolygonRings(x, y, rings) {
  if (!rings?.length || !pointInRing(x, y, rings[0])) return false;
  return !rings.slice(1).some((ring) => pointInRing(x, y, ring));
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function backgroundGrid(preset, theme) {
  const [x, y, width, height] = preset.field;
  const cols = Math.floor(width / preset.pitch);
  const rows = Math.floor(height / preset.pitch);
  const radius = MAP_TOKENS.backgroundDotDiameter * 0.5;
  const elems = [];
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      elems.push(`<circle cx="${(x + (col + 0.5) * preset.pitch).toFixed(3)}" cy="${(y + (row + 0.5) * preset.pitch).toFixed(3)}" r="${radius.toFixed(3)}" fill="${theme.foreground}"/>`);
    }
  }
  return elems;
}

function legend(classification, preset, theme) {
  const [x, y] = preset.legend;
  const diameters = MAP_TOKENS.dotDiameters[preset.id === "editorial" ? "large" : preset.dotSet];
  return classification.bins.flatMap((bin, index) => {
    const cy = y + index * 9.2;
    return [
      `<circle cx="${x}" cy="${cy}" r="${(diameters[index] * 0.5).toFixed(3)}" fill="${theme.foreground}"/>`,
      svgText(x + 8, cy + 1.1, bin.label, MAP_TOKENS.text.legend, theme.text)
    ];
  });
}

function svgText(x, y, value, size, fill) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-family="${MAP_TOKENS.fontFamily}" font-weight="400" text-anchor="start" fill="${fill}">${escapeXml(value ?? "")}</text>`;
}

function stableNoise(...values) {
  let h = 2166136261;
  for (const value of values.join(":")) {
    h ^= value.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 0xffffffff;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
