import os
from dotenv import load_dotenv

# بيقرأ ملف .env على جهازك
# وعلى Koyeb بيقرأ الـ Environment Variables مباشرة
load_dotenv()

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID", "@EdgeFootball")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

FETCH_INTERVAL_MINUTES = int(os.environ.get("FETCH_INTERVAL_MINUTES", "15"))
MAX_NEWS_PER_FETCH = int(os.environ.get("MAX_NEWS_PER_FETCH", "5"))