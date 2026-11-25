/* EDGE daily question (item 25): one sourced football question per Cairo day.
   3 options, one attempt a day, consecutive-correct-days streak.
   Everything lives on the visitor's device (localStorage), no account, no tracking. */
(function () {
  'use strict';
  var JSON_URL = 'site/questions.json?v=1';
  var KEY = 'edgeDailyQ';

  function cairoParts() {
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      var o = {};
      p.forEach(function (x) { o[x.type] = +x.value; });
      return o;
    } catch (e) { var d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }; }
  }
  function dayNum(t) { return Math.floor(Date.UTC(t.year, t.month - 1, t.day) / 864e5); }
  function dateStr(t) { return t.year + '-' + ('0' + t.month).slice(-2) + '-' + ('0' + t.day).slice(-2); }
  function yesterdayStr(t) {
    var y = new Date(Date.UTC(t.year, t.month - 1, t.day) - 864e5);
    return y.getUTCFullYear() + '-' + ('0' + (y.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + y.getUTCDate()).slice(-2);
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function streakText(n) {
    if (n <= 0) return '';
    if (n === 1) return '🔥 يوم واحد';
    if (n === 2) return '🔥 يومين ورا بعض';
    return '🔥 ' + n + ' أيام ورا بعض';
  }

  function render(qs) {
    if (document.getElementById('edgeDailyQCard')) return;
    var t = cairoParts();
    var today = dayNum(t);
    var q = qs[today % qs.length];
    var st = load();
    var answeredToday = st.lastDate === dateStr(t);
    /* a streak older than yesterday is expired for display purposes */
    if (!answeredToday && st.lastDate !== yesterdayStr(t)) st.streak = 0;

    var card = document.createElement('div');
    card.id = 'edgeDailyQCard';
    card.style.cssText = 'background:#16213a;border-right:4px solid #22c55e;border-radius:8px;padding:12px 14px;margin:0 0 16px;';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
    var title = document.createElement('span');
    title.style.cssText = 'color:#4ade80;font-weight:bold;font-size:.95em;';
    title.textContent = '❓ سؤال اليوم';
    head.appendChild(title);
    var streak = document.createElement('span');
    streak.id = 'edgeDailyQStreak';
    streak.style.cssText = 'color:#fbbf24;font-size:.82em;font-weight:bold;';
    streak.textContent = streakText(st.streak || 0);
    head.appendChild(streak);
    card.appendChild(head);

    var qEl = document.createElement('div');
    qEl.style.cssText = 'color:#e2e8f0;font-weight:bold;font-size:.95em;padding:10px 0 8px;line-height:1.8;';
    qEl.textContent = q.q;
    card.appendChild(qEl);

    var optsBox = document.createElement('div');
    optsBox.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    card.appendChild(optsBox);

    var result = document.createElement('div');
    result.id = 'edgeDailyQResult';
    result.style.cssText = 'padding-top:10px;display:none;';
    card.appendChild(result);

    function showResult(picked) {
      var ok = picked === q.correct;
      Array.prototype.forEach.call(optsBox.children, function (b, i) {
        b.disabled = true;
        b.style.cursor = 'default';
        if (i === q.correct) { b.style.borderColor = '#22c55e'; b.style.background = '#14532d'; b.style.color = '#bbf7d0'; }
        else if (i === picked) { b.style.borderColor = '#ef4444'; b.style.background = '#450a0a'; b.style.color = '#fecaca'; }
        else { b.style.opacity = '.55'; }
      });
      result.style.display = 'block';
      result.innerHTML = '';
      var line = document.createElement('div');
      line.style.cssText = 'color:' + (ok ? '#4ade80' : '#fca5a5') + ';font-weight:bold;font-size:.9em;';
      line.textContent = ok ? 'إجابة صح! ⚽' : ('غلط.. الإجابة الصح: ' + q.opts[q.correct]);
      var fact = document.createElement('div');
      fact.style.cssText = 'color:#cbd5e1;font-size:.85em;padding-top:4px;line-height:1.8;';
      fact.textContent = q.fact;
      var src = document.createElement('a');
      src.href = q.src; src.target = '_blank'; src.rel = 'noopener';
      src.textContent = 'المصدر: ' + q.srcn + ' ↗';
      src.style.cssText = 'display:inline-block;margin-top:2px;color:#fbbf24;font-size:.8em;text-decoration:none;';
      result.appendChild(line); result.appendChild(fact); result.appendChild(src);
    }

    q.opts.forEach(function (opt, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt;
      b.style.cssText = 'background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:9px 12px;font-family:inherit;font-size:.92em;text-align:right;cursor:pointer;';
      b.onclick = function () {
        if (load().lastDate === dateStr(cairoParts())) return;
        var ok = i === q.correct;
        var prev = load();
        var newStreak = ok ? ((prev.lastDate === yesterdayStr(t) && prev.lastOk) ? (prev.streak || 0) + 1 : 1) : 0;
        save({ lastDate: dateStr(t), lastOk: ok, picked: i, streak: newStreak });
        streak.textContent = streakText(newStreak);
        showResult(i);
        if (typeof edgeToast === 'function') edgeToast(ok ? 'إجابة صح! ⚽' : 'للأسف غلط');
      };
      optsBox.appendChild(b);
    });

    var share = document.createElement('button');
    share.type = 'button';
    share.textContent = '📤 شارك السؤال';
    share.style.cssText = 'margin-top:10px;background:#0f172a;color:#94a3b8;border:1px solid #334155;border-radius:8px;padding:5px 12px;font-family:inherit;font-size:.8em;cursor:pointer;';
    share.onclick = function () {
      var text = 'سؤال اليوم من EDGE:\n' + q.q + '\n' + q.opts.map(function (o, i) { return (i + 1) + ') ' + o; }).join('\n') + '\nجاوب على الموقع 👇';
      if (typeof window.edgeShare === 'function') { window.edgeShare('❓ سؤال اليوم', text); return; }
      if (navigator.share) { navigator.share({ title: '❓ سؤال اليوم', text: text }).catch(function () {}); }
    };
    card.appendChild(share);

    if (answeredToday) showResult(typeof st.picked === 'number' ? st.picked : -1);

    function insert() {
      var sec = document.getElementById('sec-home');
      if (!sec) return;
      var otd = document.getElementById('edgeOtd');
      var fm = document.getElementById('featuredMatch');
      var anchor = otd || fm;
      if (anchor && anchor.parentNode === sec) sec.insertBefore(card, anchor.nextSibling);
      else sec.appendChild(card);
    }
    var tries = 0;
    (function waitOtd() {
      if (document.getElementById('edgeOtd') || ++tries > 10) insert();
      else setTimeout(waitOtd, 300);
    })();
  }

  fetch(JSON_URL, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { if (j && j.questions && j.questions.length) render(j.questions); })
    .catch(function () {});
})();
