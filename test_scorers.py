# -*- coding: utf-8 -*-
# Edge Football - تشخيص ESPN leaders
# شغّله من: Actions -> Test Scorers -> Run workflow

import os
import json
import requests

TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
OWNER = os.environ.get("OWNER_CHAT_ID", "")


def report(text):
    print(text)
    try:
        requests.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": OWNER, "text": text[:4000]},
            timeout=30,
        )
    except Exception as e:
        print("TG fail:", e)


def probe(url):
    try:
        r = requests.get(url, timeout=15)
        line = f"\n🔗 {url}\nHTTP {r.status_code}"
        if not r.ok:
            report(line + " ❌")
            return
        try:
            d = r.json()
        except Exception:
            report(line + " — رد مش JSON: " + r.text[:200])
            return
        keys = list(d.keys())
        line += f"\n🔑 المفاتيح: {keys[:8]}"
        if "leaders" in d:
            cats = d.get("leaders") or []
            line += f"\n📦 leaders فيه {len(cats)} قسم"
            for cat in cats[:5]:
                nm = cat.get("name") or cat.get("displayName") or "؟"
                pl = cat.get("leaders") or []
                line += f"\n   • {nm}: {len(pl)} لاعب"
                if pl:
                    first = pl[0]
                    a = first.get("athlete", {}) or {}
                    line += f"\n     الأول: {a.get('displayName', '؟')} = {first.get('displayValue', '؟')}"
        else:
            line += "\n⚠️ مفيش مفتاح leaders في الرد"
            line += "\n📄 أول 250 حرف: " + json.dumps(d, ensure_ascii=False)[:250]
        report(line)
    except Exception as e:
        report(f"\n🔗 {url}\n💥 استثناء: {str(e)[:150]}")


def main():
    report("🔬 تشخيص ESPN — الدوري الإنجليزي:")
    probe("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/leaders")
    probe("https://site.web.api.espn.com/apis/common/v3/sports/soccer/eng.1/leaders")
    probe("https://site.api.espn.com/apis/common/v3/sports/soccer/eng.1/leaders")
    report("\n👉 ابعت الرسالة دي للمطور زي ما هي")


if __name__ == "__main__":
    main()
