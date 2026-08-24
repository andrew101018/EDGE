import os, json, hashlib, time
import requests
import feedparser
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator

# ============================================
# الإعدادات من Secrets
# ============================================
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHANNEL = os.environ.get("TELEGRAM_CHANNEL_ID", "@EdgeFootball")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
DEEPSEEK_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

STATE_FILE = "posted.json"
MAX_PER_RUN = 3  # عدد الأخبار في كل جولة

ARABIC_SOURCES = [
    {"name": "BBC Arabic Sport", "url": "https://feeds.bbci.co.uk/arabic/sport/rss.xml"},
    {"name": "Sky News Arabia", "url": "https://www.skynewsarabia.com/sports/rss.xml"},
    {"name": "RT Arabic Sport", "url": "https://arabic.rt.com/rss/sport/"},
]

ENGLISH_SOURCES = [
    {"name": "BBC Sport", "url": "https://feeds.bbci.co.uk/sport/rss.xml"},
    {"name": "Sky Sports", "url": "https://www.skysports.com/rss/12040"},
    {"name": "ESPN FC", "url": "https://www.espn.com/espn/rss/soccer/news"},
]

SYSTEM_PROMPT = """أنت محرر رياضي في قناة Edge Football.
أعد صياغة الخبر بالعربية بأسلوب Mix:
- العنوان: فصحى قوية مع إيموجي
- الشرح: عامية مصرية حماسية 3-4 أسطر
- لا تنسخ النص الأصلي حرفياً
- لا تضف معلومات غير موجودة
النموذج:
🔥 [عنوان]

[شرح بالعامية]

👇 المصدر الأصلي:"""


# ============================================
# أدوات مساعدة
# ============================================
def hash_id(title, url):
    return hashlib.md5((title + url).encode()).hexdigest()

def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"posted": []}

def save_state(state):
    state["posted"] = state["posted"][-2000:]  # نخزن آخر 2000 بس
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)

def translate(text):
    try:
        return GoogleTranslator(source='auto', target='ar').translate(text[:500])
    except Exception:
        return None

def send_tg(text):
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHANNEL, "text": text}, timeout=30)
        return r.ok
    except Exception:
        return False


# ============================================
# محركات الذكاء الاصطناعي (REST مباشرة)
# ============================================
def call_gemini(prompt):
    if not GEMINI_KEY: return None
    try:
        r = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=60)
        if r.ok:
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print("Gemini:", e)
    return None

def call_groq(prompt):
    if not GROQ_KEY: return None
    try:
        r = requests.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}"},
            json={"model": "llama-3.3-70b-versatile",
                  "messages": [{"role": "user", "content": prompt}]}, timeout=60)
        if r.ok:
            return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("Groq:", e)
    return None

def call_deepseek(prompt):
    if not DEEPSEEK_KEY: return None
    try:
        r = requests.post("https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_KEY}"},
            json={"model": "deepseek-chat",
                  "messages": [{"role": "user", "content": prompt}]}, timeout=60)
        if r.ok:
            return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("DeepSeek:", e)
    return None

def ai_process(title, content, is_english):
    task = "ترجم للعربية أولاً ثم" if is_english else ""
    prompt = f"{SYSTEM_PROMPT}\n{task} أعد صياغة:\nالعنوان: {title}\nالمحتوى: {content[:1500]}"
    return call_gemini(prompt) or call_groq(prompt) or call_deepseek(prompt)


# ============================================
# البرنامج الرئيسي
# ============================================
def main():
    state = load_state()
    posted = set(state["posted"])
    fresh = []

    # جلب الأخبار
    for source, is_en in [(s, False) for s in ARABIC_SOURCES] + [(s, True) for s in ENGLISH_SOURCES]:
        try:
            feed = feedparser.parse(source["url"])
            for e in feed.entries[:8]:
                title = e.get("title", "").strip()
                url = e.get("link", "")
                if not title or not url: continue

                # نتجاهل الأخبار القديمة (أقدم من 12 ساعة)
                if hasattr(e, "published_parsed") and e.published_parsed:
                    if time.time() - time.mktime(e.published_parsed) > 12 * 3600:
                        continue

                h = hash_id(title, url)
                if h in posted: continue

                summary = BeautifulSoup(e.get("summary", ""), "html.parser").get_text().strip()
                fresh.append({"title": title, "url": url, "summary": summary,
                              "source": source["name"], "en": is_en, "hash": h})
        except Exception as ex:
            print("fetch error:", source["name"], ex)

    print(f"📥 أخبار جديدة: {len(fresh)}")

    # نشر حتى MAX_PER_RUN
    count = 0
    for item in fresh:
        if count >= MAX_PER_RUN: break

        title, summary = item["title"], item["summary"]

        # ترجمة مبدئية لو إنجليزي
        if item["en"]:
            title = translate(title) or title
            summary = translate(summary) or summary

        content = ai_process(title, summary, item["en"])

        # ضمان عربي فقط: لو فشل الـ AI نترجم ترجمة بسيطة
        if not content and item["en"]:
            content = translate(f"{title}\n{summary[:300]}")

        if not content:
            print("⚠️ تجاوز:", item["title"][:40])
            posted.add(item["hash"])  # نتجاوزه نهائياً
            continue

        content += f"\n\n📡 المصدر: {item['source']}\n🔗 {item['url']}"

        if send_tg(content):
            print("✅ نُشر:", title[:40])
            posted.add(item["hash"])
            count += 1
            time.sleep(15)

    state["posted"] = list(posted)
    save_state(state)
    print("🏁 انتهت الجولة")

if __name__ == "__main__":
    main()
