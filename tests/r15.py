"""R15 suite: items 1-5 (postApprove removed, reset attempt counter, S-087 red total = 40, 底价 not praised as a path, mentor handoff + AC-108)."""
import os, sys, re, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import Suite, page, ROOT

GO_LINE='这期间你可以接着练，每多练一遍，带教老师能看到的回放就多一遍。'
NO=lambda pg: pg.evaluate("(document.querySelector('.sbar').innerText.match(/第 (\\d+) 次/)||[])[1]|0")
def send087(pg,t):
    pg.fill('#ta',t); pg.click('.input button:has-text("发送")'); pg.wait_for_timeout(200)
def reset087(pg):
    pg.click('button:has-text("重置这一遍")'); pg.wait_for_timeout(350)
def sendD(pg,t):
    pg.fill('#dta',t); pg.click('.input button:has-text("发送")'); pg.wait_for_timeout(200)

def item1(s):
    src=open(os.path.join(ROOT,'scenarios.js'),encoding='utf-8').read()
    alljs=''.join(open(os.path.join(ROOT,f),encoding='utf-8').read() for f in ['app.js','scenarios.js','practice.js','dept.js'])
    s.check('1 RL_CANCEL.postApprove removed', 'postApprove' not in alljs)
    s.check('1 RL_CANCEL keeps actFirst/deferral/dismissal', all(k+':' in src for k in ['actFirst','deferral','dismissal']))

def item2(s,p):
    with page(p,'#/session') as pg:
        n0=NO(pg); s.check('2 S-087 fresh = 第 8 次 (7 seeded)', n0==8, n0)
        reset087(pg); s.check('2 S-087 reset with 0 turns: unchanged', NO(pg)==8, NO(pg))
        send087(pg,'理解您的顾虑，方便说说对方报价包含哪些吗？'); reset087(pg)
        s.check('2 S-087 reset after 1 submitted turn: +1', NO(pg)==9, NO(pg))
        reset087(pg); s.check('2 S-087 second 0-turn reset: unchanged', NO(pg)==9, NO(pg))
        send087(pg,'理解您的顾虑，方便说说对方报价包含哪些吗？'); send087(pg,'先不谈折扣，我帮您算笔账，一年少停机 39 小时。'); reset087(pg)
        s.check('2 S-087 reset after 2 turns: +1 only', NO(pg)==10, NO(pg))
        pg.reload(); pg.wait_for_timeout(400); s.check('2 S-087 counter persists across reload', NO(pg)==10, NO(pg))
        send087(pg,'理解您的顾虑，方便说说对方报价包含哪些吗？'); pg.evaluate("submitAtt()"); pg.wait_for_timeout(300)
        rv=pg.evaluate("document.querySelector('#view h1').innerText")
        s.check('2 S-087 submitted attempt is 第 10 次 on result page', '第 10 次' in rv, rv)
        pg.evaluate("location.hash='#/session'"); pg.wait_for_timeout(400)
        s.check('2 S-087 after submit: 第 11 次', NO(pg)==11, NO(pg))
        pg.evaluate("location.hash='#/arena'"); pg.wait_for_timeout(300)
        s.check('2 arena hero agrees (第 11 次)', '第 11 次练习' in pg.inner_text('.heroCard'), pg.inner_text('.heroCard')[:80])
        s.check('2 no page errors (S-087)', not pg.errs, pg.errs)
    with page(p,'#/play?id=S-222') as pg:
        s.check('2 S-222 fresh = 第 1 次', NO(pg)==1, NO(pg))
        pg.click('button:has-text("重置这一遍")'); pg.wait_for_timeout(300)
        s.check('2 S-222 reset 0 turns: unchanged', NO(pg)==1, NO(pg))
        sendD(pg,'理解你着急，我现在就帮你提权限申请，审批通过后马上开通，下午 3 点前同步进度。')
        pg.click('button:has-text("重置这一遍")'); pg.wait_for_timeout(300)
        s.check('2 S-222 reset after 1 turn: +1', NO(pg)==2, NO(pg))
        pg.click('button:has-text("重置这一遍")'); pg.wait_for_timeout(300)
        s.check('2 S-222 second 0-turn reset: unchanged', NO(pg)==2, NO(pg))
        s.check('2 no page errors (S-222)', not pg.errs, pg.errs)

