let DATA = {};
const SUPA_URL = 'https://ejfdqvjfzgsjtztzvhem.supabase.co/rest/v1/';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZmRxdmpmemdzanR6dHp2aGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzE3NDAsImV4cCI6MjEwMjgwNzc0MH0.YD0-kgvHlRIPbJMulwv6PKhxKz9frzeT5m4QGYRGBA4';
let supa = null;
try {
  if (window.supabase && SUPA_URL.includes('supabase.co')) supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
} catch (e) {}
let MATCHES = [];

function go(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const el = document.getElementById('sec-' + id);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
}
function goMulti(ids, btn) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  ids.forEach(id => {
    const el = document.getElementById('sec-' + id);
    if (el) el.style.display = 'block';
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
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
    const preItems = [];
  groups.forEach(g => g.items.forEach(m => {
    if (m.state === 'pre') preItems.push(Object.assign({}, m, {league: g.league}));
  }));
  let preHtml = '';
  if (preItems.length) {
    preHtml = '<div class="live-block" style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid #334155;"><div class="live-title" style="color:#fbbf24;animation:none;">🕐 مباريات خلال 24 ساعة</div>' +
      preItems.slice(0, 6).map(m => `
        <div class="live-card">
          <div class="live-teams">
            <span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</span>
            <span class="live-score" style="color:#94a3b8;font-size:1.05em;">${m.time}</span>
            <span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</span>
          </div>
          <div class="live-meta">🏆 ${m.league}${m.tv ? ` | 📺 ${m.tv}` : ''}</div>
        </div>`).join('') + '</div>';
  }
    el.innerHTML = (liveHtml + preHtml + restHtml + resultsHtml) || '<div class="card">لا توجد مباريات حالياً</div>';
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


const AR2EN = {"ريال مدريد":"Real Madrid","برشلونة":"Barcelona","ليفربول":"Liverpool","مانشستر سيتي":"Manchester City","مانشستر يونايتد":"Manchester United","تشيلسي":"Chelsea","أرسنال":"Arsenal","توتنهام":"Tottenham Hotspur","باريس سان جيرمان":"Paris Saint-Germain","بايرن ميونخ":"Bayern Munich","يوفنتوس":"Juventus","إنتر ميلان":"Inter","ميلان":"AC Milan","أتلتيكو مدريد":"Atlético Madrid","بوروسيا دورتموند":"Borussia Dortmund","نابولي":"Napoli","أستون فيلا":"Aston Villa","نيوكاسل":"Newcastle United","الأهلي":"Al Ahly","الزمالك":"Zamalek","بيراميدز":"Pyramids FC","الهلال":"Al Hilal","النصر":"Al Nassr","الاتحاد":"Al Ittihad","الأهلي السعودي":"Al Ahli","الشباب":"Al Shabab","الاتفاق":"Al Ettifaq","الفيحاء":"Al Fayha","الرياض":"Al Riyad","الوحدة":"Al Wehda","القادسية":"Al Qadsiah","الخليج":"Al Khaleej","الرائد":"Al Raed","التعاون":"Al Taawoun","ضمك":"Damac FC","الفتح":"Al Fateh","الإسماعيلي":"Ismaily","المصري":"Al Masry","سموحة":"Smouha","إنبي":"ENPPI","سيراميكا كليوباترا":"Ceramica Cleopatra","مودرن سبورت":"Modern Sport","جالاطا سراي":"Galatasaray","فنربخشة":"Fenerbahçe","بشكتاش":"Beşiktaş","بنفيكا":"Benfica","بورتو":"Porto","سبورتينج لشبونة":"Sporting CP","أياكس":"Ajax","آيندهوفن":"PSV Eindhoven","إنتر ميامي":"Inter Miami","لوس أنجلوس FC":"LAFC","شيكاغو فاير":"Chicago Fire","سانتوس":"Santos"};
async function showTeam(slug, teamId, teamName) {
  const box = document.getElementById('teamModal') || (() => {
    const b = document.createElement('div'); b.id = 'teamModal';
    b.innerHTML = '<div><div style="display:flex;justify-content:space-between;font-weight:bold;color:#fbbf24;font-size:1.2em;margin-bottom:12px;"><span id="teamModalTitle"></span><button onclick="closeTeam()" style="background:none;border:none;color:#ef4444;font-size:1.3em;cursor:pointer;">✖</button></div><div id="teamModalBody"></div></div>';
    document.body.appendChild(b); return b;
  })();
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;overflow:auto;';
  box.firstElementChild.style.cssText = 'max-width:640px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('teamModalTitle').textContent = '👥 ' + teamName;
  document.getElementById('teamModalBody').innerHTML = 'ثانية بنحمل اللاعبين... ⏳';
  const get = async u => { try { return JSON.parse(await (await fetch(u)).text()); } catch (e) { return {}; } };
  const q = AR2EN[teamName] || teamName;
  const teams = ((await get('https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=' + encodeURIComponent(q))).teams || []);
  const team = teams.find(t => (t.strGender || 'Male') !== 'Female') || teams[0];
  if (!team) { document.getElementById('teamModalBody').innerHTML = '<div class="card">مفيش بيانات للفريق ده 🙏</div>'; return; }
  const players = (await get('https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=' + encodeURIComponent(team.strTeam))).player || [];
  let html = `<div style="text-align:center;margin-bottom:14px;">${team.strBadge ? `<img src="${team.strBadge}" style="width:70px;height:70px;object-fit:contain;">` : ''}<div style="font-weight:bold;font-size:1.2em;">${team.strTeam}</div><div style="opacity:.7;">${team.strLeague || ''}</div></div>`;
  html += players.length ? '<div class="p-grid">' + players.slice(0, 25).map(p =>
    `<span class="p-card">${p.strCutout || p.strThumb ? `<img class="p-face" src="${p.strCutout || p.strThumb}" onerror="this.style.display='none'">` : '👤'} ${p.strPlayer} <small>(${p.strPosition || 'لاعب'})</small></span>`).join('') + '</div>'
    : '<div class="card">قائمة اللاعبين مش متاحة للفريق ده حالياً 🙏</div>';
  document.getElementById('teamModalBody').innerHTML = html;
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

  // المصدر 1: من البيانات الحقيقية (لو موجودة)
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

  // المصدر 2: قائمة النجوم الاحتياطية (دوماً موجودة)
     const stars = [
    {name: 'محمد صلاح', team: 'ليفربول', val: 20, cat: 'الهدافون'},
    {name: 'فيرجيل فان دايك', team: 'ليفربول', val: 2, cat: 'صناعة الأهداف'},
    {name: 'فلوريان فيرتز', team: 'ليفربول', val: 12, cat: 'صناعة الأهداف'},
    {name: 'أليكساندر إيزاك', team: 'ليفربول', val: 16, cat: 'الهدافون'},
    {name: 'هوجو إيكيتيكي', team: 'ليفربول', val: 12, cat: 'الهدافون'},
    {name: 'دومينيك سوبوسلاي', team: 'ليفربول', val: 8, cat: 'صناعة الأهداف'},
    {name: 'أليكسيس ماك أليستر', team: 'ليفربول', val: 6, cat: 'صناعة الأهداف'},
    {name: 'رايان جرافينبيرخ', team: 'ليفربول', val: 5, cat: 'صناعة الأهداف'},
    {name: 'كودي جاكبو', team: 'ليفربول', val: 10, cat: 'الهدافون'},
    {name: 'جيريمي فريمبونج', team: 'ليفربول', val: 4, cat: 'صناعة الأهداف'},
    {name: 'أليسون بيكر', team: 'ليفربول', val: 1, cat: 'صناعة الأهداف'},
    {name: 'واتارو إندو', team: 'ليفربول', val: 2, cat: 'صناعة الأهداف'},
    {name: 'إيرلينج هالاند', team: 'مانشستر سيتي', val: 25, cat: 'الهدافون'},
    {name: 'فيل فودين', team: 'مانشستر سيتي', val: 11, cat: 'الهدافون'},
    {name: 'جيريمي دوكو', team: 'مانشستر سيتي', val: 7, cat: 'صناعة الأهداف'},
    {name: 'سافينيو', team: 'مانشستر سيتي', val: 6, cat: 'صناعة الأهداف'},
    {name: 'تياني رايندرز', team: 'مانشستر سيتي', val: 7, cat: 'صناعة الأهداف'},
    {name: 'ريان شرقي', team: 'مانشستر سيتي', val: 8, cat: 'صناعة الأهداف'},
    {name: 'رودري', team: 'مانشستر سيتي', val: 3, cat: 'صناعة الأهداف'},
    {name: 'إليوت أندرسون', team: 'مانشستر سيتي', val: 6, cat: 'صناعة الأهداف'},
    {name: 'روبن دياز', team: 'مانشستر سيتي', val: 1, cat: 'صناعة الأهداف'},
    {name: 'جانلويجي دوناروما', team: 'مانشستر سيتي', val: 1, cat: 'صناعة الأهداف'},
    {name: 'ماتيوس نونيز', team: 'مانشستر سيتي', val: 3, cat: 'صناعة الأهداف'},
    {name: 'ريكو لويس', team: 'مانشستر سيتي', val: 2, cat: 'صناعة الأهداف'},
    {name: 'بوكايو ساكا', team: 'أرسنال', val: 14, cat: 'صناعة الأهداف'},
    {name: 'مارتين أوديجارد', team: 'أرسنال', val: 10, cat: 'صناعة الأهداف'},
    {name: 'ديكلان رايس', team: 'أرسنال', val: 5, cat: 'صناعة الأهداف'},
    {name: 'فيكتور جيوكيرس', team: 'أرسنال', val: 18, cat: 'الهدافون'},
    {name: 'جابرييل مارتينيلي', team: 'أرسنال', val: 9, cat: 'الهدافون'},
    {name: 'إيبيريتشي إيزي', team: 'أرسنال', val: 9, cat: 'صناعة الأهداف'},
    {name: 'جابرييل ماجاليس', team: 'أرسنال', val: 2, cat: 'صناعة الأهداف'},
    {name: 'ويليام ساليبا', team: 'أرسنال', val: 2, cat: 'صناعة الأهداف'},
    {name: 'دافيد رايا', team: 'أرسنال', val: 1, cat: 'صناعة الأهداف'},
    {name: 'كاي هافيرتز', team: 'أرسنال', val: 11, cat: 'الهدافون'},
    {name: 'يورين تيمبر', team: 'أرسنال', val: 3, cat: 'صناعة الأهداف'},
    {name: 'مارتين زوبيمندي', team: 'أرسنال', val: 4, cat: 'صناعة الأهداف'},
    {name: 'برونو جيماريش', team: 'أرسنال', val: 6, cat: 'صناعة الأهداف'},
    {name: 'جابرييل جيسوس', team: 'أرسنال', val: 8, cat: 'الهدافون'},
    {name: 'نوني مادويكي', team: 'أرسنال', val: 7, cat: 'الهدافون'},
    {name: 'ميكيل ميرينو', team: 'أرسنال', val: 5, cat: 'الهدافون'},
    {name: 'كول بالمر', team: 'تشيلسي', val: 16, cat: 'الهدافون'},
    {name: 'إنزو فيرنانديز', team: 'تشيلسي', val: 7, cat: 'صناعة الأهداف'},
    {name: 'مويسيس كايسيدو', team: 'تشيلسي', val: 4, cat: 'صناعة الأهداف'},
    {name: 'جواو بيدرو', team: 'تشيلسي', val: 12, cat: 'الهدافون'},
    {name: 'أليخاندرو جارناتشو', team: 'تشيلسي', val: 9, cat: 'الهدافون'},
    {name: 'مارك كوكوريلا', team: 'تشيلسي', val: 2, cat: 'صناعة الأهداف'},
    {name: 'ليفي كولويل', team: 'تشيلسي', val: 1, cat: 'صناعة الأهداف'},
    {name: 'ريس جيمس', team: 'تشيلسي', val: 3, cat: 'صناعة الأهداف'},
    {name: 'مالو جوستو', team: 'تشيلسي', val: 3, cat: 'صناعة الأهداف'},
    {name: 'مورجان روجرز', team: 'تشيلسي', val: 10, cat: 'صناعة الأهداف'},
    {name: 'برونو فيرنانديز', team: 'مانشستر يونايتد', val: 12, cat: 'صناعة الأهداف'},
    {name: 'كوبي ماينو', team: 'مانشستر يونايتد', val: 4, cat: 'صناعة الأهداف'},
    {name: 'بريان مبيومو', team: 'مانشستر يونايتد', val: 12, cat: 'الهدافون'},
    {name: 'بنجامين سيسكو', team: 'مانشستر يونايتد', val: 13, cat: 'الهدافون'},
    {name: 'ليساندرو مارتينيز', team: 'مانشستر يونايتد', val: 1, cat: 'صناعة الأهداف'},
    {name: 'ديوجو دالوت', team: 'مانشستر يونايتد', val: 2, cat: 'صناعة الأهداف'},
    {name: 'أندريه أونانا', team: 'مانشستر يونايتد', val: 1, cat: 'صناعة الأهداف'},
    {name: 'كاسيميرو', team: 'مانشستر يونايتد', val: 3, cat: 'صناعة الأهداف'},
    {name: 'محمد قدوس', team: 'توتنهام', val: 10, cat: 'الهدافون'},
    {name: 'دومينيك سولانكي', team: 'توتنهام', val: 11, cat: 'الهدافون'},
    {name: 'تشافي سيمونز', team: 'توتنهام', val: 9, cat: 'صناعة الأهداف'},
    {name: 'جيمس ماديسون', team: 'توتنهام', val: 8, cat: 'صناعة الأهداف'},
    {name: 'ساندرو تونالي', team: 'توتنهام', val: 5, cat: 'صناعة الأهداف'},
    {name: 'كريستيان روميرو', team: 'توتنهام', val: 2, cat: 'صناعة الأهداف'},
    {name: 'ميكي فان دي فين', team: 'توتنهام', val: 2, cat: 'صناعة الأهداف'},
    {name: 'بيدرو بورو', team: 'توتنهام', val: 4, cat: 'صناعة الأهداف'},
    {name: 'عمر مرموش', team: 'توتنهام', val: 9, cat: 'الهدافون'},
    {name: 'ماتيس تيل', team: 'توتنهام', val: 7, cat: 'الهدافون'},
    {name: 'ريشارليسون', team: 'توتنهام', val: 6, cat: 'الهدافون'},
    {name: 'أنتوني جوردون', team: 'نيوكاسل', val: 12, cat: 'الهدافون'},
    {name: 'هارفي بارنز', team: 'نيوكاسل', val: 7, cat: 'الهدافون'},
    {name: 'نيك فولتيماده', team: 'نيوكاسل', val: 10, cat: 'الهدافون'},
    {name: 'كيران تريبيير', team: 'نيوكاسل', val: 3, cat: 'صناعة الأهداف'},
    {name: 'سفين بوتمان', team: 'نيوكاسل', val: 1, cat: 'صناعة الأهداف'},
    {name: 'جو ويلوك', team: 'نيوكاسل', val: 4, cat: 'صناعة الأهداف'},
    {name: 'أولي واتكينز', team: 'أستون فيلا', val: 13, cat: 'الهدافون'},
    {name: 'جون ماكجين', team: 'أستون فيلا', val: 5, cat: 'صناعة الأهداف'},
    {name: 'يوري تيليمانس', team: 'أستون فيلا', val: 6, cat: 'صناعة الأهداف'},
    {name: 'إيمي مارتينيز', team: 'أستون فيلا', val: 1, cat: 'صناعة الأهداف'},
    {name: 'كاورو ميتوما', team: 'برايتون', val: 8, cat: 'الهدافون'},
    {name: 'لوكاس باكيتا', team: 'وست هام', val: 7, cat: 'صناعة الأهداف'},
    {name: 'جارود بوين', team: 'وست هام', val: 9, cat: 'الهدافون'},
    {name: 'جاك جريليتش', team: 'إيفرتون', val: 5, cat: 'صناعة الأهداف'},
    {name: 'جوردان بيكفورد', team: 'إيفرتون', val: 1, cat: 'صناعة الأهداف'},
    {name: 'كيليان مبابي', team: 'ريال مدريد', val: 28, cat: 'الهدافون'},
    {name: 'فينيسيوس جونيور', team: 'ريال مدريد', val: 17, cat: 'الهدافون'},
    {name: 'جود بيلينجهام', team: 'ريال مدريد', val: 12, cat: 'الهدافون'},
    {name: 'ترينت ألكسندر أرنولد', team: 'ريال مدريد', val: 5, cat: 'صناعة الأهداف'},
    {name: 'فيدي فالفيردي', team: 'ريال مدريد', val: 6, cat: 'صناعة الأهداف'},
    {name: 'إدواردو كامافينجا', team: 'ريال مدريد', val: 3, cat: 'صناعة الأهداف'},
    {name: 'أوريلين تشواميني', team: 'ريال مدريد', val: 2, cat: 'صناعة الأهداف'},
    {name: 'رودريجو', team: 'ريال مدريد', val: 10, cat: 'الهدافون'},
    {name: 'إندريك', team: 'ريال مدريد', val: 6, cat: 'الهدافون'},
    {name: 'أردا جولر', team: 'ريال مدريد', val: 7, cat: 'صناعة الأهداف'},
    {name: 'تيبو كورتوا', team: 'ريال مدريد', val: 1, cat: 'صناعة الأهداف'},
    {name: 'أنطونيو روديجر', team: 'ريال مدريد', val: 2, cat: 'صناعة الأهداف'},
    {name: 'إيدير ميليتاو', team: 'ريال مدريد', val: 1, cat: 'صناعة الأهداف'},
    {name: 'داني كارفاخال', team: 'ريال مدريد', val: 2, cat: 'صناعة الأهداف'},
    {name: 'لامين يامال', team: 'برشلونة', val: 15, cat: 'صناعة الأهداف'},
    {name: 'رافينيا', team: 'برشلونة', val: 14, cat: 'الهدافون'},
    {name: 'فيران توريس', team: 'برشلونة', val: 10, cat: 'الهدافون'},
    {name: 'بيدري', team: 'برشلونة', val: 8, cat: 'صناعة الأهداف'},
    {name: 'فرينكي دي يونج', team: 'برشلونة', val: 4, cat: 'صناعة الأهداف'},
    {name: 'جافي', team: 'برشلونة', val: 4, cat: 'صناعة الأهداف'},
    {name: 'جول كوندي', team: 'برشلونة', val: 3, cat: 'صناعة الأهداف'},
    {name: 'أليخاندرو بالدي', team: 'برشلونة', val: 3, cat: 'صناعة الأهداف'},
    {name: 'تير شتيجن', team: 'برشلونة', val: 1, cat: 'صناعة الأهداف'},
    {name: 'داني أولمو', team: 'برشلونة', val: 8, cat: 'الهدافون'},
    {name: 'فيرمين لوبيز', team: 'برشلونة', val: 6, cat: 'الهدافون'},
    {name: 'جوليان ألفاريز', team: 'أتلتيكو مدريد', val: 15, cat: 'الهدافون'},
    {name: 'أنطوان جريزمان', team: 'أتلتيكو مدريد', val: 8, cat: 'صناعة الأهداف'},
    {name: 'ماركوس يورينتي', team: 'أتلتيكو مدريد', val: 5, cat: 'صناعة الأهداف'},
    {name: 'يان أوبلاك', team: 'أتلتيكو مدريد', val: 1, cat: 'صناعة الأهداف'},
    {name: 'روبين لو نورماند', team: 'أتلتيكو مدريد', val: 1, cat: 'صناعة الأهداف'},
    {name: 'أنخيل كوريا', team: 'أتلتيكو مدريد', val: 5, cat: 'الهدافون'},
    {name: 'إيسكو', team: 'ريال بيتيس', val: 6, cat: 'صناعة الأهداف'},
    {name: 'أنتوني', team: 'ريال بيتيس', val: 8, cat: 'الهدافون'},
    {name: 'جيوفاني لو سيلسو', team: 'ريال بيتيس', val: 6, cat: 'صناعة الأهداف'},
    {name: 'ميكيل أويارزابال', team: 'ريال سوسيداد', val: 9, cat: 'الهدافون'},
    {name: 'تاكيفوسا كوبو', team: 'ريال سوسيداد', val: 7, cat: 'صناعة الأهداف'},
    {name: 'لاوتارو مارتينيز', team: 'إنتر ميلان', val: 18, cat: 'الهدافون'},
    {name: 'ماركوس تورام', team: 'إنتر ميلان', val: 13, cat: 'الهدافون'},
    {name: 'هاكان تشالهان أوجلو', team: 'إنتر ميلان', val: 7, cat: 'صناعة الأهداف'},
    {name: 'نيكولو باريلا', team: 'إنتر ميلان', val: 5, cat: 'صناعة الأهداف'},
    {name: 'أليساندرو باستوني', team: 'إنتر ميلان', val: 2, cat: 'صناعة الأهداف'},
    {name: 'دينزل دومفريس', team: 'إنتر ميلان', val: 4, cat: 'صناعة الأهداف'},
    {name: 'بيوتر زيلينسكي', team: 'إنتر ميلان', val: 4, cat: 'صناعة الأهداف'},
    {name: 'دافيد فراتيسي', team: 'إنتر ميلان', val: 5, cat: 'الهدافون'},
    {name: 'كريستيان بوليسيتش', team: 'ميلان', val: 12, cat: 'الهدافون'},
    {name: 'رافائيل لياو', team: 'ميلان', val: 11, cat: 'الهدافون'},
    {name: 'لوكا مودريتش', team: 'ميلان', val: 4, cat: 'صناعة الأهداف'},
    {name: 'مايك مانيان', team: 'ميلان', val: 1, cat: 'صناعة الأهداف'},
    {name: 'يوسف فوفانا', team: 'ميلان', val: 3, cat: 'صناعة الأهداف'},
    {name: 'سانتياجو خيمينيز', team: 'ميلان', val: 10, cat: 'الهدافون'},
    {name: 'ماتيو بوليتانو', team: 'نابولي', val: 7, cat: 'صناعة الأهداف'},
    {name: 'كيفن دي بروين', team: 'نابولي', val: 10, cat: 'صناعة الأهداف'},
    {name: 'روميلو لوكاكو', team: 'نابولي', val: 12, cat: 'الهدافون'},
    {name: 'سكوت ماكتوميناي', team: 'نابولي', val: 7, cat: 'الهدافون'},
    {name: 'أليساندرو بونجورنو', team: 'نابولي', val: 1, cat: 'صناعة الأهداف'},
    {name: 'دافيد نيريس', team: 'نابولي', val: 6, cat: 'صناعة الأهداف'},
    {name: 'جوناثان ديفيد', team: 'يوفنتوس', val: 12, cat: 'الهدافون'},
    {name: 'كنان يلديز', team: 'يوفنتوس', val: 9, cat: 'صناعة الأهداف'},
    {name: 'فرانسيسكو كونسيساو', team: 'يوفنتوس', val: 7, cat: 'صناعة الأهداف'},
    {name: 'ويستون ماكيني', team: 'يوفنتوس', val: 3, cat: 'صناعة الأهداف'},
    {name: 'كيفرين تورام', team: 'يوفنتوس', val: 4, cat: 'صناعة الأهداف'},
    {name: 'تيون كوبمينرس', team: 'يوفنتوس', val: 5, cat: 'صناعة الأهداف'},
    {name: 'باولو ديبالا', team: 'روما', val: 8, cat: 'الهدافون'},
    {name: 'لورينزو بيليجريني', team: 'روما', val: 5, cat: 'صناعة الأهداف'},
    {name: 'ماتياس سولي', team: 'روما', val: 6, cat: 'صناعة الأهداف'},
    {name: 'أديمولا لوكمان', team: 'أتالانتا', val: 12, cat: 'الهدافون'},
    {name: 'ماتيو ريتيجي', team: 'أتالانتا', val: 14, cat: 'الهدافون'},
    {name: 'جانلوكا سكاماكا', team: 'أتالانتا', val: 10, cat: 'الهدافون'},
    {name: 'مويس كين', team: 'فيورنتينا', val: 12, cat: 'الهدافون'},
    {name: 'ألبرت جودموندسون', team: 'فيورنتينا', val: 7, cat: 'صناعة الأهداف'},
    {name: 'هاري كين', team: 'بايرن ميونخ', val: 24, cat: 'الهدافون'},
    {name: 'جمال موسيالا', team: 'بايرن ميونخ', val: 13, cat: 'الهدافون'},
    {name: 'لويس دياز', team: 'بايرن ميونخ', val: 12, cat: 'الهدافون'},
    {name: 'مايكل أوليسيه', team: 'بايرن ميونخ', val: 10, cat: 'صناعة الأهداف'},
    {name: 'سيرج جنابري', team: 'بايرن ميونخ', val: 7, cat: 'الهدافون'},
    {name: 'جوشوا كيميتش', team: 'بايرن ميونخ', val: 5, cat: 'صناعة الأهداف'},
    {name: 'ألفونسو ديفيز', team: 'بايرن ميونخ', val: 3, cat: 'صناعة الأهداف'},
    {name: 'دايوت أوباميكانو', team: 'بايرن ميونخ', val: 1, cat: 'صناعة الأهداف'},
    {name: 'مانويل نوير', team: 'بايرن ميونخ', val: 1, cat: 'صناعة الأهداف'},
    {name: 'باتريك شيك', team: 'باير ليفركوزن', val: 9, cat: 'الهدافون'},
    {name: 'أليخ جارسيا', team: 'باير ليفركوزن', val: 4, cat: 'صناعة الأهداف'},
    {name: 'إدموند تابسوبا', team: 'باير ليفركوزن', val: 1, cat: 'صناعة الأهداف'},
    {name: 'سيرهو جيراسي', team: 'بوروسيا دورتموند', val: 14, cat: 'الهدافون'},
    {name: 'يوليان براندت', team: 'بوروسيا دورتموند', val: 7, cat: 'صناعة الأهداف'},
    {name: 'كريم أديمي', team: 'بوروسيا دورتموند', val: 8, cat: 'الهدافون'},
    {name: 'نيكو شلوتربيك', team: 'بوروسيا دورتموند', val: 1, cat: 'صناعة الأهداف'},
    {name: 'جريجور كوبل', team: 'بوروسيا دورتموند', val: 1, cat: 'صناعة الأهداف'},
    {name: 'أنتونيو نوسا', team: 'لايبزيج', val: 6, cat: 'صناعة الأهداف'},
    {name: 'كريستوف باومجارتنر', team: 'لايبزيج', val: 5, cat: 'صناعة الأهداف'},
    {name: 'كاستيلو لوكيبا', team: 'لايبزيج', val: 1, cat: 'صناعة الأهداف'},
    {name: 'دينيز أونداف', team: 'شتوتجارت', val: 10, cat: 'الهدافون'},
    {name: 'إنزو ميلو', team: 'شتوتجارت', val: 6, cat: 'صناعة الأهداف'},
    {name: 'عثمان ديمبيلي', team: 'باريس سان جيرمان', val: 15, cat: 'الهدافون'},
    {name: 'برادلي باركولا', team: 'باريس سان جيرمان', val: 12, cat: 'الهدافون'},
    {name: 'خفيتشا كفاراتسخيليا', team: 'باريس سان جيرمان', val: 11, cat: 'الهدافون'},
    {name: 'ديزيري دوي', team: 'باريس سان جيرمان', val: 8, cat: 'صناعة الأهداف'},
    {name: 'فيتينيا', team: 'باريس سان جيرمان', val: 7, cat: 'صناعة الأهداف'},
    {name: 'جواو نيفيز', team: 'باريس سان جيرمان', val: 5, cat: 'صناعة الأهداف'},
    {name: 'وارن زاير إيمري', team: 'باريس سان جيرمان', val: 4, cat: 'صناعة الأهداف'},
    {name: 'أشرف حكيمي', team: 'باريس سان جيرمان', val: 6, cat: 'صناعة الأهداف'},
    {name: 'ماركينيوس', team: 'باريس سان جيرمان', val: 2, cat: 'صناعة الأهداف'},
    {name: 'جونزالو راموس', team: 'باريس سان جيرمان', val: 9, cat: 'الهدافون'},
    {name: 'مغنيس أكليوش', team: 'موناكو', val: 7, cat: 'صناعة الأهداف'},
    {name: 'فولارين بالوجون', team: 'موناكو', val: 10, cat: 'الهدافون'},
    {name: 'دينيس زكريا', team: 'موناكو', val: 3, cat: 'صناعة الأهداف'},
    {name: 'ماسون جرينوود', team: 'مارسيليا', val: 14, cat: 'الهدافون'},
    {name: 'أدريان رابيو', team: 'مارسيليا', val: 5, cat: 'صناعة الأهداف'},
    {name: 'مات أوريلي', team: 'مارسيليا', val: 4, cat: 'صناعة الأهداف'},
    {name: 'بنجامين بافارد', team: 'مارسيليا', val: 2, cat: 'صناعة الأهداف'},
    {name: 'إيدون زيجروفا', team: 'ليل', val: 6, cat: 'صناعة الأهداف'},
    {name: 'هاكون هارالدسون', team: 'ليل', val: 5, cat: 'الهدافون'},
    {name: 'ألكسندر لاكازيت', team: 'ليون', val: 12, cat: 'الهدافون'},
    {name: 'كورنتين توليسو', team: 'ليون', val: 4, cat: 'صناعة الأهداف'},
    {name: 'كريستيانو رونالدو', team: 'النصر', val: 25, cat: 'الهدافون'},
    {name: 'ساديو ماني', team: 'النصر', val: 12, cat: 'الهدافون'},
    {name: 'مارسيلو بروزوفيتش', team: 'النصر', val: 4, cat: 'صناعة الأهداف'},
    {name: 'إيمريك لابورت', team: 'النصر', val: 2, cat: 'صناعة الأهداف'},
    {name: 'جون دوران', team: 'النصر', val: 8, cat: 'الهدافون'},
    {name: 'كريم بنزيما', team: 'الهلال', val: 14, cat: 'الهدافون'},
    {name: 'ألكساندر ميتروفيتش', team: 'الهلال', val: 16, cat: 'الهدافون'},
    {name: 'سالم الدوسري', team: 'الهلال', val: 11, cat: 'صناعة الأهداف'},
    {name: 'مالكوم', team: 'الهلال', val: 10, cat: 'الهدافون'},
    {name: 'سيرجي سافيتش', team: 'الهلال', val: 8, cat: 'صناعة الأهداف'},
    {name: 'خاليدو كوليبالي', team: 'الهلال', val: 2, cat: 'صناعة الأهداف'},
    {name: 'ياسين بونو', team: 'الهلال', val: 1, cat: 'صناعة الأهداف'},
    {name: 'داروين نونيز', team: 'الهلال', val: 12, cat: 'الهدافون'},
    {name: 'رياض محرز', team: 'الأهلي السعودي', val: 10, cat: 'صناعة الأهداف'},
    {name: 'فراس البريكان', team: 'الأهلي السعودي', val: 9, cat: 'الهدافون'},
    {name: 'إيفان توني', team: 'الأهلي السعودي', val: 12, cat: 'الهدافون'},
    {name: 'موسى ديابي', team: 'الاتحاد', val: 9, cat: 'الهدافون'},
    {name: 'ستيفن بيرجوين', team: 'الاتحاد', val: 10, cat: 'الهدافون'},
    {name: 'فابينيو', team: 'الاتحاد', val: 3, cat: 'صناعة الأهداف'},
    {name: 'إمام عاشور', team: 'الأهلي', val: 10, cat: 'الهدافون'},
    {name: 'محمود تريزيجيه', team: 'الأهلي', val: 11, cat: 'الهدافون'},
    {name: 'حسين الشحات', team: 'الأهلي', val: 7, cat: 'صناعة الأهداف'},
    {name: 'أحمد سيد زيزو', team: 'الأهلي', val: 12, cat: 'صناعة الأهداف'},
    {name: 'محمد الشناوي', team: 'الأهلي', val: 1, cat: 'صناعة الأهداف'},
    {name: 'أشرف بن شرقي', team: 'الأهلي', val: 9, cat: 'الهدافون'},
    {name: 'ياسر إبراهيم', team: 'الأهلي', val: 1, cat: 'صناعة الأهداف'},
    {name: 'شيكو بانزا', team: 'الزمالك', val: 8, cat: 'الهدافون'},
    {name: 'ناصر ماهر', team: 'الزمالك', val: 6, cat: 'صناعة الأهداف'},
    {name: 'فيستون ماييلي', team: 'بيراميدز', val: 12, cat: 'الهدافون'},
    {name: 'رمضان صبحي', team: 'بيراميدز', val: 7, cat: 'صناعة الأهداف'},
    {name: 'أسامة فيصل', team: 'البنك الأهلي', val: 8, cat: 'الهدافون'},
    {name: 'ليروي ساني', team: 'جلطة سراي', val: 11, cat: 'الهدافون'},
    {name: 'فيكتور أوسيمين', team: 'جلطة سراي', val: 20, cat: 'الهدافون'},
    {name: 'ماورو إيكاردي', team: 'جلطة سراي', val: 14, cat: 'الهدافون'},
    {name: 'نجولو كانتي', team: 'فنربخشة', val: 3, cat: 'صناعة الأهداف'},
    {name: 'إدين دجيكو', team: 'فنربخشة', val: 12, cat: 'الهدافون'},
    {name: 'يوسف النصيري', team: 'فنربخشة', val: 13, cat: 'الهدافون'},
    {name: 'لياندرو تروسارد', team: 'بشكتاش', val: 9, cat: 'الهدافون'},
    {name: 'ليونيل ميسي', team: 'إنتر ميامي', val: 22, cat: 'الهدافون'},
    {name: 'لويس سواريز', team: 'إنتر ميامي', val: 15, cat: 'الهدافون'},
    {name: 'سيرجيو بوسكيتس', team: 'إنتر ميامي', val: 3, cat: 'صناعة الأهداف'},
    {name: 'جوردي ألبا', team: 'إنتر ميامي', val: 5, cat: 'صناعة الأهداف'},
    {name: 'رودريجو دي بول', team: 'إنتر ميامي', val: 6, cat: 'صناعة الأهداف'},
    {name: 'سون هيونج مين', team: 'لوس أنجلوس FC', val: 14, cat: 'الهدافون'},
    {name: 'هوجو لوريس', team: 'لوس أنجلوس FC', val: 1, cat: 'صناعة الأهداف'},
    {name: 'نيمار', team: 'سانتوس', val: 10, cat: 'الهدافون'},
    {name: 'ممفيس ديباي', team: 'كورينثيانز', val: 10, cat: 'الهدافون'},
    {name: 'لورينزو إنسيني', team: 'تورونتو FC', val: 8, cat: 'الهدافون'},
    {name: 'فانجيليس بافليديس', team: 'بنفيكا', val: 16, cat: 'الهدافون'},
    {name: 'أنخيل دي ماريا', team: 'بنفيكا', val: 8, cat: 'صناعة الأهداف'},
    {name: 'أياسي أويدا', team: 'فينورد', val: 12, cat: 'الهدافون'},
    {name: 'لوك دي يونج', team: 'أيندهوفن', val: 14, cat: 'الهدافون'},
    {name: 'يوهان باكايوكو', team: 'أيندهوفن', val: 8, cat: 'صناعة الأهداف'},
    {name: 'روبرت ليفاندوفسكي', team: 'شيكاغو فاير', val: 16, cat: 'الهدافون'},
  ];

  stars.forEach(p => {
    if (!map[p.name]) {
      map[p.name] = {name: p.name, team: p.team, face: '', cat: p.cat, val: p.val};
    }
  });

  return Object.values(map).map(p => Object.assign(p, {price: 4 + Math.round(p.val / 2)}));
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
            .sort((a, b) => b.val - a.val).slice(0, 100).map(p => `
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

const SHOP = [
  {name: 'كورة مباريات احترافية', emoji: '⚽', link: 'https://www.amazon.ae/s?k=football+ball'},
  {name: 'تيشيرت فريقك المفضل', emoji: '👕', link: 'https://www.amazon.ae/s?k=football+jersey'},
  {name: 'حذاء كورة عالي الجودة', emoji: '👟', link: 'https://www.amazon.ae/s?k=football+boots'},
  {name: 'شال وإكسسوارات مشجعين', emoji: '🧣', link: 'https://www.amazon.ae/s?k=football+scarf'},
];
function renderShop() {
  document.getElementById('shopContainer').innerHTML = SHOP.map(p => `
    <div class="tv-card">
      <div style="font-size:2.2em;">${p.emoji}</div>
      <div class="tv-teams" style="margin-top:6px;">${p.name}</div>
      <a class="btn" style="margin-top:8px;" href="${p.link}" target="_blank">اشتري من هنا</a>
    </div>`).join('');
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

const TRANSFER_WORDS = ['صفقة', 'صفقات', 'انتقال', 'تعاقد', 'توقيع', 'يرحل', 'رحيل',
  'يجدد', 'تجديد', 'إعارة', 'بيع', 'شراء', 'مليون', 'ينتقل', 'انضم',
  'transfer', 'signed', 'signs', 'loan', 'deal', 'move', 'joins'];
function renderTransfers() {
  const all = [...(DATA.news || []), ...(DATA.world || [])];
  const items = all.filter(n => {
    const t = (n.t || '').toLowerCase();
    return TRANSFER_WORDS.some(w => t.includes(w));
  });
  document.getElementById('transfersContainer').innerHTML = items.length ? items.map(n => `
    <div class="tv-card" style="text-align:right;">
      ${n.img ? `<img src="${n.img}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${n.t}</div>
    </div>`).join('')
    : '<div class="card">مفيش أخبار انتقالات دلوقتي — هتتحدث مع كل جولة 🔄</div>';
}

function renderArchive() {
  const q = (document.getElementById('archiveSearch').value || '').trim().toLowerCase();
  const all = [...(DATA.news || []), ...(DATA.world || [])];
  const items = q ? all.filter(n => (n.t || '').toLowerCase().includes(q)) : all;
  document.getElementById('archiveContainer').innerHTML = items.length ? items.map(n => `
    <div class="tv-card" style="text-align:right;">
      ${n.img ? `<img src="${n.img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${n.t}</div>
    </div>`).join('')
    : '<div class="card">مفيش نتائج مطابقة لبحثك 🔍</div>';
}

function renderPlayers() {
  const q = (document.getElementById('playerSearch').value || '').trim().toLowerCase();
  const all = [];
  Object.entries(DATA.leaders || {}).forEach(([league, cats]) => {
    Object.entries(cats || {}).forEach(([label, items]) => {
      (items || []).forEach(p => all.push(Object.assign({}, p, {league: league, label: label})));
    });
  });
  const items = q
    ? all.filter(p => (p.name || '').toLowerCase().includes(q) || (p.team || '').toLowerCase().includes(q))
    : all.slice(0, 12);
  document.getElementById('playersContainer').innerHTML = items.length ? items.map(p => `
    <div class="tv-card" style="text-align:center;">
      ${p.face ? `<img src="${p.face}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 8px;display:block;" onerror="this.style.display='none'">` : '<div style="font-size:2.2em;">👤</div>'}
      <div style="font-weight:bold;">${p.name}</div>
      <div style="opacity:.7;font-size:.85em;">${p.team} | ${p.league}</div>
      <div style="color:#fbbf24;font-weight:bold;margin-top:6px;">${p.label}: ${p.value}</div>
    </div>`).join('')
    : '<div class="card">مفيش لاعب بالاسم ده في البيانات الحالية 🔍</div>';
}

function allTeams() {
  const out = [];
  Object.entries(DATA.tables || {}).forEach(([league, rows]) => {
    (rows || []).forEach(r => out.push(Object.assign({}, r, {league: league})));
  });
  return out;
}
function fillTeamSelects() {
  const a = document.getElementById('teamA'), b = document.getElementById('teamB');
  if (!a || a.options.length) return;
  const opts = allTeams().map(t => `<option>${t.team}</option>`).join('');
  a.innerHTML = opts; b.innerHTML = opts;
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
    row('النقاط', ta.pts, tb.pts) +
    row('المركز', ta.rank, tb.rank, true) +
    row('لعب', ta.gp, tb.gp) +
    row('فوز', ta.w, tb.w) +
    row('تعادل', ta.d, tb.d) +
    row('خسارة', ta.l, tb.l, true) + verdict;
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
    renderShop();
    renderWorld();
    renderTransfers();
    renderArchive();
    renderPlayers();
    fillTeamSelects();

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

function renderWorld() {
  const el = document.getElementById('worldContainer');
  const W = DATA.world || [];
  el.innerHTML = W.length ? W.map(w => `
    <div class="tv-card" style="text-align:right;">
      ${w.img ? `<img src="${w.img}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${w.t}</div>
    </div>`).join('')
    : '<div class="card">لا توجد أخبار عالمية حالياً</div>';
}

loadData();
setInterval(loadData, 60000);
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const b = document.getElementById('installBtn');
  if (b) b.style.display = 'inline-block';
});
function installApp() {
  if (!deferredPrompt) { alert('من قائمة المتصفح ⋮ اختار: إضافة إلى الشاشة الرئيسية'); return; }
  deferredPrompt.prompt();
}
// ================= بيانات حية فقط =================
function allTeams() {
  const map = {};
  Object.entries(DATA.tables || {}).forEach(([league, rows]) => {
    (rows || []).forEach(r => {
      if (typeof r === 'string') {
        const m = r.match(/^(\d+)\.\s*(.+?)\s*—\s*(\d+)/);
        if (m) map[m[2]] = {rank: +m[1], team: m[2], pts: +m[3], gp: 1, w: '-', d: '-', l: '-', logo: '', league: league};
      } else {
        const gp = Number(r.gp) || 0;
        const cur = map[r.team];
        if (!cur || gp > (Number(cur.gp) || 0)) map[r.team] = Object.assign({}, r, {league: league});
      }
    });
  });
  return Object.values(map);
}
function fixTables() {
  const el = document.getElementById('tablesContainer');
  if (!el) return;
  const objs = Object.values(DATA.tables || {}).some(rows => rows && rows[0] && typeof rows[0] === 'object');
  if (objs) return;
  const byLeague = {};
  allTeams().forEach(t => { (byLeague[t.league] = byLeague[t.league] || []).push(t); });
  el.innerHTML = Object.entries(byLeague).map(([name, rows]) => `
    <div class="table-box"><h3>🏆 ${name}</h3>
    <table class="stand"><tr><th>#</th><th>الفريق</th><th>نقاط</th></tr>
    ${rows.sort((a, b) => a.rank - b.rank).map(r => `<tr><td>${r.rank}</td><td>${r.team}</td><td class="pts">${r.pts}</td></tr>`).join('')}
    </table></div>`).join('') || el.innerHTML;
}
function renderLeaders() {
  const c = document.getElementById('leadersContainer');
  if (!c) return;
  const L = DATA.leaders || {};
  if (!Object.keys(L).length) { c.innerHTML = '<div class="card">الهدافون هيتحدثوا مع أول جولة 🔄</div>'; return; }
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
  const q = (document.getElementById('playerSearch')?.value || '').trim().toLowerCase();
  const all = [];
  Object.entries(DATA.leaders || {}).forEach(([league, cats]) => {
    Object.entries(cats || {}).forEach(([label, items]) => {
      (items || []).forEach(p => all.push(Object.assign({}, p, {league})));
    });
  });
  const items = q ? all.filter(p => (p.name || '').toLowerCase().includes(q) || (p.team || '').toLowerCase().includes(q)) : all.slice(0, 20);
  const c = document.getElementById('playersContainer');
  if (!c) return;
  c.innerHTML = items.length ? items.map(p => `
    <div class="tv-card" style="text-align:center;">
      ${p.face ? `<img src="${p.face}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;" onerror="this.style.display='none'">` : '<div style="font-size:1.8em;">👤</div>'}
      <div style="font-weight:bold;">${p.name}</div>
      <div style="opacity:.7;font-size:.82em;">${p.team} | ${p.league}</div>
      <div style="color:#fbbf24;font-weight:bold;margin-top:4px;">⭐ ${p.value}</div>
    </div>`).join('')
    : '<div class="card">مفيش لاعب بالاسم ده 🔍</div>';
}
window.addEventListener('load', () => {
  setTimeout(() => {
    fixTables();
    const a = document.getElementById('teamA');
    if (a) a.innerHTML = '';
    fillTeamSelects();
    renderLeaders();
    renderPlayers();
  }, 1500);
});