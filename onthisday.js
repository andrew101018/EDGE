/* EDGE on-this-day card (item 24): verified football history per Cairo date. */
(function () {
  'use strict';
  var JSON_URL = 'site/onthisday.json?v=1';
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  function cairoToday() {
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      var o = {};
      p.forEach(function (x) { o[x.type] = +x.value; });
      return o;
    } catch (e) { var d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }; }
  }

  function ordinal(m, d) { return Date.UTC(2021, m - 1, d); }

  function nearestUpcoming(events, t) {
    var best = null, bestDiff = 366;
    var today = ordinal(t.month, t.day);
    events.forEach(function (e) {
      var diff = Math.round((ordinal(e.m, e.d) - today) / 864e5);
      if (diff <= 0) diff += 365;
      if (diff < bestDiff) { bestDiff = diff; best = e; }
    });
    return best;
  }

  function eventLine(e, showDate) {
    var row = document.createElement('div');
    row.style.cssText = 'padding:8px 0;border-top:1px dashed #334155;';
    var txt = document.createElement('div');
    txt.style.cssText = 'color:#e2e8f0;font-size:.93em;line-height:1.8;';
    txt.textContent = (showDate ? (e.d + ' ' + MONTHS[e.m - 1] + ' ' + e.y + ' · ') : (e.y + ' · ')) + e.t;
    var src = document.createElement('a');
    src.href = e.src;
    src.target = '_blank';
    src.rel = 'noopener';
    src.textContent = 'المصدر: ' + e.srcn + ' ↗';
    src.style.cssText = 'display:inline-block;margin-top:2px;color:#fbbf24;font-size:.8em;text-decoration:none;';
    row.appendChild(txt);
    row.appendChild(src);
    return row;
  }

  function render(events) {
    var fm = document.getElementById('featuredMatch');
    var sec = document.getElementById('sec-home');
    if (!sec) return;
    if (document.getElementById('edgeOtd')) return;
    var t = cairoToday();
    var todays = events.filter(function (e) { return e.m === t.month && e.d === t.day; });

    var card = document.createElement('div');
    card.id = 'edgeOtd';
    card.style.cssText = 'background:#16213a;border-right:4px solid #f59e0b;border-radius:8px;padding:12px 14px;margin:14px 0 16px;';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
    var title = document.createElement('span');
    title.style.cssText = 'color:#fbbf24;font-weight:bold;font-size:.95em;';
    title.textContent = todays.length ? '📅 حدث في مثل اليوم' : '📅 من أرشيف الكورة';
    head.appendChild(title);

    var share = document.createElement('button');
    share.type = 'button';
    share.textContent = '📤 شارك';
    share.style.cssText = 'background:#0f172a;color:#94a3b8;border:1px solid #334155;border-radius:8px;padding:4px 10px;font-family:inherit;font-size:.8em;cursor:pointer;';
    share.onclick = function () {
      var list = todays.length ? todays : [nearestUpcoming(events, t)];
      var text = list.map(function (e) { return e.d + ' ' + MONTHS[e.m - 1] + ' ' + e.y + ': ' + e.t; }).join('\n');
      var titleTxt = todays.length ? '📅 حدث في مثل اليوم' : '📅 من أرشيف الكورة';
      if (typeof window.edgeShare === 'function') { window.edgeShare(titleTxt, text); return; }
      if (navigator.share) { navigator.share({ title: titleTxt, text: text }).catch(function () {}); }
    };
    head.appendChild(share);
    card.appendChild(head);

    if (todays.length) {
      todays.forEach(function (e) { card.appendChild(eventLine(e, false)); });
    } else {
      var note = document.createElement('div');
      note.style.cssText = 'color:#64748b;font-size:.82em;padding:8px 0 0;';
      note.textContent = 'مفيش حدث مسجل النهاردة.. أقرب مناسبة جاية:';
      card.appendChild(note);
      var nx = nearestUpcoming(events, t);
      if (nx) card.appendChild(eventLine(nx, true));
    }

    if (fm && fm.parentNode === sec) { sec.insertBefore(card, fm.nextSibling); }
    else { sec.appendChild(card); }
  }

  fetch(JSON_URL, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.events && j.events.length) render(j.events); })
    .catch(function () {});
})();
