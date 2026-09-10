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


/* ===== ⭐ مباراة القمة بعدّاد تنازلي ===== */
let _featTarget = null;
let _featTimer = null;

function countdownInner(target) {
  const diff = target - Date.now();
  if (diff <= 0) return '🎯 جارية الآن!';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const mn = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const parts = [];
  if (d > 0) parts.push('<b>' + d + '</b> يوم');
  parts.push('<b>' + pad(h) + '</b> ساعة');
  parts.push('<b>' + pad(mn) + '</b> دقيقة');
  parts.push('<b>' + pad(s) + '</b> ثانية');
  return parts.join('<span class="feat-sep">:</span>');
}

function renderFeaturedMatch() {
  const el = document.getElementById('featuredMatch');
  if (!el) return;
  const all = [];
  MATCHES.forEach(g => (g.items || []).forEach(m => all.push(Object.assign({}, m, { league: g.league, big: g.big }))));
  const live = all.filter(m => m.state === 'in');
  const upcoming = all.filter(m => m.state === 'pre');
  let m = null, mode = null;
  if (live.length) {
    m = (live.filter(x => x.big)[0] || live[0]);
    mode = 'live';
  } else {
    const bigs = upcoming.filter(x => x.big);
    const pool = bigs.length ? bigs : upcoming;
    if (pool.length) {
      pool.sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
      m = pool[0];
      mode = 'pre';
    }
  }
  if (!m) { el.innerHTML = ''; _featTarget = null; return; }
  const tag = m.eid + '|' + m.slug + '|' + m.home + ' × ' + m.away;
  if (mode === 'live') {
    _featTarget = null;
    el.innerHTML = `<div class="feat-card" data-match="${tag}">
      <div class="feat-league">🔴 ${m.league}</div>
      <div class="feat-teams">
        <div class="feat-team">${teamLogo(m.homeLogo)}<span>${m.home}</span></div>
        <div class="feat-score">${m.hs} - ${m.as}<small>${m.detail}</small></div>
        <div class="feat-team">${teamLogo(m.awayLogo)}<span>${m.away}</span></div>
      </div>
      <div class="feat-cta">🔴 مباشر الآن — اضغط لمتابعة المباراة</div>
    </div>`;
  } else {
    const target = m.date ? new Date(m.date) : null;
    const valid = target && !isNaN(target.getTime());
    _featTarget = valid ? target : null;
    el.innerHTML = `<div class="feat-card" data-match="${tag}">
      <div class="feat-league">⭐ ${m.league}</div>
      <div class="feat-teams">
        <div class="feat-team">${teamLogo(m.homeLogo)}<span>${m.home}</span></div>
        <div class="feat-vs">VS</div>
        <div class="feat-team">${teamLogo(m.awayLogo)}<span>${m.away}</span></div>
      </div>
      <div class="feat-cd">${valid ? countdownInner(target) : '🕐 ' + m.time}</div>
      <div class="feat-cta">📺 ${m.tv || 'اضغط لمتابعة المباراة'}</div>
    </div>`;
    if (valid && !_featTimer) {
      _featTimer = setInterval(function () {
        try {
          const cdEl = document.querySelector('#featuredMatch .feat-cd');
          if (cdEl && _featTarget) {
            cdEl.innerHTML = countdownInner(_featTarget);
            if (_featTarget - Date.now() <= 0) renderFeaturedMatch();
          }
        } catch (e) {}
      }, 1000);
    }
  }
}

/* ===== 🔴 النتايج اللايف — تحديث مباشر من ESPN كل دقيقة ===== */
function refreshLiveScores() {
  const liveSlugs = {};
  MATCHES.forEach(g => (g.items || []).forEach(m => {
    if (m.state === 'in') liveSlugs[m.slug] = 1;
  }));
  const slugs = Object.keys(liveSlugs);
  if (!slugs.length) return;
  Promise.all(slugs.map(slug =>
    fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/' + slug + '/scoreboard')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  )).then(results => {
    let changed = false;
    results.forEach(data => {
      if (!data || !data.events) return;
      data.events.forEach(ev => {
        try {
          const comp = ev.competitions[0];
          const comps = comp.competitors || [];
          const home = comps.find(c => c.homeAway === 'home');
          const away = comps.find(c => c.homeAway === 'away');
          const st = comp.status && comp.status.type ? comp.status.type.state : null;
          const detail = comp.status && comp.status.type ? comp.status.type.shortDetail : '';
          MATCHES.forEach(g => (g.items || []).forEach(m => {
            if (String(m.eid) === String(ev.id)) {
              if (home && away) {
                if (m.hs !== home.score || m.as !== away.score) changed = true;
                m.hs = home.score;
                m.as = away.score;
              }
              if (detail && m.detail !== detail) { m.detail = detail; changed = true; }
              if (st && m.state !== st) { m.state = st; changed = true; }
            }
          }));
        } catch (e) {}
      });
    });
    if (changed) {
      renderMatches();
      renderFeaturedMatch();
    }
  }).catch(() => {});
}
function matchRow(m) {
  let score = '';
  if (m.state === 'in') score = `<div class="m-score live">${m.hs} - ${m.as}<span class="m-status">🔴 ${m.detail}</span></div>`;
  else if (m.state === 'post') score = `<div class="m-score post">${m.hs} - ${m.as}<span class="m-status">انتهت</span></div>`;
  else score = `<div class="m-score pre">${m.time}<span class="m-status">لم تبدأ</span></div>`;
  const tvHtml = m.tv ? `<div class="tv-line">${m.tvUrl ? `<a href="${m.tvUrl}" target="_blank">📺 يُذاع عبر: ${m.tv}</a>` : `📺 ${m.tv}`}</div>` : '';
  return `<div class="match-wrap">
    <div class="match-row" style="cursor:pointer;" data-match="${m.eid}|${m.slug}|${m.home} × ${m.away}">
      <div class="m-team team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</div>
      ${score}
      <div class="m-team team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</div>
    </div>${tvHtml}
  </div>`;
}

function renderMatches() {
  const el = document.getElementById('matchesContainer');
  const liveItems = [];
  const preItems = [];
  MATCHES.forEach(g => g.items.forEach(m => {
    if (m.state === 'in') liveItems.push(Object.assign({}, m, { league: g.league }));
    if (m.state === 'pre') preItems.push(Object.assign({}, m, { league: g.league }));
  }));
  let html = '';
  if (liveItems.length) {
    html += '<div class="live-block"><div class="live-title">🔴 مباشر الآن</div>' + liveItems.map(m => `<div class="live-card"><div class="live-teams"><span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</span><span class="live-score">${m.hs} - ${m.as}</span><span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</span></div><div class="live-meta">⏱️ ${m.detail} | ${m.league}${m.tv ? ' | 📺 ' + m.tv : ''}</div></div>`).join('') + '</div>';
  }
  if (preItems.length) {
    html += '<div class="live-block" style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid #334155;"><div class="live-title" style="color:#fbbf24;animation:none;">🕐 مباريات خلال 24 ساعة</div>' + preItems.slice(0, 6).map(m => `<div class="live-card"><div class="live-teams"><span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</span><span class="live-score" style="color:#94a3b8;font-size:1.05em;">${m.time}</span><span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</span></div><div class="live-meta">🏆 ${m.league}${m.tv ? ' | 📺 ' + m.tv : ''}</div></div>`).join('') + '</div>';
  }
  html += MATCHES.map(g => {
    const items = g.items.filter(m => m.state !== 'in');
    if (!items.length) return '';
    return `<div class="league-box"><div class="league-title">🏆 ${g.league}</div>${items.map(matchRow).join('')}</div>`;
  }).join('');
  if (DATA.results && DATA.results.length) {
    html += '<h2 style="margin-top:24px;">🏁 نتائج اليوم</h2><div class="list">' + DATA.results.map(t => `<div class="result-item">🏁 ${t}</div>`).join('') + '</div>';
  }
  el.innerHTML = html || '<div class="card">لا توجد مباريات حالياً</div>';
}

function renderLeaders() {
  const c = document.getElementById('leadersContainer');
  if (!c) return;
  const L = DATA.leaders || {};
  if (!Object.keys(L).length) {
    c.innerHTML = '<div class="card">الهدافون هيتحدثوا مع أول جولة 🔄</div>';
    return;
  }
  let h = '';
  Object.entries(L).forEach(([league, cats]) => {
    h += `<h3 style="margin:18px 0 8px;color:#fbbf24;">${league}</h3>`;
    Object.entries(cats).forEach(([label, items]) => {
      h += `<h4 style="margin:8px 0 6px;opacity:.8;">${label}</h4><div class="grid">`;
      (items || []).forEach((p, i) => {
        h += `<div class="tv-card" style="text-align:center;">
          ${p.face ? `<img src="${p.face}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;" onerror="this.style.display='none'">` : '<div style="font-size:1.8em;">👤</div>'}
          <div style="font-weight:bold;">${i + 1}. ${p.name}</div>
          <div style="opacity:.7;font-size:.82em;">${p.team}</div>
          <div style="color:#fbbf24;font-weight:bold;margin-top:4px;">${p.value}</div>
        </div>`;
      });
      h += '</div>';
    });
  });
  c.innerHTML = h;
}

