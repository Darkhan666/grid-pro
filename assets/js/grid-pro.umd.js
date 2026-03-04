/* ===================================
   GRID-PRO ENGINE v3.4 — UMD Module
   Hybrid proportional grid + masonry
   =================================== */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GridPro = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
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

    /* ---------- Masonry ---------- */

    function applyMasonry(el) {
        var gapY = getGapPx(el, "--gridpro-gap-y");
        el.style.gridAutoRows = MASONRY_ROW_PX + "px";

        if (el._gridproMasonryRaf) {
            cancelAnimationFrame(el._gridproMasonryRaf);
        }

        el._gridproMasonryRaf = requestAnimationFrame(function () {
            el._gridproMasonryRaf = null;
            var items = el.children;
            for (var i = 0; i < items.length; i++) {
                items[i].style.gridRowEnd = "";
            }
            var heights = [];
            for (var i = 0; i < items.length; i++) {
                heights.push(items[i].getBoundingClientRect().height);
            }
            for (var i = 0; i < items.length; i++) {
                var rowSpan = Math.ceil((heights[i] + gapY) / MASONRY_ROW_PX);
                items[i].style.gridRowEnd = "span " + rowSpan;
            }
        });
    }

    /* ---------- Apply (core) ---------- */

    function apply(el) {
        var weights = parseGridClass(el);
        if (!weights) return;

        if (el.offsetParent === null || el.clientWidth === 0) return;

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

        var items = [];
        for (var i = 0; i < el.children.length; i++) items.push(el.children[i]);
        if (items.length === 0) return;

        /* Mobile detection (container width) */
        var isMobile = el.clientWidth < MOBILE_BP;

        /* Signature: weights + child count + mobile state */
        var sig = weights.join("-") + ":" + items.length + (isMobile ? ":m" : "");
        if (el._gridproSig === sig) return;
        el._gridproSig = sig;

        el.classList.add("gridpro-active");

        /* Mobile: single column, skip masonry */
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

        /* Calculate weight sum to determine grid mode */
        var sum = 0;
        for (var i = 0; i < weights.length; i++) sum += weights[i];

        var firstRowCols;
        var template;

        if (sum < 10) {
            /* Ratio mode: weights become fr units, fill 100% */
            var templateParts = [];
            for (var i = 0; i < weights.length; i++) {
                templateParts.push(weights[i] + "fr");
            }
            template = templateParts.join(" ");
            el.style.gridTemplateColumns = template;
            firstRowCols = weights.length;

            for (var i = 0; i < items.length; i++) {
                items[i].style.gridColumn = "auto";
            }
        } else {
            /* Base-10 grid: each weight unit = 10% of the row (max 10 per row) */
            el.style.gridTemplateColumns = "repeat(10, 1fr)";

            var rowSum = 0;
            firstRowCols = 0;
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

            var templateParts = [];
            for (var j = 0; j < firstRowWeights.length; j++) {
                templateParts.push(firstRowWeights[j] + "fr");
            }
            template = templateParts.join(" ");
        }

        /* Masonry / Equal-height rows */
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

        /* Dispatch custom event */
        el.dispatchEvent(new CustomEvent('gridpro:applied', {
            bubbles: true,
            detail: {
                columns: firstRowCols,
                template: template,
                collapsed: false
            }
        }));
    }

    /* ---------- Init (observers) ---------- */

    function init(el, options) {
        if (el._gridproInit) return;
        el._gridproInit = true;

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

        apply(el);
    }

    return {
        apply: apply,
        init: init
    };
}));
