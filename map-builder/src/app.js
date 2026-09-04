import {
  DATASETS,
  LAYOUT_PRESETS,
  THEMES,
  classifyEqualInterval,
  detectUnit,
  formatRange,
  renderGenericSvg,
  summarizeRecords
} from "./map-system.js";

const NATURAL_EARTH_WORLD_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const BUILT_IN_GEOJSON_DATASETS = {
  naturalEarthWorld: {
    name: "Natural Earth 110m / World reference",
    path: NATURAL_EARTH_WORLD_URL,
    defaults: {
      field: "POP_EST",
      title: "World Population",
      year: "Natural Earth 110m",
      description: "World country polygons rendered through the same grid map system",
      source: "Natural Earth 110m Admin 0 Countries"
    }
  }
};

const state = {
  datasetId: "naturalEarthWorld",
  records: [],
  worldRecords: [],
  analysis: null,
  field: "POP_EST",
  unit: "",
  preset: "portrait",
  theme: "white",
  view: "final",
  extent: "world",
  outline: true,
  labels: true,
  title: "World Population",
  year: "Natural Earth 110m",
  description: "World country polygons rendered through the same grid map system",
  source: "Natural Earth 110m Admin 0 Countries"
};

const els = {
  root: document.querySelector(".builder"),
  datasetSelect: document.querySelector("#datasetSelect"),
  fileInput: document.querySelector("#fileInput"),
  fieldSelect: document.querySelector("#fieldSelect"),
  unitValue: document.querySelector("#unitValue"),
  rangeValue: document.querySelector("#rangeValue"),
  spatialValue: document.querySelector("#spatialValue"),
  missingValue: document.querySelector("#missingValue"),
  classList: document.querySelector("#classList"),
  pitchValue: document.querySelector("#pitchValue"),
  dotValue: document.querySelector("#dotValue"),
  densityValue: document.querySelector("#densityValue"),
  extentSelect: document.querySelector("#extentSelect"),
  outlineToggle: document.querySelector("#outlineToggle"),
  labelsToggle: document.querySelector("#labelsToggle"),
  whiteTheme: document.querySelector("#whiteTheme"),
  blackTheme: document.querySelector("#blackTheme"),
  presetButtons: document.querySelector("#presetButtons"),
  titleInput: document.querySelector("#titleInput"),
  yearInput: document.querySelector("#yearInput"),
  descriptionInput: document.querySelector("#descriptionInput"),
  sourceInput: document.querySelector("#sourceInput"),
  viewButtons: document.querySelector("#viewButtons"),
  preview: document.querySelector("#preview"),
  statusLine: document.querySelector("#statusLine"),
  exportSvg: document.querySelector("#exportSvg"),
  exportPng: document.querySelector("#exportPng"),
  exportJpeg: document.querySelector("#exportJpeg")
};

function init() {
  for (const dataset of DATASETS) {
    const option = document.createElement("option");
    option.value = dataset.id;
    option.textContent = dataset.name;
    els.datasetSelect.append(option);
  }
  for (const [id, dataset] of Object.entries(BUILT_IN_GEOJSON_DATASETS)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = dataset.name;
    els.datasetSelect.append(option);
  }

  for (const preset of Object.values(LAYOUT_PRESETS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.preset = preset.id;
    button.textContent = `${preset.name} ${preset.width}x${preset.height}`;
    els.presetButtons.append(button);
  }

  bindEvents();
  loadBuiltInGeojson(state.datasetId);
}

function bindEvents() {
  els.datasetSelect.addEventListener("change", () => {
    state.datasetId = els.datasetSelect.value;
    if (BUILT_IN_GEOJSON_DATASETS[state.datasetId]) {
      loadBuiltInGeojson(state.datasetId);
      return;
    }
    const dataset = DATASETS.find((item) => item.id === state.datasetId);
    if (!dataset) {
      syncControls();
      render();
      return;
    }
    state.records = dataset.records;
    Object.assign(state, dataset.defaults);
    updateAnalysis();
    syncControls();
    render();
  });

  els.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = await parseInputFile(file);
    state.datasetId = "imported";
    ensureImportedOption(imported.name);
    state.records = await attachWorldGeometries(imported.records);
    state.title = imported.name.replace(/\.[^.]+$/, "");
    state.year = "";
    state.description = imported.description;
    state.source = file.name;
    updateAnalysis();
    state.field = state.analysis.numericFields[0] || "";
    state.unit = detectUnit(state.field, state.analysis.metadata);
    syncControls();
    render();
  });

  els.fieldSelect.addEventListener("change", () => {
    state.field = els.fieldSelect.value;
    state.unit = detectUnit(state.field, state.analysis.metadata);
    syncControls();
    render();
  });

  els.extentSelect.addEventListener("change", () => {
    state.extent = els.extentSelect.value;
    render();
  });

  els.outlineToggle.addEventListener("change", () => {
    state.outline = els.outlineToggle.checked;
    render();
  });

  els.labelsToggle.addEventListener("change", () => {
    state.labels = els.labelsToggle.checked;
    render();
  });

  els.whiteTheme.addEventListener("click", () => setTheme("white"));
  els.blackTheme.addEventListener("click", () => setTheme("black"));

  els.presetButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-preset]");
    if (!button) return;
    state.preset = button.dataset.preset;
    syncControls();
    render();
  });

  els.viewButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    state.view = button.dataset.view;
    syncControls();
    render();
  });

  for (const [key, input] of [
    ["title", els.titleInput],
    ["year", els.yearInput],
    ["description", els.descriptionInput],
    ["source", els.sourceInput]
  ]) {
    input.addEventListener("input", () => {
      state[key] = input.value;
      render();
    });
  }

  els.exportSvg.addEventListener("click", exportSvg);
  els.exportPng.addEventListener("click", () => exportRaster("png"));
  els.exportJpeg.addEventListener("click", () => exportRaster("jpeg"));
}