def item3(s,p):
    with page(p,'#/session') as pg:
        send087(pg,'给您打8折')
        r=pg.evaluate("(()=>{const s=S(),c=calc(s.turns,s.hint);return [c.score,c.red,tAvg(fbOf(s.turns[0])),document.querySelector('#sc').textContent]})()")
        s.check('3 S-087 「给您打8折」 total = 40 (was 39)', r[0]==40 and r[1], r)
        s.check('3 S-087 header shows 40', r[3]=='40', r)
        s.check('3 S-087 red round score = 40', r[2]==40, r)
        z=pg.evaluate("[...document.querySelectorAll('#rp .row b')].filter(b=>b.textContent=='综合').map(b=>b.nextElementSibling.textContent)")
        s.check('3 S-087 right panel 综合 = 40', z and all(x=='40' for x in z), z)
        pg.evaluate("submitAtt()"); pg.wait_for_timeout(300)
        h=pg.evaluate("H().slice(-1)[0]")
        s.check('3 S-087 submitted record score 40, red, nc', h['score']==40 and h['red'] and h['nc'], (h['score'],h['red'],h.get('nc')))
        # other caps intact (synthetic turns via calc)
        q=pg.evaluate("""(()=>{const mk=t=>({i:0,t,k:'g',f:evalRaw(0,t)});const red=evalRaw(3,'给您打8折'),good={raw:1,i:0,d:{emp:96,val:96,pol:96,ctl:96},goods:[],misses:[],red:null,k:'K-5.3.1',bad:false};
          const T=f=>({i:0,t:'x',k:'g',f});return{
          longRed:calc([T(good),T(good),T(evalRaw(3,'理解您的顾虑，这样吧我直接给您打 8 折，明天把报价单发您可以吗？'))],0).score,
          shortRedHint3:calc([T(red)],3).score, shortRedHint2:calc([T(red)],2).score,
          noRedHint2:calc([T(good)],2).score, noRedHint3:calc([T(good)],3).score, noRed:calc([T(good)],0).score,
          stack:calc([T(evalRaw(3,'92 折再便宜 3 个点'))],0).score, nine:calc([T(evalRaw(3,'9 折没问题。'))],0).score}})()""")
        s.check('3 long red reply with strong other turns: total 40', q['longRed']==40, q)
        s.check('3 red + hint caps: still 40', q['shortRedHint3']==40 and q['shortRedHint2']==40, q)
        s.check('3 hint caps unchanged without red (90 / 80 / 96)', q['noRedHint2']==90 and q['noRedHint3']==80 and q['noRed']==96, q)
        s.check('3 K-1.2.5 stack + other short discount also total 40', q['stack']==40 and q['nine']==40, q)
        d=pg.evaluate("""(()=>{const sc=getSc('S-222');const f=gEval(sc,0,'先开了');const ok=gEval(sc,0,'理解你着急，我现在就帮你提权限申请，审批通过后马上开通，下午 3 点前同步进度。');return [gCalc([{t:'先开了',f}],0).score,gCalc([{t:'x',f:ok}],0).score,gCalc([],0).score]})()""")
        s.check('3 dept red total also exactly 40 (S-222 「先开了」)', d[0]==40, d)
        s.check('3 dept compliant total unaffected (>40), empty = null', d[1]>40 and d[2] is None, d)
        s.check('3 no page errors', not pg.errs, pg.errs)

