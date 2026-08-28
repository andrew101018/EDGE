let DATA = {};
const SUPA_URL = 'https://ejfdqvjfzgsjtztzvhem.supabase.co/rest/v1/';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZmRxdmpmemdzanR6dHp2aGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzE3NDAsImV4cCI6MjEwMjgwNzc0MH0.YD0-kgvHlRIPbJMulwv6PKhxKz9frzeT5m4QGYRGBA4';
let supa = null;
try {
  if (window.supabase && SUPA_URL.includes('supabase.co')) supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
} catch (e) {}
let MATCHES = [];

function go(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const sec = document.getElementById('sec-' + page);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo({top: 0});
}

function teamLogo(src) {
  if (!src) return '';
  return `<img class="t-logo" src="${src}" onerror="this.style.display='none'">`;
}

// 👆 فتح قائمة اللاعبين — ربط مباشر + احتياطي
function bindTeamLinks() {
  document.querySelectorAll('[data-team]').forEach(el => {
    el.onclick = function () {
      const parts = el.getAttribute('data-team').split('|');
      showTeam(parts[0], parts[1], parts[2] || '');
    };
  });
}
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-team]');
  if (!el) return;
  const parts = el.getAttribute('data-team').split('|');
  showTeam(parts[0], parts[1], parts[2] || '');
});
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-match]');
  if (!el) return;
  const parts = el.getAttribute('data-match').split('|');
  if (parts[0] && parts[0] !== 'undefined') showMatch(parts[1], parts[0], parts[2] || 'مباراة');
});
// 🛡️ شفاء ذاتي: ننشئ النافذة والاستايل لو مش موجودين
(function () {
  if (!document.getElementById('teamModal')) {
    const b = document.createElement('div');
    b.id = 'teamModal';
    b.className = 'modal';
    b.innerHTML = '<div class="modal-box"><div class="modal-head"><span id="teamModalTitle"></span><button onclick="closeTeam()">✖</button></div><div id="teamModalBody" class="modal-body"></div></div>';
    document.body.appendChild(b);
  }
  const st = document.createElement('style');
  st.textContent = '.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:999}.modal-box{max-width:640px;margin:6% auto;background:#1e293b;border-radius:12px;padding:20px;max-height:80vh;overflow-y:auto}.modal-head{display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:#fbbf24;font-size:1.2em;margin-bottom:12px}.modal-head button{background:none;border:none;color:#ef4444;font-size:1.2em;cursor:pointer}';
  document.head.appendChild(st);
})();
document.addEventListener('click', function (e) {
  const el = e.target.closest('[data-team]');
  if (!el) return;
  const parts = el.getAttribute('data-team').split('|');
  showTeam(parts[0], parts[1], parts[2] || '');
});

function matchRow(m) {
  let score = '';
  if (m.state === 'in') score = `<div class="m-score live">${m.hs} - ${m.as}<span class="m-status">🔴 ${m.detail}</span></div>`;
  else if (m.state === 'post') score = `<div class="m-score post">${m.hs} - ${m.as}<span class="m-status">انتهت</span></div>`;
  else score = `<div class="m-score pre">${m.time}<span class="m-status">لم تبدأ</span></div>`;

  let statsHtml = '';
  if (m.stats) {
    const labels = {possession:'استحواذ %', shotsOnTarget:'تسديدات على المرمى', cornerKicks:'ركنيات', totalShots:'تسديدات', foulsCommitted:'أخطاء'};
    statsHtml = '<div class="m-stats">' + Object.entries(m.stats).map(([k,v]) =>
      `<span>${v[0]} | ${labels[k]||k} | ${v[1]}</span>`).join('') + '</div>';
  }

  const tvHtml = m.tv ? `<div class="tv-line">${m.tvUrl ? `<a href="${m.tvUrl}" target="_blank">📺 يُذاع عبر: ${m.tv}</a>` : `📺 ${m.tv}`}</div>` : '';

    return `<div class="match-wrap">
    <div class="match-row" style="cursor:pointer;" data-match="${m.eid}|${m.slug}|${m.home} × ${m.away}">
      <div class="m-team team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</div>
      ${score}
      <div class="m-team team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</div>
    </div>${tvHtml}${statsHtml}
  </div>`;
}

