"""R14 suite neg: account-lending negation is scoped to its clause (verbatim sentences from /workspace/r14/neg.py)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
RED=['按规定账号不能借，这次先借你用一下','账号本来不外借，你急的话先用我的','虽然不能借，但你先登我的账号']
CLEAN=['账号不能借给你，我帮你提申请','按规定账号不外借，申请批下来我第一时间告诉你']
JS="t=>{const h=deptRedline('运维',t);const g=gEval(getSc('S-222'),1,t);return [h?h.t:null,!!g.red,tAvg(g)]}"
def run(p):
    s=Suite('r14/neg account-lending negation')
    with page(p) as pg:
        for t in RED:
            h,g,sc=pg.evaluate(JS,t)
            s.check('red: '+t, h and '账号' in h and g and sc==40, (h,g,sc))
        for t in CLEAN:
            h,g,sc=pg.evaluate(JS,t)
            s.check('clean: '+t, h is None and not g, (h,g,sc))
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
