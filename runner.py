import os, json, hashlib, time, re, random, asyncio, subprocess, importlib
import traceback
import requests
try:
    import feedparser  # type: ignore[import-not-found]
except ImportError:
    feedparser = None
try:
    from bs4 import BeautifulSoup  # type: ignore[import-not-found]
except ImportError:
    BeautifulSoup = None
from datetime import datetime
from zoneinfo import ZoneInfo
from difflib import SequenceMatcher


class GoogleTranslator:
    """Small dependency-free replacement for deep_translator.GoogleTranslator."""
    def __init__(self, source="auto", target="ar"):
        self.source = source
        self.target = target

    def translate(self, text):
        response = requests.get(
            "https://translate.googleapis.com/translate_a/single",
            params={
                "client": "gtx",
                "sl": self.source,
                "tl": self.target,
                "dt": "t",
                "q": text,
            },
            timeout=15,
        )
        response.raise_for_status()
        return "".join(part[0] for part in response.json()[0] if part[0])

TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHANNEL = os.environ.get("TELEGRAM_CHANNEL_ID", "@edgefootballplatform")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GROQ_KEY = os.environ.get("GROQ_KEY", "")
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_KEY", "")
MISTRAL_KEY = os.environ.get("MISTRAL_KEY", "")
CEREBRAS_KEY = os.environ.get("CEREBRAS_KEY", "")
FORCE = os.environ.get("FORCE", "") == "1"
OWNER_CHAT_ID = os.environ.get("OWNER_CHAT_ID", "").strip()

STATE_FILE = "posted.json"
MAX_PER_RUN = 6
FRESH_HOURS = 4
CAIRO = ZoneInfo("Africa/Cairo")

ARABIC_SOURCES = [
    "https://news.google.com/rss/search?q=%D9%83%D8%B1%D8%A9%20%D8%A7%D9%84%D9%82%D8%AF%D9%85&hl=ar&gl=EG&ceid=AR:eg",
    "https://news.google.com/rss/search?q=%D8%A7%D9%84%D8%A3%D9%87%D9%84%D9%8A%20OR%20%D8%A7%D9%84%D8%B2%D9%85%D8%A7%D9%84%D9%83&hl=ar&gl=EG&ceid=AR:eg",
    "https://feeds.bbci.co.uk/arabic/sport/rss.xml",
    "https://www.skynewsarabia.com/sports/rss.xml"
]



ENGLISH_SOURCES = [
    {"name": "BBC Football", "url": "https://feeds.bbci.co.uk/sport/football/rss.xml"},
    {"name": "Sky Sports Football", "url": "https://www.skysports.com/rss/12040"},
    {"name": "ESPN FC", "url": "https://www.espn.com/espn/rss/soccer/news"},
    {"name": "The Guardian Football", "url": "https://www.theguardian.com/football/rss"},
]

EXCLUDE_KEYWORDS = [
    "cricket", "كريكت", "wimbledon", "ويمبلدون", "tennis", "كرة المضرب",
    "boxing", "الملاكمة", "formula 1", "فورمولا", "rugby", "الرجبي",
    "baseball", "البيسبول", "hockey", "الهوكي", "basketball", "كرة السلة",
    "nba", "كرة اليد", "handball", "السباحة", "swimming", "ألعاب القوى",
    "الشطرنج", "chess", "المصارعة", "wrestling", "الدراجات", "cycling",
    "الجولف", "golf", "super bowl", "nfl", "test match", "the ashes",
    "grand slam",
]

FOOTBALL_KEYWORDS = [
    "كرة", "كورة", "football", "soccer", "دوري", "ملعب", "مدرب", "منتخب",
    "أهداف", "هدف", "انتقال", "صفقة", "تشكيلة", "مباراة", "مباريات", "كأس",
    "فيفا", "يويفا", "الأهلي", "الزمالك", "ريال", "برشلونة", "ليفربول",
    "مانشستر", "تشيلسي", "أرسنال", "باريس سان", "الهلال", "النصر", "الاتحاد",
    "صلاح", "ميسي", "رونالدو", "مبابي", "هالاند", "بريميرليج", "الليجا",
    "كالتشيو", "بوندسليجا", "champions", "premier", "guardiola", "كلوب",
    "أنشيلوتي", "بيراميدز", "الإسماعيلي", "المصري", "الترجي", "الوداد",
]

