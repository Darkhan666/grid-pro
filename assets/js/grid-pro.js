/* ===================================
   GRID-PRO ENGINE v3.3
   Base-10 proportional grid + masonry
   =================================== */
(function () {
    "use strict";

    var DEBOUNCE_MS = 80;
    var MASONRY_ROW_PX = 1;
    var MOBILE_BP = 768;
    var GRID_REGEX = /^grid-(\d+(-\d+)*)$/;

    /* ---------- Helpers ---------- */

    function parseGridClass(el) {
        var classes = el.classList;
        for (var i = 0; i < classes.length; i++) {
            var cls = classes[i];
            var m = cls.match(GRID_REGEX);
            if (m) {
                var parts = m[1].split("-");
                var weights = [];
                for (var j = 0; j < parts.length; j++) {
                    var v = parseInt(parts[j], 10);
                    if (v > 0) weights.push(v);
                }
                if (weights.length) return weights;
            } else if (cls.indexOf("grid-") === 0 && !el._gridproWarned) {
                /* 1.5: Warn about invalid grid- classes */
                console.warn('[GridPro] Classe ignorée (format invalide) : "' + cls + '". Format attendu : grid-2-6-2');
                el._gridproWarned = true;
            }
        }
        return null;
    }

    function getGapPx(el, prop) {
        var style = getComputedStyle(el);
        var val = style.getPropertyValue(prop);
        if (!val || val === "initial" || val.trim() === "") {
            val = style.getPropertyValue("--gridpro-gap");
        }
        return parseFloat(val) || 12;
    }

    /* ---------- Apply (core) ---------- */

    function apply(el) {
        var weights = parseGridClass(el);
        if (!weights) return;

        /* 1.2: Guard on invisible containers */
        if (el.offsetParent === null || el.clientWidth === 0) return;

        /* 1.4: Unwrap legacy .gridpro-row wrappers (v2→v3 migration) — once only */
        if (!el._gridproMigrated) {
            var hasRows = false;
            var children = el.children;
            for (var i = 0; i < children.length; i++) {
                if (children[i].classList.contains("gridpro-row")) {
                    hasRows = true;
                    break;
                }
            }
            if (hasRows) {
                var flat = [];
                for (var i = 0; i < children.length; i++) {
                    if (children[i].classList.contains("gridpro-row")) {
                        var inner = children[i].children;
                        for (var j = 0; j < inner.length; j++) {
                            flat.push(inner[j]);
                        }
                    } else {
                        flat.push(children[i]);
                    }
                }
                var frag = document.createDocumentFragment();
                for (var i = 0; i < flat.length; i++) frag.appendChild(flat[i]);
                el.replaceChildren(frag);
            }
            el._gridproMigrated = true;
        }

        /* Collect direct children */
        var items = [];
        for (var i = 0; i < el.children.length; i++) items.push(el.children[i]);
        if (items.length === 0) return;

        /* 2. Mobile detection (container width) */
        var isMobile = el.clientWidth < MOBILE_BP;

        /* 3. Signature: weights + child count + mobile state */
        var sig = weights.join("-") + ":" + items.length + (isMobile ? ":m" : "");
        if (el._gridproSig === sig) return;
        el._gridproSig = sig;

        el.classList.add("gridpro-active");

        /* 4. Mobile: single column, skip masonry */
        if (isMobile) {
            el.style.gridTemplateColumns = "1fr";
            el.style.gridAutoRows = "auto";
            for (var i = 0; i < items.length; i++) {
                items[i].style.gridColumn = "";
                items[i].style.gridRowEnd = "";
            }
            el.dispatchEvent(new CustomEvent('gridpro:applied', {
                bubbles: true,
                detail: { columns: 1, template: "1fr", collapsed: true }
            }));
            return;
        }

        /* 5. Base-10 grid: each weight unit = 10% of the row (max 10 per row) */
        el.style.gridTemplateColumns = "repeat(10, 1fr)";

        /* 6. Assign column span to each child (cycling weights) */
        var rowSum = 0;
        var firstRowCols = 0;
        var firstRowDone = false;
        var firstRowWeights = [];

        for (var i = 0; i < items.length; i++) {
            var w = weights[i % weights.length];
            if (w > 10) w = 10;
            items[i].style.gridColumn = "span " + w;
            if (!firstRowDone) {
                if (rowSum + w <= 10) {
                    rowSum += w;
                    firstRowCols++;
                    firstRowWeights.push(w);
                } else {
                    firstRowDone = true;
                }
            }
        }

        /* 7. Build template string for event (first row) */
        var templateParts = [];
        for (var j = 0; j < firstRowWeights.length; j++) {
            templateParts.push(firstRowWeights[j] + "fr");
        }
        var template = templateParts.join(" ");

        /* 8. Masonry / Equal-height rows */
        if (el.classList.contains("gridpro-masonry")) {
            applyMasonry(el);
        } else {
            el.style.gridAutoRows = "";
            for (var i = 0; i < items.length; i++) {
                items[i].style.gridRowEnd = "";
            }
            var maxH = 0;
            for (var i = 0; i < items.length; i++) {
                var h = items[i].getBoundingClientRect().height;
                if (h > maxH) maxH = h;
            }
            if (maxH > 0) {
                el.style.gridAutoRows = maxH + "px";
            }
        }

        /* 9. Dispatch custom event */
        el.dispatchEvent(new CustomEvent('gridpro:applied', {
            bubbles: true,
            detail: {
                columns: firstRowCols,
                template: template,
                collapsed: false
            }
        }));
    }

    /* ---------- Masonry ---------- */

    /* 1.3: Batched DOM operations in a single rAF (no intermediate repaint) */
    function applyMasonry(el) {
        var gapY = getGapPx(el, "--gridpro-gap-y");
        el.style.gridAutoRows = MASONRY_ROW_PX + "px";

        /* Cancel any pending masonry pass to avoid overlapping cycles */
        if (el._gridproMasonryRaf) {
            cancelAnimationFrame(el._gridproMasonryRaf);
        }

        el._gridproMasonryRaf = requestAnimationFrame(function () {
            el._gridproMasonryRaf = null;
            var items = el.children;
            /* Batch write: reset all spans */
            for (var i = 0; i < items.length; i++) {
                items[i].style.gridRowEnd = "";
            }
            /* Batch read: measure all heights (forces one synchronous layout) */
            var heights = [];
            for (var i = 0; i < items.length; i++) {
                heights.push(items[i].getBoundingClientRect().height);
            }
            /* Batch write: apply all spans — before browser paints */
            for (var i = 0; i < items.length; i++) {
                var rowSpan = Math.ceil((heights[i] + gapY) / MASONRY_ROW_PX);
                items[i].style.gridRowEnd = "span " + rowSpan;
            }
        });
    }

    /* ---------- Init (observers) ---------- */

    /* 2.1: Accept options parameter */
    function init(el, options) {
        if (el._gridproInit) return;
        el._gridproInit = true;

        /* Store options on element */
        if (options) {
            el._gridproOptions = options;
        }

        var opts = el._gridproOptions;
        var debounceMs = (opts && opts.debounce) ? opts.debounce : DEBOUNCE_MS;
        var autoObserve = (!opts || typeof opts.autoObserve === "undefined") ? true : opts.autoObserve;

        var debounceTimer = null;

        function debouncedApply() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                apply(el);
            }, debounceMs);
        }

        if (autoObserve) {
            /* ResizeObserver with debounce */
            var lastWidth = 0;
            var ro = new ResizeObserver(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var w = entries[i].contentRect.width;
                    if (w !== lastWidth && w > 0) {
                        lastWidth = w;
                        debouncedApply();
                    }
                }
            });
            ro.observe(el);

            /* MutationObserver on childList + class attribute changes */
            var mo = new MutationObserver(function (mutations) {
                var needsApply = false;
                for (var i = 0; i < mutations.length; i++) {
                    var mut = mutations[i];
                    if (mut.type === "childList") {
                        needsApply = true;
                        break;
                    }
                    if (mut.type === "attributes" && mut.attributeName === "class") {
                        needsApply = true;
                        break;
                    }
                }
                if (needsApply) {
                    el._gridproSig = null;
                    debouncedApply();
                }
            });
            mo.observe(el, { childList: true, attributes: true, attributeFilter: ["class"] });
        }

        /* First apply */
        apply(el);
    }

    /* ---------- Auto-init ---------- */

    /* 1.1: Targeted querySelectorAll — only scan elements with grid- in class */
    function autoInit() {
        var all = document.querySelectorAll('[class*="grid-"]');
        for (var i = 0; i < all.length; i++) {
            if (parseGridClass(all[i])) {
                init(all[i]);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoInit);
    } else {
        autoInit();
    }

    /* ---------- Public API ---------- */

    window.GridPro = {
        apply: apply,
        init: init
    };

})();
