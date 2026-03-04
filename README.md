# Grid-Pro

**Hybrid proportional layout engine — no media queries, no breakpoints.**

[![npm version](https://img.shields.io/npm/v/grid-pro)](https://www.npmjs.com/package/grid-pro)
[![license](https://img.shields.io/npm/l/grid-pro)](LICENSE)

## The problem

CSS Grid's `auto-fit` / `minmax` gives you equal-width columns, but no proportional control.
You can't say "this column should be twice as wide as that one" without writing custom CSS for every layout.
And media queries force you to think in viewport widths, not container widths.

**Grid-Pro** fixes both: write a single class like `grid-2-6-2`, and the engine automatically chooses the best grid strategy based on the sum of your weights. Columns always fill 100% of the container — no breakpoints needed.

## Live Demo

👉 [https://grid-pro.pointpsd.fr](https://grid-pro.pointpsd.fr/)

---

## Installation

### CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/grid-pro@3.4.0/dist/grid-pro.min.css">
<script src="https://cdn.jsdelivr.net/npm/grid-pro@3.4.0/dist/grid-pro.min.js"></script>
```

### npm

```bash
npm install grid-pro
```

```js
import GridPro from 'grid-pro';
import 'grid-pro/css';
```

### Manual

Copy the `assets/` folder into your project and add to your `<head>`:

```html
<link rel="stylesheet" href="/assets/css/grid-pro.css">
<script src="/assets/js/grid-pro.js"></script>
```

---

## Usage in 30 seconds

```html
<div class="grid-2-6-2">
    <div>Sidebar</div>
    <div>Main content</div>
    <div>Sidebar</div>
</div>
```

The numbers are **proportional weights**. Grid-Pro automatically determines the grid mode based on their sum.

---

## Hybrid grid mode

The engine applies one of two strategies depending on the sum of weights:

| Sum | Mode | Behavior |
|-----|------|----------|
| **< 10** | Ratio | Weights become CSS `fr` units, stretched to fill 100%. `grid-4-2-1` → `4fr 2fr 1fr` |
| **= 10** | Base-10 | Each unit = 10% of the row. `grid-2-6-2` → 20% + 60% + 20% |
| **> 10** | Base-10 | Same as = 10, children wrap to the next row when cumulative spans exceed 10 |

No configuration needed — the mode is determined automatically from the class name.

### Base-10 mode (sum >= 10)

The container uses `grid-template-columns: repeat(10, 1fr)`. Each child receives `grid-column: span W` where W is its weight. When cumulative spans exceed 10 on a row, excess children wrap to the next line.

```html
<!-- sum = 10 → 20% + 60% + 20% -->
<div class="grid-2-6-2">
    <div>Sidebar</div>
    <div>Main content</div>
    <div>Sidebar</div>
</div>

<!-- sum = 13 → row 1: 3+3+3=9, row 2: 4 -->
<div class="grid-3-3-3-4">
    <div>A</div>
    <div>B</div>
    <div>C</div>
    <div>D</div>
</div>
```

### Ratio mode (sum < 10)

The container uses `grid-template-columns: Xfr Yfr Zfr`. Each weight becomes a CSS `fr` unit. The row always fills 100% of the container width.

```html
<!-- sum = 7 → 4/7 + 2/7 + 1/7 = 57% + 29% + 14% -->
<div class="grid-4-2-1">
    <div>Large</div>
    <div>Medium</div>
    <div>Small</div>
</div>

<!-- sum = 3 → 2/3 + 1/3 = 67% + 33% -->
<div class="grid-2-1">
    <div>Main</div>
    <div>Side</div>
</div>
```

With more children than weights, the pattern repeats on subsequent rows:

```html
<!-- 6 children, pattern 2-1 repeats across 3 rows -->
<div class="grid-2-1">
    <div>A</div>  <!-- Row 1: 67% -->
    <div>B</div>  <!-- Row 1: 33% -->
    <div>C</div>  <!-- Row 2: 67% -->
    <div>D</div>  <!-- Row 2: 33% -->
    <div>E</div>  <!-- Row 3: 67% -->
    <div>F</div>  <!-- Row 3: 33% -->
</div>
```

### Examples

| Class | Sum | Mode | Width |
|-------|-----|------|-------|
| `grid-5-5` | 10 | Base-10 | 50% + 50% |
| `grid-3-7` | 10 | Base-10 | 30% + 70% |
| `grid-3-4-3` | 10 | Base-10 | 30% + 40% + 30% |
| `grid-2-6-2` | 10 | Base-10 | 20% + 60% + 20% |
| `grid-1-2-4-2-1` | 10 | Base-10 | 10% + 20% + 40% + 20% + 10% |
| `grid-1-2-7` | 10 | Base-10 | 10% + 20% + 70% |
| `grid-4-2-1` | 7 | Ratio | 57% + 29% + 14% |
| `grid-2-1` | 3 | Ratio | 67% + 33% |
| `grid-1-1-1-1-1` | 5 | Ratio | 20% each |
| `grid-3-2-1` | 6 | Ratio | 50% + 33% + 17% |
| `grid-3-3-3-3` | 12 | Base-10 | 3+3+3 then 3 (wraps) |

---

## Gap system

Control spacing between grid items using utility classes or CSS custom properties.

### Utility classes

| Class | Gap |
|-------|-----|
| `gap-0` | 0px |
| `gap-1` | 4px |
| `gap-2` | 8px |
| `gap-3` | 16px |
| `gap-4` | 24px |
| `gap-5` | 32px |
| `gap-6` | 48px |
| `gap-7` | 64px |

Override horizontal and vertical gaps independently:

| Class | Effect |
|-------|--------|
| `gap-x-0` to `gap-x-7` | Horizontal gap only |
| `gap-y-0` to `gap-y-7` | Vertical gap only |

```html
<!-- 48px horizontal, 4px vertical -->
<div class="grid-3-4-3 gap-x-6 gap-y-1">
    <div>A</div>
    <div>B</div>
    <div>C</div>
</div>
```

### CSS custom properties

For custom values beyond the utility classes:

```css
.my-grid {
    --gridpro-gap: 20px;
}

.my-grid-asymmetric {
    --gridpro-gap-x: 10px;
    --gridpro-gap-y: 30px;
}
```

The cascade is: `--gridpro-gap-x` / `--gridpro-gap-y` → `--gridpro-gap` → `12px` (default).

---

## Masonry mode

Add the `gridpro-masonry` class to enable vertical packing (Pinterest-style layout):

```html
<div class="grid-3-4-3 gridpro-masonry gap-2">
    <div style="min-height: 80px">Short</div>
    <div style="min-height: 200px">Tall</div>
    <div style="min-height: 120px">Medium</div>
    <div style="min-height: 150px">Tall-ish</div>
    <div style="min-height: 90px">Short</div>
    <div style="min-height: 170px">Tall</div>
</div>
```

Items stack vertically to fill gaps. The engine uses 1px micro-rows with batched DOM reads/writes inside `requestAnimationFrame` to avoid layout thrashing.

The vertical gap in masonry mode is baked into the row-span calculation — `row-gap` is set to `0` by CSS, and the `--gridpro-gap-y` value is added to each item's measured height before computing the span.

**Limitations:** Masonry relies on measuring element heights via `getBoundingClientRect()`. Images should have explicit dimensions or be fully loaded before `apply()` runs.

---

## Responsive behavior

Grid-Pro uses **container-based** responsiveness, not viewport media queries.

- **Desktop** (container >= 768px): grid layout applied normally
- **Mobile** (container < 768px): automatic single-column fallback (`1fr`), masonry disabled, all spans removed

The 768px threshold is based on `el.clientWidth`, not the viewport. A grid inside a narrow sidebar will switch to single-column even on a wide screen.

On layout change, a `gridpro:applied` event is dispatched with `detail.collapsed = true` when in mobile mode.

---

## JavaScript API

### `GridPro.init(el, options?)`

Attaches ResizeObserver + MutationObserver and applies the grid. Call this for elements added dynamically after page load.

```js
const el = document.getElementById('my-grid');
GridPro.init(el, {
    debounce: 150,      // resize debounce in ms (default: 80)
    autoObserve: true   // attach observers (default: true)
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounce` | number | 80 | Delay in ms before re-applying after resize/mutation |
| `autoObserve` | boolean | true | Attach ResizeObserver and MutationObserver |

Elements present in the DOM at page load are initialized automatically — no need to call `init()` manually.

### `GridPro.apply(el)`

Recalculates and applies the grid layout. Does not re-attach observers. Useful after programmatic class or content changes:

```js
el.className = 'grid-3-4-3';
el._gridproSig = null;   // invalidate signature cache
GridPro.apply(el);
```

### `gridpro:applied` event

CustomEvent dispatched on the container after every layout change. Bubbles up the DOM.

```js
el.addEventListener('gridpro:applied', function (e) {
    console.log(e.detail.columns);   // number of first-row columns
    console.log(e.detail.template);  // e.g. "2fr 6fr 2fr" or "4fr 2fr 1fr"
    console.log(e.detail.collapsed); // true when container < 768px
});
```

| Property | Type | Description |
|----------|------|-------------|
| `detail.columns` | number | Number of columns on the first row |
| `detail.template` | string | CSS template string of the first row (e.g. `"3fr 7fr"`) |
| `detail.collapsed` | boolean | `true` when the container is in mobile single-column mode |

---

## Signature diffing

Grid-Pro stores a signature on each element (`el._gridproSig`) combining the weights, child count, and mobile state. If the signature hasn't changed, `apply()` returns immediately — no DOM reads or writes. This makes it safe to call `apply()` frequently without performance concerns.

---

## v2 to v3 migration

Grid-Pro v3 automatically detects and unwraps legacy `.gridpro-row` wrapper elements from v2 layouts. This migration runs once per element on first `apply()`. No manual code changes needed.

---

## No-JS fallback

If JavaScript fails to load, Grid-Pro's CSS provides a graceful fallback:

```css
[class*="grid-"]:not(.gridpro-active) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--gridpro-gap, 12px);
}
```

The layout won't be proportional, but it won't collapse to a single column either. On mobile (max-width: 767px), the fallback switches to a single column.

---

## Distribution formats

| File | Format | Auto-init | Usage |
|------|--------|-----------|-------|
| `grid-pro.js` | IIFE | Yes | `<script src="...">` — drop in, works immediately |
| `grid-pro.esm.js` | ES Module | No | `import { apply, init } from 'grid-pro'` |
| `grid-pro.umd.js` | UMD | No | `require('grid-pro')` or AMD |
| `grid-pro.css` | CSS | — | Required for all formats |

The IIFE build auto-initializes all `[class*="grid-"]` elements on `DOMContentLoaded`. The ESM and UMD builds require manual `init()` calls.

---

## Browser compatibility

Grid-Pro works in all modern browsers that support CSS Grid, ResizeObserver, and MutationObserver:

- Chrome 64+
- Firefox 69+
- Safari 13.1+
- Edge 79+

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build and test instructions.

## License

[MIT](LICENSE)