def is_football(title, summary):
    t = (title + " " + summary).lower()
    for k in EXCLUDE_KEYWORDS:
        if k.lower() in t:
            return False
    for k in FOOTBALL_KEYWORDS:
        if k.lower() in t:
            return True
    return False

def norm_title(t):
    t = t.lower()
    t = re.sub(r'[^\w\u0600-\u06FF]+', ' ', t)
    return t.strip()[:80]

def is_dup_title(nt, recent):
    for p in recent[-200:]:
        if nt == p:
            return True
        if abs(len(nt) - len(p)) < 12 and SequenceMatcher(None, nt, p).ratio() > 0.9:
            return True
    return False

LEAGUES = {
    "eng.1": "الدوري الإنجليزي", "eng.2": "تشامبيونشيب",
    "esp.1": "الدوري الإسباني", "ita.1": "الدوري الإيطالي",
    "ger.1": "الدوري الألماني", "fra.1": "الدوري الفرنسي",
    "por.1": "الدوري البرتغالي", "ned.1": "الدوري الهولندي",
    "tur.1": "الدوري التركي", "sco.1": "الدوري الاسكتلندي",
    "bel.1": "الدوري البلجيكي", "gre.1": "الدوري اليوناني",
    "ksa.1": "الدوري السعودي", "egy.1": "الدوري المصري",
    "uae.1": "دوري الإمارات", "mar.1": "الدوري المغربي",
    "tun.1": "الدوري التونسي", "usa.1": "الدوري الأمريكي",
    "bra.1": "الدوري البرازيلي", "arg.1": "الدوري الأرجنتيني",
    "uefa.champions": "دوري أبطال أوروبا", "uefa.europa": "الدوري الأوروبي",
    "fifa.world": "كأس العالم",
}
BIG_LEAGUES = ["eng.1", "esp.1", "uefa.champions", "egy.1", "ksa.1"]
IMPORTANT = ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1",
             "ksa.1", "egy.1", "uefa.champions", "uefa.europa"]
BROADCASTERS = {
    "eng.1": ("beIN Sports", "https://www.bein.com/ar/"),
    "esp.1": ("beIN Sports", "https://www.bein.com/ar/"),
    "ita.1": ("beIN Sports", "https://www.bein.com/ar/"),
    "fra.1": ("beIN Sports", "https://www.bein.com/ar/"),
    "ger.1": ("beIN Sports", "https://www.bein.com/ar/"),
    "uefa.champions": ("beIN Sports", "https://www.bein.com/ar/"),
    "uefa.europa": ("beIN Sports", "https://www.bein.com/ar/"),
    "ksa.1": ("SSC / شاهد", "https://shahid.mbc.com/ar"),
    "egy.1": ("أون تايم سبورتس", "https://www.facebook.com/ONTimesports"),
    "por.1": ("Sport TV", "https://www.sporttv.pt"),
}

def send_tg(text):
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHANNEL, "text": text}, timeout=15)
        return r.ok
    except Exception:
        return False

def send_owner(text):
    if not OWNER_CHAT_ID: return False
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": OWNER_CHAT_ID, "text": text}, timeout=15)
        return r.ok
    except Exception:
        return False

def call_gemini(prompt, temp=0.9):
    if not GEMINI_KEY: return None
    for model in ["gemini-2.5-flash", "gemini-2.0-flash"]:
        try:
            r = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}],
                      "generationConfig": {"temperature": temp}}, timeout=25)
            if r.ok:
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            pass
    return None

def call_groq(prompt, temp=0.9):
    if not GROQ_KEY: return None
    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_KEY}"},
                json={"model": model, "temperature": temp,
                      "messages": [{"role": "user", "content": prompt}]}, timeout=25)
            if r.ok:
                return r.json()["choices"][0]["message"]["content"]
        except Exception:
            pass
    return None

