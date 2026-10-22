// v2ray GUI 练习 · 判分回归测试（node --test tests/）
// 覆盖：参考答案 100、各种错法扣在对的项上且说明写对、什么都不配 0 分不报错、连判 3 次结果一致、分享链接导入、坏链接。
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {E,FIXTURES,NODE_WS,ref,mut,clone}=require('./v2ray-fixtures.js');
const sha=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
const item=(g,k)=>g.items.find(i=>i.key==k);
const allText=g=>g.items.flatMap(i=>i.key=='node'?(i.evidence.fields||[]).map(f=>f.cause).filter(Boolean):i.deductions.map(d=>d.text));
const VARIANTS=[];for(const proto of ['vmess','vless','ss'])for(const net of (proto=='ss'?['tcp']:['tcp','ws']))for(const tls of (proto=='ss'?[false]:[false,true]))for(const routeReq of ['global','bypass'])VARIANTS.push({proto,net,tls,routeReq});

test('分值：7 项满分合计 100，「节点参数正确」各字段合计 35',()=>{
 assert.equal(E.V2_ITEMS.reduce((a,x)=>a+x.max,0),100);
 assert.equal(E.V2_NODE_FIELDS.reduce((a,x)=>a+x.max,0),E.V2_ITEMS.find(x=>x.key=='node').max)});

test('参考答案 = 100（VMess / VLESS / Shadowsocks × tcp/ws × TLS 开关 × 两种路由要求）',()=>{
 VARIANTS.forEach((v,i)=>{const n=E.genNode(1000+i,v);const g=E.grade(ref(n),n);assert.equal(g.total,100,JSON.stringify(v));assert.equal(g.grading,'模拟判分');
  const cp=E.checkPage(ref(n),n);assert.equal(cp.exit_ip,n.exitIp);assert.equal(cp.match,true);assert.equal(cp.dns_leak,false)})});

test('随机出题 200 道，参考答案都是 100，总分 = 各项之和',()=>{for(let s=1;s<=200;s++){const n=E.genNode(s);const g=E.grade(ref(n),n);assert.equal(g.total,100,'seed '+s);assert.equal(g.total,g.items.reduce((a,x)=>a+x.score,0))}});

for(const f of FIXTURES)test('错法 '+f.name+(f.s202?'（S-202：'+f.s202+'）':''),()=>{
 const g=E.grade(f.cfg(f.node),f.node);
 assert.equal(g.total,f.total,'总分');
 assert.equal(g.total,g.items.reduce((a,x)=>a+x.score,0),'总分 = 各项之和');
 for(const k of f.zero)assert.equal(item(g,k).score,0,'该项应为 0：'+k);
 if(f.field){const fl=item(g,'node').evidence.fields.find(x=>x.key==f.field);assert.equal(fl.score,0,'字段应为 0：'+f.field);assert.match(fl.cause,f.expect)}
 else assert.ok(allText(g).some(t=>f.expect.test(t)),'说明里应有 '+f.expect);
 // 没被改的项保持满分（不乱扣）
 for(const it of g.items)if(!f.zero.includes(it.key)&&it.key!='node')assert.equal(it.score,it.max,'不该扣：'+it.key);
 if(f.dnsLeak)assert.equal(E.checkPage(f.cfg(f.node),f.node).dns_leak,true);
 // 说明里没有没填上的 {占位}
 for(const t of allText(g))assert.doesNotMatch(t,/\{[a-z_]+\}/)});

test('UUID 填错：只扣 UUID 这一格，连接项写明原因同「节点参数正确」',()=>{
 const f=FIXTURES.find(x=>x.name=='wrong-uuid');const g=E.grade(f.cfg(f.node),f.node);
 assert.equal(item(g,'node').score,27);assert.match(item(g,'conn').deductions[0].text,/超时。原因同「节点参数正确」：UUID 第 3 段填错/);
 assert.equal(E.checkPage(f.cfg(f.node),f.node).exit_ip,f.node.realIp)});

test('什么都不配直接交：0 分，不报错（S-203 / AC-207）',()=>{
 const n=NODE_WS;for(const c of [E.blankConfig(),undefined,null,{},{servers:null}]){let g;assert.doesNotThrow(()=>{g=E.grade(c,n)});assert.equal(g.total,0);g.items.forEach(i=>assert.equal(i.score,0,i.key));assert.ok(g.items.every(i=>i.deductions.length>0))}
 assert.doesNotThrow(()=>E.checkPage(E.blankConfig(),n))});