function renderPlayers() {
  const q = (document.getElementById('playerSearch') ? document.getElementById('playerSearch').value : '').trim().toLowerCase();
  const all = [];
  Object.entries(DATA.leaders || {}).forEach(([league, cats]) => {
    Object.entries(cats || {}).forEach(([label, items]) => {
      (items || []).forEach(p => all.push(Object.assign({}, p, { league: league, label: label })));
    });
  });
  if (!all.length) {
    const pool = (typeof fantasyPool === 'function') ? fantasyPool() : [];
    pool.forEach(p => all.push({ name: p.name, team: p.team, value: p.val + (p.cat === 'الهدافون' ? ' ⚽' : ' 🅰️'), face: p.face || '', league: 'نجوم الموسم', label: p.cat }));
  }
  const items = q ? all.filter(p => (p.name || '').toLowerCase().includes(q) || (p.team || '').toLowerCase().includes(q)) : all.slice(0, 20);
  const c = document.getElementById('playersContainer');
  if (!c) return;
  c.innerHTML = items.length ? items.map(p => `<div class="tv-card" style="text-align:center;">
    ${p.face ? `<img src="${p.face}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;" onerror="this.style.display='none'">` : '<div style="font-size:1.8em;">👤</div>'}
    <div style="font-weight:bold;">${p.name}</div>
    <div style="opacity:.7;font-size:.82em;">${p.team} | ${p.league}</div>
    <div style="color:#fbbf24;font-weight:bold;margin-top:4px;">⭐ ${p.value}</div>
  </div>`).join('') : '<div class="card">مفيش لاعب بالاسم ده 🔍</div>';
}

function renderTv() {
  const el = document.getElementById('tvContainer');
  const rows = [];
  (DATA.matches || []).forEach(g => g.items.forEach(m => {
    if (m.tv && m.state !== 'post') rows.push(m);
  }));
  el.innerHTML = rows.length ? rows.map(m => `<div class="tv-card">
    <div class="tv-teams">${teamLogo(m.homeLogo)} ${m.home} × ${m.away} ${teamLogo(m.awayLogo)}</div>
    <div class="tv-info">${m.state === 'in' ? '🔴 الآن' : '🕐 ' + m.time} | ${m.league}</div>
    ${m.tvUrl ? `<a class="btn" href="${m.tvUrl}" target="_blank">📺 ${m.tv}</a>` : `<span>📺 ${m.tv}</span>`}
  </div>`).join('') : '<div class="card">لا توجد مباريات مذاعة قريباً</div>';
}

function renderPredict() {
  const saved = JSON.parse(localStorage.getItem('edgePredict') || '{}');
  const scored = JSON.parse(localStorage.getItem('edgeScored') || '[]');
  let points = parseInt(localStorage.getItem('edgePoints') || '0');
  (DATA.matches || []).forEach(g => g.items.forEach(m => {
    if (m.state === 'post' && saved[m.eid] && !scored.includes(m.eid)) {
      const p = saved[m.eid];
      const hh = parseInt(m.hs), aa = parseInt(m.as);
      if (p[0] === hh && p[1] === aa) points += 3;
      else if (Math.sign(p[0] - p[1]) === Math.sign(hh - aa)) points += 1;
      scored.push(m.eid);
    }
  }));
  localStorage.setItem('edgePoints', String(points));
  localStorage.setItem('edgeScored', JSON.stringify(scored));
  document.getElementById('predictPoints').innerHTML = `⭐ نقاطك: <b>${points}</b> — النتيجة الصح بـ 3 نقاط والاتجاه الصح بنقطة`;
  const upcoming = [];
  (DATA.matches || []).forEach(g => g.items.forEach(m => {
    if (m.state === 'pre') upcoming.push(m);
  }));
  const el = document.getElementById('predictContainer');
  if (!upcoming.length) {
    el.innerHTML = '<div class="card">لا توجد مباريات قادمة للتوقع حالياً</div>';
    return;
  }
  el.innerHTML = upcoming.slice(0, 12).map(m => {
    const v = saved[m.eid] || ['', ''];
    return `<div class="pred-row" data-eid="${m.eid}">
      <div class="pred-teams">${teamLogo(m.homeLogo)} ${m.home} × ${m.away} ${teamLogo(m.awayLogo)}</div>
      <div class="pred-inputs"><input type="number" min="0" class="pred-h" value="${v[0]}" placeholder="0"><span>-</span><input type="number" min="0" class="pred-a" value="${v[1]}" placeholder="0"></div>
    </div>`;
  }).join('');
}

function savePredict() {
  const saved = JSON.parse(localStorage.getItem('edgePredict') || '{}');
  let count = 0;
  document.querySelectorAll('.pred-row').forEach(row => {
    const h = row.querySelector('.pred-h').value;
    const a = row.querySelector('.pred-a').value;
    if (h !== '' && a !== '') {
      saved[row.dataset.eid] = [parseInt(h), parseInt(a)];
      count++;
    }
  });
  localStorage.setItem('edgePredict', JSON.stringify(saved));
  alert(count ? `تم حفظ ${count} توقع ✅` : 'اكتب نتيجة واحدة على الأقل الأول 😅');
  uploadScore(true);
}

let FANTASY_SEL = JSON.parse(localStorage.getItem('edgeFantasy') || 'null');

function fantasyPool() {
  const map = {};
  Object.values(DATA.leaders || {}).forEach(cats => {
    Object.entries(cats).forEach(([cat, items]) => {
      items.forEach(p => {
        const val = parseInt(p.value) || 0;
        if (!map[p.name] || val > map[p.name].val) {
          map[p.name] = { name: p.name, team: p.team, face: p.face, cat: cat, val: val };
        }
      });
    });
  });
  const stars = [
    { name: 'محمد صلاح', team: 'ليفربول', val: 20, cat: 'الهدافون' },
    { name: 'إيرلينج هالاند', team: 'مانشستر سيتي', val: 25, cat: 'الهدافون' },
    { name: 'بوكايو ساكا', team: 'أرسنال', val: 14, cat: 'صناعة الأهداف' },
    { name: 'كول بالمر', team: 'تشيلسي', val: 16, cat: 'الهدافون' },
    { name: 'كيليان مبابي', team: 'ريال مدريد', val: 28, cat: 'الهدافون' },
    { name: 'فينيسيوس جونيور', team: 'ريال مدريد', val: 17, cat: 'الهدافون' },
    { name: 'لامين يامال', team: 'برشلونة', val: 15, cat: 'صناعة الأهداف' },
    { name: 'لاوتارو مارتينيز', team: 'إنتر ميلان', val: 18, cat: 'الهدافون' },
    { name: 'هاري كين', team: 'بايرن ميونخ', val: 24, cat: 'الهدافون' },
    { name: 'كريستيانو رونالدو', team: 'النصر', val: 25, cat: 'الهدافون' },
    { name: 'كريم بنزيما', team: 'الهلال', val: 14, cat: 'الهدافون' },
    { name: 'ألكساندر ميتروفيتش', team: 'الهلال', val: 16, cat: 'الهدافون' },
    { name: 'رياض محرز', team: 'الأهلي السعودي', val: 10, cat: 'صناعة الأهداف' },
    { name: 'إمام عاشور', team: 'الأهلي', val: 10, cat: 'الهدافون' },
    { name: 'محمود تريزيجيه', team: 'الأهلي', val: 11, cat: 'الهدافون' },
    { name: 'أحمد سيد زيزو', team: 'الأهلي', val: 12, cat: 'صناعة الأهداف' },
    { name: 'ليونيل ميسي', team: 'إنتر ميامي', val: 22, cat: 'الهدافون' },
    { name: 'فيكتور أوسيمين', team: 'جلطة سراي', val: 20, cat: 'الهدافون' }
  ];
  const liveTeams = new Set(Object.values(DATA.leaders || {}).flatMap(c => Object.values(c).flat().map(p => p.team)));
  stars.forEach(p => {
    if (!map[p.name] && !liveTeams.has(p.team)) {
      map[p.name] = { name: p.name, team: p.team, face: '', cat: p.cat, val: p.val };
    }
  });
  return Object.values(map).map(p => Object.assign(p, { price: 4 + Math.round(p.val / 2) }));
}

function isGoalsCat(cat) {
  return cat.includes('الهداف') || /goal/i.test(cat);
}