async function loadBuiltInGeojson(id) {
  const dataset = BUILT_IN_GEOJSON_DATASETS[id];
  try {
    const response = await fetch(dataset.path);
    if (!response.ok) throw new Error(response.statusText);
    const geojson = await response.json();
    state.records = parseGeoJson(geojson);
    if (id === "naturalEarthWorld") state.worldRecords = state.records;
    Object.assign(state, dataset.defaults);
    updateAnalysis();
    state.field = state.analysis.numericFields.includes(dataset.defaults.field) ? dataset.defaults.field : state.analysis.numericFields[0] || "";
    state.unit = detectUnit(state.field, state.analysis.metadata);
    syncControls();
    render();
  } catch {
    diagnostic(`Could not load ${dataset.path}`);
  }
}

function setTheme(theme) {
  state.theme = theme;
  els.root.dataset.theme = theme;
  syncControls();
  render();
}

function updateAnalysis() {
  state.analysis = summarizeRecords(state.records);
  if (!state.analysis.numericFields.includes(state.field)) {
    state.field = state.analysis.numericFields[0] || "";
  }
  state.unit = detectUnit(state.field, state.analysis.metadata);
}

function syncControls() {
  els.datasetSelect.value = state.datasetId;
  els.fieldSelect.replaceChildren();
  for (const field of state.analysis.numericFields) {
    const option = document.createElement("option");
    option.value = field;
    option.textContent = field;
    els.fieldSelect.append(option);
  }
  els.fieldSelect.value = state.field;
  els.unitValue.textContent = state.unit || "Unit not detected";
  els.spatialValue.textContent = state.analysis.spatial.message;
  els.missingValue.textContent = String(state.analysis.missing[state.field] || 0);
  els.titleInput.value = state.title;
  els.yearInput.value = state.year;
  els.descriptionInput.value = state.description;
  els.sourceInput.value = state.source;
  els.extentSelect.value = state.extent;
  els.outlineToggle.checked = state.outline;
  els.labelsToggle.checked = state.labels;

  const values = state.records.map((record) => Number(record[state.field])).filter(Number.isFinite);
  const classes = classifyEqualInterval(values, state.unit);
  els.rangeValue.textContent = values.length ? `${formatRange(classes.min)} / ${formatRange(classes.max)}${state.unit ? ` ${state.unit}` : ""}` : "Numeric field required";
  els.classList.replaceChildren(...classes.bins.map((bin, index) => {
    const li = document.createElement("li");
    li.textContent = `${bin.label} / dot ${index + 1}`;
    return li;
  }));

  const preset = LAYOUT_PRESETS[state.preset];
  els.pitchValue.textContent = preset.pitchLabel;
  els.dotValue.textContent = preset.dotLabel;
  els.densityValue.textContent = preset.densityLabel;
  els.whiteTheme.classList.toggle("active", state.theme === "white");
  els.blackTheme.classList.toggle("active", state.theme === "black");
  for (const button of els.presetButtons.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.preset === state.preset);
  }
  for (const button of els.viewButtons.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.view === state.view);
  }
}

function ensureImportedOption(name) {
  let option = els.datasetSelect.querySelector('option[value="imported"]');
  if (!option) {
    option = document.createElement("option");
    option.value = "imported";
    els.datasetSelect.append(option);
  }
  option.textContent = `Imported: ${name}`;
}

