#!/usr/bin/env python3
"""EDGE — build_news_ingest.py
Merges verified-news records from news/incoming/*.json into site/data.json.
No rewriting: texts are stored verbatim from the record; batch files are
rendered from their exact fields with fixed presentation templates only.
Each ingested item keeps sources, published_at and checked_at.
Records are added to news/incoming/ after source verification;
this script never fetches or generates news itself.
Run: python3 scripts/build_news_ingest.py  (from repo root)
"""
import json, os, glob, re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'site', 'data.json')
INCOMING = os.path.join(ROOT, 'news', 'incoming')
FMT = "%Y-%m-%d %I:%M %p"
CAIRO = ZoneInfo('Africa/Cairo')
CAP = 60
MONTHS_AR = {'01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
             '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'}

def iso(s, field='timestamp', path='record', allow_date=False):
    raw = str(s)
    dt = datetime.fromisoformat(raw.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        if allow_date and re.fullmatch(r'\d{4}-\d{2}-\d{2}', raw):
            return dt
        raise SystemExit(f"invalid {path}: {field} must carry an explicit timezone offset (ISO 8601, e.g. 2026-11-25T14:00:00+02:00)")
    return dt

def ar_date(d):
    y, m, dd = str(d).split('-')
    return f"{int(dd)} {MONTHS_AR[m]} {y}"

def load_single(path, r):
    for k in ('id', 'section', 'title', 'body', 'source_name', 'source_url', 'published_at', 'checked_at'):
        if not r.get(k):
            raise SystemExit(f"invalid record {path}: missing {k}")
    if r['section'] not in ('news', 'world', 'opinion'):
        raise SystemExit(f"invalid record {path}: section must be news|world|opinion")
    if not str(r['source_url']).startswith('http'):
        raise SystemExit(f"invalid record {path}: source_url must be a URL")
    iso(r['published_at'], 'published_at', path, allow_date=True)
    iso(r['checked_at'], 'checked_at', path)
    return [{
        'id': r['id'], 'section': r['section'],
        't': r['title'], 'full': r['body'], 'img': r.get('image', ''),
        'source': r['source_name'], 'url': r['source_url'],
        'sources': r.get('sources') or [r['source_url']],
        'published_at': r['published_at'], 'checked_at': r['checked_at'],
    }]

def load_batch(path, r):
    """verified-news-v1: shared sources + exact result records -> one results item."""
    if not str(r.get('contract', '')).startswith('verified-news-v1'):
        raise SystemExit(f"invalid batch {path}: unknown contract")
    checked = r.get('fetched_cairo')
    if not checked:
        raise SystemExit(f"invalid batch {path}: missing fetched_cairo")
    iso(checked, 'fetched_cairo', path)
    srcs = [s['url'] for s in r.get('sources', []) if s.get('url')]
    srcs += [u for u in (r.get('also_confirmed') or {}).values()]
    if not srcs:
        raise SystemExit(f"invalid batch {path}: no source URLs")
    results = r.get('results') or []
    if not results:
        raise SystemExit(f"invalid batch {path}: empty results")
    for m in results:
        for k in ('id', 'home', 'away', 'score', 'date', 'competition'):
            if not m.get(k):
                raise SystemExit(f"invalid batch {path}: result missing {k}")
        if m.get('status') != 'FT':
            raise SystemExit(f"invalid batch {path}: {m['id']} not FT")
    comp, rnd, date = results[0]['competition'], results[0].get('round', ''), results[0]['date']
    lines = ["النتائج (بعد صافرة النهاية):"]
    lines += [f"{m['home']} × {m['away']}: {m['score']}" for m in results]
    st = r.get('standings_after_tuesday')
    if st and st.get('rows'):
        lines += ['', f"لقطة الترتيب بعد ماتشات {ar_date(date)} (مش تحديث لحظي):", st['rows']]
    lines += ['', 'المصادر: ' + ' + '.join(s.get('name', s.get('url', '')).split(' (')[0] for s in r['sources'])]
    comp_slug = re.sub(r'[^a-z0-9]+', '-', str(results[0]['id']).split('-')[0].lower()).strip('-') or 'batch'
    return [{
        'id': f"batch-{comp_slug}-{date}-{len(results)}m",
        'section': 'news',
        't': f"{comp}: نتائج {rnd} · {ar_date(date)}".replace('نتائج  ·', 'نتائج'),
        'full': '\n'.join(lines),
        'img': '',
        'source': r['sources'][0].get('name', 'مصادر موثقة'),
        'url': srcs[0],
        'sources': srcs,
        'published_at': date,
        'checked_at': checked,
    }]

def load_prediction(path, r, existing_log):
    """prediction-v1: an editorial prediction recorded BEFORE kickoff; resolved later by scripts/resolve_predictions.py.
    Integrity: kickoff must be in the future at trusted ingest (server) time, and each match
    accepts one prediction ever, so a pick cannot be submitted or rewritten after the match."""
    for k in ('id', 'eid', 'home', 'away', 'kickoff', 'pick', 'checked_at'):
        if not r.get(k):
            raise SystemExit(f"invalid record {path}: missing {k}")
    pk = r['pick']
    if not isinstance(pk, dict) or not isinstance(pk.get('hs'), int) or not isinstance(pk.get('as'), int) or pk['hs'] < 0 or pk['as'] < 0:
        raise SystemExit(f'invalid record {path}: pick must be {{"hs": int, "as": int}}')
    ko = iso(r['kickoff'], 'kickoff', path)
    chk = iso(r['checked_at'], 'checked_at', path)
    if ko <= chk:
        raise SystemExit(f"invalid record {path}: kickoff must be after checked_at (predictions are recorded before the match)")
    now = datetime.now(timezone.utc)
    if ko <= now:
        raise SystemExit(f"invalid record {path}: kickoff must be in the future at ingest time (server clock); backdated predictions are rejected")
    eid = str(r['eid'])
    if any(p.get('eid') == eid for p in (existing_log or [])):
        raise SystemExit(f"invalid record {path}: a prediction for this match (eid {eid}) already exists; one prediction per match")
    return [{
        'id': r['id'], 'section': 'predictions_log',
        'eid': eid, 'home': str(r['home']), 'away': str(r['away']),
        'kickoff': r['kickoff'], 'pick': [pk['hs'], pk['as']],
        'note': str(r.get('note', '')), 'recorded_at': r['checked_at'],
        'ingested_at': now.isoformat(timespec='seconds'),
        'status': 'pending', 'actual': None,
    }]

def load(path, pred_log=None):
    r = json.load(open(path, encoding='utf-8'))
    if r.get('kind') == 'prediction-v1':
        return load_prediction(path, r, pred_log)
    if 'results' in r:
        return load_batch(path, r)
    return load_single(path, r)

def main():
    files = sorted(glob.glob(os.path.join(INCOMING, '*.json')))
    if not files:
        print('news ingest: no records')
        return
    data = json.load(open(DATA, encoding='utf-8'))
    items = []
    for f in files:
        items += load(f, data.get('predictions_log') or [])
    seen = set(data.get('news_ids', []))
    added = []
    for it in items:
        if it['id'] in seen:
            continue
        if it['section'] not in data:
            data[it['section']] = []
        data[it['section']].insert(0, it)
        data[it['section']] = data[it['section']][:CAP]
        seen.add(it['id'])
        added.append(it['id'])
    if not added:
        print('news ingest: all records already present')
        return
    data['news_ids'] = sorted(seen)
    news_added = [it for it in items if it['id'] in added and it['section'] in ('news', 'world', 'opinion')]
    if not news_added:
        json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f"news ingest: added {len(added)} item(s): {', '.join(added)}")
        return
    latest = max(iso(it['checked_at']) for it in news_added).astimezone(CAIRO)
    try:
        current = datetime.strptime(data.get('updated_at', ''), FMT)
        if latest.replace(tzinfo=None) > current:
            data['updated_at'] = latest.strftime(FMT)
    except ValueError:
        data['updated_at'] = latest.strftime(FMT)
    json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"news ingest: added {len(added)} item(s): {', '.join(added)}")

if __name__ == '__main__':
    main()
