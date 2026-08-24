# ============================================
# Edge Football - قاعدة البيانات
# ============================================

import aiosqlite
import hashlib

DB_PATH = "edge_football.db"


async def init_db():
    """إنشاء قاعدة البيانات"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS news (
                id TEXT PRIMARY KEY,
                title TEXT,
                url TEXT,
                source TEXT,
                published_at TEXT,
                raw_content TEXT,
                ai_content TEXT,
                posted INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def is_duplicate(title, url):
    """التحقق من وجود خبر مشابه"""
    id_hash = hashlib.md5((title + url).encode()).hexdigest()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT id FROM news WHERE id=?", (id_hash,))
        result = await cursor.fetchone()
        return result is not None


async def save_news(title, url, source, published_at, raw_content):
    """حفظ خبر جديد"""
    id_hash = hashlib.md5((title + url).encode()).hexdigest()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT OR IGNORE INTO news (id, title, url, source, published_at, raw_content)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (id_hash, title, url, source, published_at, raw_content))
        await db.commit()


async def get_unposted_news(limit=5):
    """جلب الأخبار غير المنشورة"""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            SELECT id, title, url, source, raw_content FROM news
            WHERE posted = 0
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit,))
        return await cursor.fetchall()


async def mark_posted(news_id, ai_content):
    """تحديد الخبر كمنشور"""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            UPDATE news SET posted=1, ai_content=? WHERE id=?
        """, (ai_content, news_id))
        await db.commit()