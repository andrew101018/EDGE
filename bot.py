# ============================================
# Edge Football - البوت الرئيسي (محدّث)
# ============================================

import asyncio
import logging
from telegram import Bot
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, FETCH_INTERVAL_MINUTES, MAX_NEWS_PER_FETCH
from database import init_db, get_unposted_news, mark_posted
from fetcher import fetch_all_sources
from news_sources import ARABIC_SOURCES, ENGLISH_SOURCES
from ai_engine import process_news
from publisher import send_to_telegram

# إعداد Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


async def job():
    """دورة جلب ومعالجة ونشر الأخبار"""
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    logging.info("🚀 بدء دورة جلب جديدة...")
    
    # جلب الأخبار من المصادر
    all_news = await fetch_all_sources()
    logging.info(f"✅ تم جلب {len(all_news)} خبر")
    
    # أخذ الأخبار غير المنشورة
    unposted = await get_unposted_news(MAX_NEWS_PER_FETCH)
    
    if not unposted:
        logging.info("📭 لا توجد أخبار جديدة للنشر")
        return
    
    for news_id, title, url, source, raw_content in unposted:
        # تحديد لو المصدر إنجليزي
        is_english = any(s["name"] == source for s in ENGLISH_SOURCES)
        
        logging.info(f"🤖 يعالج: {title[:50]}...")
        ai_content = await process_news(title, raw_content, is_english)
        
        # لو الـ AI فشل تماماً، نتجاهل الخبر
        if not ai_content:
            logging.warning(f"⚠️ تم تجاهل خبر: {title[:50]}")
            await mark_posted(news_id, "FAILED")
            continue
        
        # إضافة اسم المصدر
        ai_content += f"\n\n📡 المصدر: {source}"
        
        # النشر
        success = await send_to_telegram(bot, TELEGRAM_CHANNEL_ID, ai_content, url)
        
        if success:
            await mark_posted(news_id, ai_content)
            logging.info(f"✅ نُشر: {title[:50]}")
            await asyncio.sleep(30)  # راحة بين المنشورات
    
    logging.info(f"💤 استراحة {FETCH_INTERVAL_MINUTES} دقيقة...")


async def main():
    """نقطة البداية"""
    await init_db()
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    
    # رسالة ترحيب
    try:
        await bot.send_message(
            chat_id=TELEGRAM_CHANNEL_ID,
            text="🎯 <b>Edge Football</b> شغال الآن!\n\n⚡ بوت الأخبار الرياضية الذكي\n🌍 تغطية عالمية\n🇪🇬 بلمسة مصرية\n🔄 تحديث كل 15 دقيقة",
            parse_mode="HTML"
        )
        logging.info("✅ تم إرسال رسالة الترحيب")
    except Exception as e:
        logging.error(f"خطأ في رسالة الترحيب: {e}")
    
    # التشغيل الدوري
    while True:
        try:
            await job()
        except Exception as e:
            logging.error(f"❌ خطأ في الدورة: {e}")
        
        await asyncio.sleep(FETCH_INTERVAL_MINUTES * 60)


if __name__ == "__main__":
    logging.info("🏁 بدء تشغيل Edge Football...")
    asyncio.run(main())