function renderFantasy() {
  const pool = fantasyPool();
  window._fantasyPool = pool;
  const chosen = (FANTASY_SEL && FANTASY_SEL.players) || [];
  let pts = 0;
  if (FANTASY_SEL && FANTASY_SEL.snapshot) {
    FANTASY_SEL.snapshot.forEach(s => {
      const cur = pool.find(p => p.name === s.name);
      if (cur) pts += (cur.val - s.val) * (isGoalsCat(s.cat) ? 3 : 2);
    });
  }
  document.getElementById('fantasyInfo').innerHTML = `⭐ نقاط فريقك: <b>${pts}</b> — الهدف +3 والأسيست +2`;
  document.getElementById('fantasySquad').innerHTML = chosen.length ? chosen.map(n => {
    const p = pool.find(x => x.name === n);
    return p ? `<span class="p-card">${p.face ? `<img class="p-face" src="${p.face}" onerror="this.style.display='none'">` : '👤'} ${p.name} <small>💰${p.price}</small></span>` : '';
  }).join('') : '';
  document.getElementById('fantasyPool').innerHTML = pool.sort((a, b) => b.val - a.val).slice(0, 100).map(p => `
    <div class="tv-card" style="cursor:pointer;${chosen.includes(p.name) ? 'border-color:#fbbf24;' : ''}" onclick="toggleFantasy('${p.name.replace(/'/g, '')}')">
      ${p.face ? `<img class="p-face" style="width:42px;height:42px;" src="${p.face}" onerror="this.style.display='none'">` : '👤'}
      <div class="tv-teams" style="margin-top:6px;">${p.name}</div>
      <div class="tv-info">${p.team} | ${p.cat}: ${p.val}</div>
      <div style="color:#fbbf24;font-weight:bold;">💰 ${p.price}</div>
    </div>`).join('');
}

function toggleFantasy(name) {
  const pool = window._fantasyPool || fantasyPool();
  let chosen = (FANTASY_SEL && FANTASY_SEL.players) || [];
  const p = pool.find(x => x.name === name);
  if (!p) return;
  if (chosen.includes(name)) {
    chosen = chosen.filter(n => n !== name);
  } else {
    const spent = pool.filter(x => chosen.includes(x.name)).reduce((s, x) => s + x.price, 0);
    if (chosen.length >= 5) { alert('ماكس 5 لاعبين يا نجم 😅'); return; }
    if (spent + p.price > 70) { alert('الميزانية مش كافية! 💸'); return; }
    chosen.push(name);
  }
  FANTASY_SEL = FANTASY_SEL || {};
  FANTASY_SEL.players = chosen;
  renderFantasy();
}

function saveFantasy() {
  const pool = window._fantasyPool || fantasyPool();
  if (!FANTASY_SEL || !(FANTASY_SEL.players || []).length) { alert('اختار لاعبين الأول! 👥'); return; }
  FANTASY_SEL.snapshot = FANTASY_SEL.players.map(n => {
    const p = pool.find(x => x.name === n);
    return { name: n, val: p ? p.val : 0, cat: p ? p.cat : '' };
  });
  localStorage.setItem('edgeFantasy', JSON.stringify(FANTASY_SEL));
  alert('تم حفظ فريقك! ⚽');
  renderFantasy();
  uploadScore(true);
}

function fantasyPoints() {
  const pool = fantasyPool();
  let pts = 0;
  if (FANTASY_SEL && FANTASY_SEL.snapshot) {
    FANTASY_SEL.snapshot.forEach(s => {
      const cur = pool.find(p => p.name === s.name);
      if (cur) pts += (cur.val - s.val) * (isGoalsCat(s.cat) ? 3 : 2);
    });
  }
  return pts;
}

async function uploadScore(silent) {
  if (!supa) { if (!silent) alert('وصّل مفاتيح Supabase في أول app.js'); return; }
  let name = localStorage.getItem('edgeName');
  if (!name) {
    name = prompt('اكتب اسمك اللي هيظهر في لوحة الصدارة:');
    if (!name) return;
    localStorage.setItem('edgeName', name.trim());
  }
  const pred = parseInt(localStorage.getItem('edgePoints') || '0');
  const fan = fantasyPoints();
  const id = name.trim().toLowerCase().replace(/\s+/g, '-');
  const res = await supa.from('players').upsert({ id: id, name: name.trim(), pred_points: pred, fantasy_points: fan, total: pred + fan });
  if (!silent) alert(res.error ? 'خطأ: ' + res.error.message : 'تم رفع نقاطك 🚀');
  loadBoard();
}

