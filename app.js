let MATCHES = [];
let CURRENT_TAB = 'big';

function renderMatches() {
  const el = document.getElementById('matchesContainer');
  const groups = CURRENT_TAB === 'big' ? MATCHES.filter(g => g.big) : MATCHES;
  if (groups.length > 0) {
    el.innerHTML = groups.map(g => `
      <div class="league-box">
        <div class="league-title">🏆 ${g.league}</div>
        ${g.items.map(m => {
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
              <div class="m-team team-link" onclick="showTeam('${m.slug}','${m.homeId}','${m.home}')">${m.home}</div>
              ${score}
              <div class="m-team team-link" onclick="showTeam('${m.slug}','${m.awayId}','${m.away}')">${m.away}</div>
            </div>${statsHtml}
          </div>`;
        }).join('')}
      </div>`).join('');
  } else {
    el.innerHTML = '<div class="card">لا توجد مباريات في هذا التبويب حالياً</div>';
  }
}

function showTab(t) {
  CURRENT_TAB = t;
  document.getElementById('tabBig').classList.toggle('active', t === 'big');
  document.getElementById('tabAll').classList.toggle('active', t === 'all');
  renderMatches();
}

async function showTeam(slug, teamId, teamName) {
  const box = document.getElementById('teamModal');
  box.style.display = 'block';
  document.getElementById('teamModalTitle').textContent = '👥 ' + teamName;
  document.getElementById('teamModalBody').innerHTML = 'جاري تحميل القائمة...';
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`);
    const d = await r.json();
    let html = '';
    (d.athletes || []).forEach(g => {
      const pos = g.position ? g.position.name : 'لاعبون';
      const names = (g.items || []).map(i => (i.athlete.displayName || i.athlete.fullName || '') + (i.athlete.jersey ? ' (' + i.athlete.jersey + ')' : '')).filter(Boolean).join('، ');
      if (names) html += `<div class="pos-box"><b>${pos}:</b> ${names}</div>`;
    });
    document.getElementById('teamModalBody').innerHTML = html || 'لا توجد بيانات متاحة لهذا الفريق';
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
    tablesEl.innerHTML = Object.entries(data.tables || {}).map(([name, rows]) => `
      <div class="table-box">
        <h3>🏆 ${name}</h3>
        <table class="stand">
          <tr><th>#</th><th>الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>نقاط</th></tr>
          ${rows.map(r => `<tr><td>${r.rank}</td><td>${r.team}</td><td>${r.gp}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="pts">${r.pts}</td></tr>`).join('')}
        </table>
      </div>`).join('');

  } catch (e) {
    console.error('خطأ:', e);
    document.getElementById('newsContainer').innerHTML = '<div class="card">جاري تحميل البيانات...</div>';
  }
}

loadData();
setInterval(loadData, 60000);