import os, json, hashlib, time, re, random, asyncio, subprocess, importlib
import requests
import feedparser
from bs4 import BeautifulSoup
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
            timeout=30,
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

STATE_FILE = "posted.json"
MAX_PER_RUN = 5
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

# ============================================
# ️ ترجمة أسماء الفرق (جديد v8)
# ============================================
TEAM_AR = {
    "Real Madrid": "ريال مدريد", "Barcelona": "برشلونة", "Liverpool": "ليفربول",
    "Manchester City": "مانشستر سيتي", "Manchester United": "مانشستر يونايتد",
    "Chelsea": "تشيلسي", "Arsenal": "أرسنال", "Tottenham Hotspur": "توتنهام",
    "Paris Saint-Germain": "باريس سان جيرمان", "Bayern Munich": "بايرن ميونخ",
    "Juventus": "يوفنتوس", "Inter": "إنتر ميلان", "AC Milan": "ميلان",
    "Atlético Madrid": "أتلتيكو مدريد", "Borussia Dortmund": "بوروسيا دورتموند",
    "Napoli": "نابولي", "Aston Villa": "أستون فيلا", "Newcastle United": "نيوكاسل",
    "Fulham": "فولهام", "Málaga": "مالاجا", "Deportivo La Coruña": "ديبورتيفو",
    "Al Ahly": "الأهلي", "Zamalek": "الزمالك", "Pyramids FC": "بيراميدز",
    "Al Hilal": "الهلال", "Al Nassr": "النصر", "Al Ittihad": "الاتحاد",
    "Al Ahli": "الأهلي السعودي", "Al Shabab": "الشباب", "Al Ettifaq": "الاتفاق",
    "Espérance de Tunis": "الترجي", "Wydad AC": "الوداد", "Raja Casablanca": "الرجاء",
    "Villarreal": "فياريال", "Real Betis": "ريال بيتيس", "Sevilla": "إشبيلية",
    "Valencia": "فالنسيا", "Athletic Club": "أتلتيك بلباو", "Real Sociedad": "ريال سوسيداد",
    "Bayer Leverkusen": "باير ليفركوزن", "RB Leipzig": "لايبزيج", "Eintracht Frankfurt": "فرانكفورت",
    "AS Roma": "روما", "Lazio": "لاتسيو", "Atalanta": "أتالانتا", "Fiorentina": "فيورنتينا",
    "Olympique Marseille": "مارسيليا", "Olympique Lyon": "ليون", "AS Monaco": "موناكو",
    "PSV Eindhoven": "آيندهوفن", "Ajax": "أياكس", "Benfica": "بنفيكا", "Porto": "بورتو",
    "Sporting CP": "سبورتينج لشبونة", "Celtic": "سيلتيك", "Rangers": "رينجرز",
    "Galatasaray": "جالاطا سراي", "Fenerbahçe": "فنربخشة", "Beşiktaş": "بشكتاش",
    "West Ham United": "وست هام", "Everton": "إيفرتون", "Brighton & Hove Albion": "برايتون",
    "Crystal Palace": "كريستال بالاس", "Wolverhampton Wanderers": "ولفرهامبتون",
    "Leicester City": "ليستر سيتي", "Leeds United": "ليدز يونايتد", "Southampton": "ساوثهامبتون",
    "Nottingham Forest": "نوتينجهام فورست", "Brentford": "برينتفورد", "Bournemouth": "بورنموث",
    "Getafe": "خيتافي", "Osasuna": "أوساسونا", "Celta Vigo": "سيلتا فيجو", "Rayo Vallecano": "رايو فاييكانو",
    "Girona": "جيرونا", "Las Palmas": "لاس بالماس", "Mallorca": "مايوركا", "Alavés": "ألافيس",
    "VfB Stuttgart": "شتوتجارت", "Werder Bremen": "فيردر بريمن", "Borussia Mönchengladbach": "جلادباخ",
    "VfL Wolfsburg": "فولفسبورج", "SC Freiburg": "فرايبورج", "TSG Hoffenheim": "هوفنهايم",
    "Udinese": "أودينيزي", "Torino": "تورينو", "Bologna": "بولونيا", "Genoa": "جنوى", "Cagliari": "كالياري",
    "Empoli": "إمبولي", "Hellas Verona": "فيرونا", "Lecce": "ليتشي", "Sassuolo": "ساسولو",
    "Montreal": "مونتريال", "Columbus Crew": "كولومبوس كرو", "LA Galaxy": "لوس أنجلوس جالاكسي",
    "Inter Miami": "إنتر ميامي", "Al Taawoun": "التعاون", "Al Fateh": "الفتح", "Damac FC": "ضمك",
    "Al Raed": "الرائد", "Al Fayha": "الفيحاء", "Al Khaleej": "الخليج", "Al Wehda": "الوحدة",
    "Al Qadsiah": "القادسية", "Al Okhdood": "الأخدود", "Al Riyad": "الرياض",
    "Ismaily": "الإسماعيلي", "Al Masry": "المصري", "Smouha": "سموحة", "ENPPI": "إنبي",
    "Ceramica Cleopatra": "سيراميكا كليوباترا", "Modern Sport": "مودرن سبورت",
    "Málaga": "مالاجا", "Deportivo": "ديبورتيفو",
}

_TEAM_TRANS_CACHE = {}

