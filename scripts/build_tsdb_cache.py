#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build site/tsdb-cache.json from TheSportsDB's free API.

Why this exists: the site used to call the API straight from the visitor's
browser. That is not allowed (rate limit is per key, 30 requests/minute) and it
broke for every visitor when the old free key was disabled. This script runs
server-side in GitHub Actions, paces its calls, and writes a static cache the
browser reads from our own domain.

Terms applied (thesportsdb.com/docs_terms_of_use.php, checked 2026-11-26):
  - official API endpoints only, never scrape HTML pages
  - free tier: 30 requests/minute -> calls paced at ~5s (12/min; the shared free key 429s well below 30/min)
  - free tier has no livescore -> only upcoming fixtures and FINISHED results
  - artwork: a player photo is stored only when strCreativeCommons == "Yes",
    together with its attribution string; team badges are not stored at all
    (team objects carry no licence field, so nothing confirms "Yes")
  - no paid plan, no account: free test key (env TSDB_KEY, default "123")

Usage: python3 scripts/build_tsdb_cache.py
Env:   TSDB_BUDGET (max requests this run, default 280)
       TSDB_KEY (default 123)
       TSDB_PACE (seconds between calls, default 2.2)
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "tsdb-cache.json")
SECTIONS = os.path.join(ROOT, "app-sections.js")

KEY = (os.environ.get("TSDB_KEY") or "123").strip()
BASE = "https://www.thesportsdb.com/api/v1/json/%s/" % KEY
BUDGET = int(os.environ.get("TSDB_BUDGET", "300"))
PACE = float(os.environ.get("TSDB_PACE", "5.0"))

FIXTURE_MAX_AGE = timedelta(hours=12)
SQUAD_MAX_AGE = timedelta(days=7)

# The site carries no advertising today. If ads are ever added, CC
# NonCommercial artwork must be dropped; flip this and rerun.
SITE_HAS_ADS = False

CAIRO = timezone(timedelta(hours=2))
TERMS_URL = "https://www.thesportsdb.com/docs_terms_of_use.php"

# National teams that get a squad table (bounded on purpose: one extra call each).
SQUAD_TEAMS = {
    "Egypt", "Saudi Arabia", "Morocco", "Algeria", "Tunisia", "Libya", "Sudan",
    "Mauritania", "Qatar", "United Arab Emirates", "Oman", "Bahrain", "Kuwait",
    "Iraq", "Jordan", "Lebanon", "Syria", "Palestine", "Yemen", "Senegal",
    "Nigeria", "Ghana", "Cameroon", "Cote d'Ivoire", "Mali", "South Africa",
    "Spain", "Portugal", "France", "England", "Germany", "Italy", "Brazil",
    "Argentina", "Mexico", "United States",
}

# TheSportsDB returns backroom staff in player lists; they are not squad members.
STAFF = {"manager", "coach", "assistant manager", "goalkeeping coach", "fitness coach", "physiotherapist", "doctor", "scout", "director"}

POSITION_ORDER = {
    "Goalkeeper": 0, "Defender": 1, "Midfielder": 2,
    "Attacker": 3, "Forward": 3, "Striker": 3,
}

calls = 0


class Budget(Exception):
    pass


def api(path, **params):
    """One paced call to an official endpoint. Raises Budget when out of budget."""
    global calls
    if calls >= BUDGET:
        raise Budget()
    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "EDGE-site-cache/1.0"})
    for attempt in (0, 1):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                body = r.read().decode("utf-8", "replace")
            calls += 1
            time.sleep(PACE)
            return json.loads(body or "{}")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                # shared free key: stop this run instead of hammering it.
                # the cache keeps whatever it already had.
                print("  429 from API - stopping this run", flush=True)
                raise Budget()
            raise
        except Exception:
            if attempt == 0:
                time.sleep(3)
                continue
            raise
    return {}


def nationals():
    """Read the national-team list straight out of app-sections.js."""
    src = open(SECTIONS, encoding="utf-8").read()
    block = re.search(r"const NATIONALS = \[(.*?)\n\];", src, re.S)
    if not block:
        sys.exit("NATIONALS not found in app-sections.js")
    out = []
    for m in re.finditer(r"\[\s*'([^']*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'[^']*'\s*\]", block.group(1)):
        en = m.group(2).replace("\\'", "'").strip()
        if en and en not in [x[1] for x in out]:
            out.append((m.group(1), en))
    if len(out) < 100:
        sys.exit("NATIONALS parse looks wrong (%d entries)" % len(out))
    return out


def age_of(stamp, now):
    if not stamp:
        return timedelta(days=3650)
    try:
        return now - datetime.fromisoformat(stamp)
    except Exception:
        return timedelta(days=3650)


def resolve_id(name):
    d = api("searchteams.php", t=name)
    teams = [
        t for t in (d.get("teams") or [])
        if (t.get("strSport") or "Soccer") == "Soccer"
        and (t.get("strGender") or "Male") != "Female"
    ]
    exact = [t for t in teams if (t.get("strTeam") or "").lower() == name.lower()]
    pick = (exact or teams or [None])[0]
    return (pick or {}).get("idTeam") or ""


