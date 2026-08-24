# ============================================
# Edge Football - محرك الذكاء الاصطناعي (محدّث)
# ============================================

import google.generativeai as genai
from openai import OpenAI
from deep_translator import GoogleTranslator
import asyncio
from config import GEMINI_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY

# تهيئة Gemini
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

# تهيئة DeepSeek و Groq
deepseek_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com/v1")
groq_client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

# مترجم Google مجاني (احتياطي)
translator = GoogleTranslator(source='auto', target='ar')

SYSTEM_PROMPT = """أنت محرر رياضي محترف في قناة Edge Football.
مهمتك: إعادة صياغة الخبر باللغة العربية بأسلوب Mix جذاب:
- العنوان: فصحى قوية وجذابة مع إيموجي مناسب
- الشرح: عامية مصرية قريبة من الجمهور، حماسية ومختصرة (3-4 أسطر)
- لا تنسخ النص الأصلي حرفياً أبداً
- أضف لمسة تحفيزية في النهاية (مثل: يلا شاركونا رأيكم! أو يا مساء الفل يا وحوش!)
- لا تذكر أن الخبر مترجم أو مُعاد صياغته
- لا تضف معلومات غير موجودة في النص الأصلي

النموذج:
🔥 [عنوان فصحى جذاب]

[شرح بالعامية المصرية 3-4 أسطر]

👇 المصدر الأصلي:"""


def translate_simple(text):
    """ترجمة بسيطة باستخدام Google Translate المجاني"""
    try:
        translated = translator.translate(text[:500])
        return f"📰 {translated}\n\n(ترجمة تلقائية)"
    except Exception as e:
        print(f"⚠️ الترجمة فشلت: {e}")
        return None


async def process_with_gemini(text, is_english=False):
    """معالجة باستخدام Gemini"""
    try:
        task = "ترجم إلى العربية ثم أعد صياغته بالعامية المصرية." if is_english else "أعد صياغته بالعامية المصرية."
        response = await asyncio.to_thread(
            lambda: gemini_model.generate_content(f"{SYSTEM_PROMPT}\n\n{task}\n\nالنص: {text[:3000]}")
        )
        return response.text
    except Exception as e:
        print(f"⚠️ Gemini فشل: {e}")
        return None


async def process_with_groq(text, is_english=False):
    """معالجة باستخدام Groq"""
    try:
        task = "ترجم إلى العربية ثم أعد صياغته بالعامية المصرية." if is_english else "أعد صياغته بالعامية المصرية."
        response = await asyncio.to_thread(
            lambda: groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": f"{SYSTEM_PROMPT}\n\n{task}\n\nالنص: {text[:3000]}"}],
                temperature=0.8
            )
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"⚠️ Groq فشل: {e}")
        return None


async def process_with_deepseek(text, is_english=False):
    """معالجة باستخدام DeepSeek"""
    try:
        task = "ترجم إلى العربية ثم أعد صياغته بالعامية المصرية." if is_english else "أعد صياغته بالعامية المصرية."
        response = await asyncio.to_thread(
            lambda: deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": f"{SYSTEM_PROMPT}\n\n{task}\n\nالنص: {text[:3000]}"}],
                temperature=0.8
            )
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"⚠️ DeepSeek فشل: {e}")
        return None


async def process_news(title, content, is_english=False):
    """معالجة الخبر بالترتيب: Gemini → Groq → DeepSeek → ترجمة بسيطة"""
    full_text = f"العنوان: {title}\n\nالمحتوى: {content}"
    
    # محاولة 1: Gemini
    result = await process_with_gemini(full_text, is_english)
    if result:
        print("✅ Gemini نجح")
        return result
    
    # محاولة 2: Groq
    result = await process_with_groq(full_text, is_english)
    if result:
        print("✅ Groq نجح")
        return result
    
    # محاولة 3: DeepSeek
    result = await process_with_deepseek(full_text, is_english)
    if result:
        print("✅ DeepSeek نجح")
        return result
    
    # محاولة 4: ترجمة بسيطة (آخر حل)
    if is_english:
        print("⚠️ كل الـ AI فشل، نلجأ للترجمة البسيطة")
        translated = await asyncio.to_thread(lambda: translate_simple(full_text))
        if translated:
            return translated
    
    # لو كل حاجة فشلت، نرفض النشر
    print("❌ فشل كامل - لن يُنشر الخبر")
    return None