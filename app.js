async function loadData() {
  try {
    const r = await fetch('site/data.json?t=' + Date.now());
    const data = await r.json();

    document.getElementById('lastUpdate').textContent = 'آخر تحديث: ' + data.updated_at;

    const matchesEl = document.getElementById('matchesContainer');
    if (data.matches && data.matches.length > 0) {
      matchesEl.innerHTML = data.matches.map(g => `
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
      matchesEl.innerHTML = '<div class="card">لا توجد مباريات حالياً</div>';
    }

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