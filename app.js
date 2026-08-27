let DATA = {};
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
    <div class="match-row">
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
  el.innerHTML = liveHtml + restHtml || '<div class="card">لا توجد مباريات حالياً</div>';
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
    const players = [];
    (d.athletes || []).forEach(g => {
      const pos = typeof g.position === 'string' ? g.position
                : (g.position && (g.position.name || g.position.displayName)) || 'لاعبون';
      (g.items || g.athletes || []).forEach(i => {
        const a = i.athlete || i;
        if (a.displayName || a.fullName) players.push({pos, a});
      });
    });
    const flat = (d.roster && (d.roster.entries || d.roster.items)) || d.entries || [];
    flat.forEach(e => {
      const a = e.athlete || e;
      if (a.displayName || a.fullName) {
        const pos = (a.position && (a.position.name || a.position.displayName)) || 'لاعبون';
        players.push({pos, a});
      }
    });
    const byPos = {};
    players.forEach(p => { (byPos[p.pos] = byPos[p.pos] || []).push(p.a); });
    Object.entries(byPos).forEach(([pos, list]) => {
      const cards = list.map(a => {
        const face = (a.headshot && (a.headshot.href || a.headshot.url)) || '';
        const s = a.statistics || {};
        const bits = [];
        if (s.goals) bits.push(`⚽ ${s.goals}`);
        if (s.assists) bits.push(`🅰️ ${s.assists}`);
        return `<span class="p-card">${face ? `<img class="p-face" src="${face}" onerror="this.style.display='none'">` : '👤'} ${a.displayName || a.fullName}${a.jersey ? ` (${a.jersey})` : ''}${bits.length ? ` <small>${bits.join(' ')}</small>` : ''}</span>`;
      }).join('');
      if (cards) html += `<div class="pos-box"><b>${pos}:</b><div class="p-grid">${cards}</div></div>`;
    });
    document.getElementById('teamModalBody').innerHTML = html || ('لا توجد بيانات — شكل البيانات: ' + Object.keys(d).join(', '));
  } catch (e) {
    document.getElementById('teamModalBody').innerHTML = '❌ خطأ في تحميل البيانات: ' + e.message;
  }
}

function closeTeam() { document.getElementById('teamModal').style.display = 'none'; }

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

  } catch (e) {
    bindTeamLinks();
    console.error('خطأ:', e);
    document.getElementById('newsContainer').innerHTML = '<div class="card">جاري تحميل البيانات...</div>';
  }
}

loadData();
setInterval(loadData, 60000);