def ar_team(name):
    if name in TEAM_AR:
        return TEAM_AR[name]
    if name in _TEAM_TRANS_CACHE:
        return _TEAM_TRANS_CACHE[name]
    tr = translate(name) or name
    _TEAM_TRANS_CACHE[name] = tr
    return tr

ENGAGEMENTS = [
    {"type": "poll", "q": "مين أحسن مهاجم في العالم دلوقتي؟ 🔥",
     "options": ["هالاند", "مبابي", "محمد صلاح", "فينيسيوس"]},
    {"type": "poll", "q": "مين الأعظم في التاريخ؟ 🐐",
     "options": ["ميسي", "رونالدو", "الاتنين في قلبي"]},
    {"type": "text", "t": "💡 معلومة سريعة: البرازيل أكتر منتخب كسب كأس العالم.. 5 مرات! 🇧🇷"},
    {"type": "poll", "q": "لو انت المدرب، هتضم مين الأول؟ 💼",
     "options": ["مبابي", "هالاند", "بيلينجهام", "صلاح"]},
    {"type": "text", "t": "💡 معلومة سريعة: أول كأس عالم اتلعبت سنة 1930 في أوروجواي.. وصاحب الأرض كسبها! 🏆"},
    {"type": "poll", "q": "أنهي مباراة بتستناها أكتر؟ ⏰",
     "options": ["كلاسيكو الأرض", "ديربي البريميرليج", "ليلية الأبطال", "قمة الدوري المصري"]},
    {"type": "text", "t": "💡 معلومة سريعة: ريال مدريد نادي القرن في أوروبا.. أكتر نادي كسب الشامبيونزليج 🏆"},
    {"type": "poll", "q": "مين أحسن لاعب عربي محترف في التاريخ؟ 🌍",
     "options": ["محمد صلاح", "رياض محرز", "أشرف حكيمي", "سعيد العويران"]},
    {"type": "text", "t": "💡 معلومة مجنونة: أكبر نتيجة في تاريخ المونديال: أستراليا 31 - 0 ساموا الأمريكية 😱"},
    {"type": "text", "t": "سؤال السهرة: مين أحسن مدرب في العالم دلوقتي؟ اكتبه في التعليقات 👇"},
]

STYLES = [
    {"name": "المعلق الحماسي",
     "p": "اكتب بأسلوب معلق كرة قدم حماسي: تعجيب، طاقة عالية، عامية مصرية قوية."},
    {"name": "العاجل المختصر",
     "p": "اكتب بأسلوب الخبر العاجل: سطرين فقط، معلومة مباشرة، بدون أي حشو."},
    {"name": "المحلل الهادي",
     "p": "اكتب بأسلوب محلل كورة رزين: لغة أقرب للفصحى، نظرة تحليلية، واختم بسؤال للجمهور."},
    {"name": "الحكواتي",
     "p": "اكتب بأسلوب الحكواتي: افتح بتصوير المشهد كأنه قصة، ثم الخبر، عامية مصرية."},
    {"name": "الغرز الودود",
     "p": "اكتب بأسلوب خفيف وظريف: غرزة ودود صغيرة متعلقة بالخبر بدون إهانة أحد، ثم المعلومة."},
    {"name": "السؤال الأول",
     "p": "افتح الخبر بسؤال استفهام يشد القارئ، ثم أجب بالخبر، عامية مصرية."},
]

BASE_RULES = """قواعد ثابتة:
- أنت تكتب عن كرة القدم فقط
- لا تنسخ النص الأصلي حرفياً أبداً
- لا تضف معلومات غير موجودة في النص
- الأرقام والأسماء والتواريخ تُنقل كما هي من النص الأصلي بدون أي تغيير
- اكتب بعربية طبيعية سلسة، ممنوع نهائياً أسلوب الترجمة الحرفية الركيك
- ممنوع أي حروف لاتينية داخل النص
- السطر الأول: عنوان جذاب مع إيموجي
- لو الخبر ليس عن كرة القدم اكتب كلمة واحدة: SKIP

مثال للشكل والجودة المطلوبة:
🔥 صلاح يفجرها: مش هسيب ليفربول كده!

النجم المصري طلع في تصريحات نارية بعد مباراة أمس، وقال
إنه لسه عنده الكتير يقدمه، والجمهور انفجر في الكومنتات 🔥
الراجل مش بيهزر، والكلام واضح!"""

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
        res = GoogleTranslator(source='auto', target='ar').translate(text[:500])
        if not res:
            return None
        bad = ["server error", "that's an error", "error 500", "try again later", "unavailable"]
        if any(b in res.lower() for b in bad):
            return None
        return res
    except Exception:
        return None

def send_tg(text):
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHANNEL, "text": text}, timeout=30)
        if not r.ok:
            print("❌ Telegram error:", r.status_code, r.text[:200])
        return r.ok
    except Exception as e:
        print("❌ Telegram exception:", e)
        return False

def send_poll(question, options):
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendPoll",
            json={"chat_id": TG_CHANNEL, "question": question,
                  "options": [{"text": o} for o in options]}, timeout=30)
        if not r.ok:
            print("❌ Poll error:", r.status_code, r.text[:200])
        return r.ok
    except Exception as e:
        print("❌ Poll exception:", e)
        return False

