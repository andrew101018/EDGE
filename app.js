let MATCHES = [];

function teamLogo(src) {
  if (!src) return '';
  return `<img class="t-logo" src="${src}" onerror="this.style.display='none'">`;
}

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
  return `<div class="match-wrap">
    <div class="match-row">
      <div class="m-team team-link" onclick="showTeam('${m.slug}','${m.homeId}','${m.home}')">${teamLogo(m.homeLogo)} ${m.home}</div>
      ${score}
      <div class="m-team team-link" onclick="showTeam('${m.slug}','${m.awayId}','${m.away}')">${m.away} ${teamLogo(m.awayLogo)}</div>
    </div>${statsHtml}
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
            <span class="team-link" onclick="showTeam('${m.slug}','${m.homeId}','${m.home}')">${teamLogo(m.homeLogo)} ${m.home}</span>
            <span class="live-score">${m.hs} - ${m.as}</span>
            <span class="team-link" onclick="showTeam('${m.slug}','${m.awayId}','${m.away}')">${m.away} ${teamLogo(m.awayLogo)}</span>
          </div>
          <div class="live-meta">⏱️ ${m.detail} | ${m.league}</div>
        </div>`).join('') + '</div>';
  }

  const restHtml = groups.map(g => {
    const items = g.items.filter(m => m.state !== 'in');
    if (!items.length) return '';
    return `<div class="league-box">
      <div class="league-title">🏆 ${g.league}</div>
      ${items.map(matchRow).join('')}
    </div>`;
  }).join('');

  const finalHtml = liveHtml + restHtml;
  el.innerHTML = finalHtml || '<div class="card">لا توجد مباريات حالياً</div>';
}

async function showTeam(slug, teamId, teamName) {
  const box = document.getElementById('teamModal');
  box.style.display = 'block';
  document.getElementById('teamModalTitle').textContent = '👥 ' + teamName;
  document.getElementById('teamModalBody').innerHTML = 'جاري تحميل القائمة...';
  try {
    const [rRoster, rTeam] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}`)
    ]);

    let html = '';

    // 🎯 المدرب
    try {
      const dt = await rTeam.json();
      const coach = (dt.coach && (dt.coach.displayName || dt.coach.fullName)) ||
                    (dt.team && dt.team.coach && (dt.team.coach.displayName || dt.team.coach.fullName)) ||
                    (Array.isArray(dt.coaches) && dt.coaches[0] && (dt.coaches[0].displayName || dt.coaches[0].fullName)) || null;
      if (coach) html += `<div class="pos-box coach-box">🎯 المدير الفني: <b>${coach}</b></div>`;
    } catch (e) {}

    // 👥 اللاعبين بالمراكز + الوجوه + الإحصائيات
    const d = await rRoster.json();
    (d.athletes || []).forEach(g => {
      const pos = typeof g.position === 'string' ? g.position
                : (g.position && (g.position.name || g.position.displayName)) || 'لاعبون';
      const items = g.items || g.athletes || [];
      const cards = items.map(i => {
        const a = i.athlete || i;
        const name = a.displayName || a.fullName || '';
        if (!name) return '';
        const face = (a.headshot && (a.headshot.href || a.headshot.url)) || '';
        const s = a.statistics || {};
        const bits = [];
        if (s.goals) bits.push(`⚽ ${s.goals}`);
        if (s.assists) bits.push(`🅰️ ${s.assists}`);
        if (s.appearances || s.gamesPlayed) bits.push(`📋 ${s.appearances || s.gamesPlayed}`);
        return `<span class="p-card">${face ? `<img class="p-face" src="${face}" onerror="this.style.display='none'">` : '👤'} ${name}${a.jersey ? ` (${a.jersey})` : ''}${bits.length ? ` <small>${bits.join(' ')}</small>` : ''}</span>`;
      }).filter(Boolean).join('');
      if (cards) html += `<div class="pos-box"><b>${pos}:</b><div class="p-grid">${cards}</div></div>`;
    });

    document.getElementById('teamModalBody').innerHTML = html || 'لا توجد بيانات متاحة لهذا الفريق حالياً';
  } catch (e) {
    document.getElementById('teamModalBody').innerHTML = 'تعذر تحميل القائمة — جرب فريق تاني';
  }
}

function closeTeam() { document.getElementById('teamModal').style.display = 'none'; }

async function loadData() {
  try {
    const r = await fetch('site/data.json?t=' + Date.now());
    const data = await r.json();

    document.getElementById('lastUpdate').textContent = 'آخر تحديث: ' + data.updated_at;

    MATCHES = data.matches || [];
    renderMatches();

    const newsEl = document.getElementById('newsContainer');
    newsEl.innerHTML = data.news.length > 0
      ? data.news.map(n => `<div class="news-item">${n.t}</div>`).join('')
      : '<div class="card">لا توجد أخبار جديدة حالياً</div>';

    const resultsEl = document.getElementById('resultsContainer');
    resultsEl.innerHTML = data.results.length > 0
      ? data.results.map(t => `<div class="result-item">🏁 ${t}</div>`).join('')
      : '<div class="card">لا توجد نتائج اليوم</div>';

    const tablesEl = document.getElementById('tablesContainer');
    tablesEl.innerHTML = Object.entries(data.tables || {})
      .filter(([name, rows]) => rows && rows.length)
      .map(([name, rows]) => `
      <div class="table-box">
        <h3>🏆 ${name}</h3>
        <table class="stand">
          <tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>نقاط</th></tr>
          ${rows.map(r => `<tr><td>${r.rank}</td><td class="team-link" onclick="showTeam('${r.slug}','${r.id}','${r.team}')">${teamLogo(r.logo)} ${r.team}</td><td>${r.gp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="pts">${r.pts}</td></tr>`).join('')}
        </table>
      </div>`).join('');

  } catch (e) {
    console.error('خطأ:', e);
    document.getElementById('newsContainer').innerHTML = '<div class="card">جاري تحميل البيانات...</div>';
  }
}

loadData();
setInterval(loadData, 60000);