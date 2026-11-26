# EDGE — صيانة الموقع (Site maintenance)

دليل مختصر لتجديد الصفحات المولّدة. مكتبة الفيديوهات وصفحات الفانتازي بتتجدد تلقائيًا كل ٦ ساعات عن طريق workflow اسمه `videos-sync` (أو يدويًا زي ما هو مكتوب تحت). الباقي يدوي: شغّل السكربت، راجع، اعمل commit.

## المولّدات (scripts/)

| السكربت | بيعمل إيه | مصدر البيانات | امتى يتشغل |
|---|---|---|---|
| `python3 scripts/build_videos.py` | يبني `videos/index.html` + صفحة لكل فيديو/شورت من `videos/videos.json` | `videos/videos.json` (العناوين من YouTube، التصنيفات من العنوان نفسه) | يدويًا بعد تعديل `videos.json` — أو تلقائيًا عن طريق `videos-sync` (تحت) |
| `python3 scripts/build_videos.py --sync` | يضيف أي فيديو/شورت جديد نزل على القناة إلى `videos.json` (في الأول، بتصنيف تلقائي من كلمات العنوان، الافتراضي `misc`) ثم يعيد البناء | تبويبا videos/shorts العامان للقناة عبر yt-dlp flat-playlist | تلقائي كل ٦ ساعات عبر `videos-sync`؛ يدوي عند الحاجة. لو yt-dlp فشل أو رجّع صفر، السكربت يوقف من غير ما يكتب حاجة |
| `python3 scripts/build_fpl.py` | يبني `fpl/gw<N>.html` + `fpl/index.html` | FPL API الرسمي (روابط تحت) | **قبل كل جولة فانتازي**: بعد قفل الجولة الحالية وقبل قفل الجاية. التجديد الجاي المطلوب: بعد قفل الجولة 12 (الجمعة 27 نوفمبر 2026 · 8:30 م القاهرة) عشان صفحة الجولة 13 تنزل قبل قفلها |
| `python3 scripts/build_sitemap.py` | يبني `sitemap.xml` من الملفات الموجودة فعلًا (تاريخ التعديل من git log) | المستودع نفسه | بعد أي صفحات جديدة (videos, fpl, articles, teams, players) |

ملاحظة: `build_sitemap.py` محتاج clone حقيقي (مش zip) عشان `git log`.

## مصادر FPL الرسمية
- الأحداث والمواعيد النهائية: `https://fantasy.premierleague.com/api/bootstrap-static/` → `events[].deadline_time` (UTC، التحويل للقاهرة بـ zoneinfo جوه السكربت)
- ماتشات الجولة: `https://fantasy.premierleague.com/api/fixtures/?event=<N>`

## النشر (deploy)
1. شغّل المولّد من جذر المستودع وراجع الفرق (`git diff`).
2. انشر على فرع `main` (أي طريقة: git push أو محرر الويب في GitHub).
3. GitHub Pages بيحدّث خلال ~دقيقتين.

## التحقق بعد أي نشر
- الصفحات الجديدة ترجع HTTP 200 على `https://andrew101018.github.io/EDGE/...`
- المحتوى المعروض يطابق المصدر (المعاد النهائي، العناوين، العدادات)
- مفيش وعود بتحديث تلقائي في أي صفحة — الصيغة المعتمدة: "آخر مراجعة <تاريخ>" / "آخر تحديث <تاريخ>"
- مفيش تواريخ منشورة من غير مصدر موثوق

