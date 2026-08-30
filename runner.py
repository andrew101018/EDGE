import os, json, hashlib, time, re, random, traceback
import requests
try:
    from feedparser import feedparser
except ImportError:
    feedparser = None
from bs4 import BeautifulSoup
from datetime import datetime
from zoneinfo import ZoneInfo
from difflib import SequenceMatcher

TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHANNEL = os.environ.get("TELEGRAM_CHANNEL_ID", "@edgefootballplatform")
OWNER_CHAT_ID = os.environ.get("OWNER_CHAT_ID", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GROQ_KEY = os.environ.get("GROQ_KEY", "")
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
FORCE = os.environ.get("FORCE", "") == "1"
STATE_FILE = "posted.json"
MAX_PER_RUN = 4
FRESH_HOURS = 8
CAIRO = ZoneInfo("Africa/Cairo")

ARABIC_SOURCES = [
    {"name": "جوجل أخبار - كرة القدم", "url": "https://news.google.com/rss/search?q=%D9%83%D8%B1%D8%A9%20%D8%A7%D9%84%D9%82%D8%AF%D9%85&hl=ar&gl=EG&ceid=AR:eg"},
    {"name": "جوجل أخبار - الأهلي والزمالك", "url": "https://news.google.com/rss/search?q=%D8%A7%D9%84%D8%A3%D9%87%D9%84%D9%8A%20OR%20%D8%A7%D9%84%D8%B2%D9%85%D8%A7%D9%84%D9%83&hl=ar&gl=EG&ceid=AR:eg"},
    {"name": "BBC Arabic Sport", "url": "https://feeds.bbci.co.uk/arabic/sport/rss.xml"},
    {"name": "Sky News Arabia", "url": "https://www.skynewsarabia.com/sports/rss.xml"},
]
ENGLISH_SOURCES = [
    {"name": "BBC Football", "url": "https://feeds.bbci.co.uk/sport/football/rss.xml"},
    {"name": "ESPN FC", "url": "https://www.espn.com/espn/rss/soccer/news"},
]
EXCLUDE = ["cricket", "كريكت", "wimbledon", "ويمبلدون", "tennis", "كرة المضرب", "boxing", "الملاكمة",
    "formula 1", "فورمولا", "rugby", "الرجبي", "baseball", "البيسبول", "hockey", "الهوكي",
    "basketball", "كرة السلة", "nba", "كرة اليد", "handball", "السباحة", "swimming", "ألعاب القوى",
    "الشطرنج", "chess", "المصارعة", "wrestling", "الدراجات", "cycling", "الجولف", "golf",
    "super bowl", "nfl", "test match", "the ashes", "grand slam", "olympic", "أولمبياد"]
FOOT = ["كرة", "كورة", "football", "soccer", "دوري", "ملعب", "مدرب", "منتخب", "أهداف", "هدف",
    "انتقال", "صفقة", "تشكيلة", "مباراة", "مباريات", "كأس", "فيفا", "يويفا", "الأهلي", "الزمالك",
    "ريال", "برشلونة", "ليفربول", "مانشستر", "تشيلسي", "أرسنال", "باريس سان", "الهلال", "النصر",
    "الاتحاد", "صلاح", "ميسي", "رونالدو", "مبابي", "هالاند", "بريميرليج", "الليجا", "كالتشيو",
    "بوندسليجا", "champions", "premier", "guardiola", "كلوب", "أنشيلوتي", "بيراميدز", "الإسماعيلي", "المصري", "الترجي", "الوداد"]

LEAGUES = {"eng.1": "الدوري الإنجليزي", "esp.1": "الدوري الإسباني", "ita.1": "الدوري الإيطالي",
    "ger.1": "الدوري الألماني", "fra.1": "الدوري الفرنسي", "ksa.1": "الدوري السعودي",
    "egy.1": "الدوري المصري", "uefa.champions": "دوري أبطال أوروبا"}
PRIORITY = ["egy.1", "ksa.1", "uefa.champions", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1"]
BIG_LEAGUES = ["eng.1", "esp.1", "uefa.champions", "egy.1", "ksa.1"]
BROADCASTERS = {"eng.1": "beIN Sports", "esp.1": "beIN Sports", "ita.1": "beIN Sports",
    "fra.1": "beIN Sports", "ger.1": "beIN Sports", "uefa.champions": "beIN Sports",
    "ksa.1": "SSC / شاهد", "egy.1": "أون تايم سبورتس"}
TEAM_AR = {"Real Madrid": "ريال مدريد", "Barcelona": "برشلونة", "Liverpool": "ليفربول",
    "Manchester City": "مانشستر سيتي", "Manchester United": "مانشستر يونايتد", "Chelsea": "تشيلسي",
    "Arsenal": "أرسنال", "Tottenham Hotspur": "توتنهام", "Paris Saint-Germain": "باريس سان جيرمان",
    "Bayern Munich": "بايرن ميونخ", "Juventus": "يوفنتوس", "Inter": "إنتر ميلان", "AC Milan": "ميلان",
    "Atlético Madrid": "أتلتيكو مدريد", "Borussia Dortmund": "بوروسيا دورتموند", "Napoli": "نابولي",
    "Aston Villa": "أستون فيلا", "Newcastle United": "نيوكاسل", "Al Ahly": "الأهلي", "Zamalek": "الزمالك",
    "Pyramids FC": "بيراميدز", "Al Hilal": "الهلال", "Al Nassr": "النصر", "Al Ittihad": "الاتحاد",
    "Al Ahli": "الأهلي السعودي", "Al Shabab": "الشباب", "Al Ettifaq": "الاتفاق", "Al Fayha": "الفيحاء",
    "Al Riyad": "الرياض", "Al Wehda": "الوحدة", "Al Qadsiah": "القادسية", "Al Khaleej": "الخليج",
    "Al Raed": "الرائد", "Al Taawoun": "التعاون", "Damac FC": "ضمك", "Al Fateh": "الفتح",
    "Ismaily": "الإسماعيلي", "Al Masry": "المصري", "Smouha": "سموحة", "ENPPI": "إنبي",
    "Ceramica Cleopatra": "سيراميكا كليوباترا", "Modern Sport": "مودرن سبورت",
    "Galatasaray": "جالاطا سراي", "Fenerbahçe": "فنربخشة", "Beşiktaş": "بشكتاش", "Benfica": "بنفيكا",
    "Porto": "بورتو", "Sporting CP": "سبورتينج لشبونة", "Ajax": "أياكس", "PSV Eindhoven": "آيندهوفن",
    "Inter Miami": "إنتر ميامي", "LAFC": "لوس أنجلوس FC", "Chicago Fire": "شيكاغو فاير", "Santos": "سانتوس"}

def ar_team(name):
    return TEAM_AR.get(name, name)

def is_football(title, summary):
    t = (title + " " + summary).lower()
    for k in EXCLUDE:
        if k.lower() in t: return False
    for k in FOOT:
        if k.lower() in t: return True
    return False

def norm_title(t):
    t = t.lower()
    t = re.sub(r'[^\w\u0600-\u06FF]+', ' ', t)
    return t.strip()[:80]

def is_dup_title(nt, recent):
    for p in recent[-200:]:
        if nt == p: return True
        if abs(len(nt) - len(p)) < 12 and SequenceMatcher(None, nt, p).ratio() > 0.9: return True
    return False

ENGAGEMENTS = [
    {"type": "poll", "q": "مين أحسن مهاجم في العالم دلوقتي؟ 🔥", "options": ["هالاند", "مبابي", "محمد صلاح", "فينيسيوس"]},
    {"type": "poll", "q": "مين الأعظم في التاريخ؟ 🐐", "options": ["ميسي", "رونالدو", "الاتنين في قلبي"]},
    {"type": "text", "t": "💡 معلومة سريعة: البرازيل أكتر منتخب كسب كأس العالم.. 5 مرات! 🇧"},
    {"type": "poll", "q": "لو انت المدرب، هتضم مين الأول؟ 💼", "options": ["مبابي", "هالاند", "بيلينجهام", "صلاح"]},
    {"type": "text", "t": "💡 معلومة سريعة: ريال مدريد نادي القرن في أوروبا.. أكتر نادي كسب الشامبيونزليج 🏆"},
    {"type": "poll", "q": "أنهي مباراة بتستناها أكتر؟ ⏰", "options": ["كلاسيكو الأرض", "ديربي البريميرليج", "ليلية الأبطال", "قمة الدوري المصري"]},
]
STYLES = [
    {"name": "المعلق الحماسي", "p": "اكتب بأسلوب معلق كرة قدم حماسي: تعجيب، طاقة عالية، عامية مصرية قوية."},
    {"name": "العاجل المختصر", "p": "اكتب بأسلوب الخبر العاجل: سطرين فقط، معلومة مباشرة، بدون أي حشو."},
    {"name": "المحلل الهادي", "p": "اكتب بأسلوب محلل كورة رزين: لغة أقرب للفصحى، نظرة تحليلية، واختم بسؤال للجمهور."},
    {"name": "الحكواتي", "p": "اكتب بأسلوب الحكواتي: افتح بتصوير المشهد كأنه قصة، ثم الخبر، عامية مصرية."},
    {"name": "الغرز الودود", "p": "اكتب بأسلوب خفيف وظريف: غرزة ودود صغيرة متعلقة بالخبر بدون إهانة أحد، ثم المعلومة."},
    {"name": "السؤال الأول", "p": "افتح الخبر بسؤال استفهام يشد القارئ، ثم أجب بالخبر، عامية مصرية."},
]
BASE_RULES = """قواعد ثابتة:
- أنت تكتب عن كرة القدم فقط
- لا تنسخ النص الأصلي حرفياً أبداً
- لا تضف معلومات غير موجودة في النص
- الأرقام والأسماء تُنقل كما هي بدون تغيير
- ممنوع أي حروف لاتينية داخل النص
- السطر الأول: عنوان جذاب مع إيموجي
- لو الخبر ليس عن كرة القدم اكتب كلمة واحدة: SKIP"""
LONG_SCRIPT_PROMPT = """أنت كاتب سيناريوهات فيديوهات كرة قدم محترف.
اكتب سكريبت فيديو طويل (3-4 دقائق) بالعامية المصرية يلخص أهم أخبار اليوم:
- مقدمة حماسية 20 ثانية
- 3-4 فقرات، كل فقرة: [المشهد:] وصف بصري / [التعليق:] كلامك بصوتك
- خاتمة: دعوة للاشتراك + سؤال للجمهور
أخبار اليوم:
"""

def hash_id(title, url):
    return hashlib.md5((title + url).encode()).hexdigest()

def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"posted": []}

def save_state(state):
    state["posted"] = state["posted"][-2000:]
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)

