#!/usr/bin/env python3
"""Build static big-team pages (idea #2) under teams/.

Each page is a fixed URL per team, client-rendered from site/data.json
(same architecture as the homepage, so it stays fresh with the 5-minute
matches refresh). No hardcoded results. Run from the repo root:

    python3 scripts/build_team_pages.py
"""
import os

SITE = "https://andrew101018.github.io/EDGE"

# slug, Arabic display name, aliases exactly as they may appear in data.json
# (ESPN English names, kooora Arabic names, NAME_FIX-normalized forms).
TEAMS = [
    ("al-ahly", "الأهلي", ["الأهلي", "الاهلي", "Al Ahly", "Al-Ahly", "Al Ahly SC"], "eg"),
    ("zamalek", "الزمالك", ["الزمالك", "Zamalek", "El Zamalek", "Zamalek SC"], "eg"),
    ("pyramids", "بيراميدز", ["بيراميدز", "Pyramids", "Pyramids FC"], "eg"),
    ("arsenal", "أرسنال", ["أرسنال", "ارسنال", "Arsenal", "Arsenal FC"], "eu"),
    ("man-city", "مانشستر سيتي", ["مانشستر سيتي", "Manchester City", "Man City", "Man. City"], "eu"),
    ("man-united", "مانشستر يونايتد", ["مانشستر يونايتد", "Manchester United", "Man Utd", "Man United", "Manchester Utd"], "eu"),
    ("liverpool", "ليفربول", ["ليفربول", "Liverpool", "Liverpool FC"], "eu"),
    ("chelsea", "تشيلسي", ["تشيلسي", "Chelsea", "Chelsea FC"], "eu"),
    ("tottenham", "توتنهام", ["توتنهام", "Tottenham", "Tottenham Hotspur", "Spurs"], "eu"),
    ("real-madrid", "ريال مدريد", ["ريال مدريد", "Real Madrid", "Real Madrid CF"], "eu"),
    ("barcelona", "برشلونة", ["برشلونة", "Barcelona", "FC Barcelona"], "eu"),
    ("atletico-madrid", "أتلتيكو مدريد", ["أتلتيكو مدريد", "اتلتيكو مدريد", "Atlético", "Atlético Madrid", "Atletico Madrid", "Atlético de Madrid"], "eu"),
    ("bayern", "بايرن ميونخ", ["بايرن ميونخ", "بايرن ميونيخ", "بايرن", "Bayern", "Bayern Munich", "FC Bayern", "Bayern München"], "eu"),
    ("dortmund", "بوروسيا دورتموند", ["بوروسيا دورتموند", "دورتموند", "Borussia Dortmund", "Dortmund", "BVB"], "eu"),
    ("juventus", "يوفنتوس", ["يوفنتوس", "Juventus", "Juve"], "eu"),
    ("inter", "إنتر ميلان", ["إنتر", "إنتر ميلان", "انتر ميلان", "Inter", "Inter Milan", "Internazionale", "Inter Milano"], "eu"),
    ("milan", "ميلان", ["ميلان", "ميلانو", "Milan", "AC Milan", "A.C. Milan"], "eu"),
    ("napoli", "نابولي", ["نابولي", "Napoli", "SSC Napoli"], "eu"),
    ("psg", "باريس سان جيرمان", ["باريس سان جيرمان", "PSG", "Paris Saint-Germain", "Paris SG", "Paris Saint Germain"], "eu"),
]

