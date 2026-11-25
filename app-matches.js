/* Edge Football - split of app.js (item 10), part: app-matches.js.
   Classic script, load order: app-core.js -> app-matches.js -> app-sections.js -> app-extras.js.
   No logic changes vs app.js; keep app.js in repo as fallback. */
/* ===== ⭐ مباراة القمة بعدّاد تنازلي ===== */
let _featTarget = null;
let _featTimer = null;

function countdownInner(target) {
  const diff = target - Date.now();
  if (diff <= 0) return '⏳ في انتظار تحديث المصدر'; // لا نستنتج البدء من الساعة - المصدر وحده يؤكد الحالة
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const mn = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const parts = [];
  if (d > 0) parts.push('<b>' + d + '</b> يوم');
  parts.push('<b>' + pad(h) + '</b> ساعة');
  parts.push('<b>' + pad(mn) + '</b> دقيقة');
  parts.push('<b>' + pad(s) + '</b> ثانية');
  return parts.join('<span class="feat-sep">:</span>');
}

/* حالة المباراة مشتقة من التفاصيل/الوقت عندما لا يخزنها العدّاء */
function fmtCairoTime(m) {
  const t = Date.parse(m.date || '');
  if (Number.isNaN(t)) return m.time || '';
  return new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(new Date(t));
}

function matchState(m) {
  if (m.state) return m.state;                 // حالة مؤكدة من ESPN عبر التحديث المباشر
  if (m.detail === 'FT') return 'post';        // انتهاء موثق من العدّاء
  return 'pre';                                // مجدولة/غير مؤكدة — لا نفترض البدء أو الانتهاء
}
/* نتيجة ماتش كان مباشر وانقطع تحديث مصدره: تُعرض كآخر نتيجة معروفة بتوقيت آخر فحص، مش كلحظة حالية */
function lastKnownCheck(m) {
  const mp = (typeof DATA !== 'undefined' && DATA.matches_checked_by_source) || {};
  return mp[m.slug] || (typeof DATA !== 'undefined' && (DATA.matches_checked_at || DATA.matches_updated_at)) || '';
}
function statusNote(m) {
  if (m.state === 'in') return 'مباشر';
  if (m.detail === 'FT' || m.state === 'post') return 'انتهت';
  const t = Date.parse(m.date || '');
  if (!Number.isNaN(t) && t <= Date.now()) return '⏳ في انتظار تحديث المصدر'; // عدّى موعد البداية والمصدر لسه مجدولة - لا نعرف: تأجيل/إلغاء/انتهاء محتمل
  return 'مجدولة';
}

function needsLivePoll(m) {
  if (m._stale) return true;
  if (m.detail === 'FT' || m.state === 'post') return false; // مباراة بدا وقتها ولم تُحسم: تُستعلم مباشرة حتى لو الخلاصة تقول pre
  const t = Date.parse(m.date || '');
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t <= now && now - t <= 36 * 3600 * 1000; // نافذة استعلام فقط، وليست حالة عرض
}