## المزامنة التلقائية (videos-sync)
- Workflow: `.github/workflows/videos-sync.yml` — كل ٦ ساعات + تشغيل يدوي (Actions → videos-sync → Run workflow). بيعمل sync للمكتبة + إعادة بناء صفحات الفانتازي، وبعدين commit واحد لو فيه تغيير.
- مفيش مفاتيح ولا حسابات: GITHUB_TOKEN المدمج بس، وكل البيانات من صفحات يوتيوب العامة.
- تأخير الوصول للموقع: لحد ~٦ ساعات + دقيقتين بناء. التشغيل اليدوي يقصّرها لدقائق.
- بيحافظ على الحقول اليدوية في `videos.json` (`topics`, `article`, `published`, `duration`) — الـ sync يضيف بس، ما يعدّلش الموجود. اتختبر: بيانات المكتبة بتفضل byte-identical لو مفيش جديد.
- تحديث التصنيفات/الربط بمقال: عدّل `videos.json` يدويًا في أي وقت، والـ sync هيحترمه.
- تنبيه معروف: GitHub بيأخّر/يتخطى المجدول أحيانًا ساعات (حصل مع matches-refresh). لو المكتبة باين عليها تأخير، شغّل الـ workflow يدوي.
- Workflows الموقع (feed/sitemap/og-images/videos-sync) بتستخدم fetch + reset + rebuild + إعادة محاولة push (×٣) بدل pull --rebase عشان متتكسرش لما commits متزامنة تتداخل (درس من فشل feed يوم 25 نوفمبر).
- صفوف لينكات المنصات (تيليجرام/يوتيوب/فيسبوك/تيك توك/إنستجرام/ثريدز) مولّدة من `SOCIAL_LINKS` في `scripts/build_videos.py` وتظهر في الفيديوهات والفانتازي والرئيسية والمقالات — أي تعديل لينك يتعمل هناك وفي `index.html`/`egypt.html` وقوالب المقالات.

## استقبال الأخبار الموثقة (news-ingest)
- Workflow: `.github/workflows/news-ingest.yml` — يشتغل تلقائيًا على أي push جوه `news/incoming/` + تشغيل يدوي من Actions.
- ملفات JSON موثقة تُضاف إلى `news/incoming/` حسب العقد المكتوب في `news/incoming/README.md` (سجل خبر مفرد أو حزمة نتائج verified-news-v1).
- الأقسام المقبولة في سجل الخبر: `news` (أخبار)، `world` (صحافة عالمية)، `opinion` (رأي/تحليل — يظهر في قسم "رأي إيدج" بعلامة "رأي" واضحة ومنفصل عن الأخبار).
- السكربت `scripts/build_news_ingest.py` بيتحقق من الحقول (أي ملف غير صالح يوقف الـ workflow بخطأ ولا ينشر حاجة)، بيمنع التكرار (نفس id لا يُدخل مرتين)، وبيدمج في `site/data.json` ويحدّث `updated_at` لأحدث `checked_at` لو أجدد.
- حد أقصى ٦٠ خبر لكل قسم (الأقدم يتحذف تلقائيًا).
- قواعد المحتوى: مصدران لكل حقيقة، نتائج بعد صافرة النهاية بس، الأوقات بإزاحة توقيت صريحة، وممنوع أي تعليمات داخلية في المجلد العام — حقائق ومصادر قابلة للنشر فقط.

## أرشيف التوقعات (predictions)
- سجلات `prediction-v1` تدخل عبر `news/incoming/` زي الأخبار، وبتتخزن في `predictions_log` في `site/data.json` — والتوقع لازم يتسجل قبل بداية الماتش (السكربت يرفض غير كده).
- `scripts/resolve_predictions.py` بيشتغل جوه workflow الماتشات بعد كل تحديث: يحسم التوقعات المعلقة من النتائج النهائية المسجلة (بالظبط/اتجاه/غلط) — مفيش نتيجة بتتكتب بإيد.
- النسب على صفحة التوقعات بتتحسب من السجل نفسه في المتصفح، مش مخزنة.

## مولّد بطاقة التشكيل (lineup)
- المصدر: `scripts/lineup.py` + عينة إدخال `scripts/lineup.sample.json` — بطاقة تشكيل PNG مقاس 1080×1350.
- التشغيل: `python3 scripts/lineup.py match.json out.png` — محتاج على الجهاز `google-chrome` (وضع headless) وخط عربي (`Noto Sans Arabic` أو `Noto Naskh Arabic`).
- العينة المرفقة تصميم فقط ("مش تشكيل حقيقي"). التشكيل الفعلي لازم مصدر موثق قبل أي نشر.

