/* ===================================
   GRID-PRO ENGINE v3.5.1 — ESM Module
   Base-10 proportional grid + masonry
   =================================== */

var DEBOUNCE_MS = 80;
var MASONRY_ROW_PX = 4;
var MOBILE_BP = 768;
var GRID_REGEX = /^grid-(\d+(-\d+)*)$/;

/* ---------- Global options ---------- */

var _globalOptions = {};

export function configure(options) {
    _globalOptions = options || {};
    if (_globalOptions.debounce) DEBOUNCE_MS = _globalOptions.debounce;
    if (_globalOptions.mobileBreakpoint) MOBILE_BP = _globalOptions.mobileBreakpoint;
    if (_globalOptions.masonryBaseRow) MASONRY_ROW_PX = _globalOptions.masonryBaseRow;
}

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
    var baseRow = (el._gridproOptions && el._gridproOptions.masonryBaseRow)
        ? el._gridproOptions.masonryBaseRow
        : MASONRY_ROW_PX;
    var gapY = getGapPx(el, "--gridpro-gap-y");
    el.style.gridAutoRows = baseRow + "px";

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
            var rowSpan = Math.ceil((heights[i] + gapY) / baseRow);
            items[i].style.gridRowEnd = "span " + rowSpan;
        }
    });
}

/* ---------- Apply (core) ---------- */

export function apply(el) {
    var weights = parseGridClass(el);
    if (!weights) return;

    /* TASK-01: Retry for hidden containers */
    if (el.clientWidth === 0) {
        if (!el._gridproRetryPending) {
            el._gridproRetryPending = true;
            var retryCount = 0;
            function retry() {
                el._gridproRetryPending = false;
                if (el.clientWidth > 0) {
                    apply(el);
                } else if (retryCount < 10) {
                    retryCount++;
                    el._gridproRetryPending = true;
                    requestAnimationFrame(retry);
                }
            }
            requestAnimationFrame(retry);
        }
        return;
    }

    /* TASK-04: Migration opt-in with warning */
    if (!el._gridproMigrated) {
        var hasRows = false;
        var children = el.children;
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList.contains("gridpro-row")) { hasRows = true; break; }
        }
        if (hasRows) {
            var opts = el._gridproOptions || {};
            if (opts.migrateLegacyRows !== false) {
                console.warn('[GridPro] Migration automatique des .gridpro-row détectée. ' +
                    'Les event listeners directs sur ces éléments peuvent être perdus. ' +
                    'Passez { migrateLegacyRows: false } pour désactiver.');
                var flat = [];
                for (var i = 0; i < children.length; i++) {
                    if (children[i].classList.contains("gridpro-row")) {
                        var inner = children[i].children;
                        for (var j = 0; j < inner.length; j++) flat.push(inner[j]);
                    } else {
                        flat.push(children[i]);
                    }
                }
                while (el.firstChild) el.removeChild(el.firstChild);
                for (var i = 0; i < flat.length; i++) el.appendChild(flat[i]);
            }
        }
        el._gridproMigrated = true;
    }

    var items = [];
    for (var i = 0; i < el.children.length; i++) items.push(el.children[i]);
    if (items.length === 0) return;

    /* Mobile detection (container width + real device screen) */
    var isMobile = el.clientWidth < MOBILE_BP ||
        (typeof screen !== "undefined" && screen.width < MOBILE_BP && screen.width > 0);

    /* TASK-03: Enhanced signature with masonry + gap */
    var gapVal = getGapPx(el, "--gridpro-gap");
    var isMasonry = el.classList.contains("gridpro-masonry") ? ":mas" : "";
    var sig = weights.join("-") + ":" + items.length + (isMobile ? ":m" : "") + isMasonry + ":g" + gapVal;
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

    /* TASK-09: Force mode via class or auto-detect */
    var forceRatio = el.classList.contains("gridpro-ratio");
    var forceBase10 = el.classList.contains("gridpro-base10");

    var useRatioMode;
    if (forceRatio) {
        useRatioMode = true;
    } else if (forceBase10) {
        useRatioMode = false;
    } else {
        useRatioMode = (sum < 10);
        if (sum >= 8 && sum <= 11 && !el._gridproModeWarned) {
            console.info('[GridPro] Mode auto détecté pour sum=' + sum +
                '. Ajoutez .gridpro-ratio ou .gridpro-base10 pour forcer le mode.');
            el._gridproModeWarned = true;
        }
    }

    var firstRowCols;
    var template;

    if (useRatioMode) {
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

    /* TASK-05/06: Masonry / Equal-height (opt-in) / Default */
    if (el.classList.contains("gridpro-masonry")) {
        applyMasonry(el);
    } else {
        el.style.gridAutoRows = "";
        for (var i = 0; i < items.length; i++) {
            items[i].style.gridRowEnd = "";
        }
        var equalHeight = el.classList.contains("gridpro-equal-height") ||
            (el._gridproOptions && el._gridproOptions.equalHeight);
        if (equalHeight) {
            var maxH = 0;
            for (var i = 0; i < items.length; i++) {
                var h = items[i].getBoundingClientRect().height;
                if (h > maxH) maxH = h;
            }
            if (maxH > 0) {
                el.style.gridAutoRows = maxH + "px";
            }
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

export function init(el, options) {
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
        el._gridproRO = ro;

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
        el._gridproMO = mo;
    }

    apply(el);
}

/* ---------- TASK-07: destroy / refresh / initAll ---------- */

export function destroy(el) {
    if (!el._gridproInit) return;

    if (el._gridproRO) { el._gridproRO.disconnect(); el._gridproRO = null; }
    if (el._gridproMO) { el._gridproMO.disconnect(); el._gridproMO = null; }
    if (el._gridproMasonryRaf) { cancelAnimationFrame(el._gridproMasonryRaf); }

    el.style.gridTemplateColumns = "";
    el.style.gridAutoRows = "";
    var items = el.children;
    for (var i = 0; i < items.length; i++) {
        items[i].style.gridColumn = "";
        items[i].style.gridRowEnd = "";
    }

    el.classList.remove("gridpro-active");
    el._gridproInit = false;
    el._gridproSig = null;
    el._gridproMigrated = false;

    el.dispatchEvent(new CustomEvent('gridpro:destroyed', { bubbles: true }));
}

export function refresh(el) {
    el._gridproSig = null;
    apply(el);
}

export function initAll(root, options) {
    var scope = root || document;
    var all = scope.querySelectorAll('[class^="grid-"], [class*=" grid-"]');
    for (var i = 0; i < all.length; i++) {
        if (parseGridClass(all[i])) {
            init(all[i], options);
        }
    }
}

export default { apply, init, destroy, refresh, initAll, configure };
