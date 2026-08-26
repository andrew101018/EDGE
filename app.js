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
          return `<div class="match-row"><div class="m-team">${m.home}</div>${score}<div class="m-team">${m.away}</div></div>`;
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
        <ul>${rows.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>`).join('');

  } catch (e) {
    console.error('خطأ:', e);
    document.getElementById('newsContainer').innerHTML = '<div class="card">جاري تحميل البيانات...</div>';
  }
}

loadData();
setInterval(loadData, 60000);