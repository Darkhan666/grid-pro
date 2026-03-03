# Grid-Pro

**Base-10 proportional layout — no media queries, no breakpoints.**

[![npm version](https://img.shields.io/npm/v/grid-pro)](https://www.npmjs.com/package/grid-pro)
[![license](https://img.shields.io/npm/l/grid-pro)](LICENSE)

## The problem

CSS Grid's `auto-fit` / `minmax` gives you equal-width columns, but no proportional control.
You can't say "this column should be twice as wide as that one" without writing custom CSS for every layout.
And media queries force you to think in viewport widths, not container widths.

**Grid-Pro** fixes both: write a single class like `grid-2-6-2`, and the engine creates a base-10 proportional grid where each weight unit equals 10% of the container. When weights exceed 10 per row (100%), children wrap to the next line — no breakpoints needed.

## Live Demo

👉 [https://grid-pro.pointpsd.fr](https://grid-pro.pointpsd.fr/)


## Installation

### CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/grid-pro@3.2.0/dist/grid-pro.min.css">
<script src="https://cdn.jsdelivr.net/npm/grid-pro@3.2.0/dist/grid-pro.min.js"></script>
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

## Usage in 30 seconds

```html
<div class="grid-2-6-2">
    <div>Sidebar</div>
    <div>Main content</div>
    <div>Sidebar</div>
</div>
```

The numbers are **weights on a base-10 scale**: each unit = 10% of the container width. `grid-2-6-2` means 20% + 60% + 20% = 100% of the row. When the sum exceeds 10, children wrap to the next line.

More examples:

| Class | Layout | Width |
|-------|--------|-------|
| `grid-5-5` | 2 equal columns | 50% + 50% |
| `grid-3-7` | 2 columns | 30% + 70% |
| `grid-3-4-3` | 3 columns | 30% + 40% + 30% |
| `grid-2-6-2` | 3 columns (sidebar) | 20% + 60% + 20% |
| `grid-1-2-4-2-1` | 5 columns (pyramid) | 10% + 20% + 40% + 20% + 10% |
| `grid-1-2-7` | 3 columns | 10% + 20% + 70% |

### Row wrapping

When weights exceed 10 (100%) per row, extra children wrap automatically:

```html
<div class="grid-1-2-7-3">
    <div>10%</div>   <!-- Row 1 -->
    <div>20%</div>   <!-- Row 1 -->
    <div>70%</div>   <!-- Row 1 (sum = 10) -->
    <div>30%</div>   <!-- Row 2 (wraps) -->
</div>
```

## API Reference

### CSS classes

#### Grid layout
Add `grid-X-Y-Z` on a container (X, Y, Z are positive integers, each unit = 10%).

#### Gap system

| Class | Gap |
|-------|-----|
| `gap-0` to `gap-7` | 0px, 4px, 8px, 16px, 24px, 32px, 48px, 64px |
| `gap-x-0` to `gap-x-7` | Horizontal gap override |
| `gap-y-0` to `gap-y-7` | Vertical gap override |

You can also set gaps via CSS custom properties:

```css
.my-grid { --gridpro-gap: 20px; }
.my-grid { --gridpro-gap-x: 10px; --gridpro-gap-y: 30px; }
```

### JavaScript API

#### `GridPro.init(el, options?)`

Attaches observers and applies the grid. Call this for elements added after page load.

```js
const el = document.getElementById('my-grid');
GridPro.init(el, {
    debounce: 150,      // resize debounce in ms (default: 80)
    autoObserve: true   // attach ResizeObserver + MutationObserver (default: true)
});
```

#### `GridPro.apply(el)`

Recalculates and applies the grid without re-attaching observers.

### `gridpro:applied` event

Dispatched on the container after every layout change.

```js
el.addEventListener('gridpro:applied', function (e) {
    console.log(e.detail.columns);   // number of first-row columns
    console.log(e.detail.template);  // e.g. "2fr 6fr 2fr" (first-row weights)
    console.log(e.detail.collapsed); // always false (no responsive collapse)
});
```

## Masonry mode

Add the `gridpro-masonry` class to enable vertical packing:

```html
<div class="grid-3-4-3 gridpro-masonry">
    <div>Short content</div>
    <div>Much longer content that takes more vertical space...</div>
    <div>Medium content</div>
</div>
```

Items will stack vertically to fill gaps, like a Pinterest layout.

**Limitations:** Masonry relies on measuring element heights via `getBoundingClientRect()`. Images should have explicit dimensions or be fully loaded before `apply()` runs.

## No-JS fallback

If JavaScript fails to load, Grid-Pro's CSS provides a graceful fallback using `repeat(auto-fit, minmax(120px, 1fr))`. The layout won't be proportional, but it won't collapse to a single column either.

## Browser compatibility

Grid-Pro works in all modern browsers that support CSS Grid, ResizeObserver, and MutationObserver:

- Chrome 64+
- Firefox 69+
- Safari 13.1+
- Edge 79+

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build and test instructions.

## License

[MIT](LICENSE)