function renderMatches() {
  const el = document.getElementById('matchesContainer');
  const groups = MATCHES;
  const liveItems = [];
  groups.forEach(g => g.items.forEach(m => {
    if (m.state === 'in') liveItems.push(Object.assign({}, m, {league: g.league}));
  }));
  let liveHtml = '';
  if (liveItems.length) {
    liveHtml = '<div class="live-block"><div class="live-title">🔴 مباشر الآن</div>' +
      liveItems.map(m => `
        <div class="live-card">
          <div class="live-teams">
            <span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</span>
            <span class="live-score">${m.hs} - ${m.as}</span>
            <span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</span>
          </div>
          <div class="live-meta">⏱️ ${m.detail} | ${m.league}${m.tv ? ` | 📺 ${m.tv}` : ''}</div>
        </div>`).join('') + '</div>';
  }
  const restHtml = groups.map(g => {
    const items = g.items.filter(m => m.state !== 'in');
    if (!items.length) return '';
    return `<div class="league-box"><div class="league-title">🏆 ${g.league}</div>${items.map(matchRow).join('')}</div>`;
  }).join('');
    let resultsHtml = '';
  if (DATA.results && DATA.results.length) {
    resultsHtml = '<h2 style="margin-top:24px;">🏁 نتائج اليوم</h2><div class="list">' +
      DATA.results.map(t => `<div class="result-item">🏁 ${t}</div>`).join('') + '</div>';
  }
  el.innerHTML = (liveHtml + restHtml + resultsHtml) || '<div class="card">لا توجد مباريات حالياً</div>';
}

function renderLeaders() {
  const el = document.getElementById('leadersContainer');
  const L = DATA.leaders || {};
  const keys = Object.keys(L);
  if (!keys.length) { el.innerHTML = '<div class="card">لا توجد بيانات حالياً</div>'; return; }
  el.innerHTML = keys.map(league => `
    <div class="league-box"><div class="league-title">🏆 ${league}</div>
      ${Object.entries(L[league]).map(([cat, items]) => `
        <div class="pos-box"><b>${cat}:</b><div class="p-grid">
          ${items.map(p => `<span class="p-card">${p.face ? `<img class="p-face" src="${p.face}" onerror="this.style.display='none'">` : '👤'} ${p.name} <small>(${p.team})</small> — <b>${p.value}</b></span>`).join('')}
        </div></div>`).join('')}
    </div>`).join('');
}

function renderTv() {
  const el = document.getElementById('tvContainer');
  const rows = [];
  (DATA.matches || []).forEach(g => g.items.forEach(m => {
    if (m.tv && m.state !== 'post') rows.push(m);
  }));
  el.innerHTML = rows.length ? rows.map(m => `
    <div class="tv-card">
      <div class="tv-teams">${teamLogo(m.homeLogo)} ${m.home} × ${m.away} ${teamLogo(m.awayLogo)}</div>
      <div class="tv-info">${m.state === 'in' ? '🔴 الآن' : '🕐 ' + m.time} | ${m.league}</div>
      ${m.tvUrl ? `<a class="btn" href="${m.tvUrl}" target="_blank">📺 ${m.tv}</a>` : `<span>📺 ${m.tv}</span>`}
    </div>`).join('')
    : '<div class="card">لا توجد مباريات مذاعة قريباً</div>';
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

  document.getElementById('predictPoints').innerHTML =
    `⭐ نقاطك: <b>${points}</b> — النتيجة الصح بـ 3 نقاط والاتجاه الصح بنقطة`;

  const upcoming = [];
  (DATA.matches || []).forEach(g => g.items.forEach(m => { if (m.state === 'pre') upcoming.push(m); }));
  const el = document.getElementById('predictContainer');
  if (!upcoming.length) { el.innerHTML = '<div class="card">لا توجد مباريات قادمة للتوقع حالياً</div>'; return; }
  el.innerHTML = upcoming.slice(0, 12).map(m => {
    const v = saved[m.eid] || ['', ''];
    return `<div class="pred-row" data-eid="${m.eid}">
      <div class="pred-teams">${teamLogo(m.homeLogo)} ${m.home} × ${m.away} ${teamLogo(m.awayLogo)}</div>
      <div class="pred-inputs">
        <input type="number" min="0" class="pred-h" value="${v[0]}" placeholder="0">
        <span>-</span>
        <input type="number" min="0" class="pred-a" value="${v[1]}" placeholder="0">
      </div>
    </div>`;
  }).join('');
}

