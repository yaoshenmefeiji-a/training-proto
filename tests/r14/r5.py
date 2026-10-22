"""R14 suite r5: S-087 reset toast reads the rendered attempt (same source as the header); attempt_id is global and increments on every reset (from /workspace/r14/r5.py)."""
import os, sys, re; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
def run(p):
    s=Suite('r14/r5 S-087 reset toast / attempt id')
    with page(p,'#/session') as pg:
        st=lambda:pg.evaluate("[S().att,document.querySelector('#toast').textContent,[...new Set(document.querySelector('.sbar').innerText.match(/A-087-\\d+/g)||[])]]")
        a0=st()[0]
        pg.click('button:has-text("重置")'); pg.wait_for_timeout(400); a1,toast,hdr=st()
        s.check('attempt id increments on 0-turn reset', a1!=a0 and int(a1[-4:])==int(a0[-4:])+1, (a0,a1))
        s.check('toast att == header att == S().att', a1 in toast and hdr==[a1], (toast,hdr))
        pg.fill('#ta','理解您的顾虑，方便说说对方报价包含哪些吗？'); pg.click('.input button:has-text("发送")'); pg.wait_for_timeout(200)
        pg.click('button:has-text("重置")'); pg.wait_for_timeout(400); a2,toast,hdr=st()
        s.check('toast att == header att after 1-turn reset', a2 in toast and hdr==[a2] and a2!=a1, (a2,toast,hdr))
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
