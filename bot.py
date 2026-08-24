# ============================================
# Edge Football - البوت الرئيسي (نسخة الاستضافة)
# ============================================

import asyncio
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from telegram import Bot
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, FETCH_INTERVAL_MINUTES, MAX_NEWS_PER_FETCH
from database import init_db, get_unposted_news, mark_posted
from fetcher import fetch_all_sources
from news_sources import ENGLISH_SOURCES
from ai_engine import process_news
from publisher import send_to_telegram

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


# ============================================
# سيرفر "نبضة القلب" - عشان الاستضافة ما تنومش البوت
# ============================================
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Edge Football is alive! ⚽")

    def log_message(self, *args):
        pass


def start_keep_alive():
    port = int(os.environ.get("PORT", 8000))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    logging.info(f"🌐 Keep-Alive server شغال على بورت {port}")


# ============================================
# دورة جلب ونشر الأخبار
# ============================================
async def job():
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    logging.info("🚀 بدء دورة جلب جديدة...")

    all_news = await fetch_all_sources()
    logging.info(f"✅ تم جلب {len(all_news)} خبر")

    unposted = await get_unposted_news(MAX_NEWS_PER_FETCH)

    if not unposted:
        logging.info("📭 لا توجد أخبار جديدة")
        return

    for news_id, title, url, source, raw_content in unposted:
        is_english = any(s["name"] == source for s in ENGLISH_SOURCES)

        logging.info(f"🤖 يعالج: {title[:50]}...")
        ai_content = await process_news(title, raw_content, is_english)

        if not ai_content:
            logging.warning(f"⚠️ تم تجاهل: {title[:50]}")
            await mark_posted(news_id, "FAILED")
            continue

        ai_content += f"\n\n📡 المصدر: {source}"

        success = await send_to_telegram(bot, TELEGRAM_CHANNEL_ID, ai_content, url)

        if success:
            await mark_posted(news_id, ai_content)
            logging.info(f"✅ نُشر: {title[:50]}")
            await asyncio.sleep(30)

    logging.info(f"💤 استراحة {FETCH_INTERVAL_MINUTES} دقيقة...")


async def main():
    start_keep_alive()   # ← مهم جداً للاستضافة
    await init_db()
    bot = Bot(token=TELEGRAM_BOT_TOKEN)

    try:
        await bot.send_message(
            chat_id=TELEGRAM_CHANNEL_ID,
            text="🎯 <b>Edge Football</b> شغال الآن 24/7!\n\n⚡ أخبار عالمية\n🇪 بلمسة مصرية",
            parse_mode="HTML"
        )
    except Exception as e:
        logging.error(f"خطأ ترحيب: {e}")

    while True:
        try:
            await job()
        except Exception as e:
            logging.error(f"❌ خطأ في الدورة: {e}")
        await asyncio.sleep(FETCH_INTERVAL_MINUTES * 60)


if __name__ == "__main__":
    logging.info("🏁 بدء تشغيل Edge Football...")
    asyncio.run(main())
