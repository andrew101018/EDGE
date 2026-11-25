/* Edge Football - split of app.js (item 10), part: app-extras.js.
   Classic script, load order: app-core.js -> app-matches.js -> app-sections.js -> app-extras.js.
   No logic changes vs app.js; keep app.js in repo as fallback. */
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
    document.getElementById('lastUpdate').innerHTML = 'آخر تحديث الأخبار: <bdi>' + fmtStamp(DATA.updated_at) + '</bdi>' + (DATA.matches_updated_at ? '<br>آخر تحديث المباريات: <bdi>' + fmtStamp(DATA.matches_updated_at) + '</bdi>' : '');
    MATCHES = DATA.matches || [];
    /* حارس الحداثة: لو خلاصة المباريات أقدم من 30 دقيقة أو غير مقروءة، منعرضش "مباشر" من الخلاصة وحدها - الاستعلام المباشر كل دقيقة يرجّع الحالة الحقيقية */
    let _feedStale = true;
    const _mu = DATA.matches_updated_at || '';
    const _pm = _mu.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) (AM|PM)$/);
    if (_pm) { const _hh = (+_pm[4]) % 12 + (_pm[6] === 'PM' ? 12 : 0); _feedStale = (Date.now() - Date.UTC(+_pm[1], +_pm[2] - 1, +_pm[3], _hh - 2, +_pm[5])) > 30 * 60 * 1000; }
    MATCHES.forEach(g => (g.items || []).forEach(m => { const t0 = Date.parse(m.date || ''); if (m.state === 'in' && (_feedStale || (!Number.isNaN(t0) && Date.now() - t0 > 3 * 3600 * 1000))) { m._stale = true; m.state = undefined; if (m.detail !== 'FT') m.detail = ''; } }));
    if (_feedStale) document.getElementById('lastUpdate').innerHTML += '<br>⚠️ تحديث المباريات متأخر';
    renderMatches();
    renderLeaders();
    renderTv();
    renderPredict();
    renderPredictArchive();
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
    renderHomeMatches();
    renderEditorialNews((DATA.news || []).slice(0, 4));
    renderEditorialOpinion((DATA.opinion || []).slice(0, 4));
    renderUpdateInfo();
    var hmUp = document.getElementById('homeMatchesUpdate'); if (hmUp) hmUp.textContent = fmtStamp(DATA.matches_updated_at || DATA.updated_at || '');
    document.getElementById('tablesContainer').innerHTML = Object.entries(DATA.tables || {})
      .filter(([name, rows]) => rows && rows.length)
      .map(([name, rows]) => {
        const isString = rows[0] && typeof rows[0] === 'string';
        if (isString) {
          return `<div class="table-box"><h3>🏆 ${name}</h3><div class="list">${rows.map(r => `<div class="result-item">📊 ${r}</div>`).join('')}</div></div>`;
        }
        return `<div class="table-box"><h3>🏆 ${name}</h3>
          <a class="btn" style="display:flex;justify-content:center;align-items:center;margin-bottom:10px;" target="_blank" rel="noopener" href="share.html?type=table&lg=${encodeURIComponent(name)}">🖼️ شارك ترتيب الدوري</a>
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


/* 🔴 تحديث لايف كل دقيقة (بس لما يكون فيه مباريات شغالة والتبويب مفتوح) */
setInterval(function () {
  if (document.visibilityState === 'visible') refreshLiveScores();
}, 60000);
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const b = document.getElementById('installBtn');
  if (b) b.style.display = 'inline-block';
  const bm = document.getElementById('installBtnMobile');
  if (bm) bm.style.display = 'inline-block';
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


// Draft: source-aware cards; legacy news remain readable without inventing provenance.
// Bind a trailing score to its team: nbsp glue plus an isolated LTR nowrap
// span, so a line wrap can never detach the score or flip its digit order.
const EDITORIAL_RES = /^(.*):[ \t]*(\d+[ \t]*[-\u2013][ \t]*\d+)[ \t]*$/;
function editorialAppendLine(p, line) {
  const m = line.match(EDITORIAL_RES);
  if (!m) { p.appendChild(document.createTextNode(line)); return; }
  p.appendChild(document.createTextNode(m[1] + ':\u00A0'));
  const sc = document.createElement('span');
  sc.dir = 'ltr';
  sc.style.whiteSpace = 'nowrap';
  sc.textContent = m[2];
  p.appendChild(sc);
}
function editorialFmtCairo(iso, withTime) {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('ar-EG', { timeZone: 'UTC', dateStyle: 'medium' }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  if (Number.isNaN(Date.parse(iso))) return '';
  const opts = { timeZone: 'Africa/Cairo', dateStyle: 'medium' };
  if (withTime) opts.timeStyle = 'short';
  return new Intl.DateTimeFormat('ar-EG', opts).format(new Date(iso));
}
function buildEditorialCard(n, opts) {
  const opinion = !!(opts && opts.opinion);
  const card = document.createElement('article');
  card.className = 'news-card';
  const thumb = document.createElement('span');
  thumb.className = 'edge-nthumb';
  thumb.textContent = opinion ? 'رأي' : 'EDGE';
  if (opinion) thumb.style.background = '#7c3aed';
  const wrap = document.createElement('div');
  wrap.className = 'edge-nwrap';
  const title = document.createElement('h3');
  title.className = 'news-title';
  title.textContent = (n.t || '').replace(/[\u00a0\u202f]/g, ' ');
  const body = document.createElement('p');
  body.className = 'edge-nexcerpt';
  const full = (n.full || n.t || '').trim();
  const first = (n.t || '').trim();
  let brief = full.startsWith(first) ? full.slice(first.length).trim() : full;
  const norm = s => s.replace(/[^\u0621-\u064Aa-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const nb = norm(brief), nt = norm(first);
  if (!nb || nt.startsWith(nb.slice(0, 50)) || nb.startsWith(nt.slice(0, 50))) brief = '';
  brief = brief.replace(/[\u00a0\u202f]/g, ' ');
  if (brief) {
    let cut = brief;
    if (cut.length > 140) {
      const nl = cut.lastIndexOf('\n', 140);
      cut = (nl > 40 ? cut.slice(0, nl) : cut.slice(0, 140)) + '\u2026';
    }
    cut.split('\n').forEach((ln, idx) => {
      if (idx) body.appendChild(document.createTextNode('\n'));
      editorialAppendLine(body, ln);
    });
  }
  const meta = document.createElement('p');
  meta.className = 'edge-nmeta';
  const date = editorialFmtCairo(n.published_at, true);
  const parts = [];
  if (opinion) parts.push('رأي وتحليل — مش خبر موثق');
  parts.push(n.source || 'المصدر غير محفوظ');
  if (date) parts.push(date);
  meta.textContent = parts.join(' — ');
  wrap.appendChild(title);
  if (opinion) {
    const tag = document.createElement('p');
    tag.style.cssText = 'display:inline-block;margin:2px 0 6px;padding:2px 10px;border-radius:999px;background:#7c3aed;color:#fff;font-size:.72em;font-weight:700;';
    tag.textContent = 'رأي';
    wrap.appendChild(tag);
  }
  if (brief) wrap.appendChild(body);
  wrap.appendChild(meta);
  card.append(thumb, wrap);
  if (n.url) {
    try {
      const url = new URL(n.url);
      if (['https:', 'http:'].includes(url.protocol)) {
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = opinion ? 'اقرأ الأساس عند المصدر' : 'اقرأ عند المصدر';
        link.style.cssText = 'display:inline-block;min-height:44px;padding-block:10px';
        wrap.appendChild(link);
      }
    } catch (_) { /* An invalid source URL is not rendered. */ }
  }
  // Detail expander: the full verified body, one element per line, plus
  // verification timestamp and source list. Nothing is rephrased or added.
  const srcs = Array.isArray(n.sources) ? n.sources.filter(u => /^https?:/.test(u || '')) : [];
  const checkedStr = editorialFmtCairo(n.checked_at, true);
  const hasMore = full && full !== first && (full.length > (brief || '').length || srcs.length || checkedStr);
  if (hasMore) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'edge-ndetails-btn';
    btn.textContent = 'عرض التفاصيل كاملة';
    btn.setAttribute('aria-expanded', 'false');
    btn.style.cssText = 'display:inline-block;min-height:44px;padding:8px 12px;margin-top:6px;background:none;border:1px solid #334155;border-radius:8px;color:#fbbf24;font-size:.85em;cursor:pointer;font-family:inherit;';
    const det = document.createElement('div');
    det.className = 'edge-ndetails';
    det.style.cssText = 'display:none;margin-top:8px;border-top:1px solid #1e293b;padding-top:8px;';
    full.split('\n').forEach(line => {
      if (!line.trim()) return;
      const p = document.createElement('p');
      p.dir = 'auto';
      p.style.cssText = 'margin:4px 0;font-size:.9em;line-height:1.7;';
      editorialAppendLine(p, line.trim());
      det.appendChild(p);
    });
    if (checkedStr) {
      const chk = document.createElement('p');
      chk.dir = 'auto';
      chk.style.cssText = 'margin:10px 0 0;font-size:.78em;color:#94a3b8;';
      chk.textContent = 'آخر فحص للمصادر: ' + checkedStr;
      det.appendChild(chk);
    }
    if (srcs.length) {
      const sh = document.createElement('p');
      sh.style.cssText = 'margin:8px 0 2px;font-size:.78em;color:#94a3b8;';
      sh.textContent = 'مصادر التحقق:';
      det.appendChild(sh);
      srcs.forEach(u => {
        try {
          const a = document.createElement('a');
          a.href = new URL(u).href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = new URL(u).hostname.replace(/^www\./, '');
          a.style.cssText = 'display:block;min-height:44px;padding-block:10px;font-size:.85em;color:#7cb3ff;direction:ltr;text-align:right;';
          det.appendChild(a);
        } catch (_) { /* An invalid source URL is not rendered. */ }
      });
    }
    btn.addEventListener('click', () => {
      const open = det.style.display !== 'none';
      det.style.display = open ? 'none' : 'block';
      btn.setAttribute('aria-expanded', String(!open));
      btn.textContent = open ? 'عرض التفاصيل كاملة' : 'إخفاء التفاصيل';
    });
    wrap.appendChild(btn);
    wrap.appendChild(det);
  }
  return card;
}
function renderEditorialNews(items) {
  const container = document.getElementById('newsContainer');
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = 'لا توجد أخبار جديدة حالياً';
    container.appendChild(empty);
    return;
  }
  items.forEach(raw => {
    const n = typeof raw === 'string' ? {t: raw, full: raw} : raw;
    container.appendChild(buildEditorialCard(n, null));
  });
}
// Item 38: when does the site update? Intended cadence vs actual freshness.
// Only pipeline facts are stated; no content-frequency promises.
function renderUpdateInfo() {
  const el = document.getElementById('updateInfo');
  if (!el) return;
  const row = (icon, title, desc) => '<div class="card"><div style="font-weight:700;margin-bottom:2px;">' + icon + ' ' + title + '</div><div style="font-size:.85em;color:#b6c2d2;line-height:1.8;">' + desc + '</div></div>';
  let html = '';
  html += row('⚽', 'المباريات والنتائج', 'التحديث مضبوط على كل ٥ دقائق من بيانات عامة، لكن التنفيذ الفعلي بيعتمد على جدولة المنصة وممكن يتأخر أو يتخطى أحيانًا. آخر تحديث ناجح: <b>' + esc(fmtStamp(DATA.matches_updated_at || '')) + '</b> — ولو عدّى ٣٠ دقيقة بيظهر تنبيه "تحديث المباريات متأخر" أعلى الصفحة.');
  html += row('📰', 'الأخبار الموثقة', 'مش تحديث دوري: الخبر بينزل بعد مراجعة مصادره وتسجيلها معاه. آخر تحديث للأخبار: <b>' + esc(fmtStamp(DATA.updated_at || '')) + '</b>.');
  html += row('🎬', 'فيديوهات القناة', 'مزامنة مجدوَلة كل ٦ ساعات مع قناة يوتيوب — الفيديو الجديد ممكن يوصل متأخر عن القناة، مش لحظي.');
  html += row('🌍', 'الصحافة العالمية', 'مختارات من الصحافة العالمية بتتجدد على فترات، مش تحديث لحظي.');
  el.innerHTML = html;
}
// Item 36: separate EDGE opinion section, always labeled as opinion, never news.
function renderEditorialOpinion(items) {
  const container = document.getElementById('opinionContainer');
  if (!container) return;
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = 'لسه مفيش آراء منشورة.';
    container.appendChild(empty);
    return;
  }
  items.forEach(raw => {
    const n = typeof raw === 'string' ? {t: raw, full: raw} : raw;
    container.appendChild(buildEditorialCard(n, { opinion: true }));
  });
}