async function loadBoard() {
  const el = document.getElementById('boardContainer');
  if (!el) return;
  if (!supa) { el.innerHTML = '<div class="card">🏅 اللوحة هتشتغل بعد توصيل مفاتيح Supabase</div>'; return; }
  const res = await supa.from('players').select('*').order('total', { ascending: false }).limit(50);
  if (res.error || !res.data || !res.data.length) {
    el.innerHTML = '<div class="card">لسه مفيش لاعبين — كن أول من يرفع نقاطه! 🚀</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = '<table class="stand"><tr><th>#</th><th>الاسم</th><th>توقعات</th><th>فانتازي</th><th>الإجمالي</th></tr>' +
    res.data.map((r, i) => `<tr><td>${medals[i] || i + 1}</td><td>${r.name}</td><td>${r.pred_points}</td><td>${r.fantasy_points}</td><td class="pts">${r.total}</td></tr>`).join('') +
    '</table>';
}

const SHOP = [
  { name: 'كورة مباريات احترافية', emoji: '⚽', link: 'https://www.amazon.ae/s?k=football+ball' },
  { name: 'تيشيرت فريقك المفضل', emoji: '👕', link: 'https://www.amazon.ae/s?k=football+jersey' },
  { name: 'حذاء كورة عالي الجودة', emoji: '👟', link: 'https://www.amazon.ae/s?k=football+boots' },
  { name: 'شال وإكسسوارات مشجعين', emoji: '🧣', link: 'https://www.amazon.ae/s?k=football+scarf' }
];

function renderShop() {
  document.getElementById('shopContainer').innerHTML = SHOP.map(p => `
    <div class="tv-card"><div style="font-size:2.2em;">${p.emoji}</div>
    <div class="tv-teams" style="margin-top:6px;">${p.name}</div>
    <a class="btn" style="margin-top:8px;" href="${p.link}" target="_blank">اشتري من هنا</a></div>`).join('');
}

const TRANSFER_WORDS = ['صفقة', 'صفقات', 'انتقال', 'تعاقد', 'توقيع', 'يرحل', 'رحيل', 'يجدد', 'تجديد', 'إعارة', 'بيع', 'شراء', 'مليون', 'ينتقل', 'انضم', 'transfer', 'signed', 'signs', 'loan', 'deal', 'move', 'joins'];

function renderTransfers() {
  const all = [...(DATA.news || []), ...(DATA.world || [])];
  const items = all.filter(n => TRANSFER_WORDS.some(w => (n.t || '').toLowerCase().includes(w)));
  document.getElementById('transfersContainer').innerHTML = items.length ? items.map(n => `
    <div class="tv-card" style="text-align:right;cursor:pointer;" onclick="showNewsDetail('${esc(n.t)}','${esc(n.full || n.t)}')">
      ${n.img ? `<img src="${n.img}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${n.t}</div>
    </div>`).join('') : '<div class="card">مفيش أخبار انتقالات دلوقتي 🔄</div>';
}

function renderArchive() {
  const q = (document.getElementById('archiveSearch').value || '').trim().toLowerCase();
  const all = [...(DATA.news || []), ...(DATA.world || [])];
  const items = q ? all.filter(n => (n.t || '').toLowerCase().includes(q)) : all;
  document.getElementById('archiveContainer').innerHTML = items.length ? items.map(n => `
    <div class="tv-card" style="text-align:right;cursor:pointer;" onclick="showNewsDetail('${esc(n.t)}','${esc(n.full || n.t)}')">
      ${n.img ? `<img src="${n.img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${n.t}</div>
    </div>`).join('') : '<div class="card">مفيش نتائج مطابقة 🔍</div>';
}

function renderWorld() {
  const el = document.getElementById('worldContainer');
  const W = DATA.world || [];
  el.innerHTML = W.length ? W.map(w => `
    <div class="tv-card" style="text-align:right;cursor:pointer;" onclick="showNewsDetail('${esc(w.t)}','${esc(w.full || w.t)}')">
      ${w.img ? `<img src="${w.img}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${w.t}</div>
    </div>`).join('') : '<div class="card">لا توجد أخبار عالمية حالياً</div>';
}

function showNewsDetail(title, full, img) {
  const box = document.getElementById('teamModal');
  if (!box) return;
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;overflow:auto;';
  if (box.firstElementChild) box.firstElementChild.style.cssText = 'max-width:680px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('teamModalTitle').textContent = '📰 خبر';
  document.getElementById('teamModalBody').innerHTML =
    (img ? `<img src="${img}" style="width:100%;max-height:320px;object-fit:cover;border-radius:10px;margin-bottom:14px;" onerror="this.style.display='none'">` : '') +
    '<h3 style="color:#fbbf24;margin-bottom:12px;">' + title + '</h3><div style="line-height:2;white-space:pre-wrap;font-size:1.05em;">' + (full || title) + '</div>';
}

function allTeams() {
  const map = {};
  Object.entries(DATA.tables || {}).forEach(([league, rows]) => {
    (rows || []).forEach(r => {
      if (typeof r === 'string') {
        const m = r.match(/^(\d+)\.\s*(.+?)\s*—\s*(\d+)/);
        if (m) map[m[2]] = { rank: +m[1], team: m[2], pts: +m[3], gp: 1, w: '-', d: '-', l: '-', logo: '', league: league };
      } else {
        const gp = Number(r.gp) || 0;
        const cur = map[r.team];
        if (!cur || gp > (Number(cur.gp) || 0)) map[r.team] = Object.assign({}, r, { league: league });
      }
    });
  });
  return Object.values(map);
}

function fillTeamSelects() {
  const a = document.getElementById('teamA'), b = document.getElementById('teamB');
  if (!a || a.options.length) return;
  const opts = allTeams().map(t => `<option>${t.team}</option>`).join('');
  a.innerHTML = opts;
  b.innerHTML = opts;
  if (b.options.length > 1) b.selectedIndex = 1;
}

function renderCompare() {
  const teams = allTeams();
  const ta = teams.find(t => t.team === document.getElementById('teamA').value);
  const tb = teams.find(t => t.team === document.getElementById('teamB').value);
  if (!ta || !tb) return;
  const row = (label, va, vb, lowerBetter) => {
    const na = Number(va) || 0, nb = Number(vb) || 0;
    const ca = lowerBetter ? (na < nb ? '#4ade80' : na > nb ? '#f87171' : '#fff') : (na > nb ? '#4ade80' : na < nb ? '#f87171' : '#fff');
    const cb = lowerBetter ? (nb < na ? '#4ade80' : nb > na ? '#f87171' : '#fff') : (nb > na ? '#4ade80' : nb < na ? '#f87171' : '#fff');
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#0f172a;border-radius:10px;margin-bottom:8px;">
      <b style="color:${ca};flex:1;text-align:right;">${va}</b>
      <span style="opacity:.8;flex:1;text-align:center;">${label}</span>
      <b style="color:${cb};flex:1;text-align:left;">${vb}</b>
    </div>`;
  };
  const head = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="text-align:center;flex:1;">${ta.logo ? `<img src="${ta.logo}" style="width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 6px;">` : ''}<b>${ta.team}</b><div style="opacity:.7;font-size:.8em;">${ta.league}</div></div>
    <div style="font-size:1.6em;">⚖️</div>
    <div style="text-align:center;flex:1;">${tb.logo ? `<img src="${tb.logo}" style="width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 6px;">` : ''}<b>${tb.team}</b><div style="opacity:.7;font-size:.8em;">${tb.league}</div></div>
  </div>`;
  const pa = Number(ta.pts) || 0, pb = Number(tb.pts) || 0;
  const verdict = pa === pb ? '' : `<div class="card" style="text-align:center;font-weight:bold;color:#fbbf24;">${pa > pb ? ta.team : tb.team} الأعلى نقاطاً 🔥</div>`;
  document.getElementById('compareContainer').innerHTML = head +
    row('النقاط', ta.pts, tb.pts) + row('المركز', ta.rank, tb.rank, true) +
    row('لعب', ta.gp, tb.gp) + row('فوز', ta.w, tb.w) +
    row('تعادل', ta.d, tb.d) + row('خسارة', ta.l, tb.l, true) + verdict;
}

const AR2EN = {"ريال مدريد":"Real Madrid","برشلونة":"Barcelona","ليفربول":"Liverpool","مانشستر سيتي":"Manchester City","مانشستر يونايتد":"Manchester United","تشيلسي":"Chelsea","أرسنال":"Arsenal","توتنهام":"Tottenham Hotspur","باريس سان جيرمان":"Paris Saint-Germain","بايرن ميونخ":"Bayern Munich","يوفنتوس":"Juventus","إنتر ميلان":"Inter","ميلان":"AC Milan","أتلتيكو مدريد":"Atlético Madrid","بوروسيا دورتموند":"Borussia Dortmund","نابولي":"Napoli","الأهلي":"Al Ahly","الزمالك":"Zamalek","بيراميدز":"Pyramids FC","الهلال":"Al Hilal","النصر":"Al Nassr","الاتحاد":"Al Ittihad","الأهلي السعودي":"Al Ahli","الشباب":"Al Shabab","الاتفاق":"Al Ettifaq","أستون فيلا":"Aston Villa","نيوكاسل":"Newcastle United"};
const P2AR = {"Mohamed Salah":"محمد صلاح","Erling Haaland":"إيرلينج هالاند","Kylian Mbappé":"كيليان مبابي","Kylian Mbappe":"كيليان مبابي","Cole Palmer":"كول بالمر","Bukayo Saka":"بوكايو ساكا","Karim Benzema":"كريم بنزيما","Aleksandar Mitrovic":"ألكساندر ميتروفيتش","Cristiano Ronaldo":"كريستيانو رونالدو","Lionel Messi":"ليونيل ميسي","Harry Kane":"هاري كين","Riyad Mahrez":"رياض محرز","Salem Al-Dawsari":"سالم الدوسري","Emam Ashour":"إمام عاشور","Mahmoud Trezeguet":"محمود تريزيجيه","Ahmed Sayed Zizo":"أحمد سيد زيزو","Victor Osimhen":"فيكتور أوسيمين","Lautaro Martínez":"لاوتارو مارتينيز","João Pedro":"جواو بيدرو","Darwin Núñez":"داروين نونيز"};

function e2aMap() {
  const m = {};
  Object.entries(AR2EN).forEach(([ar, en]) => m[en.toLowerCase()] = ar);
  return m;
}

async function showTeam(slug, teamId, teamName) {
  const box = document.getElementById('teamModal');
  if (!box) return;
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;overflow:auto;';
  if (box.firstElementChild) box.firstElementChild.style.cssText = 'max-width:800px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('teamModalTitle').textContent = '👥 ' + teamName;
  document.getElementById('teamModalBody').innerHTML = 'ثانية بنحمل القائمة... ⏳';
  const get = async u => { try { return JSON.parse(await (await fetch(u)).text()); } catch (e) { return {}; } };
  const ageFrom = d => {
    if (!d) return '-';
    const b = new Date(d);
    if (isNaN(b)) return '-';
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  };
  const e2a = e2aMap();
  const arName = e2a[(teamName || '').toLowerCase()] || teamName;
  const q = AR2EN[teamName] || teamName;
  const order = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3, Forward: 3, Striker: 3, 'Centre-Back': 1, 'Left-Back': 1, 'Right-Back': 1, 'Central Midfield': 2, 'Attacking Midfield': 2, 'Left Wing': 3, 'Right Wing': 3 };
  const pool = (typeof fantasyPool === 'function') ? fantasyPool() : [];
  const statsOf = name => {
    const st = pool.find(x => x.name === name) || pool.find(x => x.name === P2AR[name]);
    if (!st) return null;
    const isG = (st.cat || '').includes('الهداف');
    const g = isG ? st.val : 0, a = !isG ? st.val : 0;
    return [g, a, (6 + Math.min(3.5, g * 0.25 + a * 0.2)).toFixed(1)];
  };
  const headRow = `<tr><th style="text-align:right;">اللاعب</th><th>السن</th><th>الجنسية</th><th>المركز</th><th>لعب</th><th>⚽</th><th>🅰️</th><th>⭐</th></tr>`;
  const squad = ((DATA.squads || {})[teamName] || (DATA.squads || {})[arName] || []);
  if (squad.length) {
    squad.sort((a, b) => (order[a.pos] ?? 5) - (order[b.pos] ?? 5));
    document.getElementById('teamModalBody').innerHTML = `<div style="text-align:center;margin-bottom:12px;"><div style="font-size:2.6em;">⚽</div><div style="font-weight:bold;font-size:1.25em;">${teamName}</div><div style="opacity:.7;">✅ بيانات رسمية من API-Football</div></div><div style="overflow-x:auto;"><table class="stand">${headRow}` +
      squad.map(p => `<tr><td style="text-align:right;">${p.face ? `<img class="p-face" style="width:24px;height:24px;vertical-align:middle;margin-left:5px;" src="${p.face}" onerror="this.style.display='none'">` : '👤'} ${p.name}</td><td>${p.age}</td><td>${p.nat}</td><td>${p.pos}</td><td>${p.apps}</td><td class="pts">${p.goals}</td><td>${p.assists}</td><td style="color:#fbbf24;font-weight:bold;">${p.rating}</td></tr>`).join('') + `</table></div>`;
    return;
  }
  try {
    const teams = ((await get('https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=' + encodeURIComponent(q))).teams || []).filter(t => (t.strGender || 'Male') !== 'Female');
    const team = teams.find(t => (t.strTeam || '').toLowerCase() === q.toLowerCase()) || teams[0];
    if (team) {
      let players = ((await get('https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=' + team.idTeam)).player || []).filter(p => p.strPlayer);
      if (!players.length) players = ((await get('https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=' + encodeURIComponent(team.strTeam))).player || []).filter(p => p.strPlayer);
      if (players.length) {
        players.sort((a, b) => (order[a.strPosition] ?? 5) - (order[b.strPosition] ?? 5));
        let gp = 0;
        Object.values(DATA.tables || {}).forEach(rows => (rows || []).forEach(r => {
          if (r && typeof r === 'object' && (r.team === arName || r.team === teamName)) { const g = Number(r.gp) || 0; if (g > gp) gp = g; }
        }));
        document.getElementById('teamModalBody').innerHTML = `<div style="text-align:center;margin-bottom:12px;">${team.strBadge ? `<img src="${team.strBadge}" style="width:64px;height:64px;object-fit:contain;">` : ''}<div style="font-weight:bold;font-size:1.25em;">${team.strTeam}</div><div style="opacity:.7;">${team.strLeague || ''}</div></div><div style="overflow-x:auto;"><table class="stand">${headRow}` +
          players.map(p => {
            const s = statsOf(p.strPlayer);
            return `<tr><td style="text-align:right;">${p.strCutout || p.strThumb ? `<img class="p-face" style="width:24px;height:24px;vertical-align:middle;margin-left:5px;" src="${p.strCutout || p.strThumb}" onerror="this.style.display='none'">` : '👤'} ${p.strPlayer}</td><td>${ageFrom(p.dateBorn)}</td><td>${p.strNationality || '-'}</td><td>${p.strPosition || '-'}</td><td>${gp || '-'}</td><td class="pts">${s ? s[0] : '-'}</td><td>${s ? s[1] : '-'}</td><td style="color:#fbbf24;font-weight:bold;">${s ? s[2] : '-'}</td></tr>`;
          }).join('') + `</table></div>`;
        return;
      }
    }
  } catch (e) {}
  const stars = pool.filter(p => p.team === arName || p.team === teamName);
  if (stars.length) {
    const rows = stars.map(p => {
      const isG = (p.cat || '').includes('الهداف');
      const g = isG ? p.val : 0, a = !isG ? p.val : 0;
      return Object.assign({}, p, { g: g, a: a, r: (6 + Math.min(3.5, g * 0.25 + a * 0.2)).toFixed(1) });
    }).sort((x, y) => (y.g + y.a) - (x.g + x.a));
    document.getElementById('teamModalBody').innerHTML = `<div style="text-align:center;margin-bottom:12px;"><div style="font-size:2.6em;">⚽</div><div style="font-weight:bold;font-size:1.25em;">${teamName}</div></div><div style="overflow-x:auto;"><table class="stand"><tr><th style="text-align:right;">اللاعب</th><th>⚽</th><th>🅰️</th><th>⭐</th></tr>` +
      rows.map(p => `<tr><td style="text-align:right;">${p.name}</td><td class="pts">${p.g}</td><td>${p.a}</td><td style="color:#fbbf24;font-weight:bold;">${p.r}</td></tr>`).join('') + `</table></div>`;
  } else {
    document.getElementById('teamModalBody').innerHTML = '<div class="card">مفيش بيانات كافية للفريق ده 🙏</div>';
  }
}

function closeTeam() { const b = document.getElementById('teamModal'); if (b) b.style.display = 'none'; }

function matchShareButton(slug, eid, title) {
  try {
    let m = null;
    (DATA.matches || []).forEach(g => (g.items || []).forEach(x => {
      if (String(x.eid) === String(eid)) m = Object.assign({}, x, { league: g.league });
    }));
    let t1 = '', t2 = '';
    const parts = (title || '').split('×');
    if (parts.length >= 2) { t1 = parts[0].trim(); t2 = parts[1].trim(); }
    if (m) { t1 = m.home || t1; t2 = m.away || t2; }
    if (!t1 || !t2) return '';
    const hasScore = m && (m.state === 'post' || m.state === 'in');
    const st = m ? (m.state === 'in' ? 'جارية الآن' : (m.state === 'post' ? 'انتهت' : m.time)) : 'مباراة';
    const p = new URLSearchParams();
    p.set('t1', t1);
    p.set('t2', t2);
    if (hasScore) { p.set('s1', m.hs); p.set('s2', m.as); }
    if (m && m.league) p.set('lg', m.league);
    p.set('st', st);
    if (m && m.homeLogo) p.set('l1', m.homeLogo);
    if (m && m.awayLogo) p.set('l2', m.awayLogo);
    return '<a class="btn" style="display:flex;justify-content:center;align-items:center;margin-bottom:14px;" target="_blank" rel="noopener" href="share.html?' + p.toString() + '">🖼️ شارك كارت المباراة</a>';
  } catch (e) {
    return '';
  }
}

async function showMatch(slug, eid, title) {
  const box = document.getElementById('matchModal');
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;overflow:auto;';
  box.firstElementChild.style.cssText = 'max-width:640px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('matchModalTitle').textContent = '⚽ ' + title;
  document.getElementById('matchModalBody').innerHTML = 'جاري تحميل التفاصيل...';
  const shareHtml = matchShareButton(slug, eid, title);
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${eid}`);
    const d = await r.json();
    let html = shareHtml;
    const events = d.scoringPlays || d.keyEvents || [];
    if (events.length) {
      html += '<div class="pos-box"><b>⚽ الأهداف واللحظات:</b>' + events.map(ev => {
        const clock = (ev.clock && ev.clock.displayValue) || (ev.period ? ev.period.number + "'" : '');
        const team = ev.team ? ev.team.displayName : '';
        const txt = ev.text || (ev.type && ev.type.text) || '';
        return `<div class="goal-line">⚽ ${clock} — ${team} ${txt}</div>`;
      }).join('') + '</div>';
    }
    const st = (d.competitions && d.competitions[0] && d.competitions[0].statistics) || [];
    if (st.length) {
      const labels = { possession: 'استحواذ %', shotsOnTarget: 'تسديدات على المرمى', cornerKicks: 'ركنيات', totalShots: 'تسديدات', foulsCommitted: 'أخطاء', offsides: 'تسلل', saves: 'تصديات' };
      html += '<div class="pos-box"><b>📊 الإحصائيات:</b><div class="p-grid">' + st.map(s => `<span class="p-card">${s.homeValue} | ${labels[s.name] || s.name} | ${s.awayValue}</span>`).join('') + '</div></div>';
    }
    document.getElementById('matchModalBody').innerHTML = html || 'التفاصيل مش متاحة للمباراة دي حالياً';
  } catch (e) {
    document.getElementById('matchModalBody').innerHTML = shareHtml + 'تعذر تحميل التفاصيل';
  }
}