def ai_rewrite(title, summary, en=False):
    task = "ترجم للعربية ثم" if en else ""
    prompt = f"""أنت محرر رياضي. اكتب بأسلوب معلق مصري حماسي.
{task} أعد صياغة:
العنوان: {title}
المحتوى: {summary[:1200]}
- لا تنسخ حرفياً
- السطر الأول: عنوان جذاب مع إيموجي
- بعدين سطرين عامية مصرية
- لو مش كورة اكتب: SKIP"""
    return call_gemini(prompt) or call_groq(prompt)

def fetch_scoreboard(slug):
    try:
        r = requests.get(
            f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard",
            timeout=8)
        if r.ok: return r.json()
    except Exception:
        pass
    return None

def top_table(slug, n=8):
    try:
        r = requests.get(
            f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/standings",
            timeout=8)
        if not r.ok: return None
        d = r.json()
        entries = (d.get("standings", {}).get("entries")) or []
        if not entries:
            for ch in d.get("children", []):
                entries = ch.get("standings", {}).get("entries") or []
                if entries: break
        rows = []
        for e in entries:
            stats = {s["name"]: s.get("value") for s in e.get("stats", [])}
            rows.append({
                "rank": int(float(stats.get("rank", 99))),
                "team": e.get("team", {}).get("displayName", ""),
                "logo": e.get("team", {}).get("logo", ""),
                "gp": stats.get("gamesPlayed", "-"),
                "w": stats.get("wins", "-"),
                "d": stats.get("ties", stats.get("draws", "-")),
                "l": stats.get("losses", "-"),
                "pts": stats.get("points", "-"),
            })
        rows.sort(key=lambda x: x["rank"])
        return rows[:n]
    except Exception:
        return None

def fetch_world():
    out = []
    for slug in ["eng.1", "esp.1", "ita.1", "ger.1", "ksa.1", "egy.1", "uefa.champions"]:
        try:
            r = requests.get(
                f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/news",
                timeout=8)
            if not r.ok: continue
            d = r.json()
            arts = d.get("articles") or d.get("feed") or d.get("headlines") or []
            for a in arts[:3]:
                title = a.get("headline") or a.get("title") or ""
                imgs = a.get("images") or []
                img = (imgs[0].get("url") or imgs[0].get("href")) if imgs else ""
                if not img and a.get("image"):
                    img = a.get("image")
                if title:
                    out.append({"t": title, "img": img or ""})
        except Exception:
            pass
    if not out:
        try:
            r = requests.get("https://www.thesportsdb.com/api/v1/json/123/latest_soccer.php", timeout=8)
            if r.ok:
                for n in (r.json().get("news") or [])[:12]:
                    t = n.get("strHeadline") or ""
                    if t:
                        out.append({"t": t, "img": n.get("strThumb") or ""})
        except Exception:
            pass
    return out

def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"posted": [], "site_news": [], "daily_results": []}

def save_state(state):
    state["posted"] = state["posted"][-2000:]
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)