PAGE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name}: النتائج والمباريات القادمة والترتيب | Edge Football</title>
<meta name="description" content="نتائج {name} وماتشاته الجاية وترتيبه في الدوري والبطولات وهدافيه — الصفحة بتتحدث تلقائيًا مع كل ماتش على Edge Football.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{site}/teams/{slug}.html">
<meta property="og:site_name" content="Edge Football">
<meta property="og:locale" content="ar_AR">
<meta property="og:type" content="website">
<meta property="og:title" content="{name}: النتائج والمباريات القادمة والترتيب">
<meta property="og:description" content="كل ماتشات ونتائج وترتيب {name} في مكان واحد، تحديث تلقائي.">
<meta property="og:url" content="{site}/teams/{slug}.html">
<meta property="og:image" content="https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#f59e0b">
<link rel="icon" href="https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#0b1220;color:#e2e8f0;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;line-height:1.8}}
main{{max-width:760px;margin:0 auto;padding:20px 16px 48px}}
a{{color:#fbbf24}}
nav{{padding:14px 16px;background:#16213a;border-bottom:1px solid #24344f;text-align:center}}
nav a{{font-weight:bold;text-decoration:none}}
.team-head{{display:flex;align-items:center;gap:14px;margin-bottom:18px}}
.team-head img{{width:56px;height:56px;object-fit:contain;background:#fff;border-radius:12px;padding:4px}}
.team-head h1{{font-size:1.5em;margin:0;color:#fbbf24}}
.team-head p{{margin:2px 0 0;opacity:.7;font-size:.85em}}
.card{{background:#16213a;border:1px solid #24344f;border-radius:12px;padding:14px 16px;margin-bottom:12px}}
.card h2{{color:#fbbf24;font-size:1.05em;margin:0 0 8px}}
.row{{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #24344f;font-size:.92em}}
.row:last-child{{border-bottom:none}}
.row .mt{{flex:1;min-width:0}}
.row .sc{{font-weight:800;color:#fbbf24;white-space:nowrap;direction:ltr;unicode-bidi:isolate}}
.row .meta{{opacity:.65;font-size:.82em;white-space:nowrap}}
.us{{font-weight:800;color:#fbbf24}}
.badge{{display:inline-block;background:#dc2626;color:#fff;border-radius:6px;padding:0 8px;font-size:.78em;font-weight:700}}
.empty{{opacity:.6;font-size:.88em;padding:6px 0}}
.note{{opacity:.65;font-size:.8em;margin-top:16px}}
</style>
</head>
<body>
<nav><a href="{site}/">Edge Football ⚽ الصفحة الرئيسية</a> · <a href="{site}/teams/">كل الفرق</a></nav>
<main>
<div class="team-head">
  <img id="teamLogo" alt="شعار {name}" style="display:none">
  <div>
    <h1>{name}</h1>
    <p>النتائج والماتشات الجاية والترتيب — تحديث تلقائي</p>
  </div>
</div>

<div class="card" id="staleCard" style="display:none;border-color:#b45309">
  <p style="margin:0;color:#fbbf24;font-size:.9em;">⚠️ البيانات دي مش محدثة دلوقتي — آخر تحديث وصل للموقع: <span id="staleTs"></span> بتوقيت القاهرة. النتايج والماتشات ممكن تكون اتغيرت من ساعتها.</p>
</div>

<div class="card" id="liveCard" style="display:none">
  <h2 id="liveTitle">🔴 جارية دلوقتي</h2>
  <div id="liveList"></div>
</div>

<div class="card">
  <h2>الماتشات الجاية</h2>
  <div id="upcoming"><p class="empty">بنحمّل البيانات...</p></div>
</div>

<div class="card">
  <h2>آخر النتائج</h2>
  <div id="results"><p class="empty">بنحمّل البيانات...</p></div>
</div>

<div class="card">
  <h2>الترتيب</h2>
  <div id="tables"><p class="empty">بنحمّل البيانات...</p></div>
</div>

<div class="card">
  <h2>هدافو الفريق</h2>
  <div id="scorers"><p class="empty">بنحمّل البيانات...</p></div>
</div>

<p class="note">آخر تحديث للماتشات: <span id="mu">...</span> · الأخبار: <span id="nu"></span> (بتوقيت القاهرة)</p>
<p class="note">مصدر البيانات: ESPN وKooora — الصفحة بتقرأ البيانات مباشرة وبتتحدث لوحدها مع كل ماتش.</p>
</main>
<script>
const TEAM = {team_json};
const norm = s => (s || '').trim().replace(/[أإآ]/g, 'ا').toLowerCase();
const ALIASES = new Set(TEAM.aliases.map(norm));
const isUs = n => ALIASES.has(norm(n));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));

function matchRow(m) {{
  const homeUs = isUs(m.home), awayUs = isUs(m.away);
  const h = homeUs ? `<span class="us">${{esc(m.home)}}</span>` : esc(m.home);
  const a = awayUs ? `<span class="us">${{esc(m.away)}}</span>` : esc(m.away);
  let mid, meta;
  if (m.state === 'post') {{
    mid = `${{h}} <span class="sc" dir="ltr">${{esc(m.hs)}} - ${{esc(m.as)}}</span> ${{a}}`;
    meta = `انتهت · ${{esc(m.dateAr || '')}}`;
  }} else if (m.state === 'in') {{
    mid = `${{h}} <span class="sc" dir="ltr">${{esc(m.hs)}} - ${{esc(m.as)}}</span> ${{a}}`;
    meta = window.__feedStale ? `آخر نتيجة مسجلة · ${{esc(m.detail || '')}} ${{esc(m.dateAr || '')}}` : `<span class="badge">لايف</span> ${{esc(m.detail || '')}}`;
  }} else {{
    mid = `${{h}} × ${{a}}`;
    meta = `${{esc(m.day || '')}} ${{esc(m.dateAr || '')}} · ${{esc(m.time || '')}}`;
  }}
  const tv = m.tv ? ` · 📺 ${{esc(m.tv)}}` : '';
  return `<div class="row"><span class="mt">${{mid}}<br><span class="meta">${{esc(m.league || '')}}${{tv}}</span></span><span class="meta">${{meta}}</span></div>`;
}}

(async () => {{
  let d;
  try {{
    const r = await fetch('../site/data.json?t=' + Date.now(), {{ cache: 'no-store' }});
    d = await r.json();
  }} catch (e) {{
    for (const id of ['upcoming', 'results', 'tables', 'scorers'])
      document.getElementById(id).innerHTML = '<p class="empty">مقدرناش نحمّل البيانات دلوقتي، جرّب تاني بعد شوية.</p>';
    return;
  }}

  const all = [];
  for (const lg of (d.matches || []))
    for (const m of (lg.items || []))
      if (isUs(m.home) || isUs(m.away)) all.push({{ ...m, league: lg.league }});

  // freshness: matches_updated_at is Cairo wall time written by the refresh job
  let feedStale = true;
  const muRaw = d.matches_updated_at || '';
  const pm = muRaw.match(/^(\d{{4}})-(\d{{2}})-(\d{{2}}) (\d{{2}}):(\d{{2}}) (AM|PM)$/);
  if (pm) {{
    let hh = (+pm[4]) % 12 + (pm[6] === 'PM' ? 12 : 0);
    const feedUtc = Date.UTC(+pm[1], +pm[2] - 1, +pm[3], hh - 2, +pm[5]);
    feedStale = (Date.now() - feedUtc) > 30 * 60 * 1000;
  }}
  window.__feedStale = feedStale;
  if (feedStale) {{
    document.getElementById('staleCard').style.display = '';
    document.getElementById('staleTs').textContent = muRaw || 'غير معروف';
    document.getElementById('liveTitle').textContent = '⏸️ آخر حالة مسجلة (التحديث متوقف حاليًا)';
  }}

  const now = Date.now();
  const recent = m => m.date && (now - new Date(m.date).getTime()) < 3 * 60 * 60 * 1000;
  const live = all.filter(m => m.state === 'in' && !feedStale && recent(m));
  const staleLive = all.filter(m => m.state === 'in' && (feedStale || !recent(m)));
  const up = all.filter(m => m.state === 'pre').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const post = all.filter(m => m.state === 'post').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (live.length || staleLive.length) {{
    document.getElementById('liveCard').style.display = '';
    document.getElementById('liveList').innerHTML = live.concat(staleLive).map(matchRow).join('');
  }}
  document.getElementById('upcoming').innerHTML = up.length
    ? up.map(matchRow).join('')
    : '<p class="empty">مفيش ماتشات قادمة مسجلة في البيانات الحالية.</p>';
  document.getElementById('results').innerHTML = post.length
    ? post.map(matchRow).join('')
    : '<p class="empty">مفيش نتائج حديثة في البيانات الحالية.</p>';

  let logo = '';
  for (const lg of (d.matches || []))
    for (const m of (lg.items || [])) {{
      if (isUs(m.home) && m.homeLogo) {{ logo = logo || m.homeLogo; }}
      if (isUs(m.away) && m.awayLogo) {{ logo = logo || m.awayLogo; }}
    }}
  if (logo) {{
    const img = document.getElementById('teamLogo');
    img.src = logo; img.style.display = '';
  }}

  const trows = [];
  for (const [league, rows] of Object.entries(d.tables || {{}}))
    for (const r of (rows || []))
      if (isUs(r.team))
        trows.push(`<div class="row"><span class="mt">${{esc(league)}}</span><span class="meta">المركز <span class="us">${{r.rank}}</span> · ${{r.pts}} نقطة (لعب ${{r.gp}} · فاز ${{r.w}} · تعادل ${{r.d}} · خسر ${{r.l}})</span></div>`);
  document.getElementById('tables').innerHTML = trows.length
    ? trows.join('')
    : '<p class="empty">مفيش ترتيب متاح للفريق في البيانات الحالية.</p>';

  const srows = [];
  for (const [league, groups] of Object.entries(d.leaders || {{}}))
    for (const p of ((groups || {{}})['الهدافون 🏆'] || []))
      if (isUs(p.team))
        srows.push(`<div class="row"><span class="mt">${{esc(p.name)}}</span><span class="meta">${{esc(p.value)}} · ${{esc(league)}}</span></div>`);
  document.getElementById('scorers').innerHTML = srows.length
    ? srows.join('')
    : '<p class="empty">مفيش هدافين من الفريق في القوائم الحالية.</p>';

  document.getElementById('mu').textContent = d.matches_updated_at || '—';
  document.getElementById('nu').textContent = d.updated_at || '—';
}})();
</script>
</body>
</html>
"""

INDEX = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>صفحات الفرق: نتائج وماتشات وترتيب الفرق الكبيرة | Edge Football</title>
<meta name="description" content="صفحة ثابتة لكل فريق كبير: الأهلي والزمالك وبيراميدز وأرسنال وريال مدريد ومانشستر سيتي وغيرهم — نتائج وماتشات جاية وترتيب، تحديث تلقائي.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{site}/teams/">
<meta property="og:site_name" content="Edge Football">
<meta property="og:locale" content="ar_AR">
<meta property="og:type" content="website">
<meta property="og:title" content="صفحات الفرق الكبيرة على Edge Football">
<meta property="og:description" content="نتائج وماتشات وترتيب كل فريق كبير في صفحة واحدة، تحديث تلقائي.">
<meta property="og:url" content="{site}/teams/">
<meta property="og:image" content="https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg">
<meta name="theme-color" content="#f59e0b">
<link rel="icon" href="https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#0b1220;color:#e2e8f0;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;line-height:1.8}}
main{{max-width:760px;margin:0 auto;padding:20px 16px 48px}}
a{{color:#fbbf24;text-decoration:none}}
nav{{padding:14px 16px;background:#16213a;border-bottom:1px solid #24344f;text-align:center}}
nav a{{font-weight:bold}}
h1{{font-size:1.4em;color:#fbbf24}}
h2{{font-size:1.05em;color:#fbbf24;margin:18px 0 8px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}}
.grid a{{display:block;background:#16213a;border:1px solid #24344f;border-radius:12px;padding:14px 10px;text-align:center;font-weight:700}}
.grid a:hover{{border-color:#fbbf24}}
</style>
</head>
<body>
<nav><a href="{site}/">Edge Football ⚽ الصفحة الرئيسية</a></nav>
<main>
<h1>صفحات الفرق</h1>
<p style="opacity:.75;font-size:.9em;">كل فريق ليه صفحة ثابتة فيها نتائجه وماتشاته الجاية وترتيبه، بتتحدث تلقائيًا مع كل ماتش.</p>
<h2>الفرق المصرية</h2>
<div class="grid">
{eg_links}
</div>
<h2>الفرق الأوروبية</h2>
<div class="grid">
{eu_links}
</div>
</main>
</body>
</html>
"""


def main():
    os.makedirs("teams", exist_ok=True)
    for slug, name, aliases, _grp in TEAMS:
        team_json = '{"name": %s, "slug": %s, "aliases": [%s]}' % (
            json_str(name), json_str(slug), ", ".join(json_str(a) for a in aliases))
        html = PAGE.format(name=name, slug=slug, site=SITE, team_json=team_json)
        with open(os.path.join("teams", slug + ".html"), "w", encoding="utf-8") as f:
            f.write(html)
    eg = "\n".join(f'  <a href="{s}.html">{n}</a>' for s, n, _a, g in TEAMS if g == "eg")
    eu = "\n".join(f'  <a href="{s}.html">{n}</a>' for s, n, _a, g in TEAMS if g == "eu")
    with open(os.path.join("teams", "index.html"), "w", encoding="utf-8") as f:
        f.write(INDEX.format(site=SITE, eg_links=eg, eu_links=eu))
    print(f"wrote {len(TEAMS)} team pages + teams/index.html")


def json_str(s):
    import json
    return json.dumps(s, ensure_ascii=False)


if __name__ == "__main__":
    main()