def refresh_fixtures(entry, today):
    tid = entry["id"]
    nx = api("eventsnext.php", id=tid).get("events") or []
    ls = api("eventslast.php", id=tid)
    ls = ls.get("results") or ls.get("events") or []

    nexts = []
    for e in sorted(nx, key=lambda x: x.get("dateEvent") or ""):
        d = e.get("dateEvent") or ""
        if not d or d < today:
            continue
        nexts.append({
            "d": d,
            "t": (e.get("strTime") or "")[:5],
            "h": e.get("strHomeTeam") or "",
            "a": e.get("strAwayTeam") or "",
            "lg": e.get("strLeague") or "",
        })
        if len(nexts) >= 8:
            break

    lasts = []
    for e in sorted(ls, key=lambda x: x.get("dateEvent") or "", reverse=True):
        d = e.get("dateEvent") or ""
        hs, as_ = e.get("intHomeScore"), e.get("intAwayScore")
        # finished only: free tier has no livescore, never cache an in-play score
        if not d or d > today or hs is None or as_ is None:
            continue
        try:
            hs, as_ = int(hs), int(as_)
        except Exception:
            continue
        lasts.append({
            "d": d, "h": e.get("strHomeTeam") or "", "a": e.get("strAwayTeam") or "",
            "hs": hs, "as": as_, "lg": e.get("strLeague") or "",
        })
        if len(lasts) >= 6:
            break

    entry["next"] = nexts
    entry["last"] = lasts


def refresh_squad(entry):
    ps = api("lookup_all_players.php", id=entry["id"]).get("player") or []
    rows = []
    for p in ps:
        name = (p.get("strPlayer") or "").strip()
        if not name or (p.get("strPosition") or "").strip().lower() in STAFF:
            continue
        cc = (p.get("strCreativeCommons") or "").strip().lower()
        img, credit = "", ""
        if cc == "yes":
            credit = (p.get("strCreativeCommonsAttribution") or "").strip()
            if not (SITE_HAS_ADS and "noncommercial" in credit.lower()):
                img = p.get("strCutout") or p.get("strThumb") or ""
        rows.append({
            "n": name,
            "pos": p.get("strPosition") or "",
            "nat": p.get("strNationality") or "",
            "born": p.get("dateBorn") or "",
            "img": img,
            "credit": credit,
        })
    rows.sort(key=lambda r: POSITION_ORDER.get(r["pos"], 9))
    entry["squad"] = rows[:30]


def main():
    now = datetime.now(CAIRO)
    today = now.date().isoformat()
    stamp = now.isoformat(timespec="seconds")

    if os.path.exists(OUT):
        try:
            cache = json.load(open(OUT, encoding="utf-8"))
        except Exception:
            cache = {}
    else:
        cache = {}
    teams = cache.get("teams") or {}

    wanted = nationals()
    # staleness order: least recently refreshed first, so a capped run rotates
    ordered = sorted(wanted, key=lambda pair: age_of((teams.get(pair[1]) or {}).get("fixtures_at"), now))

    done_fx = done_sq = 0
    try:
        for ar, en in ordered:
            entry = teams.setdefault(en, {"ar": ar, "name": en})
            entry.setdefault("next", [])
            entry.setdefault("last", [])
            entry.setdefault("squad", [])
            try:
                if not entry.get("id"):
                    entry["id"] = resolve_id(en)
                    if not entry["id"]:
                        entry["missing_at"] = stamp
                        continue
                if age_of(entry.get("fixtures_at"), now) > FIXTURE_MAX_AGE:
                    refresh_fixtures(entry, today)
                    entry["fixtures_at"] = stamp
                    done_fx += 1
                if en in SQUAD_TEAMS and age_of(entry.get("squad_at"), now) > SQUAD_MAX_AGE:
                    refresh_squad(entry)
                    entry["squad_at"] = stamp
                    done_sq += 1
            except Budget:
                raise
            except Exception as e:
                print("  %s failed: %s" % (en, e), flush=True)
    except Budget:
        print("budget of %d requests reached" % BUDGET, flush=True)

    cache["teams"] = teams
    cache["generated_at"] = stamp
    cache["source"] = "TheSportsDB"
    cache["source_url"] = "https://www.thesportsdb.com/"
    cache["terms_url"] = TERMS_URL
    cache["plan"] = "free"
    cache["livescore"] = False
    cache["note"] = "بيانات من TheSportsDB (الخطة المجانية) - مباريات قادمة ونتائج منتهية فقط"
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    have_fx = sum(1 for t in teams.values() if t.get("next") or t.get("last"))
    have_sq = sum(1 for t in teams.values() if t.get("squad"))
    print("requests=%d teams=%d fixtures=%d squads=%d size=%dKB" % (
        calls, len(teams), have_fx, have_sq,
        os.path.getsize(OUT) // 1024))
    print("this run: fixtures=%d squads=%d" % (done_fx, done_sq))


if __name__ == "__main__":
    main()
