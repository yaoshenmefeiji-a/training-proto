// 从 v2ray-engine.js 的文案表生成字段表（界面显示的字就是这些表里的字）：node tests/v2ray-fields.js > v2ray-fields.md
const E=require('../v2ray-engine.js'),L=E.V2_LABELS;const o=[];const p=s=>o.push(s);
const tbl=(h,rows)=>{p('| '+h.join(' | ')+' |');p('|'+h.map(()=>'---').join('|')+'|');rows.forEach(r=>p('| '+r.map(x=>String(x).replace(/\|/g,'\\|')).join(' | ')+' |'));p('')};
p('# v2ray GUI 练习 · 字段表（草稿）');p('');
p('自动生成自 `v2ray-engine.js`（`V2_LABELS` / `V2_CHECKS` / `V2_ITEMS` / `V2_NODE_FIELDS` / `V2_DEDUCT` / `IMPORT_ERR` / `V2_CHECK_NOTE`）。界面直接读这些表，改文案只改 `v2ray-engine.js` 里的表，再跑 `node tests/v2ray-fields.js` 重新生成本文件。`{xx}` 是占位，判分时按实际值填。');p('');
p('## 1 客户端窗口');p('');
tbl(['位置','显示文字'],[['窗口标题',L.window],['菜单栏',Object.values(L.menu).join(' / ')],['「'+L.menu.server+'」菜单',Object.values(L.menuServer).join(' / ')],['「'+L.menu.sub+'」菜单（练习环境不可用）',Object.values(L.menuSub).join(' / ')],['「'+L.menu.setting+'」菜单',Object.values(L.menuSetting).join(' / ')],['「'+L.menu.help+'」菜单',Object.values(L.menuHelp).join(' / ')],['服务器列表列名',Object.values(L.cols).join(' / ')],['状态栏 · '+L.status.sysProxy,Object.values(E.SYS_PROXY).join(' / ')],['状态栏 · '+L.status.routing,Object.values(E.ROUTING).join(' / ')],['快捷键','Enter = '+L.menuServer.setActive+'；Delete = '+L.menuServer.del+'；Ctrl+R = '+L.menuServer.test+'；双击行 = '+L.menuServer.edit],['弹窗按钮',L.ok+' / '+L.cancel],['「模拟」标签','「'+L.simTag+'」，悬停提示：'+L.simTagTitle]]);
p('## 2 添加 / 编辑服务器弹窗');p('');
const F=L.fields;tbl(['字段','VMess','VLESS','Shadowsocks','可选值 / 说明'],[
 [F.alias,'✓','✓','✓','不填时用地址'],[F.addr,'✓','✓','✓','必填'],[F.port,'✓','✓','✓','必填，1–65535'],[F.id,'✓','✓','—','8-4-4-4-12'],[F.pwd,'—','—','✓',''],[F.aid,'✓','—','—','数字，任务要求 0'],
 [F.enc,'✓（'+E.VMESS_SEC.join(' / ')+'）','✓（文本，应为 none）','✓（'+E.SS_METHODS.join(' / ')+'）',''],[F.net,'✓','✓','—',E.NETS.join(' / ')],[F.host,'✓','✓','—','ws 用'],[F.path,'✓','✓','—','ws 用'],[F.tls,'✓','✓','—','（空）/ tls']]);
tbl(['弹窗','标题'],Object.entries(L.dialogTitle).map(([k,v])=>[E.PROTO_NAME[k],v]));
p('## 3 设置');p('');
tbl(['位置','字段','可选值 / 默认'],[[L.paramTitle,L.socksPort,'默认 10808'],[L.paramTitle,L.httpPort,'默认 10809'],[L.paramTitle,L.dnsLabel,Object.values(E.DNS_MODE).join(' / ')+'（练习初始：'+E.DNS_MODE[E.blankConfig().dns]+'）'],[L.routingTitle,'域名策略',Object.values(E.ROUTING).join(' / ')+'（初始：'+E.ROUTING[E.blankConfig().routing]+'）'],[L.importTitle,'粘贴框',L.importHint]]);
p('## 4 检测页检测项');p('');tbl(['key','检测项','行内标签','是否计分'],E.V2_CHECKS.map(c=>[c.key,c.name,c.key=='exit_ip'?'「'+L.simTag+'」':'—',c.key=='webrtc_leak'?'不计分（只展示）':c.key=='dns_leak'?'对应判分项「DNS 走代理」':'对应判分项「检测页出口 IP 一致」']));
tbl(['key','检测页说明文字'],Object.entries(E.V2_CHECK_NOTE));
p('## 5 判分项（合计 100）');p('');tbl(['key','判分项','分值','行内标签'],E.V2_ITEMS.map(i=>[i.key,i.name,i.max,i.simulated?'「'+L.simTag+'」（grade.json 里 "simulated": true）':'—']));
p('封顶：真连接失败或检测页出口 IP 不一致时，整回合最高 `V2_FAIL_CAP` = '+E.V2_FAIL_CAP+' 分，判「不通过」，成绩单顶部显示 `cap_not_connected`（见第 6 节）。走通代理后总分 ≥ 达标线（默认 '+E.V2_PASS_LINE+'，界面读 CONFIG.masteryLine）判「通过」。成绩单右上角标签：「通过」/「不通过」。');p('');p('「节点参数正确」按字段拆分：');p('');tbl(['key','字段','分值'],E.V2_NODE_FIELDS.map(i=>[i.key,i.name,i.max]));
p('## 6 扣分说明（`V2_DEDUCT`，文案同学改这张表）');p('');tbl(['code','说明文字'],Object.entries(E.V2_DEDUCT));
p('## 7 导入失败提示（`IMPORT_ERR`）');p('');tbl(['code','提示文字'],Object.entries(E.IMPORT_ERR));
process.stdout.write(o.join('\n'));