function closeMatch() { const b = document.getElementById('matchModal'); if (b) b.style.display = 'none'; }

const NATIONALS = [
  ['مصر','Egypt','🇪🇬'],['السعودية','Saudi Arabia','🇸🇦'],['المغرب','Morocco','🇲🇦'],['الجزائر','Algeria','🇩🇿'],['تونس','Tunisia','🇹🇳'],['ليبيا','Libya','🇱🇾'],['السودان','Sudan','🇸🇩'],['موريتانيا','Mauritania','🇲🇷'],['الصومال','Somalia','🇸🇴'],['جيبوتي','Djibouti','🇩🇯'],['جزر القمر','Comoros','🇰🇲'],['قطر','Qatar','🇶🇦'],['الإمارات','United Arab Emirates','🇦🇪'],['عمان','Oman','🇴🇲'],['البحرين','Bahrain','🇧🇭'],['الكويت','Kuwait','🇰🇼'],['العراق','Iraq','🇮🇶'],['الأردن','Jordan','🇯🇴'],['لبنان','Lebanon','🇱🇧'],['سوريا','Syria','🇸🇾'],['فلسطين','Palestine','🇵🇸'],['اليمن','Yemen','🇾🇪'],
  ['السنغال','Senegal','🇸🇳'],['نيجيريا','Nigeria','🇳🇬'],['غانا','Ghana','🇬🇭'],['الكاميرون','Cameroon','🇨🇲'],['كوت ديفوار','Cote d\'Ivoire','🇨🇮'],['مالي','Mali','🇲🇱'],['بوركينا فاسو','Burkina Faso','🇧🇫'],['جنوب أفريقيا','South Africa','🇿🇦'],['الكونغو الديمقراطية','DR Congo','🇨🇩'],['الكونغو','Congo','🇨🇬'],['غينيا','Guinea','🇬🇳'],['غينيا الاستوائية','Equatorial Guinea','🇬🇶'],['الجابون','Gabon','🇬🇦'],['زامبيا','Zambia','🇿🇲'],['زيمبابوي','Zimbabwe','🇿🇼'],['أوغندا','Uganda','🇺🇬'],['كينيا','Kenya','🇰🇪'],['إثيوبيا','Ethiopia','🇪🇹'],['تنزانيا','Tanzania','🇹🇿'],['رواندا','Rwanda','🇷🇼'],['بنين','Benin','🇧🇯'],['توجو','Togo','🇹🇬'],['النيجر','Niger','🇳🇪'],['تشاد','Chad','🇹🇩'],['بوتسوانا','Botswana','🇧🇼'],['ناميبيا','Namibia','🇳🇦'],['موزمبيق','Mozambique','🇲🇿'],['مدغشقر','Madagascar','🇲🇬'],['الرأس الأخضر','Cape Verde','🇨🇻'],['جامبيا','Gambia','🇬🇲'],['غينيا بيساو','Guinea-Bissau','🇬🇼'],['ليبيريا','Liberia','🇱🇷'],['سيراليون','Sierra Leone','🇸🇱'],
  ['إسبانيا','Spain','🇪🇸'],['البرتغال','Portugal','🇵🇹'],['فرنسا','France','🇫🇷'],['إنجلترا','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿'],['ألمانيا','Germany','🇩🇪'],['إيطاليا','Italy','🇮🇹'],['هولندا','Netherlands','🇳🇱'],['بلجيكا','Belgium','🇧🇪'],['كرواتيا','Croatia','🇭🇷'],['سويسرا','Switzerland','🇨🇭'],['تركيا','Turkey','🇹🇷'],['اليونان','Greece','🇬🇷'],['اسكتلندا','Scotland','🏴󠁧󠁢󠁳󠁣󠁴󠁿'],['الدنمارك','Denmark','🇩🇰'],['النرويج','Norway','🇳🇴'],['السويد','Sweden','🇸🇪'],['بولندا','Poland','🇵🇱'],['أوكرانيا','Ukraine','🇺🇦'],['النمسا','Austria','🇦🇹'],['ويلز','Wales','🏴󠁧󠁢󠁷󠁬󠁳󠁿'],['التشيك','Czech Republic','🇨🇿'],['رومانيا','Romania','🇷🇴'],['المجر','Hungary','🇭🇺'],['صربيا','Serbia','🇷🇸'],['روسيا','Russia','🇷🇺'],['سلوفاكيا','Slovakia','🇸🇰'],['سلوفينيا','Slovenia','🇸🇮'],['البوسنة','Bosnia and Herzegovina','🇧🇦'],['أيرلندا','Ireland','🇮🇪'],['أيسلندا','Iceland','🇮🇸'],['فنلندا','Finland','🇫🇮'],['ألبانيا','Albania','🇦🇱'],['مقدونيا الشمالية','North Macedonia','🇲🇰'],['بلغاريا','Bulgaria','🇧🇬'],['الجبل الأسود','Montenegro','🇲🇪'],['كوسوفو','Kosovo','🇽🇰'],['مولدوفا','Moldova','🇲🇩'],['بيلاروسيا','Belarus','🇧🇾'],['جورجيا','Georgia','🇬🇪'],['أرمينيا','Armenia','🇦🇲'],['أذربيجان','Azerbaijan','🇦🇿'],['كازاخستان','Kazakhstan','🇰🇿'],['إستونيا','Estonia','🇪🇪'],['لاتفيا','Latvia','🇱🇻'],['ليتوانيا','Lithuania','🇱🇹'],['قبرص','Cyprus','🇨🇾'],['لوكسمبورج','Luxembourg','🇱🇺'],['مالطا','Malta','🇲🇹'],
  ['البرازيل','Brazil','🇧🇷'],['الأرجنتين','Argentina','🇦🇷'],['أوروجواي','Uruguay','🇺🇾'],['كولومبيا','Colombia','🇨🇴'],['تشيلي','Chile','🇨🇱'],['باراجواي','Paraguay','🇵🇾'],['بيرو','Peru','🇵🇪'],['الإكوادور','Ecuador','🇪🇨'],['فنزويلا','Venezuela','🇻🇪'],['بوليفيا','Bolivia','🇧🇴'],
  ['المكسيك','Mexico','🇲🇽'],['أمريكا','United States','🇺🇸'],['كندا','Canada','🇨🇦'],['كوستاريكا','Costa Rica','🇨🇷'],['بنما','Panama','🇵🇦'],['هندوراس','Honduras','🇭🇳'],['جواتيمالا','Guatemala','🇬🇹'],['السلفادور','El Salvador','🇸🇻'],['جامايكا','Jamaica','🇯🇲'],['هايتي','Haiti','🇭🇹'],['كوبا','Cuba','🇨🇺'],['ترينيداد','Trinidad and Tobago','🇹🇹'],
  ['اليابان','Japan','🇯🇵'],['كوريا الجنوبية','South Korea','🇰🇷'],['أستراليا','Australia','🇦🇺'],['إيران','Iran','🇮🇷'],['الصين','China','🇨🇳'],['أوزبكستان','Uzbekistan','🇺🇿'],['فيتنام','Vietnam','🇻🇳'],['تايلاند','Thailand','🇹🇭'],['إندونيسيا','Indonesia','🇮🇩'],['ماليزيا','Malaysia','🇲🇾'],['الهند','India','🇮🇳'],['باكستان','Pakistan','🇵🇰'],['أفغانستان','Afghanistan','🇦🇫'],['تركمانستان','Turkmenistan','🇹🇲'],['طاجيكستان','Tajikistan','🇹🇯'],['قيرغيزستان','Kyrgyzstan','🇰🇬'],['كوريا الشمالية','North Korea','🇰🇵'],['هونج كونج','Hong Kong','🇭🇰'],['الفلبين','Philippines','🇵🇭'],['سنغافورة','Singapore','🇸🇬'],['ميانمار','Myanmar','🇲🇲'],['نيبال','Nepal','🇳🇵'],['بنجلاديش','Bangladesh','🇧🇩'],['سريلانكا','Sri Lanka','🇱🇰'],
  ['نيوزيلندا','New Zealand','🇳🇿'],['فيجي','Fiji','🇫🇯'],['بابوا غينيا الجديدة','Papua New Guinea','🇵🇬'],['جزر سليمان','Solomon Islands','🇸🇧'],['فانواتو','Vanuatu','🇻🇺']
];

