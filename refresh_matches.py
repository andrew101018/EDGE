"""Fixtures-only refresh for site/data.json.
Reads public ESPN scoreboards and updates ONLY the `matches` list and `updated_at`.
No publishing, no secrets, no news. Existing items outside the window are kept."""
import json, urllib.request, datetime as dt
from zoneinfo import ZoneInfo

CAIRO = ZoneInfo("Africa/Cairo")
PATH = "site/data.json"
data = json.load(open(PATH, encoding="utf-8"))
now = dt.datetime.now(dt.timezone.utc)
DATES = [(now + dt.timedelta(days=d)).strftime("%Y%m%d") for d in (-1, 0, 1, 2)]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
changed = False

def fetch(slug):
    events, ok = [], False
    for d in DATES:
        url = "https://site.api.espn.com/apis/site/v2/sports/soccer/%s/scoreboard?dates=%s" % (slug, d)
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                events += json.loads(r.read().decode()).get("events", [])
                ok = True
        except Exception as e:
            print("fetch failed", slug, d, type(e).__name__)
    return {"events": events} if ok else None

def build(ev, slug, old):
    comp = ev["competitions"][0]
    cs = comp.get("competitors", [])
    home = next((c for c in cs if c.get("homeAway") == "home"), None)
    away = next((c for c in cs if c.get("homeAway") == "away"), None)
    if not home or not away:
        return None
    t = dt.datetime.strptime(ev["date"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc).astimezone(CAIRO)
    st = comp["status"]["type"]
    state = st.get("state")
    detail = st.get("shortDetail") or st.get("detail") or ""
    if state == "post":
        detail = "FT"
    elif state == "pre":
        detail = "Scheduled"
    item = dict(old or {})
    item.update({
        "home": (old or {}).get("home") or home["team"].get("shortDisplayName") or home["team"]["displayName"],
        "away": (old or {}).get("away") or away["team"].get("shortDisplayName") or away["team"]["displayName"],
        "eid": str(ev["id"]), "slug": slug,
        "homeId": str(home["team"]["id"]), "awayId": str(away["team"]["id"]),
        "homeLogo": (old or {}).get("homeLogo") or home["team"].get("logo", ""),
        "awayLogo": (old or {}).get("awayLogo") or away["team"].get("logo", ""),
        "tv": (old or {}).get("tv", ""),
        "hs": str(home.get("score", "0")), "as": str(away.get("score", "0")),
        "time": t.strftime("%I:%M"), "day": DAYS[t.weekday()],
        "dateAr": t.strftime("%d/%m"), "date": t.strftime("%Y-%m-%dT%H:%M:%S+02:00") if t.utcoffset() == dt.timedelta(hours=2) else t.isoformat(),
        "detail": detail, "state": state,
    })
    return item

for g in data.get("matches", []):
    slug = g.get("slug", "")
    if not slug or slug == "egy.1":
        continue
    res = fetch(slug)
    if not res:
        continue
    items = g.setdefault("items", [])
    by = {str(i.get("eid")): i for i in items}
    for ev in res.get("events", []):
        try:
            new = build(ev, slug, by.get(str(ev["id"])))
        except Exception as e:
            print("skip event", ev.get("id"), type(e).__name__)
            continue
        if not new:
            continue
        if str(ev["id"]) in by:
            old = by[str(ev["id"])]
            if old != new:
                old.clear(); old.update(new); changed = True
        else:
            items.append(new); changed = True
    items.sort(key=lambda i: i.get("date", ""))
if changed:
    data["updated_at"] = dt.datetime.now(CAIRO).strftime("%Y-%m-%d %I:%M %p")
    json.dump(data, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("updated")
else:
    print("no change")
