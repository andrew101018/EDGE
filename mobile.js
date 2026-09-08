/* =====================================================
   EDGE FOOTBALL — mobile.js
   المنيو المنزلق باللمس + تحسينات اللمس للموبايل
   الشغل كله تلقائي — مش محتاج أي تعديل في app.js
   ===================================================== */
(function () {
  "use strict";

  var nav = null;
  var body = document.body;
  var menuBtn = null;
  var overlay = null;

  /* ---------- أدوات ---------- */
  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }
  function isOpen() {
    return body.classList.contains("menu-open");
  }
  function openMenu() {
    body.classList.add("menu-open");
    if (menuBtn) { menuBtn.setAttribute("aria-expanded", "true"); }
  }
  function closeMenu() {
    body.classList.remove("menu-open");
    if (menuBtn) { menuBtn.setAttribute("aria-expanded", "false"); }
  }

  /* ---------- بناء زرار الهامبرغر والطبقة الشفافة ---------- */
  function buildUI() {
    menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "menu-toggle";
    menuBtn.setAttribute("aria-label", "فتح القائمة");
    menuBtn.setAttribute("aria-expanded", "false");
    for (var i = 0; i < 3; i++) {
      menuBtn.appendChild(document.createElement("span"));
    }

    overlay = document.createElement("div");
    overlay.className = "menu-overlay";

    body.appendChild(menuBtn);
    body.appendChild(overlay);

    menuBtn.addEventListener("click", function () {
      if (isOpen()) { closeMenu(); } else { openMenu(); }
    });
    overlay.addEventListener("click", closeMenu);
  }

  /* ---------- ربط الأحداث ---------- */
  function bindEvents() {
    /* اختيار قسم من المنيو → اقفل المنيو */
    nav.addEventListener("click", function (e) {
      if (e.target.closest(".nav-btn")) { closeMenu(); }
    });

    /* زرار Escape على الكيبورد → اقفل */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeMenu(); }
    });

    /* لما الشاشة تكبر → اقفل المنيو */
    window.addEventListener("resize", function () {
      if (!isMobile()) { closeMenu(); }
    });

    /* ===== السحب بالإصبع ===== */
    var startX = 0;
    var startY = 0;
    var tracking = false;

    document.addEventListener("touchstart", function (e) {
      if (!isMobile() || e.touches.length !== 1) { tracking = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    document.addEventListener("touchmove", function (e) {
      if (!tracking || !isOpen() || e.touches.length !== 1) { return; }
      var t = e.touches[0];
      if (Math.abs(t.clientY - startY) > 60) { return; }
      /* المنيو بيتبع صباعك حيًّا وأنت بتسحبه لليمين */
      var dx = Math.min(110, Math.max(0, t.clientX - startX));
      nav.style.transition = "none";
      nav.style.transform = "translateX(" + dx + "%)";
    }, { passive: true });

    document.addEventListener("touchend", function (e) {
      if (!tracking) { return; }
      tracking = false;
      nav.style.transition = "";
      nav.style.transform = "";
      if (!isMobile() || !e.changedTouches.length) { return; }
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      var edge = window.innerWidth * 0.14;

      /* سحب لليسار من الحافة اليمين → افتح المنيو */
      if (!isOpen() && dx < -55 && Math.abs(dy) < 60 && startX > window.innerWidth - edge) {
        openMenu();
      }
      /* سحب لليمين والمنيو مفتوح → اقفل */
      else if (isOpen() && dx > 55 && Math.abs(dy) < 60) {
        closeMenu();
      }
    }, { passive: true });
  }

  /* ---------- التشغيل ---------- */
  function init() {
    nav = document.querySelector(".top-nav");
    if (!nav) { return; }
    buildUI();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
