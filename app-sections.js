/* Edge Football - split of app.js (item 10), part: app-sections.js.
   Classic script, load order: app-core.js -> app-matches.js -> app-sections.js -> app-extras.js.
   No logic changes vs app.js; keep app.js in repo as fallback. */
function renderMatches() {
  const el = document.getElementById('matchesContainer');
  const liveItems = [];
  const preItems = [];
  MATCHES.forEach(g => g.items.forEach(m => {
    if (m.state === 'in') liveItems.push(Object.assign({}, m, { league: g.league }));
    const t0 = Date.parse(m.date || '');
    if (!Number.isNaN(t0) && t0 > Date.now() && t0 - Date.now() <= 24 * 3600 * 1000) preItems.push(Object.assign({}, m, { league: g.league }));
  }));
  let html = '';
  if (liveItems.length) {
    html += '<div class="live-block"><div class="live-title">🔴 مباشر الآن</div>' + liveItems.map(m => `<div class="live-card"><div class="live-teams"><span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home} <bdi dir="ltr" style="font-weight:800;">${m.hs}</bdi></span><span class="live-score" style="font-size:.9em;">⏱️ ${m.detail}</span><span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}"><bdi dir="ltr" style="font-weight:800;">${m.as}</bdi> ${m.away} ${teamLogo(m.awayLogo)}</span></div><div class="live-meta">${m.league}</div></div>`).join('') + '</div>';
  }
  if (preItems.length) {
    html += '<div class="live-block" style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid #334155;"><div class="live-title" style="color:#fbbf24;animation:none;">🕐 مباريات خلال 24 ساعة</div>' + preItems.slice(0, 6).map(m => `<div class="live-card"><div class="live-teams"><span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home}</span><span class="live-score" style="color:#94a3b8;font-size:1.05em;">${fmtCairoTime(m)}</span><span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${m.away} ${teamLogo(m.awayLogo)}</span></div><div class="live-meta">🏆 ${m.league}</div></div>`).join('') + '</div>';
  }
  html += MATCHES.map(g => {
    const items = g.items.filter(m => matchState(m) !== 'in');
    if (!items.length) return '';
    const byState = { pre: [], post: [] };
    items.forEach(m => { const s = matchState(m); if (byState[s]) byState[s].push(m); });
    return `<div class="league-box"><div class="league-title">🏆 ${g.league}</div>` +
      (g.slug === 'egy.1' ? `<div style="padding:6px 10px;font-size:.72em;color:#eebf63;background:#0f172a;">المصدر: كورة (محدّث تلقائيًا). القائمة قد لا تشمل كل مباريات الجولة، والنتائج النهائية مأخوذة من مصدر واحد.</div>` : '') +
      (byState.post.length ? `<div style="padding:6px 10px;font-size:.75em;opacity:.6;background:#0f172a;">🏁 مباريات انتهت</div>` + byState.post.map(matchRow).join('') : '') +
      (byState.pre.length ? `<div style="padding:6px 10px;font-size:.75em;opacity:.6;background:#0f172a;">🕐 مباريات مجدولة</div>` + byState.pre.map(matchRow).join('') : '') +
      `</div>`;
  }).join('');
  // نتائج موثقة فقط: القائمة النصية القديمة DATA.results لا تُعرض لأنها غير قابلة للتحقق؛
  // النتائج المعروضة أعلاه مأخوذة من بيانات المباريات المنظمة (ESPN ±24 ساعة) لكل دوري.
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
    const hasGoals = Object.keys(cats || {}).some(k => (k || '').includes('الهداف'));
    h += `<h3 style="margin:18px 0 8px;color:#fbbf24;">${league}</h3>`;
    if (hasGoals) h += `<a class="btn" style="display:flex;justify-content:center;align-items:center;margin:0 0 8px;" target="_blank" rel="noopener" href="share.html?type=scorer&lg=${encodeURIComponent(league)}">🖼️ شارك كارت الهدافين</a>`;
    Object.entries(cats).forEach(([label, items]) => {
      h += `<h4 style="margin:8px 0 6px;opacity:.8;">${label}</h4><div class="grid">`;
      (items || []).forEach((p, i) => {
        h += `<div class="tv-card" style="text-align:center;">
          ${p.face ? `<img loading="lazy" src="${p.face}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;" onerror="this.style.display='none'">` : '<div style="font-size:1.8em;">👤</div>'}
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
    ${p.face ? `<img loading="lazy" src="${p.face}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;margin:0 auto 6px;display:block;" onerror="this.style.display='none'">` : '<div style="font-size:1.8em;">👤</div>'}
    <div style="font-weight:bold;">${p.name}</div>
    <div style="opacity:.7;font-size:.82em;">${p.team} | ${p.league}</div>
    <div style="color:#fbbf24;font-weight:bold;margin-top:4px;">⭐ ${p.value}</div>
  </div>`).join('') : '<div class="card">مفيش لاعب بالاسم ده 🔍</div>';
}

function renderTv() {
  const el = document.getElementById('tvContainer');
  const rows = [];
  (DATA.matches || []).forEach(g => (g.items || []).forEach(m => {
    if (matchState(m) !== 'post') rows.push(Object.assign({}, m, { league: g.league }));
  }));
  el.innerHTML = rows.length ? rows.map(m => `<div class="tv-card">
    <div class="tv-teams">${teamLogo(m.homeLogo)} ${m.home} × ${m.away} ${teamLogo(m.awayLogo)}</div>
    <div class="tv-info">${statusNote(m)} — ${fmtCairoTime(m)} | ${m.league}</div>
  </div>`).join('') : '<div class="card">لا توجد مباريات مجدولة قريباً</div>';
}

/* ISO week key in Africa/Cairo — the same week definition the shared weekly winner would use. */
function cairoWeekKey(d) {
  d = d || new Date();
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const dt = new Date(p + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7) + 3);
  const ft = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  ft.setUTCDate(ft.getUTCDate() - ((ft.getUTCDay() + 6) % 7) + 3);
  return dt.getUTCFullYear() + '-W' + String(1 + Math.round((dt - ft) / 6048e5)).padStart(2, '0');
}

// Item 37: editorial predictions archive. Every stat is computed from the
// resolved records shown below it; nothing is asserted by hand.
function renderPredictArchive() {
  const el = document.getElementById('predictArchive');
  if (!el) return;
  const log = (DATA.predictions_log || []).slice().sort((a, b) => String(b.kickoff).localeCompare(String(a.kickoff)));
  if (!log.length) {
    el.innerHTML = '<div class="card">أول توقع هيظهر هنا قبل الماتش — وبعد الماتش بنعرض طلع صح ولا غلط.</div>';
    return;
  }
  const done = log.filter(p => p.status && p.status !== 'pending');
  const exact = done.filter(p => p.status === 'exact').length;
  const dirUp = done.filter(p => p.status === 'exact' || p.status === 'direction').length;
  let html = '';
  if (done.length) {
    html += '<div class="card" style="text-align:center;line-height:1.9;"><div>من ' + done.length + ' توقع اتحسم:</div><div>النتيجة بالظبط: <b>' + Math.round(exact / done.length * 100) + '%</b></div><div>الاتجاه الصح أو بالظبط: <b>' + Math.round(dirUp / done.length * 100) + '%</b></div><small style="color:#b6c2d2;">النسب محسوبة من السجل المعروض تحت مباشرة.</small></div>';
  }
  const fmtKo = iso => {
    if (Number.isNaN(Date.parse(iso))) return '';
    return new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  };
  html += log.slice(0, 30).map(p => {
    let res;
    if (p.status === 'pending') res = '<span style="color:#94a3b8;">⏳ بانتظار الماتش</span>';
    else if (p.status === 'exact') res = '<span style="color:#4ade80;">✓ النتيجة بالظبط</span>';
    else if (p.status === 'direction') res = '<span style="color:#4ade80;">✓ الاتجاه صح</span>';
    else res = '<span style="color:#f87171;">✗ غلط</span>';
    const actual = Array.isArray(p.actual) ? ' · طلعت <bdi dir="ltr">' + p.actual[0] + '-' + p.actual[1] + '</bdi>' : '';
    const note = p.note ? '<div style="margin-top:2px;font-size:.85em;color:#b6c2d2;">' + esc(p.note) + '</div>' : '';
    return '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>' + esc(p.home) + ' × ' + esc(p.away) + '</span>' + res + '</div>' +
      '<div style="margin-top:4px;font-size:.9em;color:#e2e8f0;line-height:1.8;">توقعنا <bdi dir="ltr">' + esc(String(p.pick[0])) + '-' + esc(String(p.pick[1])) + '</bdi>' + actual + '</div>' +
      '<div style="font-size:.85em;color:#b6c2d2;line-height:1.8;">الماتش: ' + esc(fmtKo(p.kickoff)) + (p.ingested_at ? ' · سُجل: ' + esc(fmtKo(p.ingested_at)) : '') + '</div>' + note + '</div>';
  }).join('');
  el.innerHTML = html;
}

function renderPredict() {
  const saved = JSON.parse(localStorage.getItem('edgePredict') || '{}');
  const scored = JSON.parse(localStorage.getItem('edgeScored') || '[]');
  let points = parseInt(localStorage.getItem('edgePoints') || '0');
  const wk = cairoWeekKey();
  let week = JSON.parse(localStorage.getItem('edgeWeek') || 'null');
  if (!week || week.key !== wk) week = { key: wk, pts: 0 };
  let earned = 0;
  (DATA.matches || []).forEach(g => g.items.forEach(m => {
    if (m.state === 'post' && saved[m.eid] && !scored.includes(m.eid)) {
      const p = saved[m.eid];
      const hh = parseInt(m.hs), aa = parseInt(m.as);
      if (p[0] === hh && p[1] === aa) { points += 3; earned += 3; }
      else if (Math.sign(p[0] - p[1]) === Math.sign(hh - aa)) { points += 1; earned += 1; }
      scored.push(m.eid);
    }
  }));
  week.pts += earned;
  localStorage.setItem('edgePoints', String(points));
  localStorage.setItem('edgeScored', JSON.stringify(scored));
  localStorage.setItem('edgeWeek', JSON.stringify(week));
  document.getElementById('predictPoints').innerHTML = `⭐ نقاطك: <b>${points}</b> — النتيجة الصح بـ 3 نقاط والاتجاه الصح بنقطة<br><small>📅 <b>${week.pts}</b> نقطة اتضافت الأسبوع ده (على جهازك بس)</small>`;
  const upcoming = [];
  (DATA.matches || []).forEach(g => g.items.forEach(m => {
    if (m.state === 'pre') upcoming.push(m);
  }));
  const el = document.getElementById('predictContainer');
  if (!upcoming.length) {
    el.innerHTML = '<div class="card">لا توجد مباريات قادمة للتوقع حالياً</div>';
    return;
  }
  el.innerHTML = `<a class="btn" style="display:flex;justify-content:center;align-items:center;margin-bottom:12px;" target="_blank" rel="noopener" href="share.html?type=predict">🖼️ شارك توقعاتي (ستوري)</a>` + upcoming.slice(0, 40).map(m => {
    const v = saved[m.eid] || ['', ''];
    return `<div class="pred-row" data-eid="${m.eid}">
      <div class="pred-teams">${teamLogo(m.homeLogo)} ${m.home} × ${m.away} ${teamLogo(m.awayLogo)}</div>
      <div class="pred-inputs"><input type="number" min="0" class="pred-h" value="${v[0]}" placeholder="0"><span>-</span><input type="number" min="0" class="pred-a" value="${v[1]}" placeholder="0"></div>
      ${edgeShareBtn('توقعي: ' + m.home + ' × ' + m.away, 'توقعي: ' + m.home + ' × ' + m.away + ' — جاي من Edge Football', 'https://andrew101018.github.io/EDGE/')}
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
    return p ? `<span class="p-card">${p.face ? `<img loading="lazy" class="p-face" src="${p.face}" onerror="this.style.display='none'">` : '👤'} ${p.name} <small>💰${p.price}</small></span>` : '';
  }).join('') : '';
  document.getElementById('fantasyPool').innerHTML = pool.sort((a, b) => b.val - a.val).slice(0, 100).map(p => `
    <div class="tv-card" style="cursor:pointer;${chosen.includes(p.name) ? 'border-color:#fbbf24;' : ''}" onclick="toggleFantasy('${p.name.replace(/'/g, '')}')">
      ${p.face ? `<img loading="lazy" class="p-face" style="width:42px;height:42px;" src="${p.face}" onerror="this.style.display='none'">` : '👤'}
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
  const inviteBtn = '<div style="margin-bottom:10px">' + edgeShareBtn('لوحة EDGE', 'هتقدر تطلعني من على لوحة EDGE؟ شوف نقاطك ورتبك هنا 🏅', location.origin + location.pathname + '#board') + ' ادعُ أصحابك وشوف مين هيكسب الجون 😄</div>';
  const res = await supa.from('players').select('*').order('total', { ascending: false }).limit(50);
  if (res.error || !res.data || !res.data.length) {
    el.innerHTML = inviteBtn + '<div class="card">لسه مفيش لاعبين — كن أول من يرفع نقاطه! 🚀</div>';
    return;
  }
  const medals = ['🥇', '🥈', '🥉'];
  el.innerHTML = inviteBtn + '<table class="stand"><tr><th>#</th><th>الاسم</th><th>توقعات</th><th>فانتازي</th><th>الإجمالي</th></tr>' +
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
      ${n.img ? `<img loading="lazy" src="${n.img}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${n.t}</div>
    </div>`).join('') : '<div class="card">مفيش أخبار انتقالات دلوقتي 🔄</div>';
}

function renderArchive() {
  const q = (document.getElementById('archiveSearch').value || '').trim().toLowerCase();
  const all = [...(DATA.news || []), ...(DATA.world || [])];
  const items = q ? all.filter(n => (n.t || '').toLowerCase().includes(q)) : all;
  document.getElementById('archiveContainer').innerHTML = items.length ? items.map(n => `
    <div class="tv-card" style="text-align:right;cursor:pointer;" onclick="showNewsDetail('${esc(n.t)}','${esc(n.full || n.t)}')">
      ${n.img ? `<img loading="lazy" src="${n.img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${n.t}</div>
    </div>`).join('') : '<div class="card">مفيش نتائج مطابقة 🔍</div>';
}

function renderWorld() {
  const el = document.getElementById('worldContainer');
  const W = DATA.world || [];
  el.innerHTML = W.length ? W.map(w => `
    <div class="tv-card" style="text-align:right;cursor:pointer;" onclick="showNewsDetail('${esc(w.t)}','${esc(w.full || w.t)}')">
      ${w.img ? `<img loading="lazy" src="${w.img}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
      <div style="font-weight:bold;font-size:.9em;">${w.t}</div>
      ${edgeShareBtn(w.t, w.t, w.url || 'https://andrew101018.github.io/EDGE/')}
    </div>`).join('') : '<div class="card">لا توجد أخبار عالمية حالياً</div>';
}

function showNewsDetail(title, full, img) {
  const box = document.getElementById('teamModal');
  if (!box) return;
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;overflow:auto;';
  if (box.firstElementChild) box.firstElementChild.style.cssText = 'max-width:680px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('teamModalTitle').textContent = '📰 خبر';
  
  // تنظيف التكرار: لو النص بيبدأ بنفس العنوان، نشيله من أول النص
  let clean = (full || title).trim();
  const t = (title || '').trim();
  if (t && clean.startsWith(t)) clean = clean.slice(t.length).trim();
  if (t && clean.startsWith('-')) clean = clean.slice(1).trim();
  clean = clean.replace(t + '\\n', '').replace(t + ' ', ' ').trim();
  
  document.getElementById('teamModalBody').innerHTML =
    (img ? `<img loading="lazy" src="${img}" style="width:100%;max-height:320px;object-fit:cover;border-radius:10px;margin-bottom:14px;" onerror="this.style.display='none'">` : '') +
    '<h3 style="color:#fbbf24;margin-bottom:12px;">' + title + '</h3>' +
    '<div style="line-height:2;white-space:pre-wrap;font-size:1.05em;">' + (clean || t) + '</div>' +
    (clean && clean.length < 50 ? '<div style="opacity:.6;font-size:.85em;margin-top:14px;">💡 التفاصيل الكاملة متاحة من المصدر — البيانات بتتحسن مع المصادر الجديدة</div>' : '');
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
    <div style="text-align:center;flex:1;">${ta.logo ? `<img loading="lazy" src="${ta.logo}" style="width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 6px;">` : ''}<b>${ta.team}</b><div style="opacity:.7;font-size:.8em;">${ta.league}</div></div>
    <div style="font-size:1.6em;">⚖️</div>
    <div style="text-align:center;flex:1;">${tb.logo ? `<img loading="lazy" src="${tb.logo}" style="width:48px;height:48px;object-fit:contain;display:block;margin:0 auto 6px;">` : ''}<b>${tb.team}</b><div style="opacity:.7;font-size:.8em;">${tb.league}</div></div>
  </div>`;
  const pa = Number(ta.pts) || 0, pb = Number(tb.pts) || 0;
  const verdict = pa === pb ? '' : `<div class="card" style="text-align:center;font-weight:bold;color:#fbbf24;">${pa > pb ? ta.team : tb.team} الأعلى نقاطاً 🔥</div>`;
  document.getElementById('compareContainer').innerHTML = head +
    row('النقاط', ta.pts, tb.pts) + row('المركز', ta.rank, tb.rank, true) +
    row('لعب', ta.gp, tb.gp) + row('فوز', ta.w, tb.w) +
    row('تعادل', ta.d, tb.d) + row('خسارة', ta.l, tb.l, true) + verdict;
}

function allPlayers() {
  const map = {};
  Object.entries(DATA.leaders || {}).forEach(([league, cats]) => {
    Object.values(cats || {}).forEach(items => {
      (items || []).forEach(p => {
        const nm = (p.name || '').trim();
        if (!nm) return;
        const goals = parseInt(p.value, 10) || 0;
        const cur = map[nm] || (map[nm] = { name: nm, team: p.team || '', leagues: [], total: 0 });
        if (!cur.team && p.team) cur.team = p.team;
        cur.leagues.push({ league: league, goals: goals });
        cur.total += goals;
      });
    });
  });
  return Object.values(map);
}

function fillPlayerSelects() {
  const a = document.getElementById('playerA'), b = document.getElementById('playerB'), lg = document.getElementById('playerLeague');
  if (!a || a.options.length) return;
  const opts = allPlayers().map(p => `<option value="${p.name.replace(/"/g, '&quot;')}">${p.name}${p.team ? ' — ' + p.team : ''}</option>`).join('');
  a.innerHTML = opts;
  b.innerHTML = opts;
  if (b.options.length > 1) b.selectedIndex = 1;
  if (lg && !lg.options.length) {
    lg.innerHTML = Object.keys(DATA.leaders || {}).map(l => `<option>${l}</option>`).join('');
  }
}

function renderPlayerCompare() {
  const players = allPlayers();
  const pa = players.find(p => p.name === document.getElementById('playerA').value);
  const pb = players.find(p => p.name === document.getElementById('playerB').value);
  const lg = document.getElementById('playerLeague').value;
  if (!pa || !pb || !lg) return;
  const selA = document.getElementById('playerA'), selB = document.getElementById('playerB');
  selA.title = selA.options[selA.selectedIndex].text;
  selB.title = selB.options[selB.selectedIndex].text;
  const ga = (pa.leagues.find(x => x.league === lg) || {}).goals;
  const gb = (pb.leagues.find(x => x.league === lg) || {}).goals;
  const MISSING = 'غير مسجل';
  const cell = g => (typeof g === 'number') ? g : `<span style="opacity:.75;font-size:.85em;">${MISSING}</span>`;
  const bothKnown = (typeof ga === 'number') && (typeof gb === 'number');
  const ca = bothKnown ? (ga > gb ? '#4ade80' : ga < gb ? '#f87171' : '#fff') : '#fff';
  const cb = bothKnown ? (gb > ga ? '#4ade80' : gb < ga ? '#f87171' : '#fff') : '#fff';
  const head = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
    <div style="text-align:center;flex:1;"><b>${pa.name}</b><div style="opacity:.7;font-size:.8em;">${pa.team}</div></div>
    <div style="font-size:1.6em;">⚖️</div>
    <div style="text-align:center;flex:1;"><b>${pb.name}</b><div style="opacity:.7;font-size:.8em;">${pb.team}</div></div>
  </div>`;
  const row = `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#0f172a;border-radius:10px;margin-bottom:8px;">
      <b style="color:${ca};flex:1;text-align:right;">${cell(ga)}</b>
      <span style="opacity:.8;flex:1;text-align:center;">الأهداف</span>
      <b style="color:${cb};flex:1;text-align:left;">${cell(gb)}</b>
    </div>`;
  document.getElementById('playerCompareContainer').innerHTML = head + row;
  const upd = DATA.updated_at ? ` — آخر تحديث للموقع: <bdi dir="ltr">${DATA.updated_at}</bdi>` : '';
  document.getElementById('playerCompareMeta').innerHTML =
    `الأرقام من جدول هدافي «${lg}» المسجل عندنا${upd}. «${MISSING}» يعني اللاعب مش ظاهر في الجدول ده في بياناتنا، مش إنه سجل صفر. المقارنة دي لقطة من جداول الهدافين، مش إحصائية موسم كاملة.`;
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
      squad.map(p => `<tr><td style="text-align:right;">${p.face ? `<img loading="lazy" class="p-face" style="width:24px;height:24px;vertical-align:middle;margin-left:5px;" src="${p.face}" onerror="this.style.display='none'">` : '👤'} ${p.name}</td><td>${p.age}</td><td>${p.nat}</td><td>${p.pos}</td><td>${p.apps}</td><td class="pts">${p.goals}</td><td>${p.assists}</td><td style="color:#fbbf24;font-weight:bold;">${p.rating}</td></tr>`).join('') + `</table></div>`;
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
        document.getElementById('teamModalBody').innerHTML = `<div style="text-align:center;margin-bottom:12px;">${team.strBadge ? `<img loading="lazy" src="${team.strBadge}" style="width:64px;height:64px;object-fit:contain;">` : ''}<div style="font-weight:bold;font-size:1.25em;">${team.strTeam}</div><div style="opacity:.7;">${team.strLeague || ''}</div></div><div style="overflow-x:auto;"><table class="stand">${headRow}` +
          players.map(p => {
            const s = statsOf(p.strPlayer);
            return `<tr><td style="text-align:right;">${p.strCutout || p.strThumb ? `<img loading="lazy" class="p-face" style="width:24px;height:24px;vertical-align:middle;margin-left:5px;" src="${p.strCutout || p.strThumb}" onerror="this.style.display='none'">` : '👤'} ${p.strPlayer}</td><td>${ageFrom(p.dateBorn)}</td><td>${p.strNationality || '-'}</td><td>${p.strPosition || '-'}</td><td>${gp || '-'}</td><td class="pts">${s ? s[0] : '-'}</td><td>${s ? s[1] : '-'}</td><td style="color:#fbbf24;font-weight:bold;">${s ? s[2] : '-'}</td></tr>`;
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
    const t24 = m && m.date ? (String(m.date).match(/T(\d{2}:\d{2})/) || [])[1] : null;
    const st = m ? (m.state === 'in' ? 'جارية الآن' : (m.state === 'post' ? 'انتهت' : (t24 || m.time))) : 'مباراة';
    const p = new URLSearchParams();
    p.set('t1', t1);
    p.set('t2', t2);
    if (hasScore) { p.set('s1', m.hs); p.set('s2', m.as); }
    if (m && m.league) p.set('lg', m.league);
    p.set('st', st);
    if (m && m.dateAr) p.set('dt', m.dateAr);
    if (m && m.homeLogo) p.set('l1', m.homeLogo);
    if (m && m.awayLogo) p.set('l2', m.awayLogo);
    return '<a class="btn" style="display:flex;justify-content:center;align-items:center;margin-bottom:14px;" target="_blank" rel="noopener" href="share.html?' + p.toString() + '">🖼️ شارك كارت المباراة</a>';
  } catch (e) {
    return '';
  }
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function icsDate(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + '00Z';
}

function icsButton(eid) {
  try {
    let m = null;
    (DATA.matches || []).forEach(g => (g.items || []).forEach(x => {
      if (String(x.eid) === String(eid)) m = x;
    }));
    if (!m || m.state !== 'pre') return '';
    const t = Date.parse(m.date || '');
    if (Number.isNaN(t) || t <= Date.now()) return '';
    return '<button class="btn" style="display:flex;justify-content:center;align-items:center;margin-bottom:6px;width:100%;" onclick="downloadIcs(\'' + String(eid) + '\')">📅 أضف المباراة لتقويم موبايلك</button><div style="font-size:.75em;opacity:.65;margin:0 0 12px;text-align:center">الموعد مبدئي ومش مؤكد رسميًا — ممكن يتغير أو يتأجل</div>';
  } catch (e) {
    return '';
  }
}

function downloadIcs(eid) {
  try {
    let m = null, lg = '';
    (DATA.matches || []).forEach(g => (g.items || []).forEach(x => {
      if (String(x.eid) === String(eid)) { m = x; lg = g.league || ''; }
    }));
    if (!m) return;
    const t = new Date(m.date);
    if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) return;
    const end = new Date(t.getTime() + 2 * 60 * 60 * 1000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Edge Football//Matches//AR',
      'BEGIN:VEVENT',
      'UID:edge-' + eid + '@edgefootball',
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(t),
      'DTEND:' + icsDate(end),
      'SUMMARY:' + icsEscape('⚽ ' + m.home + ' × ' + m.away + (lg ? ' — ' + lg : '')),
      'DESCRIPTION:' + icsEscape('الموعد مبدئي ومش مؤكد رسميًا — بحسب بيانات Edge Football (آخر تحديث المباريات: ' + (DATA.matches_updated_at || 'غير متوفر') + ') وقد يتغير أو يتأجل — المدة تقديرية (ساعتان) — تابع الموقع قبل الماتش: https://andrew101018.github.io/EDGE/'),
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'edge-match-' + eid + '.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) {}
}

async function showMatch(slug, eid, title) {
  const box = document.getElementById('matchModal');
  box.style.cssText = 'display:block;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;overflow:auto;';
  box.firstElementChild.style.cssText = 'max-width:640px;margin:40px auto;background:#1e293b;border-radius:12px;padding:20px;';
  document.getElementById('matchModalTitle').textContent = '⚽ ' + title;
  document.getElementById('matchModalBody').innerHTML = 'جاري تحميل التفاصيل...';
  const shareHtml = matchShareButton(slug, eid, title) + icsButton(eid);
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



