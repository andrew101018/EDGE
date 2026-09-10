# -*- coding: utf-8 -*-
# Edge Football - اختبار جلب الهدافين من API-Football
# شغّله من: Actions -> Test Scorers -> Run workflow
# النتيجة توصل على تيليجرام

import os
import requests

API_KEY = os.environ.get("API_FOOTBALL_KEY", "")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
OWNER = os.environ.get("OWNER_CHAT_ID", "")


def report(text):
    print(text)
    try:
        requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": OWNER, "text": text},
            timeout=30,
        )
    except Exception as e:
        print("TG fail:", e)


def test_season(season):
    try:
        r = requests.get(
            "https://v3.football.api-sports.io/players/topscorers",
            headers={"x-apisports-key": API_KEY},
            params={"league": 39, "season": season},
            timeout=15,
        )
        info = f"HTTP {r.status_code}"
        try:
            d = r.json()
        except Exception:
            return f"❌ season {season}: {info} — رد غير مفهوم: {r.text[:150]}"
        errs = d.get("errors") or {}
        if errs:
            return f"❌ season {season}: {info} — أخطاء: {str(errs)[:250]}"
        resp = d.get("response") or []
        if not resp:
            return f"⚠️ season {season}: {info} — رجع فاضي (مفيش بيانات)"
        top = []
        for e in resp[:3]:
            p = e.get("player") or {}
            st = (e.get("statistics") or [{}])[0]
            goals = (st.get("goals") or {}).get("total") or 0
            team = ((st.get("team") or {}).get("name") or "")
            top.append(f"• {p.get('name', '؟')} ({team}) — {goals} أهداف")
        return f"✅ season {season}: {info} — {len(resp)} لاعب\n" + "\n".join(top)
    except Exception as ex:
        return f"❌ season {season}: مشكلة اتصال — {str(ex)[:150]}"


def main():
    if not API_KEY:
        report("❌ اختبار الهدافين: API_FOOTBALL_KEY مش موجود في الـ Secrets")
        return
    lines = ["🔬 اختبار الهدافين — الدوري الإنجليزي (ليج 39):", ""]
    lines.append(test_season(2026))
    lines.append("")
    lines.append(test_season(2025))
    lines.append("")
    lines.append(test_season(2023))
    lines.append("")
    lines.append("👉 ابعت الرسالة دي للمطور زي ما هي")
    report("\n".join(lines))


if __name__ == "__main__":
    main()
