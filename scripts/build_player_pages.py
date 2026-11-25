#!/usr/bin/env python3
"""Build static player pages (idea #3) under players/.

One fixed URL per player found in data.json leaders (the site's existing
players guide). Pages are client-rendered from site/data.json, same
architecture as the homepage and team pages, so stats stay fresh with the
refresh job. No hardcoded stats. Run from the repo root:

    python3 scripts/build_player_pages.py [path/to/data.json]
"""
import json
import os
import re
import sys
import unicodedata

SITE = "https://andrew101018.github.io/EDGE"

# The 19 big-team pages (idea #2): slug + aliases, kept in sync with
# scripts/build_team_pages.py so player pages can link to team pages.
BIG_TEAMS = [
    ("al-ahly", "الأهلي", ["الأهلي", "الاهلي", "Al Ahly", "Al-Ahly", "Al Ahly SC"]),
    ("zamalek", "الزمالك", ["الزمالك", "Zamalek", "El Zamalek", "Zamalek SC"]),
    ("pyramids", "بيراميدز", ["بيراميدز", "Pyramids", "Pyramids FC"]),
    ("arsenal", "أرسنال", ["أرسنال", "ارسنال", "Arsenal", "Arsenal FC"]),
    ("man-city", "مانشستر سيتي", ["مانشستر سيتي", "Manchester City", "Man City", "Man. City"]),
    ("man-united", "مانشستر يونايتد", ["مانشستر يونايتد", "Manchester United", "Man Utd", "Man United", "Manchester Utd"]),
    ("liverpool", "ليفربول", ["ليفربول", "Liverpool", "Liverpool FC"]),
    ("chelsea", "تشيلسي", ["تشيلسي", "Chelsea", "Chelsea FC"]),
    ("tottenham", "توتنهام", ["توتنهام", "Tottenham", "Tottenham Hotspur", "Spurs"]),
    ("real-madrid", "ريال مدريد", ["ريال مدريد", "Real Madrid", "Real Madrid CF"]),
    ("barcelona", "برشلونة", ["برشلونة", "Barcelona", "FC Barcelona"]),
    ("atletico-madrid", "أتلتيكو مدريد", ["أتلتيكو مدريد", "اتلتيكو مدريد", "Atlético", "Atlético Madrid", "Atletico Madrid", "Atlético de Madrid"]),
    ("bayern", "بايرن ميونخ", ["بايرن ميونخ", "بايرن ميونيخ", "بايرن", "Bayern", "Bayern Munich", "FC Bayern", "Bayern München"]),
    ("dortmund", "بوروسيا دورتموند", ["بوروسيا دورتموند", "دورتموند", "Borussia Dortmund", "Dortmund", "BVB"]),
    ("juventus", "يوفنتوس", ["يوفنتوس", "Juventus", "Juve"]),
    ("inter", "إنتر ميلان", ["إنتر", "إنتر ميلان", "انتر ميلان", "Inter", "Inter Milan", "Internazionale", "Inter Milano"]),
    ("milan", "ميلان", ["ميلان", "ميلانو", "Milan", "AC Milan", "A.C. Milan"]),
    ("napoli", "نابولي", ["نابولي", "Napoli", "SSC Napoli"]),
    ("psg", "باريس سان جيرمان", ["باريس سان جيرمان", "PSG", "Paris Saint-Germain", "Paris SG", "Paris Saint Germain"]),
]


def norm(s):
    return (s or "").strip().replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").lower()


def slugify(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "player"


def collect_players(data):
    """name -> {'teams': [...], 'first_league': str} preserving data order."""
    players = {}
    for league, cats in (data.get("leaders") or {}).items():
        for _label, items in (cats or {}).items():
            for p in items or []:
                nm = (p.get("name") or "").strip()
                if not nm:
                    continue
                e = players.setdefault(nm, {"teams": [], "first_league": league})
                t = (p.get("team") or "").strip()
                if t and t not in e["teams"]:
                    e["teams"].append(t)
    return players


# Entries whose numbers failed verification against current provider data
# (FBref 2026-2027) are withheld, not published. Haaland Nations League row:
# site lists 8 goals, FBref 2026-27 NL shows 6 in 6 (checked 25-11-2026).
WITHHOLD = {
    "Erling Haaland": ["دوري الأمم الأوروبية"],
}


def render_page(name, slug, big_teams_json):
    player_json = json.dumps(
        {"name": name, "slug": slug, "hide": WITHHOLD.get(name, [])},
        ensure_ascii=False)
    esc_name = name.replace("{", "{{").replace("}", "}}")
    return PAGE.format(
        name=esc_name,
        slug=slug,
        site=SITE,
        player_json=player_json,
        big_teams_json=big_teams_json,
    )


def main():
    data_path = sys.argv[1] if len(sys.argv) > 1 else "site/data.json"
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)
    players = collect_players(data)

    slugs = {}
    used = set()
    for name in players:
        s = slugify(name)
        base, i = s, 2
        while s in used:
            s = f"{base}-{i}"
            i += 1
        used.add(s)
        slugs[name] = s

    big = {norm(a): slug for slug, _n, aliases in BIG_TEAMS for a in aliases}
    big_json = json.dumps(big, ensure_ascii=False)

    os.makedirs("players", exist_ok=True)
    for name, slug in slugs.items():
        html = render_page(name, slug, big_json)
        with open(os.path.join("players", slug + ".html"), "w", encoding="utf-8") as f:
            f.write(html)

    known = {norm(name): slug for name, slug in slugs.items()}
    with open(os.path.join("players", "index.html"), "w", encoding="utf-8") as f:
        f.write(INDEX.format(site=SITE, known_json=json.dumps(known, ensure_ascii=False)))
    print(f"wrote {len(slugs)} player pages + players/index.html")
    for n in list(slugs)[:5]:
        print(" ", slugs[n], "<-", n)


# Templates live in sibling files to keep this script readable.
_HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_HERE, "player_page_template.html"), encoding="utf-8") as _f:
    PAGE = _f.read()
with open(os.path.join(_HERE, "players_index_template.html"), encoding="utf-8") as _f:
    INDEX = _f.read()


if __name__ == "__main__":
    main()