OWNER_CHAT_ID = os.environ.get("OWNER_CHAT_ID", "")
FB_PAGE_ID = os.environ.get("FB_PAGE_ID", "")
FB_PAGE_TOKEN = os.environ.get("FB_PAGE_TOKEN", "")

SCENE_PROMPTS = [
    "photorealistic football stadium at night with floodlights, real photo",
    "photorealistic football player kicking ball on green pitch, real photo",
    "photorealistic happy football fans celebrating in stadium stands, real photo",
    "photorealistic close up football ball on grass, stadium background, real photo",
]

def image_for(title):
    import urllib.parse
    seed = int(hashlib.md5(title.encode()).hexdigest()[:8], 16)
    # صور مجانية من Unsplash - أكثر استقراراً
    queries = ["football+stadium+night", "soccer+ball+grass", "football+fans+stadium"]
    q = queries[seed % len(queries)]
    return f"https://source.unsplash.com/1200x800/?{q}&sig={seed}"

def send_photo(url, caption):
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendPhoto",
            json={"chat_id": TG_CHANNEL, "photo": url, "caption": caption[:1000]},
            timeout=60)
        if r.ok: return True
        print("❌ Photo error:", r.status_code)
    except Exception as e:
        print("❌ Photo exception:", e)
    return False

def post_facebook(text, image_url):
    # فيسبوك مؤقتاً متعطل لحين عمل App Review
    return False
    if not (FB_PAGE_ID and FB_PAGE_TOKEN):
        return False
    try:
        r = requests.post(
            f"https://graph.facebook.com/v19.0/{FB_PAGE_ID}/photos",
            data={"url": image_url, "caption": text, "access_token": FB_PAGE_TOKEN},
            timeout=60)
        if r.ok:
            print("✅ نُشر على فيسبوك")
            return True
        print("❌ FB error:", r.status_code, r.text[:200])
    except Exception as e:
        print("❌ FB exception:", e)
    return False

def send_owner(text):
    if not OWNER_CHAT_ID: return False
    try:
        r = requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": OWNER_CHAT_ID, "text": text}, timeout=30)
        return r.ok
    except Exception:
        return False

SHORTS_SCRIPT_PROMPT = """أنت كاتب سيناريوهات فيديوهات كرة قدم محترف.
اكتب سكريبت فيديو Shorts مدته 45 ثانية بالعامية المصرية:
- أول سطر: HOOK يخطف الانتباه
- بعده 3 مشاهد، كل مشهد كده:
[المشهد:] وصف بصري قصير
[التعليق:] اللي هتقوله بصوتك
- آخر سطر: دعوة لمتابعة قناة Edge Football
موضوع الخبر:
"""

LONG_SCRIPT_PROMPT = """أنت كاتب سيناريوهات فيديوهات كرة قدم محترف.
اكتب سكريبت فيديو طويل (3-4 دقائق) بالعامية المصرية يلخص أهم أخبار اليوم:
- مقدمة حماسية 20 ثانية
- 3-4 فقرات، كل فقرة:
[المشهد:] وصف بصري (لقطات تصورها أو صور تعرضها)
[التعليق:] كلامك بصوتك
- خاتمة: دعوة للاشتراك + سؤال للجمهور
أخبار اليوم:
"""

BREAKING_WORDS = ["عاجل", "رسميا", "رسمياً", "إقالة", "استقالة", "إصابة",
                  "تعاقد", "انتقال", "breaking", "official", "signed",
                  "transfer", "injury", "sacked", "confirmed"]

def is_breaking(title):
    t = title.lower()
    return any(w in t for w in BREAKING_WORDS)

def verify_content(orig_title, orig_summary, draft):
    prompt = f"""أنت مدقق أخبار رياضية صارم.
النص الأصلي:
{orig_title}
{orig_summary[:600]}

الخبر المكتوب:
{draft}

هل الخبر المكتوب أمين للنص الأصلي بدون إضافة أرقام أو أسماء أو نتائج غير موجودة؟
لو أمين اكتب: OK
لو فيه أي إضافة أو تغيير اكتب: FIX وبعدها الخبر المصحح كاملاً."""
    res = (call_gemini(prompt, 0.3) or call_groq(prompt, 0.3) or
           call_mistral(prompt, 0.3))
    if not res:
        return draft
    res = res.strip()
    if res.startswith("OK"):
        return draft
    if res.startswith("FIX"):
        fixed = res[3:].strip()
        if len(fixed) > 80:
            print("🛡️ التحقق: تم تصحيح الخبر قبل النشر")
            return fixed
    return draft

def make_shorts_script(news_text):
    prompt = SHORTS_SCRIPT_PROMPT + news_text[:800]
    script = call_gemini(prompt, 1.0) or call_groq(prompt, 1.0) or call_deepseek(prompt, 1.0)
    if script and send_owner("🎬 سكريبت Shorts جاهز:\n\n" + script):
        print("📩 اتبعت سكريبت Shorts")
def make_shorts_script(news_text):
    ...

GEMINI_MODELS = [
    "gemini-3.7-flash",      # الأحدث والأقوى
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-pro",        # أقوى موديل متاح
]

def call_gemini(prompt, temp):
    if not GEMINI_KEY: return None
    for model in GEMINI_MODELS:
        try:
            r = requests.post(
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={GEMINI_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": temp},
                },
                timeout=60,
            )
            if r.ok:
                print("✨ Gemini model:", model)
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
            print("Gemini status:", model, r.status_code)
        except Exception as e:
            print("Gemini:", e)
    return None

GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-20b"]

def call_groq(prompt, temp):
    if not GROQ_KEY: return None
    for model in GROQ_MODELS:
        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_KEY}"},
                json={"model": model, "temperature": temp,
                      "messages": [{"role": "user", "content": prompt}]}, timeout=60)
            if r.ok:
                print("✨ Groq model:", model)
                return r.json()["choices"][0]["message"]["content"]
            print("Groq status:", model, r.status_code)
        except Exception as e:
            print("Groq:", e)
    return None

def call_deepseek(prompt, temp):
    if not DEEPSEEK_KEY: return None
    try:
        r = requests.post("https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_KEY}"},
            json={"model": "deepseek-chat", "temperature": temp,
                  "messages": [{"role": "user", "content": prompt}]}, timeout=60)
        if r.ok:
            return r.json()["choices"][0]["message"]["content"]
        print("DeepSeek status:", r.status_code, r.text[:150])
    except Exception as e:
        print("DeepSeek:", e)
    return None

def call_openai_compat(base_url, key, models, prompt, temp, name):
    if not key: return None
    for model in models:
        try:
            r = requests.post(base_url,
                headers={"Authorization": f"Bearer {key}"},
                json={"model": model, "temperature": temp,
                      "messages": [{"role": "user", "content": prompt}]}, timeout=60)
            if r.ok:
                print(f"✨ {name}:", model)
                return r.json()["choices"][0]["message"]["content"]
            print(f"{name} status:", model, r.status_code)
        except Exception as e:
            print(f"{name}:", e)
    return None

def call_openrouter(prompt, temp):
    return call_openai_compat("https://openrouter.ai/api/v1/chat/completions",
        OPENROUTER_KEY,
        ["meta-llama/llama-3.1-8b-instruct:free", "qwen/qwen-2.5-7b-instruct:free", "google/gemma-2-9b-it:free"],        prompt, temp, "OpenRouter")

def call_mistral(prompt, temp):
    return call_openai_compat("https://api.mistral.ai/v1/chat/completions",
        MISTRAL_KEY, ["mistral-small-latest", "open-mistral-nemo"],
        prompt, temp, "Mistral")

def call_cerebras(prompt, temp):
    return call_openai_compat("https://api.cerebras.ai/v1/chat/completions",
        CEREBRAS_KEY, ["llama3.1-8b", "llama-4-scout-17b-16e-instruct"],
        prompt, temp, "Cerebras")

def quality_ok(text):
    """يرفض أي رد مكسور أو مليان حروف عشوائية"""
    if not text or len(text) < 80:
        return False
    arabic = len(re.findall(r'[؀-ۿ]', text))
    latin = len(re.findall(r'[A-Za-z]', text))
    if arabic < 30:
        return False
    if latin > arabic * 0.15:
        return False
    return True

def ai_process(title, content, is_english, forbidden=None):
    style = random.choice(STYLES)
    temp = round(random.uniform(0.9, 1.3), 2)
    print(f"🎭 ستايل: {style['name']} | حرارة: {temp}")

    forbidden_block = ""
    if forbidden:
        forbidden_block = "\nممنوع تماماً تفتح الخبر بأي من الجمل دي (اتستخدمت قبل كده):\n"
        forbidden_block += "\n".join(f"- {f}" for f in forbidden[-5:])

    task = "ترجم للعربية أولاً ثم" if is_english else ""
    prompt = f"""أنت محرر رياضي في قناة Edge Football.
{style['p']}
{BASE_RULES}{forbidden_block}

{task} أعد صياغة الخبر ده:
العنوان: {title}
المحتوى: {content[:1500]}"""

    for engine in [call_gemini, call_groq, call_openrouter, call_mistral, call_cerebras]:
        result = engine(prompt, temp)
        if not result:
            continue
        if "SKIP" in result[:20]:
            return None
        if quality_ok(result):
            return result
        print("⚠️ جودة منخفضة من", engine.__name__, "— بجرب المحرك اللي بعده")
    return None


_SCORE_CACHE = {}

def fetch_scoreboard(slug):
    if slug in _SCORE_CACHE:
        return _SCORE_CACHE[slug]
    data = None
    try:
        r = requests.get(
            f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard",
            timeout=20)
        if r.ok:
            data = r.json()
    except Exception as e:
        print("scoreboard error:", slug, e)
    _SCORE_CACHE[slug] = data
    return data

def fetch_standings(slug):
    try:
        r = requests.get(
            f"https://site.api.espn.com/apis/v2/sports/soccer/{slug}/standings",
            timeout=20)
        if not r.ok: return None
        data = r.json()
        if "standings" in data and "entries" in data["standings"]:
            return data["standings"]["entries"]
        for ch in data.get("children", []):
            if "standings" in ch and "entries" in ch["standings"]:
                return ch["standings"]["entries"]
    except Exception as e:
        print("standings error:", slug, e)
    return None

def fetch_lineups(slug, event_id):
    try:
        r = requests.get(
            f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/summary?event={event_id}",
            timeout=20)
        if not r.ok: return None
        data = r.json()
        out = {}
        for roster in data.get("rosters", []):
            team = roster.get("team", {}).get("shortDisplayName", "")
            players = []
            for p in roster.get("rosters", []):
                if p.get("starter") in (True, "true"):
                    name = p.get("athlete", {}).get("shortName", "")
                    if name: players.append(name)
            if team and players:
                out[team] = players[:11]
        return out or None
    except Exception:
        return None