def item4(s,p):
    with page(p,'#/session') as pg:
        J="t=>{const r=evalRaw(3,t),c=compose(r);return [!!r.red,r.goods.join('|'),c.good||'',c.fix||'']}"
        r=pg.evaluate(J,'92折已经是底价，让不了点')
        s.check('4 「92折已经是底价，让不了点」 not red', not r[0], r)
        s.check('4 「92折已经是底价，让不了点」 not praised for a price-cut path', '降价路径' not in r[1] and '降价路径' not in r[2], r)
        for t in ['92 折已经是最低价了','92折是底价，我这边没法再让了']:
            r=pg.evaluate(J,t); s.check('4 refusal not praised: '+t, '降价路径' not in r[1] and not r[0], r)
        for t in ['改成年付可以走 92 折，我帮你申请','92折是我们的标准阶梯价。','按 K-1.2.3，年采购额 30–80 万可以给 92 折；超出的部分我帮您申请审批。','92折已经是底价了，不过改成年付我可以帮您申请审批']:
            r=pg.evaluate(J,t); s.check('4 real path still credited: '+t, '合规降价路径' in r[1] and not r[0], r)
        # UI: turn 4 coach card
        for t in ['理解您的顾虑，方便说说对方报价包含哪些吗？','先不谈折扣，我帮您算笔账，一年少停机 39 小时约 78 万。','专属工程师一年能省约 300 工时，折合约 12 万。']: send087(pg,t)
        send087(pg,'92折已经是底价，让不了点')
        txt=pg.locator('.coach').last.inner_text()
        s.check('4 UI coach card for turn 4 has no path praise', '降价路径' not in txt.split('可以更好')[0] and '合规降价路径' not in txt, txt)
        s.check('4 no page errors', not pg.errs, pg.errs)

