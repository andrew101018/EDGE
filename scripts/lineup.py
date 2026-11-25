# usage: python3 lineup.py match.json out.png   (EDGE lineup card, 1080x1350, no credits, no numbering)
import json,sys,html,subprocess,os
d=json.load(open(sys.argv[1])); out=os.path.abspath(sys.argv[2])
def team(t,side):
    rows=t["rows"]  # GK first, then defence ... attack; each row = list of Arabic surnames
    if side=="top": rows=rows
    else: rows=list(reversed(rows))
    h=""
    for r in rows:
        h+='<div class="r">'+"".join(f'<div class="p"><i></i><span>{html.escape(n)}</span></div>' for n in r)+'</div>'
    return f'<div class="half {side}"><div class="tn">{html.escape(t["name"])}<small dir="ltr">{html.escape(t["formation"])}</small></div>{h}</div>'
css="""*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;font-family:'Noto Sans Arabic','Noto Naskh Arabic','Noto Sans',sans-serif;color:#fff;background:#0b1220;position:relative;overflow:hidden}
.top{height:200px;text-align:center;padding-top:18px}.comp{font-size:34px;color:#fbbf24;font-weight:700}.vs{font-size:44px;font-weight:900;margin-top:2px;line-height:1.3}.ko{font-size:28px;color:#b6c6e6;margin-top:2px}
.pitch{position:absolute;left:30px;right:30px;top:210px;bottom:84px;background:linear-gradient(#14532d,#166534);border:4px solid #e5e7eb;border-radius:18px;display:flex;flex-direction:column}
.mid{position:absolute;left:0;right:0;top:50%;border-top:4px solid #e5e7eb}.half{flex:1;display:flex;flex-direction:column;justify-content:space-around;padding:10px 0;position:relative}
.tn{text-align:center;font-size:34px;font-weight:800}.tn small{font-size:26px;color:#fbbf24;margin-right:14px;direction:ltr;display:inline-block}
.r{display:flex;justify-content:space-around}.p{display:flex;flex-direction:column;align-items:center;width:190px}.p i{width:30px;height:30px;border-radius:50%;background:#fff;border:5px solid #1d4ed8}.p span{font-size:27px;font-weight:700;text-align:center;margin-top:3px;text-shadow:0 2px 4px #000;line-height:1.1}
.brand{position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:34px;font-weight:900;color:#fbbf24;letter-spacing:8px}"""
body=f'<div class="top"><div class="comp">{html.escape(d["comp"])}</div><div class="vs">{html.escape(d["home"]["name"])} × {html.escape(d["away"]["name"])}</div><div class="ko">{html.escape(d["ko"])}</div></div><div class="pitch">{team(d["home"],"top")}<div class="mid"></div>{team(d["away"],"bot")}</div><div class="brand">EDGE</div>'
open(out+".html","w").write(f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{css}</style></head><body>{body}</body></html>')
subprocess.run(["google-chrome","--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars","--window-size=1080,1350",f"--screenshot={out}",f"file://{out}.html"],capture_output=True)