def collect_news(state):
    posted = set(state["posted"])
    recent_titles = state.get("posted_titles", [])
    fresh = []
    skipped_old = 0
    skipped_dup = 0

    for source, is_en in [(s, False) for s in ARABIC_SOURCES] + [(s, True) for s in ENGLISH_SOURCES]:
        try:
            feed = feedparser.parse(source["url"])
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

                fresh.append({"title": title, "url": url, "summary": summary,
                              "source": source["name"], "en": is_en,
                              "hash": h, "nt": nt})
        except Exception as ex:
            print("fetch error:", source["name"], ex)

    print(f"🚫 قديمة: {skipped_old} | مكررة: {skipped_dup}")
    return fresh, posted, recent_titles


def finish_text(home, hs, away, as_, name):
    home, away = ar_team(home), ar_team(away)
    hs, as_ = int(hs), int(as_)
    if hs > as_:
        line = f"{home} خطفها وخد التلات نقاط 💪"
    elif as_ > hs:
        line = f"{away} قلبها وخد التلات نقاط 🔥"
    else:
        line = "تعادل مثير.. ولا واحد رضي بالتاني 😅"
    short = f"{home} {hs} - {as_} {away}"
    full = f"🏁 نهاية المباراة | {name}\n{short}\n{line}\n\n⚽ Edge Football"
    return full, short

def collect_finished(state):
    reported = set(state.get("reported_matches", []))
    found = []
    now = datetime.now(CAIRO)
    for slug, name in LEAGUES.items():
        data = fetch_scoreboard(slug)
        if not data: continue
        for ev in data.get("events", []):
            eid = ev.get("id")
            if not eid or eid in reported: continue
            try:
                comp = ev["competitions"][0]
                if comp["status"]["type"]["state"] != "post": continue
                # 🎯 الدقة: ننشر بس مباريات انتهت خلال آخر 12 ساعات
                start = datetime.fromisoformat(
                    ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                if (now - start).total_seconds() > 12 * 3600:
                    reported.add(eid)
                    continue
                comps = comp["competitors"]
                home = [c for c in comps if c.get("homeAway") == "home"][0]
                away = [c for c in comps if c.get("homeAway") == "away"][0]
                full, short = finish_text(home["team"]["displayName"], home["score"],
                                          away["team"]["displayName"], away["score"], name)
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
                hours_left = (dt - now).total_seconds() / 3600
                if not (0.5 <= hours_left <= 4): continue
                comps = comp["competitors"]
                home = ar_team([c for c in comps if c.get("homeAway") == "home"][0]["team"]["displayName"])
                away = ar_team([c for c in comps if c.get("homeAway") == "away"][0]["team"]["displayName"])
                found.append((eid, slug, home, away, dt))
            except Exception:
                continue
    return found, previewed

def build_preview(slug, home, away, dt, event_id):
    lines = [f"🔥 الليلة | {LEAGUES[slug]}",
             f"⚽ {home} × {away} — {dt.strftime('%I:%M %p')}", ""]
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
            rank = int(float(stats.get("rank", 99)))
            team = ar_team(e.get("team", {}).get("shortDisplayName", ""))
            rows.append({
                "rank": rank, "team": team,
                "id": e.get("team", {}).get("id"),
                "slug": slug,
                "logo": e.get("team", {}).get("logo", ""),
                "gp": stats.get("gamesPlayed", "-"),
                "w": stats.get("wins", "-"),
                "d": stats.get("ties", stats.get("draws", "-")),
                "l": stats.get("losses", "-"),
                "pts": stats.get("points", "-"),
            })
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
            table = top_table(slug, 5)
            if table:
                lines.append(f"🏆 {LEAGUES[slug]}:")
                lines += [f"{r['rank']}. {r['team']} — {r['pts']} نقطة" for r in table]
                lines.append("")
    if len(lines) <= 3:
        return None
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
    if total == 0:
        return None
    return "\n".join(lines) + "\n\n⚽ Edge Football"


def post_engagement(state):
    idx = state.get("engagement_index", 0) % len(ENGAGEMENTS)
    item = ENGAGEMENTS[idx]
    if item["type"] == "poll":
        ok = send_poll(item["q"], item["options"])
    else:
        ok = send_tg(item["t"] + "\n\n⚽ Edge Football")
    if ok:
        state["engagement_index"] = idx + 1
        print("✅ نُشر منشور تفاعل")


# ============================================
# 🎬 توليد فيديوهات Shorts
# ============================================
async def _tts(text, out):
    edge_tts = importlib.import_module("edge_tts")
    c = edge_tts.Communicate(text, "ar-EG-ShakirNeural")
    await c.save(out)

def send_video(path, caption):
    try:
        with open(path, "rb") as f:
            r = requests.post(
                f"https://api.telegram.org/bot{TG_TOKEN}/sendVideo",
                data={"chat_id": TG_CHANNEL, "caption": caption},
                files={"video": f}, timeout=180)
        if not r.ok:
            print("❌ Video error:", r.status_code, r.text[:200])
        return r.ok
    except Exception as e:
        print("❌ Video exception:", e)
        return False

def upload_youtube(video_path, title, description):
    try:
        from google.oauth2.credentials import Credentials
        build = importlib.import_module("googleapiclient.discovery").build
        MediaFileUpload = importlib.import_module(
            "googleapiclient.http").MediaFileUpload
        info = json.loads(os.environ.get("YOUTUBE_TOKEN", ""))
        if not info:
            print("⚠️ مفيش YOUTUBE_TOKEN")
            return False
        creds = Credentials.from_authorized_file_info(
            info, scopes=["https://www.googleapis.com/auth/youtube.upload"])
        yt = build("youtube", "v3", credentials=creds)
        body = {
            "snippet": {"title": title[:100], "description": description[:4000],
                        "tags": ["كرة_قدم", "اخبار_كورة", "Edge_Football", "Shorts"],
                        "categoryId": "17"},
            "status": {"privacyStatus": "public"}
        }
        media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True)
        resp = yt.videos().insert(part="snippet,status", body=body, media_body=media).execute()
        print("✅ اترفع على يوتيوب:", resp["id"])
        return True
    except Exception as e:
        print("❌ YouTube error:", e)
        return False

