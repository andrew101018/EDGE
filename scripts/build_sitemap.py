#!/usr/bin/env python3
"""Rebuild sitemap.xml from the pages actually in the repo (idea #5).

Scans articles/, teams/, players/, videos/, fpl/ plus the homepage, so new pages are
picked up automatically when they land on main. lastmod comes from each
file's last git commit date (truthful modification date), never the run
date. Run from the repo root:

    python3 scripts/build_sitemap.py
"""
import glob
import os
import subprocess

SITE = "https://andrew101018.github.io/EDGE"


def lastmod(path):
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or None
    except subprocess.CalledProcessError:
        return None


def url(loc, priority, mod=None, changefreq=None):
    lines = ["  <url>", f"    <loc>{loc}</loc>"]
    if mod:
        lines.append(f"    <lastmod>{mod}</lastmod>")
    if changefreq:
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
    lines.append(f"    <priority>{priority}</priority>")
    lines.append("  </url>")
    return "\n".join(lines)


def main():
    entries = [url(SITE + "/", "1.0", changefreq="hourly")]

    # Other standalone root pages (faq.html, ...) - index.html is the homepage above.
    for path in sorted(glob.glob("*.html")):
        if path == "index.html":
            continue
        entries.append(url(f"{SITE}/{path}", "0.6", lastmod(path)))

    for path in sorted(glob.glob("articles/*.html")):
        entries.append(url(f"{SITE}/{path}", "0.6", lastmod(path)))

    if os.path.exists("teams/index.html"):
        entries.append(url(SITE + "/teams/", "0.7", lastmod("teams/index.html")))
    for path in sorted(glob.glob("teams/*.html")):
        if path.endswith("index.html"):
            continue
        entries.append(url(f"{SITE}/{path}", "0.7", lastmod(path)))

    if os.path.exists("videos/index.html"):
        entries.append(url(SITE + "/videos/", "0.6", lastmod("videos/index.html")))
    for path in sorted(glob.glob("videos/*.html")):
        if path.endswith("index.html"):
            continue
        entries.append(url(f"{SITE}/{path}", "0.5", lastmod(path)))

    if os.path.exists("fpl/index.html"):
        entries.append(url(SITE + "/fpl/", "0.6", lastmod("fpl/index.html")))
    for path in sorted(glob.glob("fpl/*.html")):
        if path.endswith("index.html"):
            continue
        entries.append(url(f"{SITE}/{path}", "0.5", lastmod(path)))

    if os.path.exists("players/index.html"):
        entries.append(url(SITE + "/players/", "0.8", lastmod("players/index.html")))
    for path in sorted(glob.glob("players/*.html")):
        if path.endswith("index.html"):
            continue
        entries.append(url(f"{SITE}/{path}", "0.6", lastmod(path)))

    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               + "\n".join(entries) + "\n</urlset>\n")
    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write(sitemap)
    print(f"wrote sitemap.xml with {len(entries)} URLs")


if __name__ == "__main__":
    main()
