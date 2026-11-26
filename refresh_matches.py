"""Fixtures-only refresh for site/data.json.
Reads public ESPN scoreboards and updates ONLY the `matches` list and `updated_at`.
No publishing, no secrets, no news. Existing items outside the window are kept."""
import json, re, urllib.request, datetime as dt
from zoneinfo import ZoneInfo

CAIRO = ZoneInfo("Africa/Cairo")
PATH = "site/data.json"
data = json.load(open(PATH, encoding="utf-8"))
if "matches_updated_at" not in data:
    # one-time migration: updated_at is the NEWS timestamp (last bot run). An earlier version of this
    # job overwrote it on 2026-11-24, so restore the last real news time and track matches separately.
    data["updated_at"] = "2026-11-23 06:53 PM"
    data["matches_updated_at"] = data["updated_at"]
    changed_init = True
else:
    changed_init = False
now = dt.datetime.now(dt.timezone.utc)
DATES = [(now + dt.timedelta(days=d)).strftime("%Y%m%d") for d in (-1, 0, 1, 2)]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
changed = changed_init

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


# Canonical club names as used by the Egyptian press (kooora shows merged names for these)
NAME_FIX = {"الشرقية إنبي": "إنبي", "السويس بتروجيت": "بتروجيت", "الجيش": "طلائع الجيش"}
KOOORA_EGY = "https://www.kooora.com/%D9%83%D8%B1%D8%A9-%D8%A7%D9%84%D9%82%D8%AF%D9%85/%D9%85%D8%B3%D8%A7%D8%A8%D9%82%D8%A9/%D8%A7%D9%84%D8%AF%D9%88%D8%B1%D9%8A-%D8%A7%D9%84%D9%85%D8%B5%D8%B1%D9%8A-%D8%A7%D9%84%D9%85%D9%85%D8%AA%D8%A7%D8%B2/8k1xcsyvxapl4jlsluh3eomre"

# 2026-11-25: paused. Kooora's terms of use (https://www.kooora.com/%D8%B3%D9%8A%D8%A7%D8%B3%D8%A9-%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85 clause 11) prohibit
# automated scraping. While paused, egy.1 keeps its last verified snapshot and its per-source stamp
# stays frozen at the last successful check (2026-11-25 11:47 PM). Set to False to resume.
EGY_SOURCE_PAUSED = True

# 2026-11-26: paused. Disney/ESPN terms (https://disneytermsofuse.com/english/ clause x; Arabic:
# https://disneytermsofuse.com/arabic/) prohibit automated access/extraction and restrict use to
# personal noncommercial; no endpoint-specific permission exists for site.api.espn.com. While paused,
# every ESPN league keeps its last verified items and its per-source stamp stays frozen at the last
# successful check (2026-11-25 11:55 PM). Set to False to resume only with a permitted source.
ESPN_SOURCES_PAUSED = True

def fetch_kooora(slug):
    """Egyptian league from kooora's public page (same source the old bot used)."""
    try:
        req = urllib.request.Request(KOOORA_EGY, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        txt = urllib.request.urlopen(req, timeout=30).read().decode()
        m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', txt, re.S)
        sm = json.loads(m.group(1))["props"]["pageProps"]["data"]["summaryMatches"]
    except Exception as e:
        print("kooora failed", type(e).__name__)
        return None
    out = []
    for ev in sm:
        try:
            st = {"FIXTURE": "pre", "RESULT": "post", "LIVE": "in", "PLAYING": "in"}.get((ev.get("status") or "").upper(), "pre")
            t = dt.datetime.fromisoformat(ev["startDate"].replace("Z", "+00:00")).astimezone(CAIRO)
            ta, tb, sc = ev.get("teamA") or {}, ev.get("teamB") or {}, ev.get("score") or {}
            out.append({
                "home": NAME_FIX.get(ta.get("name", ""), ta.get("name", "")), "away": NAME_FIX.get(tb.get("name", ""), tb.get("name", "")),
                "eid": "kz-" + str(ev.get("id") or ""), "slug": slug,
                "homeId": ta.get("id", ""), "awayId": tb.get("id", ""),
                "homeLogo": (ta.get("image") or {}).get("url", ""), "awayLogo": (tb.get("image") or {}).get("url", ""),
                "tv": "", "hs": "" if sc.get("teamA") is None else str(sc.get("teamA")), "as": "" if sc.get("teamB") is None else str(sc.get("teamB")),
                "state": st, "time": t.strftime("%I:%M"), "day": DAYS[t.weekday()],
                "dateAr": t.strftime("%d/%m"), "date": t.isoformat(),
                "detail": "FT" if st == "post" else ((ev.get("gameset") or {}).get("name", "") if st == "pre" else "")})
        except Exception:
            continue
    return out or None

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

now_str = dt.datetime.now(CAIRO).strftime("%Y-%m-%d %I:%M %p")
checked = dict(data.get("matches_checked_by_source", {}))
all_ok = True
fetched_any = False
for g in data.get("matches", []):
    slug = g.get("slug", "")
    if slug == "egy.1":
        if EGY_SOURCE_PAUSED:
            print("egy.1 source paused (source terms); keeping last verified items")
            continue
        fetched_any = True
        k = fetch_kooora(slug)
        if k is not None:
            checked["egy.1"] = now_str
            old_by = {i.get("eid"): i for i in g.get("items", [])}
            for i in k:
                if i["eid"] in old_by and i["tv"] == "":
                    i["tv"] = old_by[i["eid"]].get("tv", "")
            if k != g.get("items"):
                g["items"] = k; changed = True
        else:
            all_ok = False
        continue
    if not slug:
        continue
    if ESPN_SOURCES_PAUSED:
        print(slug, "source paused (source terms); keeping last verified items")
        continue
    fetched_any = True
    res = fetch(slug)
    if not res:
        all_ok = False
        continue
    checked[slug] = now_str
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
# matches_checked_by_source[slug] = last SUCCESSFUL fetch of that slug's source.
# matches_checked_at = last run where EVERY source fetched successfully.
# matches_updated_at = last content change only. File changes every run -> workflow commits every run.
data["matches_checked_by_source"] = checked
if all_ok and fetched_any:
    data["matches_checked_at"] = now_str
if changed:
    data["matches_updated_at"] = now_str
    print("updated")
else:
    print("no change")
json.dump(data, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