function renderFeaturedMatch() {
  const el = document.getElementById('featuredMatch');
  if (!el) return;
  const all = [];
  MATCHES.forEach(g => (g.items || []).forEach(m => all.push(Object.assign({}, m, { league: g.league, big: g.big }))));
  const live = all.filter(m => m.state === 'in');
  const upcoming = all.filter(m => { const t = Date.parse(m.date || ''); return !Number.isNaN(t) && t > Date.now(); });
  let m = null, mode = null;
  if (live.length) {
    m = (live.filter(x => x.big)[0] || live[0]);
    mode = 'live';
  } else {
    const bigs = upcoming.filter(x => x.big);
    const pool = bigs.length ? bigs : upcoming;
    if (pool.length) {
      pool.sort((a, b) => String(a.date || '9999').localeCompare(String(b.date || '9999')));
      m = pool[0];
      mode = 'pre';
    }
  }
  if (!m) { el.innerHTML = ''; _featTarget = null; return; }
  const tag = m.eid + '|' + m.slug + '|' + m.home + ' × ' + m.away;
  if (mode === 'live') {
    _featTarget = null;
    el.innerHTML = `<div class="feat-card" data-match="${tag}">
      <div class="feat-league">🔴 ${m.league}</div>
      <div class="feat-teams">
        <div class="feat-team">${teamLogo(m.homeLogo)}<span>${m.home}</span><bdi dir="ltr" style="display:block;font-size:1.7em;font-weight:800;line-height:1.15;">${m.hs}</bdi></div>
        <div class="feat-score"><small style="font-size:1em;">${m.detail}</small></div>
        <div class="feat-team">${teamLogo(m.awayLogo)}<span>${m.away}</span><bdi dir="ltr" style="display:block;font-size:1.7em;font-weight:800;line-height:1.15;">${m.as}</bdi></div>
      </div>
      <div class="feat-cta">🔴 مباشر الآن — اضغط لمتابعة المباراة</div>
    </div>`;
  } else {
    const target = m.date ? new Date(m.date) : null;
    const valid = target && !isNaN(target.getTime());
    _featTarget = valid ? target : null;
    el.innerHTML = `<div class="feat-card" data-match="${tag}">
      <div class="feat-league">⭐ ${m.league}</div>
      <div class="feat-teams">
        <div class="feat-team">${teamLogo(m.homeLogo)}<span>${m.home}</span></div>
        <div class="feat-vs">VS</div>
        <div class="feat-team">${teamLogo(m.awayLogo)}<span>${m.away}</span></div>
      </div>
      <div class="feat-cd">${valid ? countdownInner(target) : '🕐 ' + m.time}</div>
      <div class="feat-cta">اضغط لمتابعة المباراة</div>
    </div>`;
    if (valid && !_featTimer) {
      _featTimer = setInterval(function () {
        try {
          const cdEl = document.querySelector('#featuredMatch .feat-cd');
          if (cdEl && _featTarget) {
            cdEl.innerHTML = countdownInner(_featTarget);
            if (_featTarget - Date.now() <= 0) renderFeaturedMatch();
            refreshLiveScores();
          }
        } catch (e) {}
      }, 1000);
    }
  }
}


