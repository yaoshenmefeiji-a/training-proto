"""v2ray GUI 练习 · 浏览器端到端检查 + 截图（headless Chromium / Playwright）。
用法：先在仓库根目录起静态服务（python3 -m http.server 18931），再
  BASE=http://127.0.0.1:18931 OUT=/workspace/proto-bot/v2ray-shots python3 tests/v2ray-e2e.py
"""
import os, json, sys
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE','http://127.0.0.1:18931'); OUT=os.environ.get('OUT','shots-v2ray'); os.makedirs(OUT,exist_ok=True)
results=[]
def check(name,cond,detail=''):
    results.append((name,bool(cond),detail)); print(('PASS ' if cond else 'FAIL ')+name+(' · '+str(detail) if detail else ''))
def shot(pg,name,el=None):
    pg.add_style_tag(content='.toast{display:none!important}'); pg.wait_for_timeout(150)
    p=os.path.join(OUT,name); (pg.locator(el) if el else pg).screenshot(path=p); print('  shot',p); return p
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1480,'height':940},device_scale_factor=1); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto(BASE+'/index.html#/overview'); pg.evaluate('localStorage.clear()')
    def seed(n):
        pg.evaluate('n=>{const s=JSON.parse(localStorage.tp_v2);s.seed=n;localStorage.tp_v2=JSON.stringify(s)}',n); pg.reload(); pg.wait_for_timeout(300)
    node=lambda: pg.evaluate('V2E.genNode(JSON.parse(localStorage.tp_v2).seed)')
    def menu(top,item):
        pg.click(f'.v2m:has-text("{top}")'); pg.click(f'.v2drop div:has-text("{item}")')
    def finish(n):
        pg.select_option('.v2status label:has-text("系统代理") select','auto')
        menu('设置','路由设置'); pg.check(f'#v2f input[name=routing][value={n["routeReq"]}]'); pg.click('.v2btns .v2b.p')
        menu('设置','参数设置'); pg.check('#v2f input[name=dns][value=remote]'); pg.click('.v2btns .v2b.p')
        menu('服务器','测试真连接延迟')
    # 1 入口
    pg.goto(BASE+'/index.html#/arena'); pg.wait_for_timeout(400)
    check('练习场里有入口卡片「v2ray 节点配置实操」',pg.locator('#v2entry:has-text("v2ray 节点配置实操")').count()==1)
    pg.locator('#v2entry').scroll_into_view_if_needed(); pg.evaluate('window.scrollBy(0,-120)'); shot(pg,'01-entry-arena.png')
    # 2 空客户端
    pg.click('#v2entry a.q'); pg.wait_for_timeout(300); seed(100036)
    check('空客户端：服务器列表为空',pg.locator('.v2empty').count()==1)
    shot(pg,'02-empty-client.png')
    # 3 添加 VMess 服务器（填好）
    n=node(); check('题目是 VMess + ws + tls',n['proto']=='vmess' and n['net']=='ws' and n['tls'])
    menu('服务器','添加[VMess]服务器')
    for k,v in [('alias',n['alias']),('addr',n['addr']),('port',str(n['port'])),('id',n['id']),('aid','0'),('host',n['host']),('path',n['path'])]: pg.fill(f'#v2f [name={k}]',v)
    pg.select_option('#v2f [name=net]','ws'); pg.select_option('#v2f [name=tls]','tls')
    shot(pg,'03-add-server-dialog-filled.png','#v2win')
    pg.click('.v2btns .v2b.p'); check('添加后列表有 1 台服务器',pg.locator('table.v2t tr').count()==2)
    pg.click('table.v2t tr >> nth=1'); pg.keyboard.press('Enter'); check('按 Enter 设为活动服务器',pg.locator('table.v2t tr.act').count()==1)
    finish(n); check('真连接延迟显示 ms',pg.locator('table.v2t td.v2ok').count()==1, pg.locator('table.v2t td.v2ok').first.inner_text() if pg.locator('table.v2t td.v2ok').count() else '')
    pg.click('button:has-text("打开检测页")'); check('检测页出口 IP 一致',pg.locator('#v2chk:has-text("✓ 一致")').count()==1)
    pg.click('button:has-text("✓ 提交")'); pg.wait_for_timeout(300)
    g=json.loads(pg.locator('#v2json').inner_text()); check('手动填写的标准配置 = 100（S-201）',g['total']==100,g['total'])
    check('成绩单标「模拟判分」',pg.locator('#v2grade .tag:has-text("模拟判分")').count()==1 and g['grading']=='模拟判分')
    sh=pg.evaluate('''()=>{const s=JSON.parse(localStorage.tp_v2),n=V2E.genNode(s.seed);return [1,2,3].map(()=>JSON.stringify(V2E.grade(s.cfg,n)))}''')
    check('浏览器里同一配置判 3 次一致',len(set(sh))==1)
    shot(pg,'05-grade-full-score.png','#v2grade')
    # 4 重新练习：导入（先坏链接，再改错 UUID 第 3 段），不开系统代理
    pg.click('#v2grade button:has-text("重新练习")'); pg.wait_for_timeout(200); seed(100008); n=node()
    check('重新练习：attempt 计数 +1',pg.locator('.meta:has-text("第 2 次练习")').count()==1)
    menu('服务器','从剪贴板导入'); pg.fill('#v2f [name=links]','vmess://这不是base64'); pg.click('.v2btns .v2b.p')
    check('坏链接：对话框里提示原因，不加服务器',('base64' in pg.locator('#v2err').inner_text()) and pg.locator('.v2empty').count()==1, pg.locator('#v2err').inner_text())
    shot(pg,'07-import-malformed-link.png','#v2win')
    link=pg.locator('#v2link').inner_text(); segs=n['id'].split('-'); segs[2]=('1' if segs[2][0]!='1' else '2')+segs[2][1:]; bad=link.replace(n['id'],'-'.join(segs))
    pg.fill('#v2f [name=links]',bad); pg.click('.v2btns .v2b.p'); pg.click('table.v2t tr >> nth=1'); menu('服务器','设为活动服务器'); menu('服务器','测试真连接延迟')
    check('UUID 错：真连接延迟显示「超时」',pg.locator('table.v2t td.v2to:has-text("超时")').count()==1)
    pg.click('button:has-text("打开检测页")'); check('检测页显示不一致 + 本机 IP',pg.locator('#v2chk:has-text("✕ 不一致")').count()==1 and pg.locator(f'#v2chk:has-text("{n["realIp"]}")').count()>0)
    pg.locator('#v2chk').scroll_into_view_if_needed(); shot(pg,'04-check-page-mismatch.png','#v2chk')
    pg.click('button:has-text("✓ 提交")'); pg.wait_for_timeout(300); g=json.loads(pg.locator('#v2json').inner_text())
    it={i['key']:i for i in g['items']}
    check('有扣分的成绩单：UUID 第 3 段 / 系统代理 / DNS 各扣在对的项',g['total']==47 and it['sysproxy']['score']==0 and it['dns']['score']==0 and any('UUID 第 3 段填错' in (f['cause'] or '') for f in it['node']['evidence']['fields']),g['total'])
    shot(pg,'06-grade-with-deductions.png','#v2grade')
    # 5 什么都不配直接交
    pg.click('#v2grade button:has-text("重新练习")'); pg.wait_for_timeout(200); pg.click('button:has-text("✓ 提交")'); pg.wait_for_timeout(300)
    g=json.loads(pg.locator('#v2json').inner_text()); check('什么都不配直接交：0 分，不报错（S-203）',g['total']==0 and not errs, errs)
    shot(pg,'08-grade-blank-zero.png','#v2grade')
    # 6 用分享链接导入（Shadowsocks）→ 满分
    pg.click('#v2grade button:has-text("重新练习")'); pg.wait_for_timeout(200); seed(100003); n=node()
    menu('服务器','从剪贴板导入'); pg.fill('#v2f [name=links]',pg.locator('#v2link').inner_text()); pg.click('.v2btns .v2b.p')
    pg.click('table.v2t tr >> nth=1'); pg.keyboard.press('Enter'); finish(n); pg.click('button:has-text("✓ 提交")'); pg.wait_for_timeout(300)
    g=json.loads(pg.locator('#v2json').inner_text()); check('从剪贴板导入 ss:// 链接 = 100',g['total']==100,g['total'])
    check('历次成绩 4 遍、计数正确',pg.evaluate('JSON.parse(localStorage.tp_v2h).length')==4)
    pg.goto(BASE+'/index.html#/arena'); pg.wait_for_timeout(300); check('入口卡片显示已交卷 4 遍',pg.locator('#v2entry:has-text("已交卷 4 遍")').count()==1)
    check('全程无脚本错误',not errs,errs)
    b.close()
fails=[r for r in results if not r[1]]; print(f'\n{len(results)-len(fails)}/{len(results)} passed'); sys.exit(1 if fails else 0)