def make_short(text, state):
    import urllib.parse
    os.makedirs("videos", exist_ok=True)

    body = text.split("📡")[0].strip()[:350]
    voice_text = f"أهلاً بيكم في إيدج فوتبول! {body} تابعونا عشان كل جديد في عالم الكورة!"
    mp3 = "videos/voice.mp3"
    asyncio.run(_tts(voice_text, mp3))
    print("🎙️ تم توليد الصوت")

    prompt = urllib.parse.quote(
        "dramatic football stadium at night, cinematic lighting, green pitch, epic atmosphere, no text")
    r = requests.get(
        f"https://image.pollinations.ai/prompt/{prompt}?width=1080&height=1920", timeout=120)
    if not r.ok or len(r.content) < 1000:
        print("⚠️ توليد الصورة فشل — هنكمل من غير فيديو")
        return
    with open("videos/bg.jpg", "wb") as f:
        f.write(r.content)
    print("🖼️ تم توليد الخلفية")

    out = "videos/short.mp4"
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", "videos/bg.jpg", "-i", mp3,
           "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p",
           "-c:v", "libx264", "-r", "24", "-c:a", "aac", "-shortest", "-t", "60", out]
    subprocess.run(cmd, check=True, capture_output=True)
    print("🎬 تم تركيب الفيديو")

    cap = body[:500] + "\n\n🎬 Edge Football Shorts"
    if send_video(out, cap):
        print("✅ نُشر فيديو Shorts في القناة")
        today = datetime.now(CAIRO).strftime("%Y-%m-%d")
        if state.get("yt_date") != today:
            state["yt_date"] = today
            state["yt_count"] = 0
        if state.get("yt_count", 0) < 4:
            if upload_youtube(
                out,
                body[:90] + " ⚽ #Shorts",
                cap + "\n\nتابعنا:\nhttps://t.me/edgefootballplatform\nhttps://andrew101018.github.io/EDGE/"):
                state["yt_count"] = state.get("yt_count", 0) + 1
        else:
            print("⚠️ وصلنا حد يوتيوب اليومي (4 فيديوهات)")


# ============================================
# 🌐 توليد بيانات الموقع (محدّث v8)
# ============================================
def fetch_leaders():
    out = {}
    labels = {"goals": "الهدافون", "assists": "صناعة الأهداف"}
    for slug in ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "ksa.1", "egy.1"]:
        try:
            r = requests.get(
                f"https://site.api.espn.com/apis/site/v2/sports/soccer/{slug}/leaders",
                timeout=20)
            if not r.ok: continue
            d = r.json()
            cats = {}
            for cat in d.get("leaders", []):
                cname = (cat.get("name") or "").lower()
                label = labels.get(cname) or cat.get("displayName") or cat.get("title") or "الأفضل"
                items = []
                entries = cat.get("leaders") or cat.get("entries") or cat.get("items") or []
                for e in entries[:10]:
                    a = e.get("athlete", {}) or {}
                    items.append({
                        "name": ar_team(a.get("displayName", "")),
                        "team": ar_team((a.get("team", {}) or {}).get("displayName", "")),
                        "value": e.get("displayValue", e.get("value", "")),
                        "face": (a.get("headshot", {}) or {}).get("href", ""),
                    })
                if items:
                    cats[label] = items
            if cats:
                out[LEAGUES[slug]] = cats
        except Exception as e:
            print("leaders error:", slug, e)
    print("👑 دوريات فيها هدافين:", len(out))
    return out

def fetch_highlights(matches):
    items = []
    try:
        r = requests.get("https://www.scorebat.com/video-api/v3/", timeout=30)
        if r.ok:
            d = r.json()
            resp = d.get("response", []) if isinstance(d, dict) else d
            for v in resp[:10]:
                items.append({"title": v.get("title", ""), "thumb": v.get("thumbnail", ""),
                              "url": v.get("url", "")})
    except Exception as e:
        print("scorebat error:", e)
    if not items:
        import urllib.parse
        for g in matches:
            for m in g["items"]:
                if m["state"] == "post":
                    q = urllib.parse.quote(f"أهداف مباراة {m['home']} و {m['away']}")
                    items.append({
                        "title": f"🎯 أهداف: {m['home']} {m['hs']} - {m['as']} {m['away']}",
                        "thumb": m.get("homeLogo", ""),
                        "url": f"https://www.youtube.com/results?search_query={q}",
                    })
                if len(items) >= 10: break
            if len(items) >= 10: break
    print("🎬 هايلايتس:", len(items))
    return items
    