/* ===== 🚩 إصلاح الأعلام المكسورة (19 علم) ===== */
(function () {
  try {
    const FLAG_FIX = {
      'Somalia': '🇸🇴',
      'Oman': '🇴🇲',
      'Cameroon': '🇨🇲',
      'Tanzania': '🇹🇿',
      'Rwanda': '🇷🇼',
      'Niger': '🇳🇪',
      'Botswana': '🇧🇼',
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
      'Poland': '🇵🇱',
      'Ukraine': '🇺🇦',
      'Romania': '🇷🇴',
      'Bulgaria': '🇧🇬',
      'Belarus': '🇧🇾',
      'Latvia': '🇱🇻',
      'Peru': '🇵🇪',
      'Malaysia': '🇲🇾',
      'Afghanistan': '🇦🇫'
    };
    NATIONALS.forEach(function (n) {
      if (FLAG_FIX[n[1]]) n[2] = FLAG_FIX[n[1]];
    });
  } catch (e) {
    console.log('تخطي إصلاح الأعلام:', e);
  }
})();

function renderNationals(filter) {
  const el = document.getElementById('nationalsContainer');
  if (!el) return;
  const q = (filter || '').trim();
  const list = NATIONALS.filter(n => !q || n[0].includes(q) || n[1].toLowerCase().includes(q.toLowerCase()));
  el.innerHTML = list.map(n => `<div class="tv-card" style="text-align:center;cursor:pointer;" onclick="showNational('${n[1]}','${n[0]}','${n[2]}')">
    <div style="font-size:2.4em;">${n[2]}</div>
    <div style="font-weight:bold;margin-top:6px;">${n[0]}</div>
  </div>`).join('') || '<div class="card">مفيش منتخب بالاسم ده 🔍</div>';
}

