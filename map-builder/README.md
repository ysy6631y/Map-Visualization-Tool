# Map Visualization Tool

Static web UI for grid-based black/white spatial SVG rendering.

The first implementation reuses the measured visual tokens from the original Aral Sea outputs without requiring those source files in the deployed tool. The tool renders imported CSV / JSON / GeoJSON / SVG data directly in the browser.

For generic GeoJSON polygon data, the tool follows the Aral renderer pattern: geometry is sampled into the drawing grid, map boundaries are generated as cell-edge contours, and class dots are drawn from the same occupied grid cells.

## Existing System Relationship

- Visual token source: the original Aral Sea SVG outputs and `scripts/build-aral-sea-change.py`
- Runtime boundary source: Natural Earth 110m Admin 0 Countries from `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`
- Runtime renderer: `src/map-system.js`

CSV / JSON country tables can be joined to the embedded Natural Earth boundary by fields such as `ADM0_A3`, `ISO_A3`, `iso`, `country_code`, `country`, `Country`, `name`, or `NAME`.

## Presets

- Portrait: `210 x 250`, `*_210x250_확장.svg`
- Editorial: `480 x 180`, `*_담수변화.svg`
- Landscape: `420 x 280`, `*_중간밀도_오른쪽_420x280.svg`

Portrait and Landscape keep the original page sizes and near-full-page map fields. Expanding the visible map field beyond those measured margins would change grid cell counts, dot sampling, contour shape, and legend/source spacing, so the tool treats the existing margins as part of the output design system.

`아랄해_2014_중간밀도_샘플.svg` is treated as a test combination of the Editorial composition with mid-density settings, not as a separate preset.

## Design Tokens

- Background dot diameter: `0.24pt`
- Mid pitch: `4.8pt`
- Mid dot diameters: `1.2 / 1.8 / 2.5 / 3.3pt`
- Large pitch: `7.2pt`
- Large dot diameters: `2.4 / 3.8 / 5.4 / 7.2pt`
- Micro pitch: `2.9pt`
- Micro dot diameters: `0.60 / 0.90 / 1.20 / 1.55pt`
- Theme colors: only `#000000` and `#FFFFFF`

## Use

Open `map-builder/index.html` from a local static server rooted at this project directory.

No build step is required.

## Export

- SVG: current vector preview
- PNG: current preview rasterized at 4x canvas scale
- JPEG: current preview rasterized at 4x canvas scale with the active black/white background