/* ===== الرئيسية: شريط المباريات (تصور المرحلة الأولى) — بيانات ESPN الحقيقية فقط ===== */
var edgeHomeDay = 0;
function edgeMatchDay(d) {
  edgeHomeDay = d;
  document.querySelectorAll('#homeMatchTabs .edge-mtab').forEach(b => b.classList.toggle('active', Number(b.dataset.day) === d));
  renderHomeMatches();
}
function edgeCairoDay(offset) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date(Date.now() + offset * 86400000));
}
function renderHomeMatches() {
  const el = document.getElementById('homeMatches');
  if (!el) return;
  const all = [];
  MATCHES.forEach(g => (g.items || []).forEach(m => all.push(Object.assign({}, m, { league: g.league }))));
  if (!all.length) { el.innerHTML = '<div class="card">لا توجد مباريات مسجلة حاليًا</div>'; return; }
  const wanted = edgeCairoDay(edgeHomeDay);
  const inDay = m => { const t = Date.parse(m.date || ''); if (Number.isNaN(t)) return false;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)) === wanted; };
  const dayAll = all.filter(inDay);
  if (!dayAll.length) { el.innerHTML = '<div class="card">لا توجد مباريات مسجلة في هذا اليوم</div>'; return; }
  const now = Date.now();
  const ts = m => { const t = Date.parse(m.date || ''); return Number.isNaN(t) ? 0 : t; };
  const live = dayAll.filter(m => matchState(m) === 'in');
  const upcoming = dayAll.filter(m => matchState(m) === 'pre').sort((a, b) => ts(a) - ts(b));
  const finished = dayAll.filter(m => matchState(m) === 'post').sort((a, b) => ts(b) - ts(a));
  const ordered = live.concat(upcoming, finished).slice(0, 40);
  el.innerHTML = ordered.map(m => {
    let center, homeRow, awayRow;
    const sc = v => `<bdi dir="ltr" style="float:left;font-weight:800;">${v}</bdi>`;
    const hasScore = m.hs != null && m.as != null && m.hs !== '' && m.as !== '';
    if (matchState(m) === 'in') {
      homeRow = `<div class="edge-mrow edge-live">${teamLogo(m.homeLogo)} ${m.home}${hasScore ? sc(m.hs) : ''}</div>`;
      awayRow = `<div class="edge-mrow edge-live">${teamLogo(m.awayLogo)} ${m.away}${hasScore ? sc(m.as) : ''}</div>`;
      center = `<div class="edge-mstatus">🔴 مباشر ${m.detail || ''}</div>`;
    } else if (m.detail === 'FT' && m.hs != null) {
      homeRow = `<div class="edge-mrow">${teamLogo(m.homeLogo)} ${m.home}${hasScore ? sc(m.hs) : ''}</div>`;
      awayRow = `<div class="edge-mrow">${teamLogo(m.awayLogo)} ${m.away}${hasScore ? sc(m.as) : ''}</div>`;
      center = `<div class="edge-mstatus">انتهت ${m.dateAr || ''}</div>`;
    } else if (m._stale && m.hs != null && m.as != null) {
      const ck = lastKnownCheck(m);
      homeRow = `<div class="edge-mrow" style="color:#94a3b8;">${teamLogo(m.homeLogo)} ${m.home}${sc(m.hs)}</div>`;
      awayRow = `<div class="edge-mrow" style="color:#94a3b8;">${teamLogo(m.awayLogo)} ${m.away}${sc(m.as)}</div>`;
      center = `<div class="edge-mstatus">⏳ في انتظار تحديث المصدر · آخر نتيجة معروفة${ck ? ' حتى ' + fmtStamp(ck) : ''}</div>`;
    } else {
      const tstr = fmtCairoTime(m);
      const note = statusNote(m);
      homeRow = `<div class="edge-mrow">${teamLogo(m.homeLogo)} ${m.home}</div>`;
      awayRow = `<div class="edge-mrow">${teamLogo(m.awayLogo)} ${m.away}</div>`;
      center = `<div class="edge-mscore edge-pre">${tstr}</div><div class="edge-mstatus">${note}${m.dateAr ? ' — ' + m.dateAr : ''}</div>`;
    }
    return `<div class="edge-mcard" onclick="goMulti(['matches','tv'], null)">
      <div class="edge-mleague">${m.league}</div>
      ${homeRow}
      ${awayRow}
      ${center}
    </div>`;
  }).join('');
}

/* ===== 🔴 النتايج اللايف — تحديث مباشر من ESPN كل دقيقة ===== */
function refreshLiveScores() {
  const _rlNow = Date.now();
  if (_rlNow - (window._liveFetchAt || 0) < 45000) return; // ٤٥ ثانية على الأقل بين طلبات المصدر - نداءات مؤقت العد التنازلي كل ثانية تبقى بلا تكلفة شبكة
  const liveSlugs = {};
  MATCHES.forEach(g => (g.items || []).forEach(m => {
    if (m.state === 'in' || needsLivePoll(m)) {
      let q = '';
      const t1 = Date.parse(m.date || '');
      if ((m._stale || (!Number.isNaN(t1) && Date.now() - t1 > 3 * 3600 * 1000)) && !Number.isNaN(t1)) q = '?dates=' + new Date(t1).toISOString().slice(0, 10).replace(/-/g, '');
      liveSlugs[m.slug + '|' + q] = 1;
    }
  }));
  const slugs = Object.keys(liveSlugs);
  if (!slugs.length) return;
  window._liveFetchAt = _rlNow;
  Promise.all(slugs.map(key =>
    fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/' + key.split('|')[0] + '/scoreboard' + (key.split('|')[1] || ''))
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  )).then(results => {
    let changed = false;
    results.forEach(data => {
      if (!data || !data.events) return;
      data.events.forEach(ev => {
        try {
          const comp = ev.competitions[0];
          const comps = comp.competitors || [];
          const home = comps.find(c => c.homeAway === 'home');
          const away = comps.find(c => c.homeAway === 'away');
          const st = comp.status && comp.status.type ? comp.status.type.state : null;
          const detail = comp.status && comp.status.type ? comp.status.type.shortDetail : '';
          MATCHES.forEach(g => (g.items || []).forEach(m => {
            if (String(m.eid) === String(ev.id)) {
              if (home && away) {
                if (m.hs !== home.score || m.as !== away.score) changed = true;
                m.hs = home.score;
                m.as = away.score;
              }
              if (detail && m.detail !== detail) { m.detail = detail; changed = true; }
              if (st && m.state !== st) { m.state = st; changed = true; }
              if (st) { m._stale = false; m._liveAt = Date.now(); }
            }
          }));
        } catch (e) {}
      });
    });
    if (changed) {
      window._liveOverlayAt = Date.now();
      renderMatches();
      renderFeaturedMatch();
      if (typeof renderHomeMatches === 'function') renderHomeMatches();
      if (typeof renderFreshness === 'function') renderFreshness();
    }
  }).catch(() => {});
}
const DAYS_AR = {"Saturday": "السبت", "Sunday": "الأحد", "Monday": "الاثنين", "Tuesday": "الثلاثاء", "Wednesday": "الأربعاء", "Thursday": "الخميس", "Friday": "الجمعة"};