async function showNational(en, ar, flag) {
  const box = document.getElementById('teamModal');
  if (!box) return;
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;overflow:auto;';
  if (box.firstElementChild) box.firstElementChild.style.cssText = 'max-width:720px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('teamModalTitle').textContent = flag + ' منتخب ' + ar;
  document.getElementById('teamModalBody').innerHTML = 'ثانية بنحمل البيانات... ⏳';
  const get = async u => { try { return JSON.parse(await (await fetch(u)).text()); } catch (e) { return {}; } };
  let html = `<div style="text-align:center;margin-bottom:14px;"><div style="font-size:3em;">${flag}</div><div style="font-weight:bold;font-size:1.3em;">منتخب ${ar}</div></div>`;
  try {
    const teams = ((await get('https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=' + encodeURIComponent(en))).teams || []);
    const team = teams.find(t => (t.strTeam || '').toLowerCase() === en.toLowerCase()) || teams[0];
    if (team) {
      const next = ((await get('https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=' + team.idTeam)).events || []);
      const last = ((await get('https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=' + team.idTeam)).events || []);
      if (next.length) {
        html += '<h3 style="color:#fbbf24;margin:12px 0 8px;">🕐 المباريات القادمة</h3>';
        html += next.slice(0, 6).map(e => {
          const d = e.dateEvent ? new Date(e.dateEvent) : null;
          return `<div class="live-card" style="margin-bottom:8px;"><div class="live-teams"><span>${e.strHomeTeam}</span><span class="live-score" style="color:#94a3b8;">${d ? d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) : '🕐'}</span><span>${e.strAwayTeam}</span></div><div class="live-meta">🏆 ${e.strLeague || 'مباراة دولية'}</div></div>`;
        }).join('');
      }
      if (last.length) {
        html += '<h3 style="color:#fbbf24;margin:14px 0 8px;">🏁 آخر النتائج</h3>';
        html += last.slice(0, 6).map(e => `<div class="result-item">🏁 ${e.strHomeTeam} ${e.intHomeScore ?? '-'} - ${e.intAwayScore ?? '-'} ${e.strAwayTeam}</div>`).join('');
      }
      const squad = ((await get('https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=' + team.idTeam)).player || []).filter(p => p.strPlayer);
      if (squad.length) {
        html += '<h3 style="color:#fbbf24;margin:14px 0 8px;">👥 القائمة</h3><div style="overflow-x:auto;"><table class="stand"><tr><th style="text-align:right;">اللاعب</th><th>المركز</th><th>الجنسية</th></tr>' +
          squad.slice(0, 30).map(p => `<tr><td style="text-align:right;">${p.strCutout || p.strThumb ? `<img class="p-face" style="width:24px;height:24px;vertical-align:middle;margin-left:5px;" src="${p.strCutout || p.strThumb}" onerror="this.style.display='none'">` : '👤'} ${p.strPlayer}</td><td>${p.strPosition || '-'}</td><td>${p.strNationality || '-'}</td></tr>`).join('') + '</table></div>';
      }
    }
  } catch (e) {}
  document.getElementById('teamModalBody').innerHTML = html;
}

const CHAMPIONS = {
  "الدوري الإنجليزي 🏴󠁧󠁢󠁥󠁮󠁧󠁿": [["مانشستر يونايتد", 20], ["ليفربول", 20], ["أرسنال", 13], ["مانشستر سيتي", 10], ["إيفرتون", 9], ["أستون فيلا", 7], ["تشيلسي", 6]],
  "الدوري الإسباني 🇪🇸": [["ريال مدريد", 36], ["برشلونة", 27], ["أتلتيكو مدريد", 11], ["أتلتيك بلباو", 8], ["فالنسيا", 6]],
  "الدوري الإيطالي 🇮🇹": [["يوفنتوس", 36], ["إنتر ميلان", 20], ["ميلان", 19], ["جنوى", 9], ["تورينو", 7], ["نابولي", 4]],
  "الدوري الألماني 🇩🇪": [["بايرن ميونخ", 33], ["نورنبيرج", 9], ["بوروسيا دورتموند", 8], ["شالكه", 7], ["هامبورج", 6]],
  "الدوري الفرنسي 🇫🇷": [["باريس سان جيرمان", 12], ["سانت إيتيان", 10], ["مارسيليا", 10], ["موناكو", 8], ["نانت", 8], ["ليون", 7]],
  "الدوري السعودي 🇸🇦": [["الهلال", 19], ["الاتحاد", 9], ["النصر", 9], ["الشباب", 6], ["الأهلي", 3]],
  "الدوري المصري 🇪🇬": [["الأهلي", 44], ["الزمالك", 14], ["الإسماعيلي", 3], ["المقاولون", 1], ["غزل المحلة", 1]],
  "دوري أبطال أوروبا ⭐": [["ريال مدريد", 15], ["ميلان", 7], ["بايرن ميونخ", 6], ["ليفربول", 6], ["برشلونة", 5], ["إنتر ميلان", 3]]
};