## قواعد ثابتة
- ممنوع لمس workflows الخاصة بالنشر الاجتماعي (fb/tg/meta).
- ممنوع تعديل `site/data.json` يدويًا (بتحدثه بايبلاين الماتشات و news-ingest).
- المحتوى الرأي/التحليلي لا يُدار من هذا المستودع — الموقع يعرض حقائق موثقة بس.


## تحديث المباريات: حدود الجدولة ودلالة الحقول (25 نوفمبر 2026)
- `matches-refresh.yml` مجدول `*/5 * * * *`، لكن المراقبة الفعلية لوحظ فيها تشغيلان مجدولان فقط خلال ٢٤ ساعة (GitHub بيأخّر/يدمج cron المتكرر). الاعتمادية الحقيقية: ساعات، مش دقائق. لو لزم تحديث فوري: تشغيل يدوي من Actions.
- معناهما في `site/data.json`:
  - `matches_checked_by_source` = قاموس لكل دوري/مصدر بآخر جلب ناجح له؛ فشل مصدر لا يقدّم طابعه، ولا يستر عليه نجاح مصدر آخر.
  - `matches_checked_at` = آخر تشغيل نجحت فيه كل المصادر معًا (يظهر في التذييل كـ"آخر فحص للمصدر").
  - `matches_updated_at` = آخر تغيير فعلي في بيانات المباريات (يُكتب فقط عند تغيّر المحتوى).
  - `updated_at` = خاص بالأخبار (news-ingest)، لا علاقة له بالمباريات.
- حارس الحداثة في الواجهة (`renderFreshness` في app-extras.js) يقيس تأخر كل ماتش من طابع مصدره في `matches_checked_by_source` (مع رجوع للطابع العام): فوق ٣٠ دقيقة يظهر تنبيه "تحديث المباريات متأخر" وحالة "مباشر" القادمة من الخلاصة وحدها تُخفى — وتبقى النتيجة ظاهرة كـ"آخر نتيجة معروفة حتى <وقت الفحص>" بدل شارة المباشر. الحارس يشتغل مع كل نبضة loadData (كل ٥ دقائق) حتى لو البيانات نفسها ما اتغيرتش، فالتبويب المفتوح لا يبقى "مباشر" لساعات من غير إعادة تحميل، والتنبيه يختفي تلقائيًا عند عودة الانتظام.
- أي ماتش عدّى موعد بدايته والمصدر لسه مُسجّله مجدولة يظهر "⏳ في انتظار تحديث المصدر" مع موعده المعروف — الواجهة لا تستنتج بدء/انتهاء/نتيجة من الساعة أبدًا، والعدّاد التنازلي لا يقول "جارية الآن" عند وصوله للصفر.
- ملكية الصيانة: workflows الموقع تعمل بلا مشرف على GitHub (feed/sitemap/og-images/videos-sync/matches-refresh/news-ingest). المحتوى التحريري (أخبار/رأي/توقعات) ملك الناشر عبر news-ingest فقط. إصلاحات الموقع تمر بمراجعة قبل الدمج على main.

## 2026-11-25 (late): Client-side live-score overlay

