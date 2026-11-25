/* Edge Football - split of app.js (item 10), part: app-core.js.
   Classic script, load order: app-core.js -> app-matches.js -> app-sections.js -> app-extras.js.
   No logic changes vs app.js; keep app.js in repo as fallback. */
let DATA = {};
const SUPA_URL = 'https://ejfdqvjfzgsjtztzvhem.supabase.co/rest/v1/';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZmRxdmpmemdzanR6dHp2aGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzE3NDAsImV4cCI6MjEwMjgwNzc0MH0.YD0-kgvHlRIPbJMulwv6PKhxKz9frzeT5m4QGYRGBA4';
let supa = null;
try {
  if (window.supabase && SUPA_URL.includes('supabase.co')) {
    supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  }
} catch (e) {}
let MATCHES = [];

/* ===== 🧭 التنقل + روابط الأقسام (hash) ===== */
function go(id, btn) { navigateTo([id], btn); }

function goMulti(ids, btn) { navigateTo(ids, btn); }

function applySections(ids) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  ids.forEach(id => {
    const el = document.getElementById('sec-' + id);
    if (el) el.style.display = 'block';
  });
  window.scrollTo(0, 0);
}

function setActiveNav(ids) {
  const multiKey = "['" + ids.join("','") + "']";
  document.querySelectorAll('.nav-btn').forEach(b => {
    const oc = b.getAttribute('onclick') || '';
    b.classList.remove('active');
    if (ids.length === 1 && oc.indexOf("go('" + ids[0] + "'") > -1) b.classList.add('active');
    if (ids.length > 1 && oc.indexOf(multiKey) > -1) b.classList.add('active');
  });
}

function parseHash() {
  const h = (location.hash || '').replace(/^#/, '').trim();
  if (!h) return null;
  const ids = h.split(',').map(s => s.trim()).filter(id => document.getElementById('sec-' + id));
  return ids.length ? ids : null;
}

let _curKey = 'home';

function navigateTo(ids, btn, fromHash) {
  const key = ids.join(',');
  if (key === _curKey && !btn) return;
  _curKey = key;
  applySections(ids);
  if (btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    setActiveNav(ids);
  }
  if (!fromHash && location.hash !== '#' + key) location.hash = key;
}

window.addEventListener('hashchange', function () {
  const ids = parseHash();
  if (ids) navigateTo(ids, null, true);
});

(function () {
  const ids = parseHash();
  if (ids && ids.join(',') !== 'home') navigateTo(ids, null, true);
})();

/* ===== ⌨️ Esc + الضغط على الخلفية يقفلوا المودالات ===== */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  const tm = document.getElementById('teamModal');
  const mm = document.getElementById('matchModal');
  if (mm && mm.style.display === 'block') { closeMatch(); return; }
  if (tm && tm.style.display === 'block') { closeTeam(); return; }
  const gs = document.getElementById('globalResults');
  if (gs) gs.innerHTML = '';
});

document.addEventListener('click', function (e) {
  if (e.target && e.target.id === 'teamModal') closeTeam();
  if (e.target && e.target.id === 'matchModal') closeMatch();
});

(function () {
  const mm = document.getElementById('matchModal');
  if (mm) mm.style.display = 'none';
})();

function teamLogo(src) {
  if (!src) return '';
  return `<img loading="lazy" class="t-logo" src="${src}" onerror="this.style.display='none'">`;
}

function esc(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

document.addEventListener('click', function (e) {
  const teamEl = e.target.closest('[data-team]');
  if (teamEl) {
    const parts = teamEl.getAttribute('data-team').split('|');
    showTeam(parts[0], parts[1], parts[2] || '');
    return;
  }
  const matchEl = e.target.closest('[data-match]');
  if (matchEl) {
    const parts = matchEl.getAttribute('data-match').split('|');
    if (parts[0] && parts[0] !== 'undefined') showMatch(parts[1], parts[0], parts[2] || 'مباراة');
  }
});

(function () {
  if (!document.getElementById('teamModal')) {
    const b = document.createElement('div');
    b.id = 'teamModal';
    b.innerHTML = '<div><div style="display:flex;justify-content:space-between;font-weight:bold;color:#fbbf24;font-size:1.2em;margin-bottom:12px;"><span id="teamModalTitle"></span><button onclick="closeTeam()" style="background:none;border:none;color:#ef4444;font-size:1.3em;cursor:pointer;">✖</button></div><div id="teamModalBody"></div></div>';
    document.body.appendChild(b);
  }
  if (!document.getElementById('matchModal')) {
    const b = document.createElement('div');
    b.id = 'matchModal';
    b.innerHTML = '<div><div style="display:flex;justify-content:space-between;font-weight:bold;color:#fbbf24;font-size:1.2em;margin-bottom:12px;"><span id="matchModalTitle"></span><button onclick="closeMatch()" style="background:none;border:none;color:#ef4444;font-size:1.3em;cursor:pointer;">✖</button></div><div id="matchModalBody"></div></div>';
    document.body.appendChild(b);
  }
})();


/* ===== 📤 مشاركة أصلية (Web Share) مع رجوع للنسخ ===== */
function edgeShare(title, text, url) {
  const u = url || location.href;
  if (text && text.indexOf('#EDGE') === -1) text = text + ' #EDGE';
  if (navigator.share) { navigator.share({ title: title || document.title, text: text || '', url: u }).catch(function(){}); return; }
  const full = (text ? text + '\n' : '') + u;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(full).then(function(){ edgeToast('تم نسخ الرابط ✅'); }).catch(function(){ window.prompt('انسخ الرابط:', full); });
  } else { window.prompt('انسخ الرابط:', full); }
}
function edgeToast(msg) {
  let t = document.getElementById('edgeToast');
  if (!t) {
    t = document.createElement('div'); t.id = 'edgeToast';
    t.style.cssText = 'display:none;position:fixed;bottom:96px;right:50%;transform:translateX(50%);background:#16213a;color:#fbbf24;border:1px solid #fbbf24;padding:8px 16px;border-radius:20px;font-size:.85em;z-index:9999;';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(function(){ t.style.display = 'none'; }, 1800);
}
function edgeShareBtn(title, text, url) {
  return `<button type="button" class="edge-share" onclick="event.stopPropagation();edgeShare(this.dataset.t,this.dataset.x,this.dataset.u)" data-t="${esc(title||'')}" data-x="${esc(text||'')}" data-u="${esc(url||location.href)}" style="background:none;border:1px solid #334155;border-radius:8px;color:#fbbf24;font-size:.78em;padding:2px 8px;cursor:pointer;font-family:inherit;">📤 شارك</button>`;
}

/* ===== تنسيق طابع زمني "YYYY-MM-DD HH:MM AM/PM" (بتوقيت القاهرة) بصيغة عربية واضحة ===== */
function fmtStamp(s) {
  const p = (s || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) (AM|PM)$/);
  if (!p) return esc(s || '');
  const hh = (+p[4]) % 12 + (p[6] === 'PM' ? 12 : 0);
  // The stamp is Cairo wall time. Convert wall -> instant using the real Cairo
  // offset at that moment (handles DST), never the visitor's locale.
  const target = Date.UTC(+p[1], +p[2] - 1, +p[3], hh, +p[5]);
  let guess = target - 2 * 3600 * 1000;
  const cairo = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  for (let i = 0; i < 3; i++) {
    const o = {};
    cairo.formatToParts(new Date(guess)).forEach(x => { o[x.type] = x.value; });
    const wall = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute);
    const diff = target - wall;
    if (!diff) break;
    guess += diff;
  }
  return new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(guess));
}