def translate(text):
    try:
        r = requests.get("https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": "auto", "tl": "ar", "dt": "t", "q": text[:500]}, timeout=10)
        r.raise_for_status()
        res = "".join(p[0] for p in r.json()[0] if p[0])
        bad = ["server error", "that's an error", "error 500", "try again later", "unavailable"]
        if not res or any(b in res.lower() for b in bad): return None
        return res
    except Exception:
        return None

def send_tg(text):
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHANNEL, "text": text}, timeout=15)
        if not r.ok: print("❌ Telegram error:", r.status_code)
        return r.ok
    except Exception as e:
        print("❌ Telegram exception:", e)
        return False

def send_poll(question, options):
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendPoll",
            json={"chat_id": TG_CHANNEL, "question": question, "options": [{"text": o} for o in options]}, timeout=15)
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

def call_gemini(prompt, temp):
    if not GEMINI_KEY: return None
    for model in ["gemini-2.5-flash", "gemini-2.0-flash"]:
        try:
            r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": temp}}, timeout=25)
            if r.ok:
                print("✨ Gemini:", model)
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
            print("Gemini status:", model, r.status_code)
        except Exception as e:
            print("Gemini:", e)
    return None

def call_groq(prompt, temp):
    if not GROQ_KEY: return None
    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_KEY}"},
                json={"model": model, "temperature": temp, "messages": [{"role": "user", "content": prompt}]}, timeout=25)
            if r.ok: return r.json()["choices"][0]["message"]["content"]
        except Exception:
            pass
    return None