function savePredict() {
  const saved = JSON.parse(localStorage.getItem('edgePredict') || '{}');
  let count = 0;
  document.querySelectorAll('.pred-row').forEach(row => {
    const h = row.querySelector('.pred-h').value;
    const a = row.querySelector('.pred-a').value;
    if (h !== '' && a !== '') { saved[row.dataset.eid] = [parseInt(h), parseInt(a)]; count++; }
  });
  localStorage.setItem('edgePredict', JSON.stringify(saved));
  alert(count ? `تم حفظ ${count} توقع ✅ النقاط بتتحسب لوحدها بعد المباريات` : 'اكتب نتيجة واحدة على الأقل الأول 😅');
    uploadScore(true);
}


async function showTeam(slug, teamId, teamName) {
  let box = document.getElementById('teamModal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'teamModal';
    box.innerHTML = '<div><div style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:#fbbf24;font-size:1.2em;margin-bottom:12px;"><span id="teamModalTitle"></span><button onclick="closeTeam()" style="background:none;border:none;color:#ef4444;font-size:1.3em;cursor:pointer;">✖</button></div><div id="teamModalBody"></div></div>';
    document.body.appendChild(box);
  }
  box.style.cssText = 'display:block;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;overflow:auto;';
  box.firstElementChild.style.cssText = 'max-width:640px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('teamModalTitle').textContent = '👥 ' + teamName;
  document.getElementById('teamModalBody').innerHTML = 'جاري تحميل القائمة...';
  try {
    const [rRoster, rTeam] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}`)
    ]);
    let html = '';
    try {
      const dt = await rTeam.json();
      const coach = (dt.coach && (dt.coach.displayName || dt.coach.fullName)) ||
                    (dt.team && dt.team.coach && (dt.team.coach.displayName || dt.team.coach.fullName)) ||
                    (Array.isArray(dt.coaches) && dt.coaches[0] && (dt.coaches[0].displayName || dt.coaches[0].fullName)) || null;
      if (coach) html += `<div class="pos-box coach-box">🎯 المدير الفني: <b>${coach}</b></div>`;
    } catch (e) {}
          const d = await rRoster.json();

    const coachName = d.coach && (d.coach.displayName || d.coach.fullName || d.coach.name);
    if (coachName) html += `<div class="pos-box coach-box">🎯 المدير الفني: <b>${coachName}</b></div>`;

    const players = [];
    const addList = (pos, list) => {
      (list || []).forEach(i => {
        const a = i.athlete || i;
        if (a && (a.displayName || a.fullName)) players.push({pos, a});
      });
    };
    if (Array.isArray(d.athletes)) {
      d.athletes.forEach(g => {
        if (g && (g.items || g.athletes)) {
          const pos = typeof g.position === 'string' ? g.position
                    : (g.position && (g.position.name || g.position.displayName)) || 'لاعبون';
          addList(pos, g.items || g.athletes);
        } else if (g && (g.displayName || g.fullName)) {
          const pos = (g.position && (g.position.name || g.position.displayName)) || 'لاعبون';
          players.push({pos, a: g});
        }
      });
    } else if (d.athletes && typeof d.athletes === 'object') {
      Object.entries(d.athletes).forEach(([pos, list]) => addList(pos, list));
    }

    const byPos = {};
    players.forEach(p => { (byPos[p.pos] = byPos[p.pos] || []).push(p.a); });
    Object.entries(byPos).forEach(([pos, list]) => {
      const cards = list.map(a => {
        const face = (a.headshot && (a.headshot.href || a.headshot.url)) || (a.id ? `https://a.espncdn.com/i/headshots/soccer/players/full/${a.id}.png` : '');
        const s = a.statistics || {};
        const bits = [];
        if (s.goals) bits.push(`⚽ ${s.goals}`);
        if (s.assists) bits.push(`🅰️ ${s.assists}`);
        return `<span class="p-card">${face ? `<img class="p-face" src="${face}" onerror="this.style.display='none'">` : '👤'} ${a.displayName || a.fullName}${a.jersey ? ` (${a.jersey})` : ''}${bits.length ? ` <small>${bits.join(' ')}</small>` : ''}</span>`;
      }).join('');
      if (cards) html += `<div class="pos-box"><b>${pos}:</b><div class="p-grid">${cards}</div></div>`;
    });
    document.getElementById('teamModalBody').innerHTML = html || ('لا توجد بيانات — عينة: ' + JSON.stringify(d).slice(0, 300));
  } catch (e) {
    document.getElementById('teamModalBody').innerHTML = '❌ خطأ في تحميل البيانات: ' + e.message;
  }
}