def main():
    state = load_state()
    now = datetime.now(CAIRO)
    today = now.strftime("%Y-%m-%d")
    posted = set(state["posted"])

    send_owner(f"🟢 بدأت الجولة المصغرة | {now.strftime('%H:%M')}")
    report = [f"🟢 بدأت | {now.strftime('%H:%M')}"]

    # ========== الأخبار ==========
    news_count = 0
    for url in ARABIC_SOURCES:
        if news_count >= 3: break
        try:
            rr = requests.get(url, timeout=10, headers={"User-Agent": "EdgeFootball/1.0"})
            feed = feedparser.parse(rr.content)
            for e in feed.entries[:4]:
                title = e.get("title", "").strip()
                url_e = e.get("link", "")
                if not title or not url_e: continue
                h = hashlib.md5((title + url_e).encode()).hexdigest()
                if h in posted: continue
                summary = BeautifulSoup(e.get("summary", ""), "html.parser").get_text().strip()
                draft = ai_rewrite(title, summary)
                if not draft or "SKIP" in draft[:20]:
                    draft = f"⚽ {title}\n\n{summary[:300]}"
                if send_tg(draft + "\n\n📡 Edge Football"):
                    print("✅ نُشر:", title[:40])
                    news_count += 1
                    posted.add(h)
                    state.setdefault("site_news", []).append(
                        {"t": draft.splitlines()[0][:100], "img": ""})
                    time.sleep(4)
                if news_count >= 3: break
        except Exception as ex:
            print("news error:", ex)
    report.append(f"📰 أخبار: {news_count}")

    # ========== المباريات ==========
    matches = []
    for slug, name in LEAGUES.items():
        data = fetch_scoreboard(slug)
        if not data: continue
        group = {"league": name, "slug": slug, "items": [], "big": True}
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                st = comp["status"]["type"]["state"]
                detail = comp["status"]["type"].get("shortDetail", "")
                dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                hrs = (now - dt).total_seconds() / 3600
                if st == "post" and hrs > 24: continue
                if st == "pre" and hrs < -72: continue
                comps = comp["competitors"]
                home = [c for c in comps if c.get("homeAway") == "home"][0]
                away = [c for c in comps if c.get("homeAway") == "away"][0]
                group["items"].append({
                    "home": home["team"]["displayName"],
                    "away": away["team"]["displayName"],
                    "eid": ev.get("id"),
                    "slug": slug,
                    "homeLogo": home["team"].get("logo", ""),
                    "awayLogo": away["team"].get("logo", ""),
                    "tv": BROADCASTERS.get(slug, ""),
                    "hs": home["score"], "as": away["score"],
                    "time": dt.strftime("%I:%M %p"),
                    "state": st, "detail": detail,
                })
            except Exception:
                continue
        if group["items"]:
            group["items"].sort(key=lambda x: {"in": 0, "post": 1, "pre": 2}.get(x["state"], 3))
            matches.append(group)
        PRIORITY = ["egy.1", "ksa.1", "uefa.champions", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1"]
    matches.sort(key=lambda g: PRIORITY.index(g["slug"]) if g.get("slug") in PRIORITY else 99)
    total_matches = sum(len(g["items"]) for g in matches)
    report.append(f"⚽ مباريات: {total_matches}")

    # ========== ترتيب الدوريات ==========
    tables = {}
    for slug, name in LEAGUES.items():
        t = top_table(slug, 8)
        if t:
            tables[name] = t

    # ========== الهدافون ==========
    leaders = {}
    for slug, name in LEAGUES.items():
        try:
            r = requests.get(
                f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/leaders",
                timeout=8)
            if not r.ok: continue
            d = r.json()
            cats = {}
            for cat in d.get("leaders", []):
                label = cat.get("displayName") or "الأفضل"
                items = []
                entries = cat.get("leaders") or cat.get("entries") or []
                for e in entries[:10]:
                    a = e.get("athlete", {}) or {}
                    items.append({
                        "name": a.get("displayName", ""),
                        "team": (a.get("team", {}) or {}).get("displayName", ""),
                        "value": e.get("displayValue", e.get("value", "")),
                        "face": (a.get("headshot", {}) or {}).get("href", ""),
                    })
                if items:
                    cats[label] = items
            if cats:
                leaders[name] = cats
        except Exception:
            pass

    # ========== بناء الموقع ==========
    site_data = {
        "updated_at": now.strftime("%Y-%m-%d %I:%M %p"),
        "news": state.get("site_news", [])[-20:],
        "results": [x["t"] for x in state.get("daily_results", []) if x.get("d") == today][-10:],
        "matches": matches,
        "tables": tables,
        "leaders": leaders,
        "world": fetch_world(),
        "highlights": [],
    }
    os.makedirs("site", exist_ok=True)
    with open("site/data.json", "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)

    state["posted"] = list(posted)
    state["site_news"] = state.get("site_news", [])[-20:]
    save_state(state)

    # ========== التقرير ==========
    report.append(f"📁 site/data.json: ✅ ({os.path.getsize('site/data.json')} بايت)")
    report.append(f"🕐 آخر تحديث: {site_data['updated_at']}")
    report.append("🏁 انتهت الجولة المصغرة")
    send_owner("\n".join(report))
    print("\n".join(report))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        tb = traceback.format_exc()
        print(tb)
        try:
            send_owner("🚨 البوت وقع:\n" + tb[-900:])
        except Exception:
            pass
        raise