#!/usr/bin/env python3
"""EDGE — build_fpl.py
Generates fpl/gw<N>.html (one static page per Premier League Fantasy gameweek)
plus fpl/index.html, from the official FPL API (fantasy.premierleague.com).
Run before each gameweek:  python3 scripts/build_fpl.py   (from repo root)
Manual refresh: rerun and commit when a new gameweek approaches.
"""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_videos import socials
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'fpl')
BASE = 'https://andrew101018.github.io/EDGE/'
CAIRO = ZoneInfo('Africa/Cairo')
API = 'https://fantasy.premierleague.com/api'

DAYS_AR = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
MONTHS_AR = {'01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
             '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'}

STYLE = """
body { background:#0b1220; color:#e2e8f0; font-family:'Segoe UI',Tahoma,sans-serif; direction:rtl; margin:0; padding-bottom:40px; }
.wrap { max-width:760px; margin:0 auto; padding:0 14px; }
h1 { color:#fbbf24; font-size:1.5em; margin:18px 0 4px; }
.sub { color:#94a3b8; font-size:.85em; margin-bottom:18px; }
.vd-soc { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 4px; }
.vd-soc a { background:#16213a; border:1px solid #24344f; border-radius:20px; padding:7px 14px; color:#e2e8f0; font-size:.82em; font-weight:bold; text-decoration:none; }
.vd-back { display:inline-block; background:#16213a; border:1px solid #24344f; border-radius:20px; padding:8px 18px; color:#94a3b8; text-decoration:none; margin:14px 14px 4px; font-weight:bold; }
.fpl-deadline { background:#3b2f0b; border:1px solid #fbbf24; border-radius:12px; padding:14px 16px; margin:16px 0; }
.fpl-deadline .t { color:#fbbf24; font-weight:bold; font-size:1.05em; }
.fpl-deadline .d { color:#fde68a; font-size:.9em; margin-top:4px; }
.fpl-match { background:#16213a; border:1px solid #24344f; border-radius:12px; padding:12px 14px; margin-bottom:10px; }
.fpl-when { color:#fbbf24; font-size:.8em; font-weight:bold; margin-bottom:4px; }
.fpl-teams { font-weight:bold; font-size:.98em; line-height:1.6; }
.fpl-gw { background:#16213a; border:1px solid #24344f; border-radius:12px; padding:14px; margin-bottom:12px; display:block; text-decoration:none; color:#e2e8f0; }
.fpl-gw .t { font-weight:bold; }
.fpl-gw .m { color:#64748b; font-size:.8em; margin-top:4px; }
"""

HEAD = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
"""

def fetch(path):
    with urllib.request.urlopen(API + path, timeout=30) as r:
        return json.load(r)

def fmt(dt):
    h = dt.hour
    suffix = 'ص' if h < 12 else 'م'
    h12 = h % 12 or 12
    return f"{DAYS_AR[dt.weekday()]} {dt.day} {MONTHS_AR[f'{dt.month:02d}']} · {h12}:{dt.minute:02d} {suffix}"

def gw_page(gw, deadline, fixtures, updated):
    rows = '\n'.join(
        f"""<div class="fpl-match"><div class="fpl-when">{fmt(k)}</div><div class="fpl-teams">{h} × {a}</div></div>"""
        for k, h, a in fixtures)
    return HEAD + f"""<title>فانتازي الدوري الإنجليزي — الجولة {gw} | EDGE</title>
<meta name="description" content="موعد غلق التعديلات وماتشات الجولة {gw} في فانتازي الدوري الإنجليزي بتوقيت القاهرة">
<style>{STYLE}</style>
</head>
<body>
<nav><a class="vd-back" href="index.html">🔮 كل الجولات</a><a class="vd-back" href="{BASE}">⚽ الصفحة الرئيسية</a><a class="vd-back" href="{BASE}#fantasy">🎮 فانتازي على الموقع</a></nav>
<div class="wrap">
<h1>🔮 الجولة {gw}</h1>
<div class="sub">فانتازي الدوري الإنجليزي · المواعيد بتوقيت القاهرة</div>
{socials()}
<div class="fpl-deadline"><div class="t">⏰ قفل التعديلات: {fmt(deadline)}</div><div class="d">بعد المعاد ده التشكيلة والتبديلات بتتقفل للجولة دي</div></div>
<h1 style="font-size:1.15em;">📅 ماتشات الجولة</h1>
{rows}
<div class="sub" style="margin-top:16px;">المصدر: الموقع الرسمي لفانتازي الدوري الإنجليزي · آخر تحديث {updated}</div>
</div>
</body>
</html>
"""

def index_page(gws, updated):
    cards = '\n'.join(
        f"""<a class="fpl-gw" href="gw{n}.html"><div class="t">🔮 الجولة {n}</div><div class="m">قفل التعديلات: {d}</div></a>"""
        for n, d in gws)
    return HEAD + """<title>فانتازي الدوري الإنجليزي — الجولات | EDGE</title>
<meta name="description" content="صفحة ثابتة لكل جولة من فانتازي الدوري الإنجليزي: موعد القفل والماتشات بتوقيت القاهرة">
<style>""" + STYLE + """</style>
</head>
<body>
<nav><a class="vd-back" href=\"""" + BASE + """">⚽ الصفحة الرئيسية</a><a class="vd-back" href=\"""" + BASE + """#fantasy">🎮 فانتازي على الموقع</a></nav>
<div class="wrap">
<h1>🔮 فانتازي الدوري الإنجليزي</h1>
<div class="sub">صفحة ثابتة لكل جولة · المواعيد بتوقيت القاهرة</div>
""" + socials() + """
""" + cards + f"""
<div class="sub" style="margin-top:16px;">المصدر: الموقع الرسمي لفانتازي الدوري الإنجليزي · آخر تحديث {updated}</div>
</div>
</body>
</html>
"""

def main():
    boot = fetch('/bootstrap-static/')
    teams = {t['id']: t['name'] for t in boot['teams']}
    upcoming = [e for e in boot['events'] if e['is_next'] or e['is_current'] and not e['finished']]
    targets = sorted({e['id'] for e in boot['events'] if e['is_next']})
    cur = [e for e in boot['events'] if e['is_current'] and not e['finished']]
    targets = sorted(set(targets) | {e['id'] for e in cur})
    events = {e['id']: e for e in boot['events']}
    updated = fmt(datetime.now(timezone.utc).astimezone(CAIRO))
    os.makedirs(OUT, exist_ok=True)
    gws = []
    for n in targets:
        e = events[n]
        deadline = datetime.fromisoformat(e['deadline_time'].replace('Z', '+00:00')).astimezone(CAIRO)
        fixtures = sorted(
            ((datetime.fromisoformat(x['kickoff_time'].replace('Z', '+00:00')).astimezone(CAIRO),
              teams[x['team_h']], teams[x['team_a']])
             for x in fetch(f'/fixtures/?event={n}') if x['kickoff_time']),
            key=lambda t: t[0])
        open(os.path.join(OUT, f'gw{n}.html'), 'w', encoding='utf-8').write(
            gw_page(n, deadline, fixtures, updated))
        gws.append((n, fmt(deadline)))
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(index_page(gws, updated))
    print(f"built fpl pages for gameweeks {[n for n, _ in gws]} (updated {updated})")

if __name__ == '__main__':
    main()
