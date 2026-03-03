# Contributing to Grid-Pro

## Setup

```bash
git clone <repo-url>
cd grid-pro-plugin
npm install
```

## Build

```bash
npm run build
```

This generates minified files in `dist/`:

| File | Format |
|------|--------|
| `dist/grid-pro.min.js` | IIFE (direct `<script>` inclusion) |
| `dist/grid-pro.esm.js` | ES Module |
| `dist/grid-pro.umd.js` | CommonJS / UMD |
| `dist/grid-pro.min.css` | CSS minified |

## Tests

```bash
npm test
```

Tests use [Vitest](https://vitest.dev/).

## Source files

| File | Role |
|------|------|
| `assets/js/grid-pro.js` | Main IIFE engine (browser `<script>`) |
| `assets/js/grid-pro.esm.js` | ESM module source |
| `assets/js/grid-pro.umd.js` | UMD module source |
| `assets/css/grid-pro.css` | Plugin styles + gap utilities |
| `index.d.ts` | TypeScript declarations |

## Philosophy

Grid-Pro is a **container-based** proportional layout engine. All responsive behavior is derived from the container's actual pixel width, not the viewport.

**Do not** add:
- Fixed breakpoints (`data-cols-sm`, `data-cols-md`)
- Viewport-dependent logic
- Media queries

These would contradict Grid-Pro's core philosophy.
