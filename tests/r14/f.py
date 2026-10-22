"""R14 suite f: full 8-department regression (c.py lists + R14 additions: ops act-first / account lending, S-087 让点 stacking). Additions verbatim from /workspace/r14/f.py."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
from r14.c import TR, OK, S87
TR={k:list(v) for k,v in TR.items()}; OK=list(OK); S87=list(S87)
TR['运维']+=['审批通过后补，现在先给你开','审批后再补手续，权限我先开了','等批下来后补单子，我马上给你开','审批通过后补流程就行，先用着','申请慢慢走，账号我今天先给你','流程回头再说，你先用我的账号','用我的账号登一下就行','我先把账号借你，申请照样提','账号借给你用，申请回头提','借用一下我的账号吧']
OK+=['审批后补一下备注就行，权限等批了再开','按流程申请账号，批下来再给你','账号不能借，我帮你提申请','你的账号批下来后我第一时间通知你','审批通过后补个备注，权限等批了再开','账号不能借给你，我帮你提申请']
S87+=[('在 92 折上再给您让 5 个点',1),('92折基础上再让两个点',1),('92 折再便宜 3 个点',1),('92折已经是底价，让不了点',0),('92 折是标准阶梯价，没法再让点了',0),('要再让点得申请审批，我先给您 92 折',0),('先给您 92 折，审批我回头补，再让 3 个点',1)]

JS="""([TR,OK,S87])=>{const o={n:0,miss:[],fp:[],bad87:[],ops:[]};
  for(const[d,L]of Object.entries(TR))for(const t of L){o.n++;const h=deptRedline(d,t);if(!h)o.miss.push(d+':'+t);if(d=='运维'&&L.indexOf(t)>=4){const g=gEval(getSc('S-222'),1,t);o.ops.push([t,h&&h.t,tAvg(g),g.d.pol])}}
  for(const d of Object.keys(DEPT_REDLINES))for(const t of OK){const h=deptRedline(d,t);if(h)o.fp.push(d+':'+t+' => '+h.t);const sc=allDeptSc(false).find(s=>s.dept==d&&s.mode=='AI 陪练');const g=gEval(sc,1,t);if(g.red)o.fp.push('gE '+d+':'+t)}
  for(const[t,e]of S87){const r=evalRaw(3,t),c=compose(r);if((r.red?1:0)!=e)o.bad87.push(t);if(r.red&&tAvg(c)!=RL_CAP())o.bad87.push('round!=40 '+t)}
  return o}"""
def run(p):
    s=Suite('r14/f full 8-dept regression')
    with page(p) as pg:
        r=pg.evaluate(JS,[TR,OK,S87])
        s.check('8 departments covered', len(TR)==8, list(TR))
        s.check('all %d violation sentences hit'%r['n'], not r['miss'], r['miss'])
        s.check('0 false positives (%d compliant x 8 depts, deptRedline + gEval)'%len(OK), not r['fp'], r['fp'])
        s.check('S-087 %d expectations (red/clean, red round = 40)'%len(S87), not r['bad87'], r['bad87'])
        bad=[x for x in r['ops'] if not x[1] or x[2]!=40 or x[3]!=40]
        s.check('ops act-first / account lending => S-222 round 40 pol 40 (%d)'%len(r['ops']), not bad, bad)
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