async function render() {
  const values = state.records.map((record) => Number(record[state.field])).filter(Number.isFinite);
  if (!state.field || !values.length) {
    diagnostic("Numeric field required");
    return;
  }
  if (!state.analysis.spatial.detected && state.datasetId !== "aral") {
    diagnostic(state.analysis.spatial.message);
    return;
  }
  const svg = renderGenericSvg({
    records: state.records,
    contextRecords: state.extent === "world" ? state.worldRecords : [],
    field: state.field,
    unit: state.unit,
    preset: LAYOUT_PRESETS[state.preset],
    theme: THEMES[state.theme],
    extent: state.extent,
    labels: {
      title: state.title,
      year: state.year,
      description: state.description,
      source: state.source,
      outline: state.outline,
      geographic: state.labels
    },
    view: state.view
  });
  els.preview.innerHTML = svg;
  els.statusLine.textContent = state.view === "final" ? "Rendered with extracted map tokens" : `${state.view} view`;
}

function diagnostic(message) {
  els.preview.innerHTML = `<div class="diagnostic">${message}</div>`;
  els.statusLine.textContent = message;
}

async function parseInputFile(file) {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) return { name: file.name, description: "Imported CSV", records: parseCsv(text) };
  if (lower.endsWith(".svg")) return { name: file.name, description: "Imported SVG geographic shape", records: parseSvg(text) };
  const json = JSON.parse(text);
  if (json.type === "FeatureCollection") return { name: file.name, description: "Imported GeoJSON", records: parseGeoJson(json) };
  return { name: file.name, description: "Imported JSON", records: Array.isArray(json) ? json : [json] };
}

async function loadWorldRecords() {
  if (state.worldRecords.length) return state.worldRecords;
  const response = await fetch(NATURAL_EARTH_WORLD_URL);
  if (!response.ok) throw new Error(response.statusText);
  const geojson = await response.json();
  state.worldRecords = parseGeoJson(geojson);
  return state.worldRecords;
}

async function attachWorldGeometries(records) {
  if (records.some((record) => record.geometry)) return records;
  const world = await loadWorldRecords();
  const index = buildWorldIndex(world);
  let matched = 0;
  const joined = records.map((record) => {
    const key = countryKey(record);
    const boundary = key ? index.get(key) : null;
    if (!boundary) return record;
    matched += 1;
    return {
      ...boundary,
      ...record,
      geometry: boundary.geometry,
      boundary_source: "Natural Earth 110m Admin 0 Countries"
    };
  });
  if (matched) return joined;
  return records;
}

function buildWorldIndex(records) {
  const index = new Map();
  for (const record of records) {
    for (const value of [record.ADM0_A3, record.ISO_A3, record.NAME, record.NAME_LONG, record.ADMIN, record.name, record.country]) {
      const key = normalizeCountry(value);
      if (key && !index.has(key)) index.set(key, record);
    }
  }
  return index;
}

function countryKey(record) {
  for (const field of ["ADM0_A3", "ISO_A3", "iso_a3", "iso", "country_code", "country", "Country", "name", "NAME", "admin", "ADMIN"]) {
    const key = normalizeCountry(record[field]);
    if (key) return key;
  }
  return "";
}

function normalizeCountry(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((row) => row.split(",").map((cell) => cell.trim()));
  const header = rows.shift() || [];
  return rows.map((row) => Object.fromEntries(header.map((key, index) => [key, coerce(row[index])])));
}

function parseGeoJson(geojson) {
  return geojson.features.map((feature, index) => ({
    id: feature.id ?? index,
    ...feature.properties,
    geometry: feature.geometry
  }));
}

function parseSvg(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  return [...doc.querySelectorAll("circle")].map((node, index) => ({
    id: index,
    x: Number(node.getAttribute("cx")),
    y: Number(node.getAttribute("cy")),
    value: Number(node.getAttribute("r")) || 1
  }));
}

function coerce(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function exportSvg() {
  const svg = els.preview.querySelector("svg");
  if (!svg) return;
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${state.title || "map"}_${state.year || "export"}_${state.preset}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportRaster(format) {
  const svg = els.preview.querySelector("svg");
  if (!svg) return;
  const clone = svg.cloneNode(true);
  const viewBox = clone.getAttribute("viewBox")?.split(/\s+/).map(Number) || [0, 0, 480, 180];
  const width = viewBox[2];
  const height = viewBox[3];
  const scale = 4;
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = THEMES[state.theme].background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const out = canvas.toDataURL(mime, 0.95);
    const a = document.createElement("a");
    a.href = out;
    a.download = `${state.title || "map"}_${state.year || "export"}_${state.preset}.${format === "jpeg" ? "jpg" : "png"}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  image.src = url;
}

init();