def call_deepseek(prompt, temp):
    if not DEEPSEEK_KEY: return None
    try:
        r = requests.post("https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_KEY}"},
            json={"model": "deepseek-chat", "temperature": temp, "messages": [{"role": "user", "content": prompt}]}, timeout=25)
        if r.ok: return r.json()["choices"][0]["message"]["content"]
    except Exception:
        pass
    return None

def ai_process(title, content, is_english, forbidden=None):
    style = random.choice(STYLES)
    temp = round(random.uniform(0.9, 1.3), 2)
    print(f"🎭 ستايل: {style['name']} | حرارة: {temp}")
    fb = ""
    if forbidden:
        fb = "\nممنوع تفتح الخبر بأي من الجمل دي (اتستخدمت قبل كده):\n" + "\n".join(f"- {f}" for f in forbidden[-5:])
    task = "ترجم للعربية أولاً ثم" if is_english else ""
    prompt = f"""أنت محرر رياضي في قناة Edge Football.
{style['p']}
{BASE_RULES}{fb}

{task} أعد صياغة الخبر ده:
العنوان: {title}
المحتوى: {content[:1500]}"""
    for engine in [call_gemini, call_groq, call_deepseek]:
        result = engine(prompt, temp)
        if result and "SKIP" not in result[:20]:
            return result
    return None

