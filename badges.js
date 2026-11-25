/* =====================================================
   EDGE FOOTBALL — badges.js
   نظام البادجات والإنجازات 🎖️ (16 إنجاز + مستويات)
   ملف مستقل بالكامل — مش بيعدّل أي ملف تاني
   ===================================================== */
(function () {
  "use strict";

  /* ---------- أدوات آمنة ---------- */
  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }
  function ls(key, fallback) {
    return safe(function () { return JSON.parse(localStorage.getItem(key)); }, fallback);
  }
  function getUnlocked() {
    return ls('edgeBadges', {}) || {};
  }
  function saveUnlocked(u) {
    safe(function () { localStorage.setItem('edgeBadges', JSON.stringify(u)); });
  }

  /* ---------- قراءة حالة المستخدم ---------- */
  function predCount() {
    var p = ls('edgePredict', {}) || {};
    return Object.keys(p).length;
  }
  function predPoints() {
    return parseInt(localStorage.getItem('edgePoints') || '0', 10) || 0;
  }
  function fantasyCount() {
    var f = ls('edgeFantasy', null);
    return (f && f.players) ? f.players.length : 0;
  }
  function fanPoints() {
    if (typeof window.fantasyPoints !== 'function') return 0;
    return safe(window.fantasyPoints, 0) || 0;
  }
  function streak() {
    var s = ls('edgeStreak', null);
    return (s && s.count) ? s.count : 0;
  }
  function visitedCount() {
    var v = ls('edgeVisited', []);
    return (v || []).length;
  }
  function isStandalone() {
    return safe(function () {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }, false);
  }
  function notifOn() {
    return safe(function () {
      return ('Notification' in window) && Notification.permission === 'granted';
    }, false);
  }

  /* ---------- المستويات (فوق الإنجازات) ----------
     كل الأرقام من إحصائيات الجهاز ده بس (نقاط + توقعات محفوظة). */
  var LEVELS = [
    { min: 0, icon: '🌱', title: 'مبتدئ' },
    { min: 15, icon: '⚡', title: 'مجتهد' },
    { min: 40, icon: '🎯', title: 'محترف' },
    { min: 100, icon: '👑', title: 'خبير' },
    { min: 200, icon: '🏆', title: 'أسطورة' }
  ];
  var LEAGUE_TIERS = [
    { min: 3, title: 'متابع' },
    { min: 8, title: 'عارف' },
    { min: 15, title: 'خبير' }
  ];
  function totalPts() { return predPoints() + fanPoints(); }
  function levelFor(pts) {
    var cur = LEVELS[0];
    LEVELS.forEach(function (l) { if (pts >= l.min) cur = l; });
    return { cur: cur, next: LEVELS[LEVELS.indexOf(cur) + 1] || null };
  }
  function leagueTierFor(n) {
    var cur = null;
    LEAGUE_TIERS.forEach(function (t) { if (n >= t.min) cur = t; });
    return { cur: cur, next: LEAGUE_TIERS[cur ? LEAGUE_TIERS.indexOf(cur) + 1 : 0] || null };
  }
  /* بنسجّل الدوري بتاع كل توقع من الفيد الحالي — التوقعات القديمة اللي خرجت من الفيد مبتتنسبش */
  function recordPredLeagues() {
    safe(function () {
      if (typeof DATA === 'undefined' || !DATA || !DATA.matches) return;
      var eidLeague = {};
      DATA.matches.forEach(function (g) {
        (g.items || []).forEach(function (m) { if (m.eid != null) eidLeague[String(m.eid)] = g.league || ''; });
      });
      var saved = ls('edgePredict', {}) || {};
      var map = ls('edgePredLeague', {}) || {};
      var changed = false;
      Object.keys(saved).forEach(function (eid) {
        if (!map[eid] && eidLeague[eid]) { map[eid] = eidLeague[eid]; changed = true; }
      });
      if (changed) localStorage.setItem('edgePredLeague', JSON.stringify(map));
    });
  }
  function leagueCounts() {
    var map = ls('edgePredLeague', {}) || {};
    var saved = ls('edgePredict', {}) || {};
    var counts = {};
    Object.keys(saved).forEach(function (eid) {
      var lg = map[eid];
      if (lg) counts[lg] = (counts[lg] || 0) + 1;
    });
    return counts;
  }
  function checkLevels() {
    recordPredLeagues();
    safe(function () {
      var prev = ls('edgeLevels', null);
      var firstRun = !prev;
      var seen = prev || { overall: -1, leagues: {} };
      if (!seen.leagues) seen.leagues = {};
      var toasts = [];
      var li = LEVELS.indexOf(levelFor(totalPts()).cur);
      if (!firstRun && li > (seen.overall == null ? -1 : seen.overall)) {
        toasts.push({ icon: LEVELS[li].icon, title: 'مستوى ' + LEVELS[li].title });
      }
      var counts = leagueCounts();
      Object.keys(counts).forEach(function (lg) {
        var t = leagueTierFor(counts[lg]).cur;
        var idx = t ? LEAGUE_TIERS.indexOf(t) : -1;
        var oldIdx = (seen.leagues[lg] != null) ? seen.leagues[lg] : -1;
        if (!firstRun && idx > oldIdx && t) toasts.push({ icon: '🎖️', title: t.title + ' ' + lg });
        seen.leagues[lg] = Math.max(oldIdx, idx);
      });
      seen.overall = Math.max(seen.overall == null ? -1 : seen.overall, li);
      localStorage.setItem('edgeLevels', JSON.stringify(seen));
      toasts.forEach(function (b, i) { setTimeout(function () { showBadgeToast(b, 'مستوى جديد! 🎉'); }, i * 1000); });
    });
  }

  /* ---------- البادجات (16) ---------- */
  var BADGES = [
    { id: 'welcome', icon: '👋', title: 'مشجع جديد', desc: 'أول زيارة لـ Edge Football', check: function () { return true; } },
    { id: 'pred1', icon: '🎯', title: 'أول توقع', desc: 'حفظت أول توقع ليك', check: function () { return predCount() >= 1; }, goal: function () { return [predCount(), 1]; } },
    { id: 'pred10', icon: '🎣', title: 'صياد المواعيد', desc: 'حفظت 10 توقعات', check: function () { return predCount() >= 10; }, goal: function () { return [predCount(), 10]; } },
    { id: 'pred25', icon: '🧠', title: 'العرّاف', desc: 'حفظت 25 توقع', check: function () { return predCount() >= 25; }, goal: function () { return [predCount(), 25]; } },
    { id: 'pts10', icon: '⭐', title: 'صاعد', desc: 'وصلت 10 نقاط في التوقعات', check: function () { return predPoints() >= 10; }, goal: function () { return [predPoints(), 10]; } },
    { id: 'pts50', icon: '🌟', title: 'نجم التوقعات', desc: 'وصلت 50 نقطة', check: function () { return predPoints() >= 50; }, goal: function () { return [predPoints(), 50]; } },
    { id: 'pts100', icon: '💯', title: 'أسطورة', desc: 'وصلت 100 نقطة توقعات', check: function () { return predPoints() >= 100; }, goal: function () { return [predPoints(), 100]; } },
    { id: 'fan1', icon: '🧩', title: 'أول صفقة', desc: 'اخترت أول لاعب في الفانتازي', check: function () { return fantasyCount() >= 1; }, goal: function () { return [fantasyCount(), 1]; } },
    { id: 'fan5', icon: '🏗️', title: 'المدير المحترف', desc: 'كوّنت فريق كامل (5 لاعبين)', check: function () { return fantasyCount() >= 5; }, goal: function () { return [fantasyCount(), 5]; } },
    { id: 'fan25', icon: '💰', title: 'ذهبية', desc: 'وصلت 25 نقطة فانتازي', check: function () { return fanPoints() >= 25; }, goal: function () { return [fanPoints(), 25]; } },
    { id: 'streak3', icon: '🔥', title: 'شغّال', desc: '3 أيام متتالية على الموقع', check: function () { return streak() >= 3; }, goal: function () { return [streak(), 3]; } },
    { id: 'streak7', icon: '⚡', title: 'الولّاعة', desc: '7 أيام متتالية على الموقع', check: function () { return streak() >= 7; }, goal: function () { return [streak(), 7]; } },
    { id: 'explorer', icon: '🧭', title: 'المستكشف', desc: 'زورت 10 أقسام مختلفة', check: function () { return visitedCount() >= 10; }, goal: function () { return [visitedCount(), 10]; } },
    { id: 'search', icon: '🔍', title: 'محقق الكورة', desc: 'استخدمت البحث الشامل', check: function () { return localStorage.getItem('edgeUsedSearch') === '1'; } },
    { id: 'notif', icon: '🔔', title: 'دايمًا في الكورة', desc: 'فعّلت الإشعارات', check: function () { return notifOn(); } },
    { id: 'install', icon: '📲', title: 'التطبيق معاك', desc: 'ثبّت تطبيق Edge', check: function () { return isStandalone(); } }
  ];

  /* ---------- تتبع الأيام والأقسام ---------- */
  function trackStreak() {
    safe(function () {
      var today = new Date().toISOString().slice(0, 10);
      var s = ls('edgeStreak', null) || { last: '', count: 0, best: 0 };
      if (s.last === today) return;
      var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      s.count = (s.last === yesterday) ? (s.count || 0) + 1 : 1;
      s.last = today;
      s.best = Math.max(s.best || 0, s.count);
      localStorage.setItem('edgeStreak', JSON.stringify(s));
    });
  }

  function currentSection() {
    var h = (location.hash || '').replace(/^#/, '').trim();
    return h ? h.split(',')[0] : 'home';
  }

  function trackSection(id) {
    safe(function () {
      var v = ls('edgeVisited', []) || [];
      if (v.indexOf(id) === -1) {
        v.push(id);
        localStorage.setItem('edgeVisited', JSON.stringify(v));
      }
    });
  }

  /* ---------- الفحص والفتح ---------- */
  function checkBadges() {
    var unlocked = getUnlocked();
    var newly = [];
    BADGES.forEach(function (b) {
      if (!unlocked[b.id] && safe(b.check, false)) {
        unlocked[b.id] = Date.now();
        newly.push(b);
      }
    });
    saveUnlocked(unlocked);
    return newly;
  }

  /* ---------- إشعار الإنجاز (توست) ---------- */
  function showBadgeToast(b, header) {
    safe(function () {
      var t = document.createElement('div');
      t.className = 'badge-toast';
      t.innerHTML = '<span style="font-size:1.7em;">' + b.icon + '</span><div><div>' + (header || 'إنجاز جديد! 🎉') + '</div><div style="font-size:.9em;">' + b.title + '</div></div>';
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4300);
    });
  }

  /* ---------- رسم القسم ---------- */
  function renderBadges() {
    var el = document.getElementById('badgesContainer');
    if (!el) return;
    var unlocked = getUnlocked();
    var count = 0;
    BADGES.forEach(function (b) { if (unlocked[b.id]) count++; });
    var pct = Math.round(count / BADGES.length * 100);
    var sum = document.getElementById('badgesSummary');
    if (sum) {
      var badgesRow = '<div class="points-banner" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
        '<span>🎖️ فتحت <b>' + count + '</b> من ' + BADGES.length + ' إنجاز</span>' +
        '<span><b>' + pct + '%</b> ⚡' + (streak() ? ' | 🔥 سلسلة: ' + streak() + ' يوم' : '') + '</span></div>';
      var tp = totalPts();
      var lvl = levelFor(tp);
      var lvlTxt = lvl.next ? ' — لسه <b>' + (lvl.next.min - tp) + '</b> نقطة لمستوى ' + lvl.next.icon + ' ' + lvl.next.title : ' — وصلت أعلى مستوى 👑';
      var lvlRow = '<div class="points-banner" style="margin-top:8px;">' + lvl.cur.icon + ' مستواك: <b>' + lvl.cur.title + '</b> (' + tp + ' نقطة)' + lvlTxt + '</div>';
      var lc = leagueCounts();
      var lgs = Object.keys(lc).sort(function (a, b) { return lc[b] - lc[a]; }).slice(0, 4);
      var lgRows = '';
      if (lgs.length) {
        lgRows = '<div class="points-banner" style="margin-top:8px;line-height:2;">🏟️ مستوياتك في الدوريات (من توقعاتك المحفوظة):' + lgs.map(function (lg) {
          var n = lc[lg];
          var t = leagueTierFor(n);
          if (t.cur) {
            var more = t.next ? ' — ' + n + '/' + t.next.min + ' للمستوى الجاي' : ' — أعلى مستوى 🏆';
            return '<div>🎖️ <b>' + t.cur.title + ' ' + lg + '</b>' + more + '</div>';
          }
          return '<div>▫️ ' + lg + ': ' + n + '/' + LEAGUE_TIERS[0].min + ' توقعات لمستوى متابع</div>';
        }).join('') + '</div>';
      }
      sum.innerHTML = badgesRow + lvlRow + lgRows;
    }
    el.innerHTML = BADGES.map(function (b) {
      var isUn = !!unlocked[b.id];
      var progress = '';
      if (!isUn && b.goal) {
        var g = safe(b.goal, [0, 1]) || [0, 1];
        var cur = Math.min(g[0], g[1]);
        var p = Math.round(cur / g[1] * 100);
        progress = '<div class="badge-progress"><div style="width:' + p + '%;"></div></div>' +
          '<div class="badge-progress-num">' + cur + ' / ' + g[1] + '</div>';
      }
      return '<div class="badge-card ' + (isUn ? 'unlocked' : 'locked') + '">' +
        (isUn ? '<div class="badge-check">✅</div>' : '') +
        '<span class="badge-icon">' + b.icon + '</span>' +
        '<div class="badge-title">' + b.title + '</div>' +
        '<div class="badge-desc">' + b.desc + '</div>' + progress + '</div>';
    }).join('');
  }

  /* ---------- مشاركة الإنجازات ---------- */
  function shareBadges() {
    safe(function () {
      var unlocked = getUnlocked();
      var list = BADGES.filter(function (b) { return unlocked[b.id]; });
      var text = '🎖️ فتحت ' + list.length + ' إنجاز في Edge Football\n' +
        list.slice(0, 10).map(function (b) { return b.icon + ' ' + b.title; }).join('\n') +
        '\n⚔️ تعال نتنافس — الكورة بتبدأ من هنا ⚡\nhttps://andrew101018.github.io/EDGE/';
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    });
  }
  window.shareBadges = shareBadges;

  /* ---------- ربط تلقائي بالوظائف الموجودة ---------- */
  function wrapAll() {
    ['savePredict', 'saveFantasy', 'uploadScore', 'installApp'].forEach(function (name) {
      if (typeof window[name] !== 'function') return;
      var orig = window[name];
      window[name] = function () {
        var r = orig.apply(this, arguments);
        scheduleCheck(500);
        return r;
      };
    });
    if (typeof window.globalSearch === 'function') {
      var origGS = window.globalSearch;
      window.globalSearch = function (q) {
        if (q && String(q).trim().length >= 2) {
          safe(function () { localStorage.setItem('edgeUsedSearch', '1'); });
          scheduleCheck(300);
        }
        return origGS.apply(this, arguments);
      };
    }
  }

  /* ---------- الجدولة ---------- */
  var _checkTimer = null;
  function scheduleCheck(delay) {
    clearTimeout(_checkTimer);
    _checkTimer = setTimeout(function () {
      var newly = checkBadges();
      newly.forEach(function (b, i) {
        setTimeout(function () { showBadgeToast(b); }, i * 1000);
      });
      checkLevels();
      renderBadges();
    }, delay || 0);
  }

  /* ---------- التشغيل ---------- */
  function init() {
    trackStreak();
    trackSection(currentSection());
    window.addEventListener('hashchange', function () {
      trackSection(currentSection());
      scheduleCheck(150);
    });
    wrapAll();
    renderBadges();
    scheduleCheck(1800);
    setInterval(function () { scheduleCheck(0); }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
