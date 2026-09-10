# -*- coding: utf-8 -*-
# Edge Football - اختبار النشر على فيسبوك
# شغّله من: Actions -> Test FB -> Run workflow
# النتيجة توصل على تيليجرام

import os
import requests

FB_PAGE_ID = os.environ.get("FB_PAGE_ID", "")
FB_PAGE_TOKEN = os.environ.get("FB_PAGE_TOKEN", "")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
OWNER = os.environ.get("OWNER_CHAT_ID", "")
LOGO = "https://cdn.jsdelivr.net/gh/andrew101018/EDGE@main/photo_2024-09-05_19-57-28.jpg"


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


def main():
    if not FB_PAGE_ID or not FB_PAGE_TOKEN:
        report("❌ اختبار فيسبوك: FB_PAGE_ID أو FB_PAGE_TOKEN مش موجودين في الـ Secrets")
        return
    try:
        r = requests.post(
            f"https://graph.facebook.com/v18.0/{FB_PAGE_ID}/photos",
            data={
                "caption": "🔥 Edge Football — اختبار الاتصال ✅ لو المنشور ده ظهر يبقى النشر التلقائي شغال ⚡",
                "url": LOGO,
                "access_token": FB_PAGE_TOKEN,
            },
            timeout=20,
        )
        if r.ok:
            report("✅ المنشور نزل على فيسبوك بنجاح! افتح الصفحة وشوفه 📘 — يعني النشر التلقائي شغال، ومحتاج بس أخبار جديدة عشان يبدأ.")
        else:
            report(f"❌ فيسبوك رفض المنشور (كود {r.status_code}):\n{r.text[:300]}\n\n👉 ابعت الرسالة دي للمطور.")
    except Exception as e:
        report("❌ مشكلة في الاتصال بفيسبوك: " + str(e)[:300])


if __name__ == "__main__":
    main()
