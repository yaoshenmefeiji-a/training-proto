// v2ray GUI 练习 · 判分 fixture（PRD §22 S-202 的 7 种错法 + 其他回归用例）
// 每个 fixture：在参考答案上改一处 → 期望哪几项为 0、说明里必须出现什么字；raw = 各项合计（没走通代理时总分再封顶 V2_FAIL_CAP）。
const E=require('../v2ray-engine.js');
const clone=o=>JSON.parse(JSON.stringify(o));
// 固定题目：vmess + ws + tls，路由要求全局（检测页在分流规则的直连名单里）
const NODE_WS=E.genNode(424242,{proto:'vmess',net:'ws',tls:true,routeReq:'global'});
const NODE_RULE=E.genNode(515151,{proto:'vless',net:'tcp',tls:false,routeReq:'rule'});
const ref=n=>E.referenceConfig(n);
const mut=(n,f)=>{const c=clone(ref(n));f(c,c.servers[0],n);return c};
const flipUuidSeg=(id,seg)=>id.split('-').map((x,i)=>i==seg-1?x.split('').map(ch=>ch=='0'?'1':'0').join(''):x).join('-');
const FIXTURES=[
 {name:'wrong-address',s202:'地址/端口',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{s.addr='n99.lab-proxy.example'}),zero:['conn','exit'],field:'addr',expect:/地址填成了「n99\.lab-proxy\.example」/,raw:96-20},
 {name:'wrong-port',s202:'地址/端口',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{s.port=8443}),zero:['conn','exit'],field:'port',expect:/端口填成了 8443，应为 443/,raw:76},
 {name:'wrong-uuid',s202:'UUID',node:NODE_WS,cfg:n=>mut(n,(c,s,n)=>{s.id=flipUuidSeg(n.id,3)}),zero:['conn','exit'],field:'cred',expect:/UUID 第 3 段填错，连接被服务器拒绝/,raw:72},
 {name:'wrong-protocol',s202:'协议',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{s.proto='vless';s.enc='none';s.aid=null}),zero:['conn','exit'],field:'proto',expect:/协议选成了 VLESS，任务节点是 VMess/,raw:100-5-2-20},
 {name:'wrong-transport',s202:'传输方式',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{s.net='tcp';s.host='';s.path=''}),zero:['conn','exit'],field:'net',expect:/传输协议选了 tcp，任务节点用的是 ws/,raw:100-4-4-20},
 {name:'wrong-path',s202:'传输方式',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{s.path='/ray'}),zero:['conn','exit'],field:'wsopt',expect:/路径填成了「\/ray」/,raw:76},
 {name:'tls-off',s202:'TLS',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{s.tls=''}),zero:['conn','exit'],field:'tls',expect:/任务节点开了 TLS，你没开，握手失败/,raw:76},
 {name:'tls-extra',s202:'TLS',node:NODE_RULE,cfg:n=>mut(n,(c,s)=>{s.tls='tls'}),zero:['conn','exit'],field:'tls',expect:/任务节点没开 TLS，你开了/,raw:76},
 {name:'proxy-off',s202:'没开系统代理',node:NODE_WS,cfg:n=>mut(n,c=>{c.sysProxy='clear'}),zero:['sysproxy','exit'],expect:/清除系统代理/,raw:75},
 {name:'proxy-keep',s202:'没开系统代理',node:NODE_WS,cfg:n=>mut(n,c=>{c.sysProxy='keep'}),zero:['sysproxy','exit'],expect:/不改变系统代理/,raw:75},
 {name:'dns-leak',s202:'DNS 没走代理',node:NODE_WS,cfg:n=>mut(n,c=>{c.dns='local'}),zero:['dns'],expect:/本机 DNS（直连）/,raw:90,dnsLeak:true},
 {name:'routing-direct',node:NODE_WS,cfg:n=>mut(n,c=>{c.routing='direct'}),zero:['routing','exit'],expect:/路由选了「直连」/,raw:80},
 {name:'routing-rule-need-global',node:NODE_WS,cfg:n=>mut(n,c=>{c.routing='rule'}),zero:['routing','exit'],expect:/选「规则分流」时它不走代理/,raw:80},
 {name:'routing-global-need-rule',node:NODE_RULE,cfg:n=>mut(n,c=>{c.routing='global'}),zero:['routing'],expect:/任务要求「规则分流」，你选了「全局」/,raw:90},
 {name:'aid-nonzero',node:E.genNode(777,{proto:'vmess',net:'tcp',tls:false,routeReq:'global'}),cfg:n=>mut(n,(c,s)=>{s.aid=64}),zero:['conn','exit'],field:'extra',expect:/额外ID 填了 64/,raw:78},
 {name:'active-none',node:NODE_WS,cfg:n=>mut(n,c=>{c.active=-1}),zero:['active','sysproxy','routing','dns','conn','exit'],expect:/没有设为活动服务器/,raw:35},
 {name:'active-wrong',node:NODE_WS,cfg:n=>mut(n,(c,s)=>{c.servers.unshift(Object.assign({},s,{addr:'192.0.2.250',alias:'旧节点'}));c.active=0}),zero:['active','conn','exit'],expect:/活动服务器是「旧节点」/,raw:70},
 {name:'local-port-conflict',node:NODE_WS,cfg:n=>mut(n,c=>{c.http=10808}),zero:['conn','exit'],expect:/SOCKS 端口和 HTTP 端口都是 10808/,raw:80}
];
module.exports={E,FIXTURES,NODE_WS,NODE_RULE,ref,mut,clone,flipUuidSeg};
if(require.main===module){// node tests/v2ray-fixtures.js → 打印 fixture 清单（markdown）
 console.log('| fixture | S-202 错法 | 各项合计 | 总分 | 结论 | 得 0 分的项 | 扣分说明（节选） |\n|---|---|---|---|---|---|---|');
 for(const f of FIXTURES){const g=E.grade(f.cfg(f.node),f.node);const z=g.items.filter(i=>i.score==0).map(i=>i.name).join('、');const t=g.items.flatMap(i=>i.key=='node'?(i.evidence.fields||[]).filter(x=>x.cause).map(x=>x.cause):i.deductions.map(d=>d.text)).filter(x=>f.expect.test(x))[0]||'';console.log(`| ${f.name} | ${f.s202||'—'} | ${g.raw_total} | ${g.total} | ${g.verdict} | ${z} | ${t} |`)}}