- `refreshLiveScores` (app-matches.js): on page view and every 60s while the tab is visible (45s network throttle inside the function), the visitor's browser fetches ESPN public scoreboard JSON (CORS-open, verified `access-control-allow-origin: *`) for leagues that have a match past kickoff and not FT, matches events to items by ESPN event id, and overlays score/state/clock onto the snapshot data. The featured-match countdown's 1s calls hit the throttle, not the network.
- Poll gate (`needsLivePoll`): `_stale` items, plus any match whose kickoff passed within 36h and that is not FT/post — regardless of the snapshot's `state` field. This is what keeps "pre" snapshot matches from sitting stale for hours.
- Overlay-confirmed items carry `_liveAt` (10-minute demotion immunity in `renderFreshness`); the session `_liveOverlayAt` drives the footer's live line. While the overlay is fresh (<30 min), the footer shows "🔴 النتايج اللايف بتتحدث من المصدر مباشرة" INSTEAD of the "⚠️ تحديث المباريات متأخر" warning; the three snapshot stamps stay unchanged and honest either way.
- Coverage: ESPN-carried leagues only. egy.1 comes from Kooora, which serves no CORS header (tested 2026-11-25), so the browser cannot fetch it cross-origin: Egyptian-league live scores remain snapshot/workflow-dependent. This rules out the tested client route only, not every possible free route.
- Score display rule: never render bare "hs - as" in the RTL page — bidi reorders it against the teams. Scores render per-team (each team's score next to its own name, wrapped in `<bdi dir="ltr">`): home stacked cards, featured card, live-block, and matchRow all follow this.
- Failure semantics: overlay fetch failure is silent and falls back to snapshot + stale-guard behavior. No false live claims; no fabricated states.

## 2026-11-26: ESPN automated routes paused over source terms
- Disney/ESPN terms (https://disneytermsofuse.com/english/ clause x; Arabic version https://disneytermsofuse.com/arabic/) prohibit automated access/extraction and restrict use to personal noncommercial use. ESPN support points to those terms (https://support.espn.com/hc/en-us/articles/360035445091-Terms-of-Use); no endpoint-specific permission exists for site.api.espn.com.
- Paused, all narrow and reversible:
  - `refresh_matches.py`: `ESPN_SOURCES_PAUSED = True` — server ingestion skips all ESPN slugs, keeps last verified items; per-source stamps stay frozen at 2026-11-25 11:55 PM. `matches_checked_at` now only advances when at least one source was actually fetched and all fetched succeeded (`fetched_any` guard). With all sources paused the run writes no changes.
  - `app-matches.js`: `ESPN_LIVE_PAUSED = true` — the 60s client overlay poller returns immediately (index.html bump to ?v=21).
  - `egypt.html`: `NT_ESPN_PAUSED = true` — the national-team schedule no longer fetches ESPN on page open; shows the last reviewed fixtures card (reviewed 25 Nov 2026, self-expiring 28 Mar 2027) with an honest "auto update paused" stamp.
- Honest UI state: no item carries a live state after the freeze; the freshness footer shows the frozen stamps plus "تحديث المباريات متأخر" (stale >30 min) — nothing promises live/minute updates. User predictions resolve only on state==='post' from verified snapshots, so frozen data cannot silently resolve them; they stay open until a permitted source resumes.
- Remaining ESPN touchpoint (user-triggered, not automated): the match-details modal in `app-sections.js` (openMatch) still fetches the ESPN summary endpoint per click. Decision pending owner review.
- Resume: set the three flags back only with a permitted source (see continuity notes for the replacement-source review).

## 2026-11-25 (late 2): Egyptian source paused over source terms
- `refresh_matches.py` gained `EGY_SOURCE_PAUSED = True`: Kooora's terms of use (https://www.kooora.com/سياسة-الاستخدام clause 11: "No text or data mining, or web scraping") prohibit automated fetching, so the egy.1 fetch is paused pending a permitted source. egy.1 keeps its last verified snapshot (all FT, stamp frozen at 2026-11-25 11:47 PM) and is excluded from the all-sources-OK stamp; ESPN and other sources are unaffected. Set the flag back to False to resume.
- Egyptian live-route research (2026-11-25): ESPN does not carry the league (egy.1 scoreboard returns HTTP 400); FotMob and 365scores serve no CORS header (no client route); Sofascore is unofficial and blocks datacenter IPs. Licensed free option under evaluation: API-Football free plan (https://www.api-football.com/pricing - $0, 100 req/day, all competitions); current-season Egyptian eligibility unverified, and signup is an owner decision.
- GitHub facts used in design: standard runners free in public repos (https://docs.github.com/en/billing/concepts/product-billing/github-actions); workflow_dispatch/repository_dispatch via GITHUB_TOKEN always create runs (https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow); job limit 6h (https://docs.github.com/en/actions/reference/limits).
- Next Egyptian fixtures (round 10, cross-checked soccerassociation.com + halascore.com + Egyptian press): Dec 8 (17:00 + 20:00 Cairo), Dec 9 (Zamalek-Masry 20:00), Dec 10 (Ghazl El Mahalla-Al Ahly 20:00).
