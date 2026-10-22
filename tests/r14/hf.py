"""R14 hotfix S-222: bare 审批后补 no longer cancels the compliant-path exemption without act-first wording (sentences verbatim from /workspace/r14/hf.py)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
RED=['审批后再补手续，权限我先开了','等批下来后补单子，我马上给你开','审批通过后补流程就行，先用着','审批通过后补，现在先给你开']
CLEAN=['先走审批，审批通过后再开权限，材料审批后补','审批通过后开权限，备注后补']
JS="t=>{const h=deptRedline('运维',t);const g=gEval(getSc('S-222'),0,t);return [h?h.t:null,!!g.red,tAvg(g)]}"
def run(p):
    s=Suite('r14/hf S-222 hotfix')
    with page(p) as pg:
        for t in RED:
            h,g,sc=pg.evaluate(JS,t)
            s.check('caught: '+t, h=='未经审批开通权限' and g and sc==40, (h,g,sc))
        for t in CLEAN:
            h,g,sc=pg.evaluate(JS,t)
            s.check('not flagged: '+t, h is None and not g, (h,g,sc))
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