async function showMatch(slug, eid, title) {
  let box = document.getElementById('matchModal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'matchModal';
    box.innerHTML = '<div><div style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:#fbbf24;font-size:1.2em;margin-bottom:12px;"><span id="matchModalTitle"></span><button onclick="closeMatch()" style="background:none;border:none;color:#ef4444;font-size:1.3em;cursor:pointer;">✖</button></div><div id="matchModalBody"></div></div>';
    document.body.appendChild(box);
  }
  box.style.cssText = 'display:block;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;overflow:auto;';
  box.firstElementChild.style.cssText = 'max-width:640px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('matchModalTitle').textContent = '⚽ ' + title;
  document.getElementById('matchModalBody').innerHTML = 'جاري تحميل التفاصيل...';
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${eid}`);
    const d = await r.json();
    let html = '';

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
      const labels = {possession:'استحواذ %', shotsOnTarget:'تسديدات على المرمى', cornerKicks:'ركنيات', totalShots:'تسديدات', foulsCommitted:'أخطاء', offsides:'تسلل', saves:'تصديات'};
      html += '<div class="pos-box"><b>📊 الإحصائيات:</b><div class="p-grid">' + st.map(s => {
        const l = labels[s.name] || s.name;
        return `<span class="p-card">${s.homeValue} | ${l} | ${s.awayValue}</span>`;
      }).join('') + '</div></div>';
    }

    document.getElementById('matchModalBody').innerHTML = html || 'التفاصيل مش متاحة للمباراة دي حالياً';
  } catch (e) {
    document.getElementById('matchModalBody').innerHTML = 'تعذر تحميل التفاصيل';
  }
}
function closeMatch() { const b = document.getElementById('matchModal'); if (b) b.style.display = 'none'; }

function closeTeam() { document.getElementById('teamModal').style.display = 'none'; }

let FANTASY_SEL = JSON.parse(localStorage.getItem('edgeFantasy') || 'null');

function fantasyPool() {
  const map = {};
  Object.values(DATA.leaders || {}).forEach(cats => {
    Object.entries(cats).forEach(([cat, items]) => {
      items.forEach(p => {
        const val = parseInt(p.value) || 0;
        if (!map[p.name] || val > map[p.name].val) {
          map[p.name] = {name: p.name, team: p.team, face: p.face, cat, val};
        }
      });
    });
  });
  return Object.values(map).map(p => Object.assign(p, {price: 4 + p.val}));
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
  document.getElementById('fantasyInfo').innerHTML =
    `⭐ نقاط فريقك: <b>${pts}</b> — الهدف +3 والأسيست +2 (بتتحدث لوحدها مع كل تحديث)`;

  document.getElementById('fantasySquad').innerHTML = chosen.length ?
    chosen.map(n => {
      const p = pool.find(x => x.name === n);
      return p ? `<span class="p-card">${p.face ? `<img class="p-face" src="${p.face}" onerror="this.style.display='none'">` : '👤'} ${p.name} <small>💰${p.price}</small></span>` : '';
    }).join('') : '';

  document.getElementById('fantasyPool').innerHTML = pool
    .sort((a, b) => b.val - a.val).slice(0, 40).map(p => `
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
    if (spent + p.price > 40) { alert('الميزانية مش كافية! 💸'); return; }
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
    return {name: n, val: p ? p.val : 0, cat: p ? p.cat : ''};
  });
  localStorage.setItem('edgeFantasy', JSON.stringify(FANTASY_SEL));
  alert('تم حفظ فريقك! ⚽ النقاط هتتحسب لوحدها مع كل تحديث بيانات');
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
  if (!supa) { if (!silent) alert('وصّل مفاتيح Supabase في أول app.js الأول'); return; }
  let name = localStorage.getItem('edgeName');
  if (!name) {
    name = prompt('اكتب اسمك اللي هيظهر في لوحة الصدارة:');
    if (!name) return;
    localStorage.setItem('edgeName', name.trim());
  }
  const pred = parseInt(localStorage.getItem('edgePoints') || '0');
  const fan = fantasyPoints();
  const id = name.trim().toLowerCase().replace(/\s+/g, '-');
  const {error} = await supa.from('players').upsert({
    id, name: name.trim(), pred_points: pred, fantasy_points: fan, total: pred + fan
  });
  if (!silent) alert(error ? 'خطأ: ' + error.message : 'تم رفع نقاطك 🚀');
  loadBoard();
}