FIX087="""n=>{const hs=[];for(let i=1;i<=n;i++)hs.push({no:i,score:i%2?70:82,var:['V-087-c3','V-087-c4','V-087-c5'][i%3],dims:{emp:70,val:70,pol:70,ctl:70},turns:[]});localStorage.setItem('tp_hist',JSON.stringify(hs));localStorage.removeItem('tp_sess')}"""
def item5(s,p):
    # AC-108 fixture: 10 attempts, never mastered (alternating 70/82 so the X=5 consecutive rule does NOT fire; only Y=10)
    with page(p,'#/arena') as pg:
        pg.evaluate(FIX087,10); pg.evaluate("location.hash='#/session'"); pg.reload(); pg.wait_for_timeout(400)
        s.check('5 AC-108 fixture F-087-Y10: next attempt is 第 11 次', NO(pg)==11, NO(pg))
        bar=pg.locator('.sys.mentor').first.inner_text() if pg.locator('.sys.mentor').count() else ''
        s.check('5 mentor hint shown after 10th unmastered attempt', '已为你安排带教' in bar and '已练 10 遍还没掌握' in bar, bar)
        s.check('5 mentor hint has the verbatim line', GO_LINE in bar, bar)
        s.check('5 input enabled on 11th attempt', pg.evaluate("!document.querySelector('#ta').disabled"))
        send087(pg,'理解您的顾虑，方便说说对方报价包含哪些吗？')
        s.check('5 11th attempt accepts a turn', pg.evaluate("S().turns.length")==1)
        pg.evaluate("submitAtt()"); pg.wait_for_timeout(300)
        s.check('5 11th attempt submitted (history = 11)', pg.evaluate("H().length")==11)
        s.check('5 result page shows the line', GO_LINE in pg.inner_text('#view'))
        pg.evaluate("location.hash='#/session'"); pg.wait_for_timeout(400)
        s.check('5 12th attempt startable (第 12 次)', NO(pg)==12 and pg.evaluate("!document.querySelector('#ta').disabled"), NO(pg))
        for i in range(6):
            send087(pg,'理解您的顾虑，方便说说对方报价包含哪些吗？' if i==0 else '我帮您算一下，按每小时 2 万计，一年少停机 39 小时，周三下午 3 点再约您？')
        pg.evaluate("submitAtt()"); pg.wait_for_timeout(300)
        s.check('5 full 6-turn 12th attempt submits (history = 12)', pg.evaluate("H().length")==12)
        pg.evaluate("LS.set('myDept','销售')")  # S-087 is the 销售 department's first scenario on the arena hero
        pg.evaluate("location.hash='#/arena'"); pg.wait_for_timeout(300)
        s.check('5 arena shows mentor hint with the line + 第 13 次', GO_LINE in pg.inner_text('#view') and '第 13 次练习' in pg.inner_text('.heroCard'))
        pg.evaluate("askMentor()"); pg.wait_for_timeout(100)
        s.check('5 「请求带教」 toast includes the line', GO_LINE in pg.inner_text('#toast'))
        s.check('5 no page errors (S-087)', not pg.errs, pg.errs)
    with page(p,'#/arena') as pg:
        pg.evaluate("location.hash='#/session'"); pg.wait_for_timeout(400)
        bar=pg.inner_text('.sys.mentor') if pg.locator('.sys.mentor').count() else ''
        s.check('5 seeded X-rule (7 fails in a row) hint also carries the line', '最近 7 遍未达标' in bar and GO_LINE in bar, bar)
    with page(p,'#/arena') as pg:
        pg.evaluate("""()=>{const hs=[];for(let i=1;i<=10;i++)hs.push({no:i,score:i>7?88:60,var:['V-087-c3','V-087-c4','V-087-c5'][i%3],dims:{emp:80,val:80,pol:80,ctl:80},turns:[]});localStorage.setItem('tp_hist',JSON.stringify(hs));localStorage.removeItem('tp_sess')}""")
        pg.evaluate("location.hash='#/session'"); pg.reload(); pg.wait_for_timeout(400)
        s.check('5 mastered at 10 attempts: no mentor hint', pg.locator('.sys.mentor').count()==0)
    with page(p,'#/arena') as pg:
        pg.evaluate("""()=>{const hs=[];for(let i=1;i<=10;i++)hs.push({no:i,score:i%2?60:84,dims:{emp:60,val:60,pol:60,ctl:60},var:'V-222-a',vi:0,att:'A-222-'+String(i).padStart(4,'0'),turns:[]});localStorage.setItem('tp_dh_S-222',JSON.stringify(hs));localStorage.setItem('tp_dseq_S-222','10')}""")
        pg.evaluate("location.hash='#/play?id=S-222'"); pg.reload(); pg.wait_for_timeout(400)
        s.check('5 AC-108 fixture F-222-Y10: S-222 第 11 次', NO(pg)==11, NO(pg))
        bar=pg.inner_text('.sys.mentor') if pg.locator('.sys.mentor').count() else ''
        s.check('5 S-222 mentor hint (Y=10) with the line', '已练 10 遍还没掌握' in bar and GO_LINE in bar, bar)
        sendD(pg,'理解你着急，我现在就帮你提权限申请，审批通过后马上开通，下午 3 点前同步进度。')
        s.check('5 S-222 11th attempt accepts a turn', pg.evaluate("dS('S-222').turns.length")==1)
        pg.evaluate("dSubmit()"); pg.wait_for_timeout(300)
        s.check('5 S-222 11th attempt submitted (history = 11)', pg.evaluate("dH('S-222').length")==11)
        pg.evaluate("location.hash='#/play?id=S-222'"); pg.wait_for_timeout(400)
        s.check('5 S-222 12th attempt startable', NO(pg)==12 and pg.evaluate("!document.querySelector('#dta').disabled"), NO(pg))
        s.check('5 no page errors (S-222)', not pg.errs, pg.errs)

def run(p):
    s=Suite('r15 items 1-5')
    item1(s); item2(s,p); item3(s,p); item4(s,p); item5(s,p)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
