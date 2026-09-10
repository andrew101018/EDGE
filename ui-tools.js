/* =====================================================
   EDGE FOOTBALL — ui-tools.js
   🔔 زرار الإشعارات (Push) + 🌙/☀️ زرار الثيم
   ملف مستقل — التنسيقات بتتعمل من جوه
   ===================================================== */
(function () {
  "use strict";

  var SUPA_URL = "https://ejfdqvjfzgsjtztzvhem.supabase.co/rest/v1/";
  var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZmRxdmpmemdzanR6dHp2aGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzE3NDAsImV4cCI6MjEwMjgwNzc0MH0.YD0-kgvHlRIPbJMulwv6PKhxKz9frzeT5m4QGYRGBA4";
  var THEME_KEY = "edgeTheme";
  var PUSH_KEY = "edgePushOn";

  /* ---------- التنسيقات ---------- */
  var st = document.createElement("style");
  st.textContent =
    ".edge-fab{position:fixed;right:18px;z-index:75;width:52px;height:52px;border-radius:50%;border:1px solid #24344f;background:#16213a;color:#e2e8f0;cursor:pointer;font-size:1.35em;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.4);transition:transform .15s,box-shadow .15s,background .15s;}" +
    ".edge-fab:hover{transform:translateY(-3px);box-shadow:0 8px 22px rgba(0,0,0,.5);border-color:#f59e0b;}" +
    ".edge-fab.on{background:linear-gradient(135deg,#b45309,#f59e0b);border-color:#f59e0b;}" +
    "#themeFab{bottom:18px;}" +
    "#bellFab{bottom:82px;}";
  document.head.appendChild(st);

  /* ---------- 🌙/☀️ الثيم ---------- */
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || "dark"; } catch (e) { return "dark"; }
  }

  function applyTheme(mode) {
    try {
      if (mode === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    } catch (e) {}
  }

  applyTheme(currentTheme());

  var themeBtn = document.createElement("button");
  themeBtn.type = "button";
  themeBtn.id = "themeFab";
  themeBtn.className = "edge-fab";
  themeBtn.title = "تبديل الثيم";
  themeBtn.textContent = currentTheme() === "light" ? "☀️" : "🌙";
  themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "light" ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
    themeBtn.textContent = next === "light" ? "☀️" : "🌙";
  });
  document.body.appendChild(themeBtn);

  /* ---------- 🔔 الإشعارات ---------- */
  function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var raw = window.atob(base64);
    var output = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
  }

  var bellBtn = document.createElement("button");
  bellBtn.type = "button";
  bellBtn.id = "bellFab";
  bellBtn.className = "edge-fab";
  bellBtn.title = "تفعيل الإشعارات";
  document.body.appendChild(bellBtn);

  function isPushOn() {
    try { return localStorage.getItem(PUSH_KEY) === "1"; } catch (e) { return false; }
  }

  function updateBell() {
    if (isPushOn()) { bellBtn.classList.add("on"); bellBtn.textContent = "🔔"; }
    else { bellBtn.classList.remove("on"); bellBtn.textContent = "🔕"; }
  }

  updateBell();

  /* مزامنة الحالة الفعلية مع المتصفح */
  if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      try {
        if (sub) localStorage.setItem(PUSH_KEY, "1");
        else localStorage.removeItem(PUSH_KEY);
      } catch (e) {}
      updateBell();
    }).catch(function () {});
  }

  function subscribePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("المتصفح بتاعك مش بيدعم الإشعارات — جرب Chrome 🙏");
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") {
        alert('لازم تدوس "Allow" عشان توصلك تنبيهات الأهداف 🔔');
        return;
      }
      Promise.all([
        navigator.serviceWorker.ready,
        fetch("site/vapid.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      ]).then(function (res) {
        var reg = res[0];
        var v = res[1];
        var key = null;
        if (v) {
          if (typeof v === "string") key = v;
          else key = v.publicKey || v.public || v.key || null;
        }
        var opts = { userVisibleOnly: true };
        if (key) opts.applicationServerKey = urlBase64ToUint8Array(key);
        return reg.pushManager.subscribe(opts);
      }).then(function (sub) {
        return fetch(SUPA_URL + "push_subs", {
          method: "POST",
          headers: {
            "apikey": SUPA_KEY,
            "Authorization": "Bearer " + SUPA_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ subscription: sub.toJSON() })
        });
      }).then(function (r) {
        if (r && r.ok) {
          try { localStorage.setItem(PUSH_KEY, "1"); } catch (e) {}
          updateBell();
          alert("تمام! 🔔 هتوصلك تنبيهات المباريات والأهداف لحظة بلحظة 🔥");
        } else {
          alert("حصلت مشكلة في الحفظ — جرب تاني 🙏");
        }
      }).catch(function (e) {
        console.log("push error:", e);
        alert("حصلت مشكلة — جرب تاني أو افتح من Chrome 🙏");
      });
    });
  }

  bellBtn.addEventListener("click", function () {
    if (isPushOn()) {
      alert("الإشعارات شغالة عندك بالفعل 🔔✅");
    } else {
      subscribePush();
    }
  });
})();