async function loadBoard() {
  const el = document.getElementById('boardContainer');
  if (!el) return;
  if (!supa) { el.innerHTML = '<div class="card">🏅 اللوحة هتشتغل بعد توصيل مفاتيح Supabase</div>'; return; }
  const {data, error} = await supa.from('players').select('*').order('total', {ascending: false}).limit(50);
  if (error || !data || !data.length) { el.innerHTML = '<div class="card">لسه مفيش لاعبين — كن أول من يرفع نقاطه! 🚀</div>'; return; }
  const medals = ['🥇', '🥈', ''];
  el.innerHTML = '<table class="stand"><tr><th>#</th><th>الاسم</th><th>توقعات</th><th>فانتازي</th><th>الإجمالي</th></tr>' +
    data.map((r, i) => `<tr><td>${medals[i] || i + 1}</td><td>${r.name}</td><td>${r.pred_points}</td><td>${r.fantasy_points}</td><td class="pts">${r.total}</td></tr>`).join('') +
    '</table>';
}

async function loadData() {
  try {
    const r = await fetch('site/data.json?t=' + Date.now());
    DATA = await r.json();

    document.getElementById('lastUpdate').textContent = 'آخر تحديث: ' + DATA.updated_at;

    MATCHES = DATA.matches || [];
    renderMatches();
    renderLeaders();
    renderTv();
    renderPredict();
   renderFantasy();
       loadBoard();

    document.getElementById('newsContainer').innerHTML = DATA.news.length > 0
      ? DATA.news.map(n => `<div class="news-item">${n.t}</div>`).join('')
      : '<div class="card">لا توجد أخبار جديدة حالياً</div>';

    document.getElementById('resultsContainer').innerHTML = DATA.results.length > 0
      ? DATA.results.map(t => `<div class="result-item">🏁 ${t}</div>`).join('')
      : '<div class="card">لا توجد نتائج اليوم</div>';

    document.getElementById('tablesContainer').innerHTML = Object.entries(DATA.tables || {})
      .filter(([name, rows]) => rows && rows.length)
      .map(([name, rows]) => `
      <div class="table-box">
        <h3>🏆 ${name}</h3>
        <table class="stand">
          <tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>نقاط</th></tr>
          ${rows.map(r => `<tr><td>${r.rank}</td><td class="team-link" data-team="${r.slug}|${r.id}|${r.team}">${teamLogo(r.logo)} ${r.team}</td><td>${r.gp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="pts">${r.pts}</td></tr>`).join('')}
        </table>
      </div>`).join('');

    bindTeamLinks();
  } catch (e) {
    console.error('خطأ:', e);
    document.getElementById('newsContainer').innerHTML = '<div class="card">جاري تحميل البيانات...</div>';
  }
}

loadData();
setInterval(loadData, 60000);