def build_site_data(state, today):
    now = datetime.now(CAIRO)

    # آخر 10 أخبار دايماً
    news_items = []
    for x in [x for x in state.get("site_news", [])][::-1]:
        news_items.append(x if isinstance(x, dict) else {"t": x, "img": ""})
        news_items = news_items[:30]

    results_items = []
    for item in state.get("daily_results", [])[-10:][::-1]:
        if item["d"] == today:
            results_items.append(item["t"])

    # المباريات (لايف + منتهية + قادمة) متجمعة حسب البطولة
        matches = []
    order = {"in": 0, "post": 1, "pre": 2}
    for slug, name in LEAGUES.items():
        data = fetch_scoreboard(slug)
        if not data: continue
        group = {"league": name, "items": [], "big": slug in IMPORTANT}
        for ev in data.get("events", []):
            try:
                comp = ev["competitions"][0]
                st = comp["status"]["type"]["state"]
                detail = comp["status"]["type"].get("shortDetail", "")
                dt = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(CAIRO)
                hrs = (now - dt).total_seconds() / 3600
                if st == "post" and hrs > 24:
                    continue
                pre_window = 72 if slug in IMPORTANT else 24
                if st == "pre" and hrs < -pre_window:
                    continue
                comps = comp["competitors"]
                home = [c for c in comps if c.get("homeAway") == "home"][0]
                away = [c for c in comps if c.get("homeAway") == "away"][0]
                item = {
                    "home": ar_team(home["team"]["displayName"]),
                    "away": ar_team(away["team"]["displayName"]),
                    "eid": ev.get("id"),
                    "homeId": home["team"].get("id"),
                    "awayId": away["team"].get("id"),
                    "slug": slug,
                    "homeLogo": home["team"].get("logo", ""),
                    "awayLogo": away["team"].get("logo", ""),
                    "tv": BROADCASTERS.get(slug, ("", ""))[0],
                    "tvUrl": BROADCASTERS.get(slug, ("", ""))[1],
                    "hs": home["score"], "as": away["score"],
                    "time": dt.strftime("%I:%M %p"),
                    "state": st, "detail": detail,
                }
                if st == "post":
                    stats = {}
                    for s in comp.get("statistics", []) or []:
                        nm = s.get("name", "")
                        if nm in ("possession", "shotsOnTarget", "cornerKicks",
                                  "totalShots", "foulsCommitted"):
                            stats[nm] = [s.get("homeValue"), s.get("awayValue")]
                    if stats:
                        item["stats"] = stats
                group["items"].append(item)
            except Exception:
                continue
        if group["items"]:
            group["items"].sort(key=lambda x: order.get(x["state"], 3))
            matches.append(group)

    # ترتيب الدوريات
    tables = {}
    for slug, name in [("eng.1", "الدوري الإنجليزي"), ("esp.1", "الدوري الإسباني"),
                        ("ita.1", "الدوري الإيطالي"), ("ger.1", "الدوري الألماني"),
                        ("fra.1", "الدوري الفرنسي"), ("ksa.1", "الدوري السعودي"),
                        ("egy.1", "الدوري المصري"), ("por.1", "الدوري البرتغالي")]:
        t = top_table(slug, 8)
        print(f"🏆 ترتيب {name}: {len(t) if t else 0} صفوف")
        if t and len(t):
            tables[name] = t
        if t:
            tables[name] = t

    site_data = {
        "updated_at": now.strftime("%Y-%m-%d %I:%M %p"),
        "news": news_items,
        "results": results_items,
        "matches": matches,
        "tables": tables,
        "leaders": fetch_leaders(),
        "highlights": fetch_highlights(matches),
    }

    os.makedirs("site", exist_ok=True)
    with open("site/data.json", "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)
    print("🌐 تم تحديث بيانات الموقع")

# ============================================
# البرنامج الرئيسي
# ============================================
def main():
    state = load_state()
    now = datetime.now(CAIRO)
    today = now.strftime("%Y-%m-%d")
    openers = state.get("last_openers", [])

    # ---------- الأخبار ----------
    fresh, posted, recent_titles = collect_news(state)
    print(f"📥 أخبار كورة جديدة: {len(fresh)}")
    count = 0
    last_video_text = None
    for item in fresh:
        if count >= MAX_PER_RUN: break
        title, summary = item["title"], item["summary"]
        if item["en"]:
            title = translate(title) or title
            summary = translate(summary) or summary
        content = ai_process(title, summary, item["en"], openers)
        if not content and not item["en"]:
            # مصدر عربي والمحركات وقعت: ننشر الأصل النضيف بدل ما نضيع الخبر
            content = f"⚽ {title}\n\n{summary[:300]}"
        if not content:
            print("⚠️ تجاوز:", item["title"][:40])
            posted.add(item["hash"])
            continue
        if is_breaking(item["title"]):
            content = verify_content(item["title"], item["summary"], content)
        content += f"\n\n📡 المصدر: {item['source']}"
        if send_tg(content):
            print("✅ نُشر:", title[:40])
            posted.add(item["hash"])
            recent_titles.append(item["nt"])
            openers.append(content.splitlines()[0][:80])
            state.setdefault("site_news", []).append(
                {"t": content.splitlines()[0][:100], "img": ""})
            state["site_news"] = state["site_news"][-40:]
            state.setdefault("daily_news", []).append(
                {"d": today, "t": content.splitlines()[0][:80]})
            post_facebook(content, "")
            make_shorts_script(content)
            count += 1
            time.sleep(15)
    state["posted"] = list(posted)
    state["posted_titles"] = recent_titles[-500:]
    state["last_openers"] = openers[-5:]
    state["site_news"] = state.get("site_news", [])[-10:]

def make_publish_package(news_lines):
    prompt = f"""انت خبير سوشيال ميديا رياضي. اكتب باقة نشر جاهزة لفيديو كورة بيتكلم عن الأخبار دي:
{news_lines}

بالشكل ده بالظبط:
🎬 عنوان يوتيوب: (عنوان عربي clickable فيه إيموجي ورقم)
🎵 عنوان تيك توك: (جملة قصيرة استفزازية بتوقف السكرول)
📝 وصف: سطرين + دعوة للاشتراك والمتابعة
#️⃣ هاشتاجات: 12 هاشتاج عربي وإنجليزي مختلطين بينهم مسافات"""
    return (call_gemini(prompt, 0.9) or call_groq(prompt, 0.9) or
            call_mistral(prompt, 0.9))

       # ---------- سكريبت فيديو طويل يومي (6م - 11م) ----------
    if FORCE or (18 <= now.hour <= 23 and state.get("last_long_date") != today):
        news_today = [x["t"] for x in state.get("daily_news", []) if x["d"] == today]
        if news_today:
            prompt = LONG_SCRIPT_PROMPT + "\n".join(f"- {t}" for t in news_today[:6])
            script = call_gemini(prompt, 1.0) or call_groq(prompt, 1.0)
            if script and send_owner("🎥 سكريبت فيديو اليوم الطويل:\n\n" + script):
                print("📩 اتبعت سكريبت الفيديو الطويل")
                pkg = make_publish_package("\n".join(f"- {t}" for t in news_today[:6]))
                if pkg and send_owner("📦 باقة النشر الجاهزة (تيك توك + يوتيوب):\n\n" + pkg):
                    print("📦 اتبعتت باقة النشر")
                if not FORCE:
                    state["last_long_date"] = today
    # ---------- اللايف ----------
    alerts = check_live(state)
    print(f"🟢 تنبيهات لايف: {len(alerts)}")
    a_sent = 0
    for text in alerts:
        if a_sent >= 3: break
        if send_tg(text):
            a_sent += 1
            time.sleep(5)

    # ---------- النتائج ----------
    found, reported = collect_finished(state)
    print(f"🏁 نتائج جديدة: {len(found)}")
    sent = 0
    for eid, full, short in found:
        if sent >= 4: break
        if send_tg(full):
            print("✅ نُشرت نتيجة")
            reported.add(eid)
            state.setdefault("daily_results", []).append({"d": today, "t": short})
            sent += 1
            time.sleep(10)
    state["reported_matches"] = list(reported)[-500:]

    # ---------- البريفيو ----------
    if FORCE or 17 <= now.hour <= 21:
        previews, previewed = collect_previews(state, now)
        print(f"🔥 بريفيوهات: {len(previews)}")
        p_sent = 0
        for eid, slug, home, away, dt in previews:
            if p_sent >= 2: break
            text = build_preview(slug, home, away, dt, eid)
            if send_tg(text):
                previewed.add(eid)
                p_sent += 1
                time.sleep(10)
        state["previewed"] = list(previewed)[-300:]

    # ---------- جدول الصباح ----------
    if FORCE or (8 <= now.hour <= 12):
        if FORCE or state.get("last_schedule_date") != today:
            sched = build_schedule(today)
            if sched and send_tg(sched):
                print("✅ نُشرت نشرة المواعيد")
                if not FORCE:
                    state["last_schedule_date"] = today

    # ---------- نشرة الليل ----------
    if FORCE or (21 <= now.hour <= 23):
        if FORCE or state.get("last_digest_date") != today:
            digest = build_digest(state, today)
            if digest and send_tg(digest):
                print("✅ نُشرت نشرة الليل")
                send_tg("🎮 لعبت توقعات النهارده؟\nتوقع نتائج المباريات واكسب نقاط في مواجهة أصحابك ⚽\n🏅 لوحة الصدارة + فانتازي إيدج من الموقع:\n🌐 https://andrew101018.github.io/EDGE/")
                print("📢 اتبعتت رسالة النمو")
                if not FORCE:
                    state["last_digest_date"] = today

    # ---------- تفاعل كل ساعتين ----------
    last_eng = state.get("last_engagement", 0)
    if FORCE or (10 <= now.hour <= 23 and time.time() - last_eng >= 2 * 3600):
        post_engagement(state)
        if not FORCE:
            state["last_engagement"] = time.time()

    state["daily_news"] = [x for x in state.get("daily_news", []) if x["d"] == today][-20:]
    state["daily_results"] = [x for x in state.get("daily_results", []) if x["d"] == today][-20:]

    # ---------- الموقع ----------
    build_site_data(state, today)

    save_state(state)
    print("🏁 انتهت الجولة")

if __name__ == "__main__":
    main()