test('同一份配置判 3 次结果完全一样（S-201 / AC-202）',()=>{
 const cases=[ref(NODE_WS),E.blankConfig()].concat(FIXTURES.map(f=>f.cfg(f.node)));
 cases.forEach((c,i)=>{const n=i<2?NODE_WS:FIXTURES[i-2].node;const h=[1,2,3].map(()=>sha(E.grade(clone(c),n)));assert.equal(new Set(h).size,1)});
 // 同一个 seed 出的题也一样
 assert.equal(sha(E.genNode(123456)),sha(E.genNode(123456)))});

test('分享链接导入后满分（vmess:// base64 JSON、vless://、ss:// SIP002 与旧式）',()=>{
 VARIANTS.forEach((v,i)=>{const n=E.genNode(2000+i,v);const r=E.parseLinks(E.shareLink(n));assert.equal(r.errors.length,0);assert.equal(r.servers.length,1);const c=ref(n);c.servers=r.servers;assert.equal(E.grade(c,n).total,100,JSON.stringify(v))});
 const n=E.genNode(9,{proto:'ss'});const legacy='ss://'+btoa(n.enc+':'+n.id+'@'+n.addr+':'+n.port)+'#'+encodeURIComponent(n.alias);
 const r=E.parseLinks(legacy);const c=ref(n);c.servers=r.servers;assert.equal(E.grade(c,n).total,100);
 const plain=`ss://${n.enc}:${n.id}@${n.addr}:${n.port}`;const r2=E.parseLinks(plain);assert.equal(r2.servers[0].id,n.id)});

test('坏的分享链接：不抛异常、不加服务器、给出能看懂的原因',()=>{
 const bad=[['',/没有内容/],['http://example.com',/不是支持的分享链接/],['vmess://!!!notbase64',/不是有效的 base64/],['vmess://'+btoa('hello'),/不是 JSON/],
  ['vmess://'+btoa(JSON.stringify({add:'a.example',port:'443'})),/缺少用户ID/],['vmess://'+btoa(JSON.stringify({add:'a.example',port:'99999',id:'x'})),/不是 1–65535/],
  ['vless://@a.example:443',/缺少用户ID/],['vless://abc@a.example:port',/端口/],['ss://@@@',/解不出|缺少/],['ss://'+btoa('rc4-md5:pw')+'@a.example:8388',/不支持/],['vmess://',/base64/]];
 for(const [l,re] of bad){let r;assert.doesNotThrow(()=>{r=E.parseLinks(l)});assert.equal(r.servers.length,0,l);assert.match(r.errors.join(' '),re,l)}
 const mixed=E.parseLinks(E.shareLink(NODE_WS)+'\nvmess://garbage');assert.equal(mixed.servers.length,1);assert.equal(mixed.errors.length,1);assert.match(mixed.errors[0],/第 2 行/)});

test('检测页：系统代理关 → 出口是本机 IP；直连 → 不走代理；DNS 本机 → DNS 泄露',()=>{
 const n=NODE_WS;let cp=E.checkPage(mut(n,c=>{c.sysProxy='clear'}),n);assert.equal(cp.exit_ip,n.realIp);assert.equal(cp.match,false);assert.equal(cp.dns_leak,null);
 cp=E.checkPage(mut(n,c=>{c.routing='direct'}),n);assert.equal(cp.proxied,false);
 cp=E.checkPage(mut(n,c=>{c.dns='local'}),n);assert.equal(cp.match,true);assert.equal(cp.dns_leak,true);assert.equal(cp.webrtc_leak,true)});

test('扣分文案都来自 V2_DEDUCT 一张表，界面字段名表完整',()=>{
 const keys=new Set(Object.keys(E.V2_DEDUCT));FIXTURES.forEach(f=>E.grade(f.cfg(f.node),f.node).items.forEach(i=>i.deductions.forEach(d=>assert.ok(keys.has(d.code)||d.code=='blank_node','未登记的扣分码 '+d.code))));
 for(const k of ['addr','port','id','pwd','aid','enc','net','host','path','tls','alias'])assert.ok(E.V2_LABELS.fields[k])});

test('「真连接测试通过」「检测页出口 IP 一致」带 simulated: true，其他项不带（满分 / 扣分 / 白卷都一样）',()=>{
 const f=FIXTURES.find(x=>x.name=='wrong-uuid');
 for(const g of [E.grade(ref(NODE_WS),NODE_WS),E.grade(f.cfg(f.node),f.node),E.grade(E.blankConfig(),NODE_WS)]){
  for(const it of g.items){if(it.key=='conn'||it.key=='exit')assert.equal(it.simulated,true,it.key);else assert.equal('simulated' in it,false,it.key)}
  assert.equal(g.check_page.exit_ip_simulated,true);
  const j=JSON.parse(JSON.stringify(g));assert.equal(j.items.find(i=>i.name=='真连接测试通过').simulated,true);assert.equal(j.items.find(i=>i.name=='检测页出口 IP 一致').simulated,true)}
 assert.equal(E.V2_LABELS.simTag,'模拟')});


