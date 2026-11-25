#!/usr/bin/env python3
"""EDGE - resolve_predictions.py
Resolves pending editorial predictions in site/data.json (predictions_log)
against final scores already recorded by the matches pipeline.
Outcome labels: exact (correct score), direction (correct winner/draw), miss.
Never invents results: only matches recorded as finished (state=post) count.
Run: python3 scripts/resolve_predictions.py  (from repo root)
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'site', 'data.json')

def sign(x):
    return (x > 0) - (x < 0)

def main():
    data = json.load(open(DATA, encoding='utf-8'))
    log = data.get('predictions_log') or []
    if not log:
        print('predictions: none recorded')
        return
    finals = {}
    for g in data.get('matches', []):
        for m in g.get('items', []):
            if m.get('state') == 'post' and m.get('eid'):
                finals[str(m['eid'])] = m
    changed = 0
    for p in log:
        if p.get('status') != 'pending':
            continue
        m = finals.get(str(p.get('eid', '')))
        if not m:
            continue
        try:
            ah, aa = int(m['hs']), int(m['as'])
            ph, pa = int(p['pick'][0]), int(p['pick'][1])
        except (TypeError, ValueError, KeyError, IndexError):
            continue
        p['actual'] = [ah, aa]
        if ph == ah and pa == aa:
            p['status'] = 'exact'
        elif sign(ph - pa) == sign(ah - aa):
            p['status'] = 'direction'
        else:
            p['status'] = 'miss'
        changed += 1
    if changed:
        json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'predictions: resolved {changed}, pending {sum(1 for p in log if p.get("status") == "pending")}')

if __name__ == '__main__':
    main()
