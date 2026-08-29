# ============================================
# Edge Football - جالب الأخبار (محدّث)
# ============================================

import requests

import feedparser
from bs4 import BeautifulSoup
import asyncio
from database import is_duplicate, save_news
from deep_translator import GoogleTranslator
import re


async def fetch_rss(source, is_english_source=False):
    """جلب أخبار من مصدر RSS واحد"""
    try:
        rr = requests.get(source["url"], timeout=10, headers={"User-Agent": "EdgeFootball/1.0"})
        feed = feedparser.parse(rr.content)
        news_list = []
        
        for entry in feed.entries[:10]:
            title = entry.get("title", "").strip()
            url = entry.get("link", "")
            published = entry.get("published", "")
            
            # استخراج النص من الـ summary
            summary = entry.get("summary", "")
            if summary:
                soup = BeautifulSoup(summary, "html.parser")
                summary = soup.get_text().strip()
            
            if not title or not url:
                continue
            
            # فحص التكرار
            if await is_duplicate(title, url):
                continue
            
            # لو المصدر إنجليزي، نترجم العنوان والمحتوى مبدئياً
            if is_english_source:
                try:
                    translator = GoogleTranslator(source='auto', target='ar')
                    title_ar = translator.translate(title[:500])
                    summary_ar = translator.translate(summary[:500]) if summary else ""
                    await save_news(title_ar, url, source["name"], published, summary_ar)
                except Exception as e:
                    print(f"⚠️ خطأ في الترجمة المبدئية: {e}")
                    continue
            else:
                # مصدر عربي - نحفظه كما هو
                await save_news(title, url, source["name"], published, summary)
            
            news_list.append({"title": title, "url": url, "source": source["name"]})
        
        return news_list
    except Exception as e:
        print(f"❌ خطأ في جلب {source['name']}: {e}")
        return []


async def fetch_all_sources():
    """جلب من كل المصادر بالتوازي"""
    from news_sources import ARABIC_SOURCES, ENGLISH_SOURCES
    
    # جلب المصادر العربية
    arabic_tasks = [fetch_rss(s, is_english_source=False) for s in ARABIC_SOURCES]
    
    # جلب المصادر الإنجليزية
    english_tasks = [fetch_rss(s, is_english_source=True) for s in ENGLISH_SOURCES]
    
    all_tasks = arabic_tasks + english_tasks
    results = await asyncio.gather(*all_tasks, return_exceptions=True)
    
    all_news = []
    for r in results:
        if isinstance(r, list):
            all_news.extend(r)
    
    return all_news