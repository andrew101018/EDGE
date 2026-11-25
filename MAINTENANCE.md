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
- الناشر يحط ملفات JSON موثقة في `news/incoming/` حسب العقد المكتوب في `news/incoming/README.md` (سجل خبر مفرد أو حزمة نتائج verified-news-v1).
- السكربت `scripts/build_news_ingest.py` بيتحقق من الحقول (أي ملف غير صالح يوقف الـ workflow بخطأ ولا ينشر حاجة)، بيمنع التكرار (نفس id لا يُدخل مرتين)، وبيدمج في `site/data.json` ويحدّث `updated_at` لأحدث `checked_at` لو أجدد.
- حد أقصى ٦٠ خبر لكل قسم (الأقدم يتحذف تلقائيًا).
- قواعد المحتوى: مصدران لكل حقيقة، نتائج بعد صافرة النهاية بس، وممنوع أي تعليمات داخلية في المجلد العام — حقائق ومصادر قابلة للنشر فقط.

## مولّد بطاقة التشكيل (lineup)
- المصدر: `scripts/lineup.py` + عينة إدخال `scripts/lineup.sample.json` — بطاقة تشكيل PNG مقاس 1080×1350.
- التشغيل: `python3 scripts/lineup.py match.json out.png` — محتاج على الجهاز `google-chrome` (وضع headless) وخط عربي (`Noto Sans Arabic` أو `Noto Naskh Arabic`).
- العينة المرفقة تصميم فقط ("مش تشكيل حقيقي"). التشكيل الفعلي لازم مصدر موثق قبل أي نشر.

## قواعد ثابتة
- ممنوع لمس workflows الخاصة بالنشر الاجتماعي (fb/tg/meta).
- ممنوع تعديل `site/data.json` يدويًا (بتحدثه بايبلاين الماتشات و news-ingest).
- المحتوى الرأي/التحليلي مع الناشر، الموقع يعرض حقائق موثقة بس.