function matchDateBadge(m) {
  const now = new Date();
  let dayLabel = "";
  if (m.date) {
    const md = new Date(m.date);
    const diff = Math.floor((md.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff === 0) dayLabel = "النهاردة";
    else if (diff === 1) dayLabel = "بكرة";
    else if (diff === -1) dayLabel = "امبارح";
    else dayLabel = (DAYS_AR[m.day] || "") + " " + (m.dateAr || "");
  }
  return dayLabel ? `<div class="m-day">${dayLabel}</div>` : '';
}

function matchRow(m) {
  const timeStr = fmtCairoTime(m);
  const staleKnown = m._stale && m.hs != null && m.as != null;
  const scored = (m.detail === 'FT' && m.hs != null) || staleKnown;
  const scStyle = scored && staleKnown ? ' style="font-weight:800;color:#94a3b8;"' : ' style="font-weight:800;"';
  const hSc = scored ? `<bdi dir="ltr"${scStyle}>${m.hs}</bdi>` : '';
  const aSc = scored ? `<bdi dir="ltr"${scStyle}>${m.as}</bdi>` : '';
  const center = (m.detail === 'FT' && m.hs != null)
    ? `<span class="live-score" style="font-size:.8em;color:#94a3b8;">FT</span>`
    : (staleKnown
      ? `<span class="live-score" style="font-size:.8em;color:#94a3b8;">⏳</span>`
      : `<span class="live-score" style="color:#94a3b8;font-size:1.05em;">${timeStr}</span>`);
  const ck = staleKnown ? lastKnownCheck(m) : '';
  const meta = staleKnown ? `⏳ في انتظار تحديث المصدر · آخر نتيجة معروفة${ck ? ' حتى ' + fmtStamp(ck) : ''}` : `${statusNote(m)}${m.dateAr ? ' — ' + m.dateAr : ''}`;
  const shareTxt = (m.detail === 'FT' && m.hs != null) ? `النتيجة: ${m.home} ${m.hs} - ${m.as} ${m.away}` : `${m.home} × ${m.away} — ${statusNote(m)}`;
  return `<div class="live-card"><div class="live-teams"><span class="team-link" data-team="${m.slug}|${m.homeId}|${m.home}">${teamLogo(m.homeLogo)} ${m.home} ${hSc}</span>${center}<span class="team-link" data-team="${m.slug}|${m.awayId}|${m.away}">${aSc} ${m.away} ${teamLogo(m.awayLogo)}</span></div><div class="live-meta">${meta} ${edgeShareBtn(shareTxt, shareTxt, 'https://andrew101018.github.io/EDGE/')}</div></div>`;
}