// 2026-10-22 PM 定稿的扣分文案（逐字核对；文案再改时同步改这里）
const COPY_2026_10_22={
 "uuid_seg": "UUID 第 {seg} 段填错，连接被服务器拒绝。把任务给的 UUID 整串复制粘贴进去，别手敲。",
 "uuid_format": "UUID 格式不对（应为 8-4-4-4-12 共 5 段），连接被服务器拒绝。把任务给的 UUID 整串复制粘贴进去。",
 "uuid_empty": "用户ID（UUID）没填，连接被服务器拒绝。把任务给的 UUID 粘贴进去。",
 "pwd": "密码和任务给的不一致，服务器解不开数据，连接失败。把任务给的密码复制粘贴进去。",
 "proto": "协议选成了 {got}，任务节点是 {want}，握手失败。删掉这条，用「添加[{want}]服务器」重新加。",
 "extra_proto": "协议选错了，额外ID 和加密方式也跟着对不上。先把协议改对，这一项会一起恢复。",
 "wsopt_net": "传输协议没选 ws，路径和伪装域名填了也不起作用。把传输协议改成 ws。",
 "tls_need": "任务节点开了 TLS，你没开，握手失败。传输层安全选 tls。",
 "tls_extra": "任务节点没开 TLS，你开了，握手失败。把传输层安全清空。",
 "no_server": "还没有活动服务器，这一项没法判断。先把任务给的节点设为活动服务器。",
 "sys_clear": "系统代理是「清除系统代理」，浏览器不经过 v2rayN，直接上网。改成「自动配置系统代理」。",
 "sys_keep": "系统代理是「不改变系统代理」，练习机原来没设代理，浏览器还是直连。改成「自动配置系统代理」。",
 "route_direct": "路由选了「直连」，所有流量都不经过代理。按任务要求改成「全局」或「绕过大陆」。",
 "dns_local": "DNS 选了「本机 DNS（直连）」，查域名的请求绕开了代理，直接发给本地运营商，你访问过哪些网站对方都看得到。在参数设置里改成「远程 DNS（走代理）」。",
 "port_conflict": "本地 SOCKS 端口和 HTTP 端口都是 {port}，v2ray 核心起不来。把两个端口改成不一样的，比如默认的 10808 和 10809。"
};
test('扣分文案与 PM 定稿逐字一致（V2_DEDUCT）',()=>{for(const [k,v] of Object.entries(COPY_2026_10_22))assert.equal(E.V2_DEDUCT[k],v,k)});
test('定稿文案填空后的整句（成绩单上显示的样子）',()=>{
 const txt=name=>{const f=FIXTURES.find(x=>x.name==name);return allText(E.grade(f.cfg(f.node),f.node))};
 assert.ok(txt('wrong-uuid').includes('UUID 第 3 段填错，连接被服务器拒绝。把任务给的 UUID 整串复制粘贴进去，别手敲。'));
 assert.ok(txt('wrong-protocol').includes('协议选成了 VLESS，任务节点是 VMess，握手失败。删掉这条，用「添加[VMess]服务器」重新加。'));
 assert.ok(txt('wrong-protocol').includes(COPY_2026_10_22.extra_proto));
 assert.ok(txt('wrong-transport').includes(COPY_2026_10_22.wsopt_net));
 assert.ok(txt('tls-off').includes(COPY_2026_10_22.tls_need));assert.ok(txt('tls-extra').includes(COPY_2026_10_22.tls_extra));
 assert.ok(txt('proxy-off').includes(COPY_2026_10_22.sys_clear));assert.ok(txt('proxy-keep').includes(COPY_2026_10_22.sys_keep));
 assert.ok(txt('routing-direct').includes(COPY_2026_10_22.route_direct));assert.ok(txt('dns-leak').includes(COPY_2026_10_22.dns_local));
 assert.ok(txt('local-port-conflict').some(t=>t.includes('本地 SOCKS 端口和 HTTP 端口都是 10808，v2ray 核心起不来。把两个端口改成不一样的，比如默认的 10808 和 10809。')));
 assert.ok(txt('active-none').includes(COPY_2026_10_22.no_server));
 const n=E.genNode(5,{proto:'ss'});const c=ref(n);c.servers[0].id='wrong';assert.ok(allText(E.grade(c,n)).includes(COPY_2026_10_22.pwd));
 const n2=E.genNode(6,{proto:'vless'});const c2=ref(n2);c2.servers[0].id='';assert.ok(allText(E.grade(c2,n2)).includes(COPY_2026_10_22.uuid_empty));c2.servers[0].id='abc';assert.ok(allText(E.grade(c2,n2)).includes(COPY_2026_10_22.uuid_format))});