def fetch_scoreboard(slug):
    try:
        r = requests.get(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard", timeout=8)
        if r.ok: return r.json()
    except Exception as e:
        print("scoreboard error:", slug, e)
    return None

def fetch_standings(slug):
    try:
        r = requests.get(f"https://site.api.espn.com/apis/v2/sports/soccer/{slug}/standings", timeout=8)
        if not r.ok: return None
        data = r.json()
        if "standings" in data and "entries" in data["standings"]: return data["standings"]["entries"]
        for ch in data.get("children", []):
            if "standings" in ch and "entries" in ch["standings"]: return ch["standings"]["entries"]
    except Exception as e:
        print("standings error:", slug, e)
    return None

def fetch_lineups(slug, event_id):
    try:
        r = requests.get(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/summary?event={event_id}", timeout=8)
        if not r.ok: return None
        out = {}
        for roster in r.json().get("rosters", []):
            team = roster.get("team", {}).get("shortDisplayName", "")
            players = [p.get("athlete", {}).get("shortName", "") for p in roster.get("rosters", []) if p.get("starter") in (True, "true")]
            players = [p for p in players if p]
            if team and players: out[team] = players[:11]
        return out or None
    except Exception:
        return None

def collect_news(state):
    posted = set(state.get("posted", []))
    recent_titles = state.get("posted_titles", [])
    fresh = []
    skipped_old = skipped_dup = 0
    for source, is_en in [(s, False) for s in ARABIC_SOURCES] + [(s, True) for s in ENGLISH_SOURCES]:
        try:
            rr = requests.get(source["url"], timeout=10, headers={"User-Agent": "EdgeFootball/1.0"})
            feed = feedparser.parse(rr.content)
            for e in feed.entries[:8]:
                title = e.get("title", "").strip()
                url = e.get("link", "")
                if not title or not url: continue
                pp = e.get("published_parsed")
                if not pp:
                    skipped_old += 1
                    continue
                if time.time() - time.mktime(pp) > FRESH_HOURS * 3600:
                    skipped_old += 1
                    continue
                summary = BeautifulSoup(e.get("summary", ""), "html.parser").get_text().strip()
                if not is_football(title, summary): continue
                h = hash_id(title, url)
                if h in posted: continue
                nt = norm_title(title)
                if is_dup_title(nt, recent_titles):
                    skipped_dup += 1
                    continue
                fresh.append({"title": title, "url": url, "summary": summary, "source": source["name"], "en": is_en, "hash": h, "nt": nt})
        except Exception as ex:
            print("fetch error:", source["name"], ex)
    print(f"🚫 قديمة: {skipped_old} | مكررة: {skipped_dup}")
    return fresh, posted, recent_titles

def finish_text(home, hs, away, as_, name):
    home, away = ar_team(home), ar_team(away)
    hs, as_ = int(hs), int(as_)
    if hs > as_: line = f"{home} خطفها وخد التلات نقاط 💪"
    elif as_ > hs: line = f"{away} قلبها وخد التلات نقاط 🔥"
    else: line = "تعادل مثير.. ولا واحد رضي بالتاني 😅"
    short = f"{home} {hs} - {as_} {away}"
    return f"🏁 نهاية المباراة | {name}\n{short}\n{line}\n\n⚽ Edge Football", short

def collect_finished(state, now):
    reported = set(state.get("reported_matches", []))
    found = []
    for slug, name in LEAGUES.items():
        data = fetch_scoreboard(slug)
        if not data: continue
        for ev in data.get("events", []):
            eid = ev.get("id")
            if not eid or eid in reported: continue
            try:
                comp = ev["competitions"][0]
                if comp["status"]["type"]["state"] != "post": continue
                start = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                if (now - start).total_seconds() > 12 * 3600:
                    reported.add(eid)
                    continue
                comps = comp["competitors"]
                home = [c for c in comps if c.get("homeAway") == "home"][0]
                away = [c for c in comps if c.get("homeAway") == "away"][0]
                full, short = finish_text(home["team"]["displayName"], home["score"], away["team"]["displayName"], away["score"], name)
                found.append((eid, full, short))
            except Exception:
                continue
    return found, reported

def check_live(state):
    live = state.get("live_scores", {})
    new_live = {}
    alerts = []
    for slug, name in LEAGUES.items():
        data = fetch_scoreboard(slug)
        if not data: continue
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                st = comp["status"]["type"]["state"]
                eid = ev.get("id")
                if st != "in": continue
                comps = comp["competitors"]
                home = [c for c in comps if c.get("homeAway") == "home"][0]
                away = [c for c in comps if c.get("homeAway") == "away"][0]
                hs, as_ = home["score"], away["score"]
                hn, an = ar_team(home["team"]["displayName"]), ar_team(away["team"]["displayName"])
                key = f"{hs}-{as_}"
                prev = live.get(eid)
                new_live[eid] = key
                if prev is None:
                    alerts.append(f"🟢 انطلقت المباراة!\n{hn} × {an} ({name})\nياللا بينا.. الليلة ليلة 🔥\n\n⚽ Edge Football")
                elif prev != key:
                    alerts.append(f"⚠️ جوووول!\n{hn} {hs} - {as_} {an} ({name})\nالمباراة شغالة والجو نار 🔥\n\n⚽ Edge Football")
            except Exception:
                continue
    state["live_scores"] = new_live
    return alerts

def collect_previews(state, now):
    previewed = set(state.get("previewed", []))
    found = []
    for slug in BIG_LEAGUES:
        data = fetch_scoreboard(slug)
        if not data: continue
        for ev in data.get("events", []):
            eid = ev.get("id")
            if not eid or eid in previewed: continue
            try:
                comp = ev["competitions"][0]
                if comp["status"]["type"]["state"] != "pre": continue
                dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                if not (0.5 <= (dt - now).total_seconds() / 3600 <= 4): continue
                comps = comp["competitors"]
                home = ar_team([c for c in comps if c.get("homeAway") == "home"][0]["team"]["displayName"])
                away = ar_team([c for c in comps if c.get("homeAway") == "away"][0]["team"]["displayName"])
                found.append((eid, slug, home, away, dt))
            except Exception:
                continue
    return found, previewed

def build_preview(slug, home, away, dt, event_id):
    lines = [f"🔥 الليلة | {LEAGUES[slug]}", f"⚽ {home} × {away} — {dt.strftime('%I:%M %p')}", ""]
    lineups = fetch_lineups(slug, event_id)
    if lineups:
        for team, players in list(lineups.items())[:2]:
            lines.append(f"🧤 تشكيل {ar_team(team)}:")
            lines.append("، ".join(players))
            lines.append("")
    else:
        lines.append("قمة نار مستنية الكل.. مين هيكسب برأيك؟ 🤔")
        lines.append("")
    lines.append("يلا نتوقع النتيجة في الكومنتات 👇")
    lines.append("⚽ Edge Football")
    return "\n".join(lines)

def top_table(slug, n=8):
    entries = fetch_standings(slug)
    if not entries: return None
    rows = []
    for e in entries:
        try:
            stats = {s["name"]: s.get("value") for s in e.get("stats", [])}
            rows.append({"rank": int(float(stats.get("rank", 99))),
                "team": ar_team(e.get("team", {}).get("displayName", "")),
                "logo": e.get("team", {}).get("logo", ""),
                "gp": stats.get("gamesPlayed", "-"), "w": stats.get("wins", "-"),
                "d": stats.get("ties", stats.get("draws", "-")), "l": stats.get("losses", "-"),
                "pts": stats.get("points", "-")})
        except Exception:
            continue
    rows.sort(key=lambda x: x["rank"])
    return rows[:n]

def build_digest(state, today):
    news = [x["t"] for x in state.get("daily_news", []) if x["d"] == today]
    results = [x["t"] for x in state.get("daily_results", []) if x["d"] == today]
    lines = ["🌙 نشرة الليل | أهم ما فاتك النهارده", ""]
    if news:
        lines.append("📰 الأخبار:")
        lines += [f"• {t}" for t in news[:5]]
        lines.append("")
    if results:
        lines.append("🏁 النتائج:")
        lines += [f"• {t}" for t in results[:8]]
        lines.append("")
        for slug in ["eng.1", "esp.1", "egy.1"]:
            t = top_table(slug, 5)
            if t:
                lines.append(f"🏆 {LEAGUES[slug]}:")
                lines += [f"{r['rank']}. {r['team']} — {r['pts']} نقطة" for r in t]
                lines.append("")
    if len(lines) <= 3: return None
    lines.append("تصبحوا على كورة 😴 Edge Football")
    return "\n".join(lines)

def build_schedule(today):
    lines = ["📅 مواعيد مباريات اليوم ⚽", ""]
    total = 0
    for slug, name in LEAGUES.items():
        data = fetch_scoreboard(slug)
        if not data: continue
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                if comp["status"]["type"]["state"] != "pre": continue
                dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                if dt.strftime("%Y-%m-%d") != today: continue
                comps = comp["competitors"]
                home = ar_team([c for c in comps if c.get("homeAway") == "home"][0]["team"]["displayName"])
                away = ar_team([c for c in comps if c.get("homeAway") == "away"][0]["team"]["displayName"])
                lines.append(f"⏰ {dt.strftime('%I:%M %p')} | {home} × {away} ({name})")
                total += 1
            except Exception:
                continue
    if total == 0: return None
    return "\n".join(lines) + "\n\n⚽ Edge Football"

def post_engagement(state):
    idx = state.get("engagement_index", 0) % len(ENGAGEMENTS)
    item = ENGAGEMENTS[idx]
    ok = send_poll(item["q"], item["options"]) if item["type"] == "poll" else send_tg(item["t"] + "\n\n⚽ Edge Football")
    if ok:
        state["engagement_index"] = idx + 1
        print("✅ نُشر منشور تفاعل")

def fetch_world():
    out = []
    for slug in PRIORITY:
        try:
            r = requests.get(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/news", timeout=8)
            if not r.ok: continue
            arts = r.json().get("articles") or r.json().get("feed") or r.json().get("headlines") or []
            for a in arts[:3]:
                title = a.get("headline") or a.get("title") or ""
                imgs = a.get("images") or []
                img = (imgs[0].get("url") or imgs[0].get("href")) if imgs else (a.get("image") or "")
                if title: out.append({"t": title, "img": img or ""})
        except Exception:
            pass
    if not out:
        try:
            r = requests.get("https://www.thesportsdb.com/api/v1/json/123/latest_soccer.php", timeout=8)
            if r.ok:
                for n in (r.json().get("news") or [])[:12]:
                    t = n.get("strHeadline") or ""
                    if t: out.append({"t": t, "img": n.get("strThumb") or ""})
        except Exception:
            pass
    return out

def build_site_data(state, today):
    now = datetime.now(CAIRO)
    matches = []
    for slug in PRIORITY:
        data = fetch_scoreboard(slug)
        if not data: continue
        group = {"league": LEAGUES[slug], "slug": slug, "items": [], "big": True}
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                st = comp["status"]["type"]["state"]
                dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                hrs = (now - dt).total_seconds() / 3600
                if st == "post" and hrs > 24: continue
                if st == "pre" and hrs < -72: continue
                comps = comp["competitors"]
                home = [c for c in comps if c.get("homeAway") == "home"][0]
                away = [c for c in comps if c.get("homeAway") == "away"][0]
                group["items"].append({
                    "home": ar_team(home["team"]["displayName"]), "away": ar_team(away["team"]["displayName"]),
                    "eid": ev.get("id"), "slug": slug,
                    "homeLogo": home["team"].get("logo", ""), "awayLogo": away["team"].get("logo", ""),
                    "tv": BROADCASTERS.get(slug, ""), "hs": home["score"], "as": away["score"],
                    "time": dt.strftime("%I:%M %p"), "state": st,
                    "detail": comp["status"]["type"].get("shortDetail", "")})
            except Exception:
                continue
        if group["items"]:
            group["items"].sort(key=lambda x: {"in": 0, "post": 1, "pre": 2}.get(x["state"], 3))
            matches.append(group)
    tables = {}
    for slug in PRIORITY:
        t = top_table(slug, 8)
        if t: tables[LEAGUES[slug]] = t
    leaders = {}
    for slug in PRIORITY:
        try:
            r = requests.get(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/leaders", timeout=8)
            if not r.ok: continue
            cats = {}
            for cat in r.json().get("leaders", []):
                label = cat.get("displayName") or "الأفضل"
                items = []
                for e in (cat.get("leaders") or cat.get("entries") or [])[:10]:
                    a = e.get("athlete", {}) or {}
                    items.append({"name": a.get("displayName", ""),
                        "team": ar_team((a.get("team", {}) or {}).get("displayName", "")),
                        "value": e.get("displayValue", e.get("value", "")),
                        "face": (a.get("headshot", {}) or {}).get("href", "")})
                if items: cats[label] = items
            if cats: leaders[LEAGUES[slug]] = cats
        except Exception:
            pass
    site_data = {
        "updated_at": now.strftime("%Y-%m-%d %I:%M %p"),
        "news": state.get("site_news", [])[-20:][::-1],
        "results": [x["t"] for x in state.get("daily_results", []) if x["d"] == today][-10:][::-1],
        "matches": matches, "tables": tables, "leaders": leaders,
        "world": fetch_world(), "highlights": [],
    }
    os.makedirs("site", exist_ok=True)
    with open("site/data.json", "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)
    print("🌐 تم تحديث بيانات الموقع")

def make_publish_package(news_lines):
    prompt = f"""انت خبير سوشيال ميديا رياضي. اكتب باقة نشر جاهزة لفيديو كورة عن الأخبار دي:
{news_lines}

بالشكل ده بالظبط:
🎬 عنوان يوتيوب: (عنوان عربي جذاب فيه إيموجي ورقم)
🎵 عنوان تيك توك: (جملة قصيرة استفزازية بتوقف السكرول)
📝 وصف: سطرين + دعوة للاشتراك
#️⃣ هاشتاجات: 12 هاشتاج عربي وإنجليزي بمسافات"""
    return call_gemini(prompt, 0.9) or call_groq(prompt, 0.9)

def main():
    state = load_state()
    now = datetime.now(CAIRO)
    today = now.strftime("%Y-%m-%d")
    openers = state.get("last_openers", [])
    send_owner(f"🟢 بدأت الجولة | {now.strftime('%H:%M')}")
    report = []

    fresh, posted, recent_titles = collect_news(state)
    print(f"📥 أخبار جديدة: {len(fresh)}")
    count = 0
    for item in fresh:
        if count >= MAX_PER_RUN: break
        title, summary = item["title"], item["summary"]
        if item["en"]:
            title = translate(title) or title
            summary = translate(summary) or summary
        content = ai_process(title, summary, item["en"], openers)
        if not content and not item["en"]:
            content = f"⚽ {title}\n\n{summary[:300]}"
        if not content:
            print("⚠️ تجاوز:", item["title"][:40])
            posted.add(item["hash"])
            continue
        content += f"\n\n📡 المصدر: {item['source']}"
        if send_tg(content):
            print("✅ نُشر:", title[:40])
            posted.add(item["hash"])
            recent_titles.append(item["nt"])
            openers.append(content.splitlines()[0][:80])
            state.setdefault("site_news", []).append({"t": content.splitlines()[0][:100], "img": ""})
            state.setdefault("daily_news", []).append({"d": today, "t": content.splitlines()[0][:80]})
            count += 1
            time.sleep(5)
    report.append(f"📰 أخبار: {count}")
    state["posted"] = list(posted)
    state["posted_titles"] = recent_titles[-500:]
    state["last_openers"] = openers[-5:]
    state["site_news"] = state.get("site_news", [])[-20:]

    if FORCE or (18 <= now.hour <= 23 and state.get("last_long_date") != today):
        news_today = [x["t"] for x in state.get("daily_news", []) if x["d"] == today]
        if news_today:
            prompt = LONG_SCRIPT_PROMPT + "\n".join(f"- {t}" for t in news_today[:6])
            script = call_gemini(prompt, 1.0) or call_groq(prompt, 1.0)
            if script and send_owner("🎥 سكريبت فيديو اليوم:\n\n" + script):
                print("📩 اتبعت سكريبت الفيديو")
                pkg = make_publish_package("\n".join(f"- {t}" for t in news_today[:6]))
                if pkg and send_owner("📦 باقة النشر (تيك توك + يوتيوب):\n\n" + pkg):
                    print("📦 اتبعتت باقة النشر")
                if not FORCE: state["last_long_date"] = today

    alerts = check_live(state)
    print(f"🟢 تنبيهات لايف: {len(alerts)}")
    a_sent = 0
    for text in alerts:
        if a_sent >= 3: break
        if send_tg(text):
            a_sent += 1
            time.sleep(4)
    report.append(f"🟢 لايف: {a_sent}")

    found, reported = collect_finished(state, now)
    print(f"🏁 نتائج جديدة: {len(found)}")
    sent = 0
    for eid, full, short in found:
        if sent >= 4: break
        if send_tg(full):
            print("✅ نُشرت نتيجة")
            reported.add(eid)
            state.setdefault("daily_results", []).append({"d": today, "t": short})
            sent += 1
            time.sleep(4)
    report.append(f"🏁 نتائج: {sent}")
    state["reported_matches"] = list(reported)[-500:]

    if FORCE or 17 <= now.hour <= 21:
        previews, previewed = collect_previews(state, now)
        p_sent = 0
        for eid, slug, home, away, dt in previews:
            if p_sent >= 2: break
            if send_tg(build_preview(slug, home, away, dt, eid)):
                previewed.add(eid)
                p_sent += 1
                time.sleep(4)
        state["previewed"] = list(previewed)[-300:]

    if FORCE or (8 <= now.hour <= 12):
        if FORCE or state.get("last_schedule_date") != today:
            sched = build_schedule(today)
            if sched and send_tg(sched):
                print("✅ نُشرت نشرة المواعيد")
                if not FORCE: state["last_schedule_date"] = today

    if FORCE or (21 <= now.hour <= 23):
        if FORCE or state.get("last_digest_date") != today:
            digest = build_digest(state, today)
            if digest and send_tg(digest):
                print("✅ نُشرت نشرة الليل")
                send_tg("🎮 لعبت توقعات النهارده؟\nتوقع واكسب نقاط ضد أصحابك ⚽\n🌐 https://andrew101018.github.io/EDGE/")
                if not FORCE: state["last_digest_date"] = today

    last_eng = state.get("last_engagement", 0)
    if FORCE or (10 <= now.hour <= 23 and time.time() - last_eng >= 2 * 3600):
        post_engagement(state)
        if not FORCE: state["last_engagement"] = time.time()

    state["daily_news"] = [x for x in state.get("daily_news", []) if x["d"] == today][-20:]
    state["daily_results"] = [x for x in state.get("daily_results", []) if x["d"] == today][-20:]

    build_site_data(state, today)
    save_state(state)

    report.append(f"📁 data.json: ✅ {os.path.getsize('site/data.json')} بايت")
    report.append(f"🕐 تحديث: {datetime.now(CAIRO).strftime('%I:%M %p')}")
    report.append("🏁 انتهت الجولة")
    msg = "\n".join(report)
    send_owner(msg)
    print(msg)

if __name__ == "__main__":
    try:
        main()
    except Exception:
        tb = traceback.format_exc()
        print(tb)
        send_owner("🚨 البوت وقع:\n" + tb[-800:])
        raise