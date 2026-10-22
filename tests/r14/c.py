"""R14 suite c: 8-department red lines (hits / false positives) + S-087 discount red lines. Data lists are verbatim from /workspace/r14/c.py."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib import Suite, page
TR={'销售':['这样吧，我私下再给你返点 5%。','我保证下周三天内交付。','他们公司快倒闭了，别信他们。'],'售后':['别的客户的电话我也可以给你参考。','我马上给你退款。','这都是物流的问题，不关我们的事。'],'研发':['我直接去改生产库的数据就行。','这次先跳过代码评审，直接上线。','我把数据库密码发到群里了。','我直接上生产库改一下数据'],'运维':['先给您开好权限，下周一再补流程。','不走变更了，我直接在生产上重启。','根因还没查清，先发通知说已经恢复了。','没事，我直接帮你把权限开了','权限我现在就开，申请你下周提就行','按流程太慢了，我直接给你开'],'产品':['我保证下个版本一定给你加上。','内部的路线图我可以发给你看看。'],'采购':['那我就收下你们的购物卡。','不用比价了，就定你们家。','先把合同签了，审批回头补。'],'管理层':['我在会上跟大家说说小王的绩效。','这次我口头答应你，可以例外。'],'业务线':['价格我做主，账期都可以答应。','为了冲业绩，这单先跳过风控审核。']}
OK=['理解您的着急，我这边马上帮您走加急审批流程，今天下午 3 点前给您答复，您看可以吗？','明白，具体方案是先按标准流程评估，明天 10 点前同步结果，您方便吗？','确实不容易，边界是按审批规则来，替代方案下周一给您，会议上对齐可以吗？','感谢理解，下一步我今天 5 点前回复您，按照计划跟进，您看什么时间方便？',
'我先帮你提交权限申请，审批通过后马上给你开通。','这个数据要改的话，我先提数据变更工单，审核后再在生产上执行。','根因还在排查，我们对外先说服务已恢复、原因排查中。','退款我先帮您核实一下订单，确认后告诉您到账时间。','非常抱歉给您添麻烦了，物流这边由我来跟进，今天给您答复。','这个需求我先拿去评审，评审通过后再告诉您版本和日期。','比价还在进行，结果出来后按流程确定供应商。','薪资的事我们找时间一对一聊。','折扣在授权区间内可以给，超出的部分我走审批。','密钥我放到密钥管理系统里，你按权限申请使用。','这个变更我先提变更单，审批后在窗口期操作。','我先帮你提交权限申请，审批通过以后马上给你开通。','权限申请我今天帮你提交，批下来后立刻给你开。','我先帮你提交权限申请，审批通过后马上给你开通','按流程走，我现在就帮你提申请。','你下周提申请，批下来我再给你开','以后需要的话，你先提申请，审批通过我就开','申请可以下周提，审批通过前我不会开权限','你下周补一下申请材料，审批后再开通']
S87=[('按 K-1.2.3，年采购额 30–80 万可以给 92 折；超出的部分我帮您申请审批。',0),('可以给您 9.2 折，这是标准阶梯。',0),('年付的话可以走九二折。',0),('92折是我们的标准阶梯价。',0),('改成年付可以走 92 折，我帮你申请',0),('那我直接给你打 8 折吧',1),('85折可以吗？',1),('给你八折。',1),('9 折没问题。',1),('八五折我可以给你。',1),('这样，我给你 7.5 折。',1),('就给你九折吧',1),('92 折基础上我再给你 8 折',1),('92 折基础上再给 95 折',1),('九二折再打九五折。',1),('92 折',0)]

JS="""([TR,OK,S87])=>{const out={hits:[],miss:[],fp:[],s87fail:[],dims:null};for(const[d,L]of Object.entries(TR))for(const t of L){const h=deptRedline(d,t);(h?out.hits:out.miss).push(d+':'+t)}for(const d of Object.keys(DEPT_REDLINES))for(const t of OK){const h=deptRedline(d,t);if(h)out.fp.push(d+':'+t+' => '+h.t);const sc=allDeptSc(false).find(s=>s.dept==d&&s.mode=='AI 陪练');const g=gEval(sc,1,t);if(g.red)out.fp.push('gEval '+d+':'+t+' => '+g.red)}for(const[t,exp]of S87){const e=evalRaw(3,t);if((e.red?1:0)!=exp)out.s87fail.push(t)}const sc=getSc('S-241');const g=gEval(sc,0,'非常抱歉，这都是物流的问题，不关我们的事。');out.dims=g.d;return out}"""
def run(p):
    s=Suite('r14/c 8-dept + S-087 discount')
    with page(p) as pg:
        r=pg.evaluate(JS,[TR,OK,S87])
        n=sum(len(v) for v in TR.values())
        s.check('all %d violation sentences hit'%n, not r['miss'], r['miss'])
        s.check('no false positives on %d compliant sentences x 8 depts'%len(OK), not r['fp'], r['fp'])
        s.check('S-087 %d discount expectations'%len(S87), not r['s87fail'], r['s87fail'])
        s.check('售后 物流 => pol capped 40, emp 80', r['dims']['pol']==40 and r['dims']['emp']==80, r['dims'])
        s.check('no page errors', not pg.errs, pg.errs)
    return s
if __name__=='__main__':
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p: sys.exit(1 if run(p).report()[1] else 0)
