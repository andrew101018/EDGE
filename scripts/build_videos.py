#!/usr/bin/env python3
"""EDGE — build_videos.py
Regenerates videos/*.html (index + one page per video) from videos/videos.json.
Data is grounded manually: titles via YouTube oEmbed, dates/durations via watch-page meta.
Run:  python3 scripts/build_videos.py   (from repo root)
Manual inventory updates: add the new video to videos/videos.json, rerun, commit.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'videos', 'videos.json')
OUT = os.path.join(ROOT, 'videos')
BASE = 'https://andrew101018.github.io/EDGE/'

STYLE = """
body { background:#0b1220; color:#e2e8f0; font-family:'Segoe UI',Tahoma,sans-serif; direction:rtl; margin:0; padding-bottom:40px; }
.wrap { max-width:760px; margin:0 auto; padding:0 14px; }
h1 { color:#fbbf24; font-size:1.5em; margin:18px 0 4px; }
.sub { color:#94a3b8; font-size:.85em; margin-bottom:18px; }
.vd-back { display:inline-block; background:#16213a; border:1px solid #24344f; border-radius:20px; padding:8px 18px; color:#94a3b8; text-decoration:none; margin:14px 14px 4px; font-weight:bold; }
.vd-card { background:#16213a; border:1px solid #24344f; border-radius:12px; padding:14px; margin-bottom:12px; display:flex; gap:12px; align-items:center; text-decoration:none; color:#e2e8f0; }
.vd-card img { width:120px; height:68px; object-fit:cover; border-radius:8px; flex-shrink:0; }
.vd-title { font-weight:bold; font-size:.95em; line-height:1.6; }
.vd-meta { color:#64748b; font-size:.78em; margin-top:4px; }
.vd-embed { position:relative; width:100%; aspect-ratio:16/9; background:#000; border-radius:12px; overflow:hidden; margin:14px 0; }
.vd-embed.short { max-width:380px; margin:14px auto; aspect-ratio:9/16; }
.vd-embed iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.vd-actions { display:flex; gap:10px; flex-wrap:wrap; margin:10px 0 20px; }
.vd-btn { background:#fbbf24; color:#0f172a; border-radius:8px; padding:10px 18px; font-weight:bold; text-decoration:none; }
.vd-btn.alt { background:#16213a; color:#e2e8f0; border:1px solid #24344f; }
.vd-soc { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 4px; }
.vd-soc a { background:#16213a; border:1px solid #24344f; border-radius:20px; padding:7px 14px; color:#e2e8f0; font-size:.82em; font-weight:bold; text-decoration:none; }
"""
SOCIAL_LINKS = [
    ('https://t.me/edgefootballplatform', '📲 تيليجرام'),
    ('https://youtube.com/@andygamall', '📺 يوتيوب'),
    ('https://www.facebook.com/share/1Gohnia7GU/', '📘 فيسبوك'),
    ('https://www.tiktok.com/@andr8w_10?_r=1&_t=ZS-99DBAk3ILae', '🎵 تيك توك'),
    ('https://www.instagram.com/edge_footballl?igsi=cHU5dGY0ZTZvdmN4', '📸 إنستجرام'),
    ('https://www.threads.com/@edge_footballl', '🧵 ثريدز'),
]

def socials():
    return '<div class="vd-soc">' + ''.join(f'<a href="{u}" target="_blank" rel="noopener">{t}</a>' for u, t in SOCIAL_LINKS) + '</div>'


TOPICS = {
    'ucl': 'دوري الأبطال',
    'egy': 'الدوري المصري',
    'epl': 'الدوري الإنجليزي',
    'united': 'مانشستر يونايتد',
    'barca': 'برشلونة',
    'madrid': 'ريال مدريد',
    'legends': 'أساطير وتاريخ',
    'nt': 'منتخبات وكأس العالم',
    'misc': 'متنوع',
}
TOPIC_ORDER = ['ucl', 'egy', 'epl', 'united', 'barca', 'madrid', 'legends', 'nt', 'misc']

CHIP_CSS = """
.vd-chips { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 18px; }
.vd-chip { background:#16213a; border:1px solid #24344f; border-radius:20px; padding:7px 15px; color:#94a3b8; font-size:.82em; font-weight:bold; cursor:pointer; font-family:inherit; }
.vd-chip.on { background:#fbbf24; color:#0f172a; border-color:#fbbf24; }
.vd-chip .n { opacity:.65; font-weight:normal; }
"""

HEAD = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
"""

def dur_ar(d):
    m = d.replace('PT', '').replace('S', '')
    parts = m.split('M')
    return parts[0] + ':' + parts[1].zfill(2) if len(parts) == 2 else m

def is_short(d):
    return int(d.replace('PT', '').replace('M', ' ').replace('S', '').split()[0]) == 0

def video_page(v, reviewed, vertical=False):
    if v.get('published') and v.get('duration'):
        meta = f"نُشر {v['published']} · المدة {dur_ar(v['duration'])} · قناة EDGE - ايدج على يوتيوب"
    elif v.get('_kind') == 'video':
        meta = 'فيديو من قناة EDGE - ايدج على يوتيوب'
    else:
        meta = 'شورت من قناة EDGE - ايدج على يوتيوب'
    article_btn = (f'<a class="vd-btn alt" href="../articles/{v["article"]}">📄 المقال المصاحب</a>' if v.get('article') else '')
    return HEAD + f"""<title>{v['title']} | EDGE</title>
<meta name="description" content="{v['title']} — فيديو من قناة EDGE - ايدج على يوتيوب">
<style>{STYLE}</style>
</head>
<body>
<nav><a class="vd-back" href="index.html">🎬 كل الفيديوهات</a><a class="vd-back" href="{BASE}">⚽ الصفحة الرئيسية</a></nav>
<div class="wrap">
<h1>{v['title']}</h1>
<div class="sub">{meta}</div>
{socials()}
<div class="vd-embed{' short' if vertical else ''}"><iframe src="https://www.youtube-nocookie.com/embed/{v['id']}" title="{v['title']}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
<div class="vd-actions">
<a class="vd-btn" href="https://www.youtube.com/watch?v={v['id']}" target="_blank" rel="noopener">▶️ شاهد على يوتيوب</a>
<a class="vd-btn alt" href="index.html">🎬 باقي الفيديوهات</a>{article_btn}
</div>
<div class="sub">المصدر: قناة EDGE - ايدج على يوتيوب · من مكتبة القناة · آخر مراجعة {reviewed}</div>
</div>
</body>
</html>
"""

def index_page(videos, shorts, reviewed):
    def card(v, short=False):
        meta = 'شورت' if short else (f"{v['published']} · {dur_ar(v['duration'])}" if v.get('published') and v.get('duration') else 'فيديو')
        topics = ' '.join(v.get('topics', []))
        return f"""<a class="vd-card" data-topics="{topics}" href="{v['id']}.html">
<img src="https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'">
<div><div class="vd-title">{v['title']}</div><div class="vd-meta">{meta}</div></div>
</a>"""
    sub = f"كل فيديوهات قناة EDGE - ايدج على يوتيوب ({len(videos)} فيديو)"
    sub += ' · الشورتس لسه جاية' if not shorts else f' + {len(shorts)} شورت'
    allv = videos + shorts
    counts = {t: sum(1 for v in allv if t in v.get('topics', [])) for t in TOPIC_ORDER}
    chips = [f'<button class="vd-chip on" data-t="">الكل <span class="n">{len(allv)}</span></button>']
    chips += [f'<button class="vd-chip" data-t="{t}">{TOPICS[t]} <span class="n">{counts[t]}</span></button>' for t in TOPIC_ORDER if counts[t]]
    chips_html = '<div class="vd-chips">' + ''.join(chips) + '</div>'
    body = [f'<div class="sub">{sub}</div>', socials(), chips_html] + [card(v) for v in videos]
    if shorts:
        body.append('<h1 style="margin-top:22px;">📱 الشورتس</h1>')
        body += [card(v, short=True) for v in shorts]
    return HEAD + """<title>فيديوهات EDGE | Edge Football</title>
<meta name="description" content="كل فيديوهات قناة EDGE - ايدج على يوتيوب في مكان واحد">
<style>""" + STYLE + CHIP_CSS + """</style>
</head>
<body>
<nav><a class="vd-back" href=\"""" + BASE + """\">⚽ الصفحة الرئيسية</a></nav>
<div class="wrap">
<h1>🎬 فيديوهات EDGE</h1>
""" + '\n'.join(body) + f"""
<div class="sub" style="margin-top:16px;">المصدر: <a style="color:#94a3b8;" href="https://www.youtube.com/@andygamall" target="_blank" rel="noopener">قناة EDGE - ايدج على يوتيوب</a> · آخر مراجعة {reviewed}</div>
</div>
<script>
document.querySelectorAll('.vd-chip').forEach(function(c){{
  c.addEventListener('click',function(){{
    document.querySelectorAll('.vd-chip').forEach(function(x){{x.classList.remove('on');}});
    c.classList.add('on');
    var t=c.getAttribute('data-t');
    document.querySelectorAll('.vd-card').forEach(function(card){{
      card.style.display = (!t || (card.getAttribute('data-topics')||'').split(' ').indexOf(t)>-1) ? '' : 'none';
    }});
    document.querySelectorAll('h1').forEach(function(h){{
      if(h.textContent.indexOf('الشورتس')>-1){{
        var anyVisible=false, el=h.nextElementSibling;
        while(el && el.classList && el.classList.contains('vd-card')){{ if(el.style.display!=='none') anyVisible=true; el=el.nextElementSibling; }}
        h.style.display = anyVisible ? '' : 'none';
      }}
    }});
  }});
}});
</script>
</body>
</html>
"""

MONTHS_AR = {'01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
             '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'}

def ar_date(iso):
    try:
        y, m, d = iso.split('-')
        return f"{int(d)} {MONTHS_AR[m]} {y}"
    except Exception:
        return iso

def main():
    data = json.load(open(DATA, encoding='utf-8'))
    reviewed = ar_date(data.get('reviewed', ''))
    videos = data.get('videos', [])
    shorts = data.get('shorts', [])
    os.makedirs(OUT, exist_ok=True)
    for v in videos:
        v['_kind'] = 'video'
        open(os.path.join(OUT, v['id'] + '.html'), 'w', encoding='utf-8').write(video_page(v, reviewed, vertical=bool(v.get('duration')) and is_short(v['duration'])))
    for v in shorts:
        open(os.path.join(OUT, v['id'] + '.html'), 'w', encoding='utf-8').write(video_page(v, reviewed, vertical=True))
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(index_page(videos, shorts, reviewed))
    print(f"built {len(videos) + len(shorts)} video pages + index (reviewed {reviewed})")


AUTOTAG = [
    ('barca', ['برشلونة', 'برسا', 'barca', 'barça', 'لامين']),
    ('madrid', ['ريال مدريد', 'real madrid', 'مدريد']),
    ('united', ['يونايتد', 'manchester united', 'مانشستر يونايتد']),
    ('ucl', ['دوري الأبطال', 'أبطال أوروبا', 'champions league', 'الأبطال', 'أبطال']),
    ('egy', ['الأهلي', 'الزمالك', 'بيراميدز', 'الجونة', 'الإسماعيلي', 'الدوري المصري', 'سيراميكا', 'إنبي', 'سموحة', 'المقاولون', 'الاتحاد السكندري', 'غزل المحلة', 'حرس الحدود']),
    ('epl', ['الدوري الإنجليزي', 'الإنجليزي', 'ليفربول', 'أرسنال', 'ارسنال', 'مان سيتي', 'تشيلسي', 'توتنهام', 'نيوكاسل', 'برايتون', 'فانتازي', 'premier league']),
    ('nt', ['منتخب', 'كأس العالم', 'الفراعنة', 'المونديال']),
    ('legends', ['أسطورة', 'أساطير', 'مارادونا', 'رونالدينيو', 'زيدان', 'بيليه', 'الظاهرة', 'فان جال', 'رونالدو']),
]

def autotag(title):
    t = title.lower()
    tags = [k for k, words in AUTOTAG if any(w.lower() in t for w in words)]
    return tags or ['misc']

def sync():
    """Append new uploads from the channel's public videos/shorts tabs to videos.json."""
    import subprocess
    from datetime import datetime
    from zoneinfo import ZoneInfo
    def tab(url):
        out = subprocess.run(['yt-dlp', '--flat-playlist', '--no-warnings', '--print', '%(id)s\t%(title)s', url],
                             capture_output=True, text=True, timeout=300)
        if out.returncode != 0:
            raise SystemExit('sync aborted: yt-dlp failed for ' + url)
        rows = []
        for line in out.stdout.splitlines():
            parts = line.split('\t', 1)
            if len(parts) == 2 and parts[0].strip() and parts[0] != 'NA':
                rows.append((parts[0].strip(), parts[1].strip()))
        return rows
    vids = tab('https://www.youtube.com/@andygamall/videos')
    shos = tab('https://www.youtube.com/@andygamall/shorts')
    if not vids and not shos:
        raise SystemExit('sync aborted: empty channel enumeration')
    data = json.load(open(DATA, encoding='utf-8'))
    existing = {v['id'] for v in data.get('videos', [])} | {v['id'] for v in data.get('shorts', [])}
    new_v = [{'id': i, 'title': t, 'topics': autotag(t)} for i, t in vids if i not in existing]
    new_s = [{'id': i, 'title': t, 'topics': autotag(t)} for i, t in shos if i not in existing]
    if not new_v and not new_s:
        print('sync: no new uploads')
        return
    data['videos'] = new_v + data.get('videos', [])
    data['shorts'] = new_s + data.get('shorts', [])
    data['reviewed'] = datetime.now(ZoneInfo('Africa/Cairo')).date().isoformat()
    json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"sync: added {len(new_v)} videos + {len(new_s)} shorts")

if __name__ == '__main__':
    import sys
    if '--sync' in sys.argv:
        sync()
    main()
