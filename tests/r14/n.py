"""R14 suite n: the 4 QA post-approval sentences are caught by the ops red line (verbatim from /workspace/r14/n.py)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
N=['审批通过后补，现在先给你开','审批后再补手续，权限我先开了','等批下来后补单子，我马上给你开','审批通过后补流程就行，先用着']
def run(p):
    s=Suite('r14/n ops post-approval sentences')
    with page(p) as pg:
        for t in N:
            r=pg.evaluate("t=>{const h=deptRedline('运维',t);const g=gEval(getSc('S-222'),1,t);return [h&&h.t,!!g.red]}",t)
            s.check('运维 hit: '+t, r[0]=='未经审批开通权限' and r[1], r)
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
