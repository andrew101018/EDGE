#!/usr/bin/env python3
"""Rebuild feed.xml (RSS 2.0) from site/data.json news + articles/ pages (idea #19).

News items come from the site's own refreshed data (same source the homepage
renders). Article items are the static articles/*.html pages; pubDate comes
from each file's last git commit date, never the run date. Run from the repo
root:

    python3 scripts/build_feed.py
"""
import glob
import json
import re
import subprocess
from email.utils import format_datetime
from datetime import datetime, timezone
from xml.sax.saxutils import escape

SITE = "https://andrew101018.github.io/EDGE"
MAX_NEWS = 20
DESC_LEN = 220


def git_datetime(path):
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or None
    except subprocess.CalledProcessError:
        return None


def rfc822(iso):
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return format_datetime(dt)


def item(title, link, guid, pubdate=None, description=None):
    lines = ["  <item>",
             f"    <title>{escape(title)}</title>",
             f"    <link>{escape(link)}</link>",
             f'    <guid isPermaLink="false">{escape(guid)}</guid>']
    if pubdate:
        lines.append(f"    <pubDate>{pubdate}</pubDate>")
    if description:
        lines.append(f"    <description>{escape(description)}</description>")
    lines.append("  </item>")
    return "\n".join(lines)


def article_title(path):
    try:
        with open(path, encoding="utf-8") as f:
            m = re.search(r"<title>(.*?)</title>", f.read(), re.S)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else None
    except OSError:
        return None


def main():
    items = []

    # Static articles (permalinks on the site itself).
    for path in sorted(glob.glob("articles/*.html")):
        title = article_title(path)
        if not title:
            continue
        items.append(item(title, f"{SITE}/{path}", path,
                          pubdate=rfc822(git_datetime(path))))

    # News from the site's own refreshed data.
    try:
        with open("site/data.json", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        data = {}
    for n in (data.get("news") or [])[:MAX_NEWS]:
        title = (n.get("t") or "").strip()
        url = (n.get("url") or "").strip()
        if not title or not url:
            continue
        desc = re.sub(r"\s+", " ", (n.get("full") or "")).strip()[:DESC_LEN]
        src = (n.get("source") or "").strip()
        if src:
            desc = (desc + " " if desc else "") + f"(المصدر: {src})"
        items.append(item(title, url, n.get("story_id") or url,
                          pubdate=rfc822(n.get("published_at")),
                          description=desc or None))

    feed = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0">\n'
            '<channel>\n'
            "  <title>Edge Football</title>\n"
            f"  <link>{SITE}/</link>\n"
            "  <description>أخبار ومقالات الكورة من Edge Football — الكورة بتبدأ من هنا ⚽</description>\n"
            "  <language>ar</language>\n"
            + "\n".join(items) + "\n</channel>\n</rss>\n")
    with open("feed.xml", "w", encoding="utf-8") as f:
        f.write(feed)
    print(f"wrote feed.xml with {len(items)} items")


if __name__ == "__main__":
    main()
