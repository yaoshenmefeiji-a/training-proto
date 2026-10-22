"""R14 suite s: S-087 stacking card quotes the first discount without inner spaces (from /workspace/r14/s.py)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
def run(p):
    s=Suite('r14/s S-087 stacking card')
    with page(p) as pg:
        for t,q in [('92 折基础上再给 95 折','92折'),('九二折再打九五折','九二折')]:
            r=pg.evaluate("t=>{const c=compose(evalRaw(3,t));return [c.red,c.k]}",t)
            s.check('stack card: '+t, ('你在%s的基础上又加了折扣'%q) in r[0] and r[1]=='K-1.2.5', r)
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
