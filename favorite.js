/* Edge Football - favorite team (item 23).
   The choice lives only on the visitor's device (localStorage), no account and no tracking.
   The favorite team's matches and news float to the top of the home and matches lists. */
(function () {
  var FAV_KEY = 'edgeFavTeam';

  function getFav() {
    try { return localStorage.getItem(FAV_KEY) || ''; } catch (e) { return ''; }
  }
  function setFav(v) {
    try {
      if (v) localStorage.setItem(FAV_KEY, v); else localStorage.removeItem(FAV_KEY);
    } catch (e) {}
  }

  /* Both Arabic and Latin spellings of the favorite, using the site's own name maps. */
  function favAliases(name) {
    var out = [name];
    try {
      if (typeof AR2EN === 'object' && AR2EN[name]) out.push(AR2EN[name]);
      if (typeof e2aMap === 'function') {
        var ar = e2aMap()[(name || '').toLowerCase()];
        if (ar && out.indexOf(ar) === -1) out.push(ar);
      }
    } catch (e) {}
    return out;
  }

  function collectTeams() {
    var seen = {}, list = [];
    function add(n) {
      n = (n || '').trim();
      if (n && !seen[n]) { seen[n] = 1; list.push(n); }
    }
    var tables = (typeof DATA === 'object' && DATA && DATA.tables) || {};
    Object.keys(tables).forEach(function (lg) {
      (tables[lg] || []).forEach(function (r) { if (r) add(r.team || r.name); });
    });
    var e2a = {};
    try { if (typeof e2aMap === 'function') e2a = e2aMap(); } catch (e) {}
    (typeof MATCHES !== 'undefined' ? MATCHES : []).forEach(function (g) {
      (g.items || []).forEach(function (m) {
        [m.home, m.away].forEach(function (n) {
          var ar = e2a[(n || '').toLowerCase()];
          if (ar && seen[ar]) return; /* already listed under its Arabic name */
          add(n);
        });
      });
    });
    list.sort(function (a, b) { return a.localeCompare(b, 'ar'); });
    return list;
  }

  function floatFirst(container, selector) {
    var fav = getFav();
    if (!fav || !container) return 0;
    var aliases = favAliases(fav);
    var byParent = new Map();
    Array.prototype.forEach.call(container.querySelectorAll(selector), function (el) {
      var t = el.textContent || '';
      var hit = aliases.some(function (a) { return a && t.indexOf(a) !== -1; });
      if (hit) {
        var p = el.parentElement;
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(el);
      }
    });
    var n = 0;
    byParent.forEach(function (els, p) {
      var set = new Set(els);
      var ref = null;
      for (var c = p.firstElementChild; c; c = c.nextElementSibling) {
        if (!set.has(c) && !c.classList.contains('live-title')) { ref = c; break; }
      }
      els.forEach(function (el) { p.insertBefore(el, ref); n++; });
    });
    return n;
  }

  function ensurePicker() {
    var sec = document.getElementById('sec-home');
    if (!sec) return;
    var bar = document.getElementById('favBar');
    if (bar) {
      var sel0 = document.getElementById('favSelect');
      if (sel0 && sel0.options.length <= 1 && collectTeams().length) fillOptions(sel0);
      return;
    }
    bar = document.createElement('div');
    bar.id = 'favBar';
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;background:#1e293b;border:1px solid #fbbf24;border-radius:12px;padding:8px 12px;margin:0 0 12px;font-size:.9em;';
    var label = document.createElement('span');
    label.style.cssText = 'color:#fbbf24;font-weight:bold;white-space:nowrap;';
    label.textContent = '⭐ فريقك المفضل';
    var sel = document.createElement('select');
    sel.id = 'favSelect';
    sel.setAttribute('aria-label', 'اختار فريقك المفضل');
    sel.style.cssText = 'flex:1;min-width:0;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:6px;font-family:inherit;';
    fillOptions(sel);
    sel.addEventListener('change', function () {
      setFav(sel.value);
      applyFav();
      if (typeof edgeToast === 'function') {
        edgeToast(sel.value ? ('تمام! ' + sel.value + ' فريقك ⭐') : 'اتشال الفريق المفضل');
      }
    });
    bar.appendChild(label);
    bar.appendChild(sel);
    sec.insertBefore(bar, sec.firstElementChild);
  }

  function fillOptions(sel) {
    var cur = getFav();
    sel.innerHTML = '<option value="">اختار فريقك...</option>';
    collectTeams().forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  function applyFav() {
    ensurePicker();
    floatFirst(document.getElementById('homeMatches'), '.edge-mcard');
    floatFirst(document.getElementById('matchesContainer'), '.live-card');
    floatFirst(document.getElementById('newsContainer'), '.news-card');
  }

  /* Re-apply after every render of the three lists, however it was triggered. */
  ['renderHomeMatches', 'renderMatches', 'renderEditorialNews'].forEach(function (fn) {
    if (typeof window[fn] === 'function') {
      var orig = window[fn];
      window[fn] = function () {
        var r = orig.apply(this, arguments);
        applyFav();
        return r;
      };
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(applyFav, 800); });
  } else {
    setTimeout(applyFav, 800);
  }
})();
