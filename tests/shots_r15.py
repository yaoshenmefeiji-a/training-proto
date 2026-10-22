"""R15 screenshots (not a regression suite): python3 tests/shots_r15.py [outdir]  (default /workspace/proto-bot/r15-shots)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import page
from r15 import FIX087, send087, reset087, NO
from playwright.sync_api import sync_playwright
O=sys.argv[1] if len(sys.argv)>1 else '/workspace/proto-bot/r15-shots'; os.makedirs(O,exist_ok=True)
out=[]
with sync_playwright() as p:
    with page(p,'#/session') as pg:
        reset087(pg); a=NO(pg)
        send087(pg,'理解您的顾虑，方便说说对方报价包含哪些吗？'); reset087(pg); b=NO(pg)
        pg.evaluate("document.querySelector('#toast').classList.add('on')")
        f=O+'/r15-01_reset_counter_1280.png'; pg.screenshot(path=f); out.append((f,'0-turn reset 第 %d 次 -> 1-turn reset 第 %d 次'%(a,b)))
    with page(p,'#/session') as pg:
        send087(pg,'给您打8折'); pg.evaluate("setTab('sco')"); pg.wait_for_timeout(200)
        f=O+'/r15-02_s087_red_capped_39_1280.png'; pg.screenshot(path=f); out.append((f,'header score '+pg.inner_text('#sc')))
    with page(p,'#/arena') as pg:
        pg.evaluate(FIX087,10); pg.evaluate("location.hash='#/session'"); pg.reload(); pg.wait_for_timeout(400)
        pg.locator('.sys.mentor').scroll_into_view_if_needed()
        f=O+'/r15-03_mentor_hint_attempt11_1280.png'; pg.screenshot(path=f); out.append((f,'第 %d 次 · '%NO(pg)+pg.inner_text('.sys.mentor').replace('\n',' / ')))
        pg.evaluate("location.hash='#/play?id=S-222'")
        pg.evaluate("""()=>{const hs=[];for(let i=1;i<=10;i++)hs.push({no:i,score:i%2?60:84,dims:{emp:60,val:60,pol:60,ctl:60},var:'V-222-a',vi:0,att:'A-222-'+String(i).padStart(4,'0'),turns:[]});localStorage.setItem('tp_dh_S-222',JSON.stringify(hs));localStorage.setItem('tp_dseq_S-222','10');localStorage.removeItem('tp_ds_S-222')}""")
        pg.reload(); pg.wait_for_timeout(400)
        f=O+'/r15-04_mentor_hint_S222_attempt11_1280.png'; pg.screenshot(path=f); out.append((f,'第 %d 次 · '%NO(pg)+pg.inner_text('.sys.mentor').replace('\n',' / ')))
for f,d in out: print(f,'|',d)
