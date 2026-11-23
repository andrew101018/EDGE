"""Draft editorial helpers. No network, credentials, or publishing side effects."""
import calendar
import re
from datetime import datetime
from difflib import SequenceMatcher
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

# Reviewable starting heuristics, not audience research or a news-importance guarantee.
REGIONS = {
    "egypt": ("مصر", "المصري", "الأهلي", "الاهلي", "الزمالك", "بيراميدز", "egypt", "zamalek", "al ahly"),
    "europe": ("أوروبا", "اوروبا", "أبطال أوروبا", "برشلونة", "ريال مدريد", "ليفربول", "مانشستر", "أرسنال", "الدوري الإنجليزي", "الدوري الإسباني", "الدوري الإيطالي", "الدوري الألماني", "europe", "champions league", "premier league", "barcelona", "real madrid", "liverpool", "arsenal", "manchester", "serie a", "bundesliga"),
}
MAJOR = ("كأس العالم", "كاس العالم", "نهائي", "رسميا", "رسميًا", "عقوبة", "انتقال", "إصابة", "world cup", "final", "confirmed", "transfer", "injury")

def published_epoch(parsed):
    return calendar.timegm(parsed) if parsed else None

def valid_news_time(parsed, now, max_age_hours=8):
    stamp = published_epoch(parsed)
    return stamp is not None and -300 <= now - stamp <= max_age_hours * 3600

def normalize_title(text):
    text = re.sub(r"[ًٌٍَُِّْـ]", "", str(text).lower())
    text = re.sub(r"[أإآ]", "ا", text)
    return re.sub(r"[^\w\u0600-\u06ff]+", " ", text).strip()

def rank_news(items, now):
    """Stable relative ranking among collected feed candidates only. No quota."""
    def score(item):
        text = normalize_title(item.get("title", "") + " " + item.get("summary", ""))
        region = any(normalize_title(term) in text for terms in REGIONS.values() for term in terms)
        major = sum(normalize_title(term) in text for term in MAJOR)
        stamp = published_epoch(item.get("published_parsed")) or 0
        recency = max(0, 8 - max(0, now - stamp) / 3600)
        return (3 * int(region) + min(major, 2) + recency / 8, stamp)
    ordered = sorted(items, key=score, reverse=True)
    selected = []
    for item in ordered:
        title = normalize_title(item.get("title", ""))
        if any(SequenceMatcher(None, title, normalize_title(p.get("title", ""))).ratio() > .9 for p in selected):
            continue
        selected.append(item)
    return selected

def parse_rewrite(text):
    value = (text or "").strip()
    if re.match(r"^SKIP(?:\b|$)", value, flags=re.I):
        return {"status": "rejected", "text": ""}
    if not value or len(value) > 1600:
        return {"status": "failed", "text": ""}
    return {"status": "ready", "text": value}

def safe_source_url(url):
    parsed = urlparse(str(url))
    return str(url) if parsed.scheme in ("https", "http") and parsed.netloc and not parsed.username and len(str(url)) <= 2048 else ""

def source_time(parsed):
    stamp = published_epoch(parsed)
    if stamp is None:
        return ""
    return datetime.fromtimestamp(stamp, ZoneInfo("Africa/Cairo")).strftime("%Y-%m-%d %H:%M")

def format_news(content, item):
    """Plain text; the existing transport handles HTML escaping."""
    publisher = re.sub(r"[\r\n]+", " ", item.get("publisher") or item.get("source") or "المصدر غير محدد")[:100]
    stamp = source_time(item.get("published_parsed"))
    footer = "المصدر: " + publisher
    if stamp:
        footer += " | " + stamp + " بتوقيت القاهرة"
    return content.strip() + "\n\n" + footer

def news_record(content, item):
    stamp = published_epoch(item.get("published_parsed"))
    return {
        "t": content.splitlines()[0][:180], "full": content,
        "img": item.get("img", ""), "source": item.get("publisher") or item.get("source", ""),
        "url": safe_source_url(item.get("url", "")),
        "published_at": datetime.fromtimestamp(stamp, ZoneInfo("UTC")).isoformat() if stamp is not None else "",
        "story_id": item.get("hash", ""), "ingested_at": datetime.now(ZoneInfo("UTC")).isoformat(), "editorial_status": "rewritten_not_independently_verified",
    }