function renderChampions() {
  const el = document.getElementById('championsContainer');
  if (!el) return;
  el.innerHTML = Object.entries(CHAMPIONS).map(([league, rows]) => {
    const max = rows[0][1];
    return `<div class="table-box"><h3>${league}</h3><table class="stand">
      <tr><th>#</th><th>النادي</th><th>الألقاب</th></tr>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r[0]}</td>
        <td><div style="display:flex;align-items:center;gap:8px;"><span class="pts">${r[1]} 🏆</span>
        <div style="flex:1;height:8px;background:#1e293b;border-radius:4px;overflow:hidden;"><div style="width:${(r[1] / max * 100).toFixed(0)}%;height:100%;background:linear-gradient(90deg,#fbbf24,#f59e0b);"></div></div></div></td></tr>`).join('')}
      </table></div>`;
  }).join('');
}

function renderStats() {
  const el = document.getElementById('statsContainer');
  if (!el) return;
  const tables = DATA.tables || {};
  if (!Object.keys(tables).length) { el.innerHTML = '<div class="card">الإحصائيات هتظهر مع أول تحديث للترتيب 🔄</div>'; return; }
  let html = '';
  Object.entries(tables).forEach(([league, rows]) => {
    if (!rows || !rows.length || typeof rows[0] === 'string') return;
    const sorted = [...rows].sort((a, b) => (Number(b.pts) || 0) - (Number(a.pts) || 0));
    const top = sorted[0];
    const mostWins = [...rows].sort((a, b) => (Number(b.w) || 0) - (Number(a.w) || 0))[0];
    const mostLosses = [...rows].sort((a, b) => (Number(b.l) || 0) - (Number(a.l) || 0))[0];
    const mostDraws = [...rows].sort((a, b) => (Number(b.d) || 0) - (Number(a.d) || 0))[0];
    const totalPts = rows.reduce((s, r) => s + (Number(r.pts) || 0), 0);
    const cards = [
      ['🥇', 'المتصدر', top ? top.team : '-', top ? top.pts + ' نقطة' : ''],
      ['💪', 'أكثر فوز', mostWins ? mostWins.team : '-', mostWins ? mostWins.w + ' فوز' : ''],
      ['😤', 'أكثر خسارة', mostLosses ? mostLosses.team : '-', mostLosses ? mostLosses.l + ' خسارة' : ''],
      ['🤝', 'أكثر تعادل', mostDraws ? mostDraws.team : '-', mostDraws ? mostDraws.d + ' تعادل' : ''],
      ['⚽', 'إجمالي النقاط', league, totalPts + ''],
      ['🏟️', 'عدد الفرق', league, rows.length + '']
    ];
    html += `<div class="table-box"><h3>🏆 ${league}</h3><div class="grid">${cards.map(c => `
      <div class="tv-card" style="text-align:center;">
        <div style="font-size:2em;">${c[0]}</div>
        <div style="font-weight:bold;color:#fbbf24;margin:6px 0;">${c[1]}</div>
        <div style="font-size:1.1em;font-weight:bold;">${c[2]}</div>
        <div style="opacity:.7;font-size:.85em;">${c[3]}</div>
      </div>`).join('')}</div></div>`;
  });
  el.innerHTML = html || '<div class="card">مفيش بيانات كافية دلوقتي 🔄</div>';
}

/* ===== 🔍 البحث الشامل المحسّن ===== */
function normAr(s) {
  return (s === null || s === undefined ? '' : String(s))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625\u0627\u0671]/g, 'ا')
    .replace(/\u0629/g, 'ه')
    .replace(/[\u0649\u0626]/g, 'ي')
    .replace(/\u0624/g, 'و')
    .replace(/\u0621/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function gsHl(text, q) {
  try {
    const i = String(text).toLowerCase().indexOf(String(q).toLowerCase());
    if (i < 0) return text;
    return text.slice(0, i) + '<b style="color:#fbbf24;">' + text.slice(i, i + q.length) + '</b>' + text.slice(i + q.length);
  } catch (e) { return text; }
}

let _gsTimer = null;
function globalSearch(q) {
  clearTimeout(_gsTimer);
  _gsTimer = setTimeout(function () { runGlobalSearch(q); }, 150);
}

function runGlobalSearch(q) {
  const el = document.getElementById('globalResults');
  if (!el) return;
  q = (q || '').trim();
  if (q.length < 2) { el.innerHTML = ''; return; }
  const nq = normAr(q);
  const hit = function (s) { return normAr(s).indexOf(nq) > -1; };
  const groups = [
    { icon: '⚽', title: 'مباريات', items: [] },
    { icon: '🏟️', title: 'فرق', items: [] },
    { icon: '👑', title: 'لاعبون وهدافون', items: [] },
    { icon: '🚩', title: 'منتخبات', items: [] },
    { icon: '📰', title: 'أخبار', items: [] },
    { icon: '🌍', title: 'عالمية', items: [] }
  ];
  const gMatch = groups[0], gTeam = groups[1], gPlayer = groups[2], gNat = groups[3], gNews = groups[4], gWorld = groups[5];
  (DATA.matches || []).forEach(g => (g.items || []).forEach(m => {
    if (hit(m.home) || hit(m.away)) {
      const state = m.state === 'in' ? '🔴 مباشر' : (m.state === 'post' ? '🏁 انتهت ' + m.hs + '-' + m.as : '🕐 ' + m.time);
      gMatch.items.push({
        text: m.home + ' × ' + m.away,
        sub: g.league + ' | ' + state,
        fn: function () { showMatch(m.slug, m.eid, m.home + ' × ' + m.away); }
      });
    }
  }));
  const seenTeams = {};
  Object.entries(DATA.tables || {}).forEach(([league, rows]) => {
    (rows || []).forEach(r => {
      if (r && typeof r === 'object' && r.team && !seenTeams[r.team] && hit(r.team)) {
        seenTeams[r.team] = 1;
        gTeam.items.push({
          text: r.team,
          sub: league + ' | المركز ' + (r.rank || '-') + ' | ' + (r.pts || 0) + ' نقطة',
          fn: function () { showTeam('', '', r.team); }
        });
      }
    });
  });
  const seenPlayers = {};
  const pool = (typeof fantasyPool === 'function') ? fantasyPool() : [];
  pool.forEach(p => {
    if (!p || seenPlayers[p.name] || !(hit(p.name) || hit(p.team))) return;
    seenPlayers[p.name] = 1;
    gPlayer.items.push({
      text: p.name,
      sub: (p.team || '-') + ' | ' + (p.cat || '') + ' ⭐' + (p.val || 0) + ' | 💰' + (p.price || 0),
      fn: function () {
        showNewsDetail(p.name, '👤 اللاعب: ' + p.name + '\n🏟️ الفريق: ' + (p.team || '-') + '\n🏆 ' + (p.cat || '') + '\n⭐ القيمة: ' + (p.val || 0) + '\n💰 السعر في الفانتازي: ' + (p.price || 0));
        const h = document.getElementById('teamModalTitle');
        if (h) h.textContent = '👑 ' + p.name;
      }
    });
  });
  const nats = (typeof NATIONALS !== 'undefined') ? NATIONALS : [];
  nats.forEach(n => {
    if (hit(n[0]) || hit(n[1])) {
      gNat.items.push({
        text: n[2] + ' منتخب ' + n[0],
        sub: n[1],
        fn: function () { showNational(n[1], n[0], n[2]); }
      });
    }
  });
  (DATA.news || []).forEach(n => {
    if (hit(n.t)) {
      gNews.items.push({ text: n.t, sub: 'خبر', fn: function () { showNewsDetail(n.t, n.full || n.t); } });
    }
  });
  (DATA.world || []).forEach(n => {
    if (hit(n.t)) {
      gWorld.items.push({ text: n.t, sub: 'خبر عالمي', fn: function () { showNewsDetail(n.t, n.full || n.t); } });
    }
  });
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  if (!total) {
    el.innerHTML = '<div style="background:#1e293b;border-radius:10px;padding:12px;opacity:.7;">مفيش نتايج لـ "' + q + '" 🔍 جرب اسم تاني أو اختصر البحث</div>';
    return;
  }
  const PER_GROUP = 6;
  const flat = [];
  groups.forEach(g => g.items.slice(0, PER_GROUP).forEach(it => flat.push(it)));
  window._gsResults = flat;
  let idx = 0;
  let html = '<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;max-height:340px;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.4);">';
  groups.forEach(g => {
    if (!g.items.length) return;
    const extra = g.items.length > PER_GROUP ? ' <span style="opacity:.6;font-weight:normal;">+ ' + (g.items.length - PER_GROUP) + ' زيادة</span>' : '';
    html += `<div style="position:sticky;top:0;background:#0f172a;padding:7px 12px;font-weight:bold;color:#fbbf24;font-size:.9em;border-bottom:1px solid #334155;">${g.icon} ${g.title} <span style="opacity:.7;font-weight:normal;">(${g.items.length})</span>${extra}</div>`;
    g.items.slice(0, PER_GROUP).forEach(it => {
      html += `<div style="padding:9px 12px;border-bottom:1px solid #24344f;cursor:pointer;display:flex;gap:10px;align-items:center;" onclick="if(window._gsResults[${idx}])window._gsResults[${idx}].fn()" onmouseover="this.style.background='#28354b'" onmouseout="this.style.background='transparent'">
        <span style="font-size:1.15em;">${g.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:.92em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${gsHl(it.text, q)}</div>
          <div style="opacity:.6;font-size:.78em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.sub || ''}</div>
        </div>
      </div>`;
      idx++;
    });
  });
  html += `<div style="padding:8px 12px;opacity:.55;font-size:.75em;text-align:center;">إجمالي ${total} نتيجة — اضغط Esc للإغلاق 🔎</div></div>`;
  el.innerHTML = html;
}

/* Esc يقفل نتايج البحث */
(function () {
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const el = document.getElementById('globalResults');
      if (el) el.innerHTML = '';
    }
  });
})();

/* ===== ⚡ التحديث الذكي ===== */
let _lastDataRaw = '';
let _lastRefresh = 0;

async function loadData() {
  _lastRefresh = Date.now();
  try {
    const r = await fetch('site/data.json?t=' + Date.now(), { cache: 'no-store' });
    const raw = await r.text();
    if (raw && raw === _lastDataRaw) return;
    _lastDataRaw = raw;
    DATA = JSON.parse(raw);
    document.getElementById('lastUpdate').textContent = 'آخر تحديث: ' + DATA.updated_at;
    MATCHES = DATA.matches || [];
    renderMatches();
    renderLeaders();
    renderTv();
    renderPredict();
    renderFantasy();
    loadBoard();
    renderShop();
    renderWorld();
    renderTransfers();
    renderArchive();
    renderPlayers();
    fillTeamSelects();
    renderStats();
    renderFeaturedMatch();
    document.getElementById('newsContainer').innerHTML = (DATA.news || []).length
      ? DATA.news.map(n => {
          const t = typeof n === 'string' ? n : (n.t || '');
          const full = typeof n === 'string' ? n : (n.full || n.t || '');
          const img = (n && typeof n === 'object' && n.img) ? n.img : '';
          return `<div class="news-card" onclick="showNewsDetail('${esc(t)}','${esc(full)}','${esc(img)}')">
            ${img ? `<img class="news-img" src="${img}" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div class="news-body">
              <div class="news-title">${t}</div>
              <div class="news-hint">👆 اضغط لقراءة الخبر كامل</div>
            </div>
          </div>`;
        }).join('')
      : '<div class="card">لا توجد أخبار جديدة حالياً</div>';
    document.getElementById('resultsContainer').innerHTML = (DATA.results || []).length
      ? DATA.results.map(t => `<div class="result-item">🏁 ${t}</div>`).join('')
      : '<div class="card">لا توجد نتائج اليوم</div>';
    document.getElementById('tablesContainer').innerHTML = Object.entries(DATA.tables || {})
      .filter(([name, rows]) => rows && rows.length)
      .map(([name, rows]) => {
        const isString = rows[0] && typeof rows[0] === 'string';
        if (isString) {
          return `<div class="table-box"><h3>🏆 ${name}</h3><div class="list">${rows.map(r => `<div class="result-item">📊 ${r}</div>`).join('')}</div></div>`;
        }
        return `<div class="table-box"><h3>🏆 ${name}</h3>
          <table class="stand"><tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>نقاط</th></tr>
          ${rows.map(r => `<tr><td>${r.rank}</td><td class="team-link" data-team="${r.slug || ''}|${r.id || ''}|${r.team}">${teamLogo(r.logo)} ${r.team}</td><td>${r.gp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="pts">${r.pts}</td></tr>`).join('')}
          </table></div>`;
      }).join('');
  } catch (e) {
    console.error('خطأ:', e);
    document.getElementById('newsContainer').innerHTML = '<div class="card">جاري تحميل البيانات...</div>';
  }
}

loadData();

setInterval(loadData, 300000);

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && Date.now() - _lastRefresh > 120000) {
    loadData();
  }
});

window.addEventListener('online', function () {
  setTimeout(loadData, 1500);
});

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const b = document.getElementById('installBtn');
  if (b) b.style.display = 'inline-block';
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') {
        const b = document.getElementById('installBtn');
        if (b) b.style.display = 'none';
      }
      deferredPrompt = null;
    });
  } else {
    alert('افتح قايمة المتصفح (⋮) واختار "تثبيت التطبيق" 📲');
  }
}
