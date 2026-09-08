# -*- coding: utf-8 -*-
# Edge Football - اختبار إشعارات Push
# شغّله من: Actions -> Test Push -> Run workflow

import base64
import json
import os
import sys
import time

import requests
from pywebpush import webpush, WebPushException

SUPABASE_URL = "https://ejfdqvjfzgsjtztzvhem.supabase.co/rest/v1/"
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
VAPID_PRIVATE = os.environ.get("VAPID_PRIVATE", "")
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
OWNER_CHAT_ID = os.environ.get("OWNER_CHAT_ID", "")
SITE_URL = "https://andrew101018.github.io/EDGE/"

# بادئة DER لتحويل مفتاح EC P-256 خام (32 بايت) لصيغة PKCS8
PKCS8_PREFIX = bytes.fromhex(
    "303C020101301306072A8648CE3D020106082A8648CE3D03010704220420"
)


def tg_report(text):
    """يبعت تقرير النتيجة للمالك على تيليجرام"""
    try:
        requests.post(
            "https://api.telegram.org/bot%s/sendMessage" % BOT_TOKEN,
            json={"chat_id": OWNER_CHAT_ID, "text": text},
            timeout=30,
        )
    except Exception as e:
        print("فشل إرسال تقرير تيليجرام:", e)


def fetch_subs():
    """يجيب كل الاشتراكات من جدول push_subs في Supabase"""
    r = requests.get(
        SUPABASE_URL + "/rest/v1/push_subs",
        params={"select": "id,subscription"},
        headers={"apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def delete_dead_sub(row_id):
    """يمسح اشتراك ميّت (410/404) عشان الجدول يفضل نضيف"""
    try:
        requests.delete(
            SUPABASE_URL + "/rest/v1/push_subs",
            params={"id": "eq." + str(row_id)},
            headers={"apikey": ANON_KEY, "Authorization": "Bearer " + ANON_KEY},
            timeout=30,
        )
        print("اتمسح اشتراك ميّت id =", row_id)
    except Exception as e:
        print("فشل حذف اشتراك ميّت:", e)


def normalize_sub(sub):
    """يوحد شكل الاشتراك مع الشكل القياسي {endpoint, keys:{p256dh, auth}}"""
    if isinstance(sub, dict) and "endpoint" in sub:
        if "keys" not in sub and "p256dh" in sub:
            return {
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub.get("auth", "")},
            }
    return sub


def key_variants():
    """يرجع أشكال محتملة للمفتاح الخاص (PEM أو خام) للتجربة بالترتيب"""
    key = VAPID_PRIVATE.strip().strip('"').strip("'").strip()
    if "-----BEGIN" in key:
        return [key.replace("\\n", "\n")]
    variants = [key]
    try:
        raw = base64.urlsafe_b64decode(key + "=" * (-len(key) % 4))
        if len(raw) == 32:
            der = PKCS8_PREFIX + raw
            b64 = base64.b64encode(der).decode()
            lines = [b64[i:i + 64] for i in range(0, len(b64), 64)]
            variants.append(
                "-----BEGIN PRIVATE KEY-----\n"
                + "\n".join(lines)
                + "\n-----END PRIVATE KEY-----"
            )
    except Exception:
        pass
    return variants


def send_one(sub_info, payload_bytes):
    """يبعت إشعار واحد ويجرب أشكال المفتاح لحد ما واحد ينجح"""
    claims = {"sub": SITE_URL, "exp": int(time.time()) + 3600}
    last_err = None
    for key in key_variants():
        try:
            webpush(
                subscription_info=sub_info,
                data=payload_bytes,
                vapid_private_key=key,
                vapid_claims=claims,
                ttl=600,
            )
            return True, None
        except WebPushException as e:
            resp = getattr(e, "response", None)
            code = getattr(resp, "status_code", None)
            if code in (404, 410):
                raise  # الاشتراك نفسه ميّت - مش مشكلة مفتاح
            last_err = e
        except Exception as e:
            last_err = e
    return False, last_err


def main():
    if not ANON_KEY:
        tg_report("❌ اختبار الإشعارات: Secret اسمه SUPABASE_ANON_KEY مش موجود")
        sys.exit(1)

    try:
        subs = fetch_subs()
    except Exception as e:
        tg_report("❌ فشل قراءة push_subs من Supabase:\n" + str(e)[:300])
        sys.exit(1)

    if not subs:
        tg_report(
            "🔔 اختبار الإشعارات: مفيش ولا اشتراك في push_subs\n"
            "افتح الموقع من الموبايل، اضغط زرار 🔔 ووافق على الإشعارات،"
            "بعدين شغّل الاختبار تاني من Actions."
        )
        sys.exit(0)

    payload = {
        "title": "Edge Football 🔔",
        "body": "الإشعارات شغالة 100% ✅ رسالة تجريبية EDGE-TEST",
        "url": SITE_URL,
        "data": {
            "title": "Edge Football 🔔",
            "body": "الإشعارات شغالة 100% ✅ رسالة تجريبية EDGE-TEST",
            "url": SITE_URL,
        },
        "tag": "edge-test",
    }
    payload_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    ok_count = 0
    dead_deleted = 0
    fail_list = []

    for row in subs:
        row_id = row.get("id")
        sub_info = normalize_sub(row.get("subscription"))
        if not isinstance(sub_info, dict) or "endpoint" not in sub_info:
            fail_list.append((row_id, "شكل الاشتراك غلط"))
            continue
        try:
            sent, err = send_one(sub_info, payload_bytes)
            if sent:
                ok_count += 1
            else:
                fail_list.append((row_id, str(err)[:300]))
        except WebPushException as e:
            resp = getattr(e, "response", None)
            code = getattr(resp, "status_code", None)
            if code in (404, 410):
                delete_dead_sub(row_id)
                dead_deleted += 1
            else:
                fail_list.append((row_id, str(e)[:300]))
        except Exception as e:
            fail_list.append((row_id, str(e)[:300]))

    report = (
        "🔔 نتيجة اختبار إشعارات Edge Football:\n"
        "• المشتركين: " + str(len(subs)) + "\n"
        "• وصل بنجاح: " + str(ok_count) + "\n"
        "• اشتراكات ميتة اتمسحت: " + str(dead_deleted) + "\n"
        "• فشل: " + str(len(fail_list))
    )
    for row_id, err in fail_list[:3]:
        report += "\n❌ (id " + str(row_id) + "): " + str(err)

    if ok_count and not fail_list:
        report += "\n\n✅ كل حاجة تمام - الإشعارات واصلة!"
    elif ok_count:
        report += "\n\n⚠️ في إشعارات وصلت وفي مشاكل تانية."
    else:
        report += "\n\n❌ مفيش إشعار وصل - المشكلة في VAPID أو sw.js"

    print(report)
    tg_report(report)


if __name__ == "__main__":
    main()
