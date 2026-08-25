async function loadData() {
  try {
    const r = await fetch('data.json?t=' + Date.now());
    const data = await r.json();

    document.getElementById('lastUpdate').textContent = 'آخر تحديث: ' + data.updated_at;

    // مباريات لايف
    const liveEl = document.getElementById('liveContainer');
    if (data.live && data.live.length > 0) {
      document.getElementById('liveSection').style.display = 'block';
      liveEl.innerHTML = data.live.map(m => `
        <div class="card match-card">
          <div class="teams">${m.home} × ${m.away}</div>
          <div class="score">${m.home_score} - ${m.away_score}</div>
          <div class="league">🔴 مباشر | ${m.league}</div>
        </div>`).join('');
    }

    // الأخبار
    const newsEl = document.getElementById('newsContainer');
    newsEl.innerHTML = data.news.length > 0
      ? data.news.map(t => `<div class="news-item">${t}</div>`).join('')
      : '<div class="card">لا توجد أخبار جديدة حالياً</div>';

    // النتائج
    const resultsEl = document.getElementById('resultsContainer');
    resultsEl.innerHTML = data.results.length > 0
      ? data.results.map(t => `<div class="result-item">🏁 ${t}</div>`).join('')
      : '<div class="card">لا توجد نتائج اليوم</div>';

    // الجدول
    const scheduleEl = document.getElementById('scheduleContainer');
    scheduleEl.innerHTML = data.schedule.length > 0
      ? data.schedule.map(m => `
        <div class="schedule-item">
          <span class="time">⏰ ${m.time}</span>
          <span class="teams">${m.home} × ${m.away}</span>
          <span class="league">${m.league}</span>
        </div>`).join('')
      : '<div class="card">لا توجد مباريات اليوم</div>';

    // الترتيب
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
setInterval(loadData, 60000); // تحديث كل دقيقة
