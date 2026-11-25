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
  return `<img class="t-logo" src="${src}" onerror="this.style.display='none'">`;
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

