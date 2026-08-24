# ============================================
# Edge Football - ناشر تيليجرام (محدّث)
# ============================================

from telegram import Bot
from telegram.constants import ParseMode


async def send_to_telegram(bot: Bot, channel_id: str, content: str, url: str):
    """إرسال رسالة إلى القناة"""
    
    # التحقق من وجود محتوى
    if not content:
        print("⚠️ لا يوجد محتوى للنشر - تم التجاوز")
        return False
    
    try:
        full_message = f"{content}\n\n🔗 {url}"
        await bot.send_message(
            chat_id=channel_id,
            text=full_message,
            disable_web_page_preview=False
        )
        return True
    except Exception as e:
        print(f"❌ فشل النشر: {e}")
        return False