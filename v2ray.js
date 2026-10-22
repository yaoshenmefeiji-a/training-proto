// ===== v2ray.js：v2ray 节点配置实操（PRD §22 第一步：网页模拟判分） =====
// 界面：仿 v2rayN Windows 客户端（纯 HTML/CSS 绘制）+ 练习任务 + 模拟检测页 + 成绩单。
// 判分、出题、分享链接解析都在 v2ray-engine.js（V2E），这里只管界面和本机存档（localStorage：tp_v2 / tp_v2h / tp_v2seq）。
(function(){
const E=window.V2E,L=E.V2_LABELS;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vH=()=>LS.get('v2h',[]);
function newAttempt(){const seq=LS.get('v2seq',0)+1;LS.set('v2seq',seq);const seed=100000+Math.floor(Math.random()*900000);
 return{no:vH().length+1,att:'A-V2R-'+pad(seq),seed,cfg:E.blankConfig(),sel:-1,tests:{},log:[{t:'v2ray 核心已启动（练习模拟）· 监听 SOCKS 127.0.0.1:10808 / HTTP 127.0.0.1:10809'}],check:false,submitted:null}}
const V=()=>LS.get('v2',null)||(LS.set('v2',newAttempt()),LS.get('v2'));
const vSave=s=>LS.set('v2',s);
const node=s=>E.genNode(s.seed);
let dlg=null,menu=null;                         // 当前弹窗 / 展开的菜单（不存档）
const log=(s,t)=>{s.log.push({t});if(s.log.length>60)s.log=s.log.slice(-60)};
const rer=()=>{const el=$('#v2root');if(el)el.innerHTML=body()};
const ms=v=>v==null?'':v<0?'超时':v+' ms';

// ---------------- 客户端窗口 ----------------
const MENUS={
 server:[['addVmess',"v2Dlg('add','vmess')"],['addVless',"v2Dlg('add','vless')"],['addSs',"v2Dlg('add','ss')"],'-',['importClip',"v2Dlg('import')"],'-',['setActive','v2Active()','Enter'],['edit','v2Edit()'],['del','v2Del()','Delete'],'-',['test','v2Test()','Ctrl+R']],
 sub:[['subSetting','v2NoSub()',null,1],['subUpdate','v2NoSub()',null,1]],
 setting:[['param',"v2Dlg('param')"],['routing',"v2Dlg('routing')"]],
 help:[['guide',"v2Dlg('guide')"],['about',"v2Dlg('about')"]]};
const MLAB={server:L.menuServer,sub:L.menuSub,setting:L.menuSetting,help:L.menuHelp};
function menuBar(){return`<div class="v2menu">${Object.keys(MENUS).map(k=>`<div class="v2m ${menu==k?'on':''}" onclick="v2Menu(event,'${k}')">${L.menu[k]}${menu==k?`<div class="v2drop">${MENUS[k].map(x=>x=='-'?'<hr>':`<div class="${x[3]?'dis':''}" onclick="event.stopPropagation();v2Menu(event,null);${x[1]}">${MLAB[k][x[0]]}${x[2]?`<kbd>${x[2]}</kbd>`:''}</div>`).join('')}</div>`:''}</div>`).join('')}</div>`}
function table(s){const c=s.cfg,C=L.cols;
 if(!c.servers.length)return`<div class="v2empty">服务器列表是空的。<br>用「${L.menu.server}」菜单添加服务器，或「${L.menuServer.importClip}」导入分享链接。</div>`;
 return`<table class="v2t"><tr><th style="width:26px"></th><th>${C.type}</th><th>${C.alias}</th><th>${C.addr}</th><th>${C.port}</th><th>${C.enc}</th><th>${C.net}</th><th>${C.host}</th><th>${C.tls}</th><th>${C.sub}</th><th>${C.delay}</th></tr>${c.servers.map((v,i)=>`<tr class="${s.sel==i?'sel':''} ${c.active==i?'act':''}" onclick="v2Sel(${i})" ondblclick="v2Sel(${i});v2Edit()"><td>${c.active==i?'<b class="v2on">✔</b>':''}</td><td>${E.PROTO_NAME[v.proto]}</td><td>${esc(v.alias)}</td><td>${esc(v.addr)}</td><td>${esc(v.port)}</td><td>${esc(v.enc)}</td><td>${v.proto=='ss'?'tcp':esc(v.net)}</td><td>${esc(v.host)}</td><td>${v.tls=='tls'?'tls':''}</td><td></td><td class="${s.tests[i]<0?'v2to':s.tests[i]>0?'v2ok':''}">${ms(s.tests[i])}</td></tr>`).join('')}</table>`}
function statusBar(s){const c=s.cfg,a=c.servers[c.active];const sel=(k,O,f)=>`<select onchange="v2Set('${k}',this.value)" ${s.submitted?'disabled':''}>${Object.entries(O).map(([v,t])=>`<option value="${v}" ${c[k]==v?'selected':''}>${t}</option>`).join('')}</select>`;
 return`<div class="v2status"><label>${L.status.sysProxy} ${sel('sysProxy',E.SYS_PROXY)}</label><label>${L.status.routing} ${sel('routing',E.ROUTING)}</label><span>SOCKS5 127.0.0.1:${esc(c.socks)}</span><span>HTTP 127.0.0.1:${esc(c.http)}</span><span class="ml">活动服务器：<b>${a?esc(a.alias||a.addr):'无'}</b></span></div>`}
const fRow=(lab,inner)=>`<label>${lab}</label><div>${inner}</div>`;
const inp=(n,v,ph)=>`<input name="${n}" value="${esc(v)}" ${ph?`placeholder="${ph}"`:''} spellcheck="false" autocomplete="off">`;
const selO=(n,opts,v)=>`<select name="${n}">${opts.map(o=>{const [val,t]=Array.isArray(o)?o:[o,o];return`<option value="${val}" ${String(v)==String(val)?'selected':''}>${t}</option>`}).join('')}</select>`;
function dialog(s){if(!dlg)return'';const F=L.fields,c=s.cfg;let title,inner,ok;
 if(dlg.t=='add'){const v=dlg.v,p=v.proto;title=L.dialogTitle[p];
  inner=fRow(F.alias,inp('alias',v.alias,'例如 练习节点'))+fRow(F.addr,inp('addr',v.addr,'域名或 IP'))+fRow(F.port,inp('port',v.port,'1–65535'))
   +(p=='ss'?fRow(F.pwd,inp('id',v.id))+fRow(F.enc,selO('enc',E.SS_METHODS,v.enc))
    :fRow(F.id,inp('id',v.id,'8-4-4-4-12'))+(p=='vmess'?fRow(F.aid,inp('aid',v.aid))+fRow(F.enc,selO('enc',E.VMESS_SEC,v.enc)):fRow(F.enc,inp('enc',v.enc)))
     +`<div class="v2sep">底层传输方式（transport）</div>`+fRow(F.net,selO('net',E.NETS,v.net))+fRow(F.host,inp('host',v.host,'ws 填 Host；tcp 留空'))+fRow(F.path,inp('path',v.path,'ws 路径，例如 /ray'))+fRow(F.tls,selO('tls',[['','（空）'],['tls','tls']],v.tls)));
  ok='v2SaveSrv()'}
 else if(dlg.t=='import'){title=L.importTitle;inner=`<div style="grid-column:1/3" class="s13">${L.importHint}</div><textarea name="links" style="grid-column:1/3;height:110px" spellcheck="false">${esc(dlg.text||'')}</textarea>`;ok='v2Import()'}
 else if(dlg.t=='param'){title=L.paramTitle;inner=fRow(L.socksPort,inp('socks',c.socks))+fRow(L.httpPort,inp('http',c.http))+fRow(L.dnsLabel,Object.entries(E.DNS_MODE).map(([k,t])=>`<label class="v2r"><input type="radio" name="dns" value="${k}" ${c.dns==k?'checked':''}> ${t}</label>`).join(''));ok='v2SaveParam()'}
 else if(dlg.t=='routing'){title=L.routingTitle;const D={global:'所有网站都走代理',rule:'按分流规则：直连名单里的网站直连，其他走代理',direct:'所有网站都直连，不走代理'};inner=fRow('域名策略',Object.entries(E.ROUTING).map(([k,t])=>`<label class="v2r"><input type="radio" name="routing" value="${k}" ${c.routing==k?'checked':''}> ${t} <span class="muted">· ${D[k]}</span></label>`).join(''));ok='v2SaveRouting()'}
 else if(dlg.t=='guide'){title=L.menuHelp.guide;inner=`<div style="grid-column:1/3" class="s13">这是练习用的模拟客户端：界面仿 v2rayN，不含真实代理核心，也不会改你电脑的设置。<br>按右边「练习任务」配好节点，设为活动服务器，开系统代理，选路由和 DNS，测延迟，再打开检测页看出口 IP，最后提交。</div>`;ok=null}
 else {title=L.menuHelp.about;inner=`<div style="grid-column:1/3" class="s13">${L.window}<br>公司培训系统 · 练习场。网页模拟版，判分在浏览器里算，不代表真实连通。</div>`;ok=null}
 return`<div class="v2dlg" onclick="if(event.target==this)v2Close()"><div><div class="v2dh"><b>${title}</b><span class="ml v2x" onclick="v2Close()">✕</span></div><div class="v2form" id="v2f">${inner}</div><div class="v2err" id="v2err"></div><div class="v2btns">${ok?`<button class="v2b p" onclick="${ok}">${L.ok}</button><button class="v2b" onclick="v2Close()">${L.cancel}</button>`:`<button class="v2b p" onclick="v2Close()">${L.ok}</button>`}</div></div></div>`}
function client(s){return`<div class="v2win ${dlg?'hasdlg':''}" id="v2win"><div class="v2title"><span class="v2ico">V</span>${L.window}<span class="v2wc"><i>—</i><i>☐</i><i>✕</i></span></div>${menuBar()}<div class="v2tbl">${table(s)}</div><div class="v2log">${s.log.slice(-6).map(x=>`<div>${esc(x.t)}</div>`).join('')}</div>${statusBar(s)}${dialog(s)}${s.submitted?`<div class="v2lock"><div>已交卷 · 点「重新练习」开始第 ${vH().length+1} 次</div></div>`:''}</div>`}

// ---------------- 练习任务 / 检测页 / 成绩单 ----------------
function task(s){const n=node(s),F=L.fields;const rows=[['协议',E.PROTO_NAME[n.proto]],[F.addr,n.addr],[F.port,n.port],[n.proto=='ss'?F.pwd:F.id,n.id]]
 .concat(n.proto=='vmess'?[[F.aid,0]]:[]).concat(n.proto!='vmess'?[[F.enc,n.enc]]:[])
 .concat(n.proto=='ss'?[]:[[F.net,n.net]].concat(n.net=='ws'?[[F.host,n.host],[F.path,n.path]]:[]).concat([[F.tls,n.tls?'开（tls）':'关']]));
 return`<div class="card"><div class="ch"><h2>练习任务</h2><span class="tag y">练习数据</span><span class="r muted s13">第 ${s.no} 次 · 每次一组新节点</span></div>
 <table class="v2task">${rows.map(r=>`<tr><th>${r[0]}</th><td class="mono">${esc(r[1])}</td></tr>`).join('')}</table>
 <div class="kref on" style="margin-top:10px"><b>目标：出口 IP 应为 <span class="mono">${n.exitIp}</span></b><div class="s13" style="margin-top:4px">路由要求：<b>${E.ROUTING[n.routeReq]}</b>${n.checkOnDirectList?'（检测页在分流规则的直连名单里）':'（检测页不在直连名单里）'} · DNS 要走代理，不能泄露</div><div class="s13 muted">检测页 ${'https://'+n.checkHost+'/'}</div></div>
 <div class="s13 muted" style="margin:10px 0 4px">也可以用分享链接导入（同一个节点）：</div><div class="v2link mono" id="v2link">${esc(E.shareLink(n))}</div><div class="row" style="margin-top:6px"><button class="btn sm" onclick="v2Copy()">复制链接</button><span class="muted s13">到客户端「${L.menu.server} › ${L.menuServer.importClip}」里粘贴</span></div>
 <div class="list s13" style="margin-top:10px">${['添加服务器（手动填或导入链接）','选中它，按 Enter 设为活动服务器','状态栏把系统代理改成「自动配置系统代理」','按任务选路由（初始是「直连」）；「设置 › 参数设置」里把 DNS 改成走代理','「测试真连接延迟」看到 ms，再「打开检测页」核对出口 IP，最后提交'].map((t,i)=>`<div style="padding:5px 0"><span class="tag">${i+1}</span>${t}</div>`).join('')}</div></div>`}
const simTag=id=>`<span class="tag o v2sim" data-sim="${id}" title="${L.simTagTitle}">${L.simTag}</span>`;
const yn=v=>v===null?'<span class="tag">不判断</span>':v?'<span class="tag r">是</span>':'<span class="tag g">否</span>';
function checkCard(s){if(!s.check)return'';const n=node(s),cp=E.checkPage(s.cfg,n),K=Object.fromEntries(E.V2_CHECKS.map(x=>[x.key,x.name]));
 return`<div class="card v2chk" id="v2chk" style="margin-top:16px"><div class="ch"><h2>检测页</h2><span class="tag o">模拟</span><span class="muted s13">按当前客户端配置推出来的结果，改了配置会跟着变</span><button class="btn sm r" onclick="v2Check(false)">关闭</button></div>
 <div class="v2url"><span>🔒</span>${esc(cp.url)}</div>
 <div class="v2kpis"><div class="kpi" data-check="exit_ip"><div class="l">${K.exit_ip} ${simTag('check-exit')}</div><div class="n mono" style="font-size:22px">${cp.exit_ip}</div><div class="muted s13">${cp.proxied?'练习节点出口':'本机真实 IP'}</div></div><div class="kpi"><div class="l">${K.match}</div><div class="n" style="font-size:22px">${cp.match?'<span class="up" style="font-size:22px">✓ 一致</span>':'<span class="dn" style="font-size:22px">✕ 不一致</span>'}</div><div class="muted s13">任务要求 ${cp.expected_ip}</div></div><div class="kpi"><div class="l">${K.dns_leak}</div><div class="n" style="font-size:22px">${yn(cp.dns_leak)}</div></div><div class="kpi"><div class="l">${K.webrtc_leak}</div><div class="n" style="font-size:22px">${yn(cp.webrtc_leak)}</div><div class="muted s13">本练习不计分</div></div></div>
 <div class="list s13" style="margin-top:8px">${cp.notes.map(t=>`<div>${esc(t)}</div>`).join('')}</div></div>`}
function gradeCard(s){const r=s.submitted;if(!r)return'';const g=r.grade,pass=g.passed,hs=vH();
 return`<div class="card" id="v2grade" style="margin-top:16px"><div class="ch"><h2>成绩单 · 第 ${r.no} 次</h2><span class="tag o">模拟判分</span><span class="muted s13">attempt ${r.att} · seed ${r.seed}</span><span class="ml tag ${pass?'g':'r'}" id="v2verdict">${g.verdict}</span><span class="tag ${pass?'g':'o'}" style="font-size:16px;padding:3px 12px">${g.total} / 100</span></div>${g.cap?`<div class="red" id="v2cap">⛔ ${esc(g.cap.text)}${g.cap.applied?`（各项合计 ${g.raw_total} 分，按 ${g.cap.value} 分计）`:''}</div>`:''}
 <div class="sub" style="margin-bottom:12px">${pass?'这一遍达标了。':g.connected?'还差 '+(g.pass_line-g.total)+' 分达标。':'这一遍没有走通代理，判不通过。'}按交卷时的配置重测一次连接、重开一次检测页来判分。这是网页模拟判分，不连真实节点，只说明配置思路对不对，不代表真实连通。</div>
 <div class="grid g21"><div>${g.items.map(it=>`<div class="dim" style="margin-bottom:14px"><div class="row" data-item="${it.key}"><b>${it.name}</b>${it.simulated?simTag(it.key):''}<b class="r">${it.score}</b><span class="muted" style="width:40px">/ ${it.max}</span></div>${bar(Math.round(it.score/it.max*100),it.score==it.max?'':it.score?'#b48a2c':'#b2463b')}
  ${it.key=='node'&&it.evidence.fields&&it.evidence.fields.length?`<table class="v2sub">${it.evidence.fields.map(f=>`<tr><td>${f.name}</td><td class="mono" style="width:60px">${f.score} / ${f.max}</td><td>${f.cause?`<span class="dn">${esc(f.cause)}</span>`:'<span class="up">✓</span>'}</td></tr>`).join('')}</table>`:it.deductions.map(d=>`<div class="pt"><span class="tag ${d.linked?'y':'o'}">−${d.points}</span><div style="flex:1">${esc(d.text)}</div></div>`).join('')}</div>`).join('')}</div>
 <div><div class="kref"><div class="muted s13">检测页（交卷时）</div><div class="row" data-check="exit_ip"><span>出口 IP</span>${simTag('grade-check-exit')}<b class="mono r">${g.check_page.exit_ip}</b></div><div class="row"><span>与任务要求一致</span><span class="r">${g.check_page.match?'<span class="tag g">是</span>':'<span class="tag r">否</span>'}</span></div><div class="row"><span>DNS 泄露</span><span class="r">${yn(g.check_page.dns_leak)}</span></div><div class="row"><span>WebRTC 泄露 <span class="muted s13">（不计分）</span></span><span class="r">${yn(g.check_page.webrtc_leak)}</span></div></div>
 ${hs.length>1?`<div class="muted s13" style="margin:8px 0 4px">历次成绩（第几次 · 分数）</div><div class="row" style="flex-wrap:wrap;gap:6px">${hs.slice(-10).map(h=>`<span class="tag ${h.score>=CONFIG.masteryLine?'g':'o'}">第 ${h.no} 次 · ${h.score}</span>`).join('')}</div>`:''}<div class="row" style="margin-top:10px"><a class="btn" href="#/arena">结束</a><button class="btn p big r" onclick="v2Retry()">↺ 重新练习（第 ${hs.length+1} 次）</button></div></div></div>
 <div class="ch" style="margin-top:14px;display:flex;align-items:center;gap:10px"><h2>原始结果 grade.json</h2><span class="muted s13">培训系统存这一份；同一份配置判几次结果都一样</span><button class="btn sm ml" onclick="v2CopyJson()">复制 JSON</button></div><pre class="term v2json" id="v2json">${esc(JSON.stringify(Object.assign({attempt_id:r.att,attempt_no:r.no,submitted_at:r.at},g),null,2))}</pre></div>`}
function body(){const s=V(),hs=vH();
 return`<div class="page"><div class="hd"><div><div class="eyebrow">沙盒实操 · 售后部门 · 技术实操</div><h1>v2ray 节点配置实操 <span class="tag o" style="vertical-align:middle">模拟判分</span></h1><div class="meta"><span>第 <b>${s.no}</b> 次练习</span><span>attempt <b>${s.att}</b></span><span>seed <b>${s.seed}</b></span><span>已交卷 <b>${hs.length}</b> 遍</span><span>最好成绩 <b>${hs.length?Math.max(...hs.map(h=>h.score)):'还没有成绩'}</b></span></div></div>
 <div class="act"><button class="btn" onclick="v2Check(true)">打开检测页</button><button class="btn" onclick="v2Retry()">↺ 重新练习</button><button class="btn p" onclick="v2Submit()" ${s.submitted?'disabled style="opacity:.5"':''}>✓ 提交</button></div></div>
 <div class="warn" style="margin-bottom:14px">这一版在浏览器里模拟：不连真实节点，判分在网页里算，只练界面操作和配置判断。下一版接公司服务器上的真实 v2ray 练习节点和检测页，按服务器那头的实际结果判分。</div>
 <div class="v2grid"><div>${client(s)}${checkCard(s)}</div>${task(s)}</div>${gradeCard(s)}</div>`}

// ---------------- 操作 ----------------
const edit=f=>{const s=V();if(s.submitted){toast('已交卷，点「重新练习」开始新的一遍');return}f(s);vSave(s);rer()};
window.v2Menu=(e,k)=>{if(e)e.stopPropagation();menu=menu==k?null:k;rer()};
window.v2Close=()=>{dlg=null;rer()};
window.v2NoSub=()=>toast('练习环境不提供订阅，请手动添加或从剪贴板导入');
window.v2Dlg=(t,p)=>{const s=V();if(s.submitted&&t!='guide'&&t!='about'){toast('已交卷，点「重新练习」开始新的一遍');return}dlg=t=='add'?{t,v:E.newServer(p),i:-1}:{t};rer();setTimeout(()=>{const f=document.querySelector('#v2f input,#v2f textarea');f&&f.focus()},0)};
window.v2Sel=i=>{const s=V();s.sel=i;vSave(s);rer()};
window.v2Edit=()=>{const s=V();if(s.sel<0||!s.cfg.servers[s.sel]){toast('先在列表里选中一台服务器');return}if(s.submitted){toast('已交卷，点「重新练习」开始新的一遍');return}dlg={t:'add',v:Object.assign({},s.cfg.servers[s.sel]),i:s.sel};rer()};
const fv=n=>{const e=document.querySelector(`#v2f [name=${n}]`);return e?e.value:undefined};
const ferr=m=>{$('#v2err').textContent=m};
window.v2SaveSrv=()=>{const v=Object.assign({},dlg.v);['alias','addr','port','id','aid','enc','net','host','path','tls'].forEach(k=>{const x=fv(k);if(x!==undefined)v[k]=k=='port'?x.trim():x});
 if(!v.addr.trim()){ferr('地址不能为空');return}if(!E.portOk(v.port)){ferr('端口必须是 1–65535 的数字');return}v.port=+v.port;if(v.proto=='vmess'&&v.aid!==''&&!/^\d+$/.test(String(v.aid).trim())){ferr('额外ID 必须是数字');return}
 if(!v.alias.trim())v.alias=v.addr.trim();const i=dlg.i;
 edit(s=>{if(i>=0){s.cfg.servers[i]=v;log(s,'已修改服务器「'+v.alias+'」')}else{s.cfg.servers.push(v);s.sel=s.cfg.servers.length-1;log(s,'已添加服务器「'+v.alias+'」。选中后按 Enter 设为活动服务器。')}s.tests={}});dlg=null;rer()};
window.v2Import=()=>{const r=E.parseLinks(fv('links'));if(!r.servers.length){ferr(r.errors.join(' '));return}
 edit(s=>{r.servers.forEach(v=>s.cfg.servers.push(v));s.sel=s.cfg.servers.length-1;s.tests={};log(s,'从剪贴板导入 '+r.servers.length+' 条'+(r.errors.length?'，失败 '+r.errors.length+' 条：'+r.errors.join(' '):''))});dlg=null;rer();toast('导入 '+r.servers.length+' 条'+(r.errors.length?'，失败 '+r.errors.length+' 条':''))};
window.v2SaveParam=()=>{const so=fv('socks').trim(),ht=fv('http').trim(),d=(document.querySelector('#v2f [name=dns]:checked')||{}).value||'local';
 if(!E.portOk(so)||!E.portOk(ht)){ferr('端口必须是 1–65535 的数字');return}
 edit(s=>{s.cfg.socks=+so;s.cfg.http=+ht;s.cfg.dns=d;log(s,'参数已保存：SOCKS '+so+' · HTTP '+ht+' · DNS '+E.DNS_MODE[d]+(so==ht?'（SOCKS 和 HTTP 端口相同，核心起不来）':''))});dlg=null;rer()};
window.v2SaveRouting=()=>{const r=(document.querySelector('#v2f [name=routing]:checked')||{}).value;edit(s=>{s.cfg.routing=r;log(s,'路由：'+E.ROUTING[r])});dlg=null;rer()};
window.v2Set=(k,v)=>edit(s=>{s.cfg[k]=v;log(s,k=='sysProxy'?'系统代理：'+E.SYS_PROXY[v]+(v=='auto'?'（HTTP 127.0.0.1:'+s.cfg.http+'）':''):'路由：'+E.ROUTING[v])});
window.v2Active=()=>{const s=V();if(s.sel<0||!s.cfg.servers[s.sel]){toast('先在列表里选中一台服务器');return}edit(s=>{s.cfg.active=s.sel;const a=s.cfg.servers[s.sel];log(s,'活动服务器：「'+(a.alias||a.addr)+'」')})};
window.v2Del=()=>{const s=V();if(s.sel<0||!s.cfg.servers[s.sel]){toast('先在列表里选中一台服务器');return}edit(s=>{const i=s.sel,a=s.cfg.servers[i];s.cfg.servers.splice(i,1);if(s.cfg.active==i)s.cfg.active=-1;else if(s.cfg.active>i)s.cfg.active--;s.sel=-1;s.tests={};log(s,'已删除服务器「'+(a.alias||a.addr)+'」')})};
window.v2Test=()=>{const s=V();if(!s.cfg.servers.length){toast('列表里还没有服务器');return}edit(s=>{const n=node(s);s.cfg.servers.forEach((v,i)=>{const r=E.testServer(s.cfg,n,i);s.tests[i]=r.ok?r.ms:-1;log(s,'「'+(v.alias||v.addr)+'」真连接延迟：'+ms(s.tests[i]))})})};
window.v2Check=on=>{const s=V();s.check=on;vSave(s);rer();if(on)setTimeout(()=>{const c=$('#v2chk');c&&c.scrollIntoView({behavior:'smooth',block:'nearest'})},0)};
window.v2Copy=()=>{const t=$('#v2link').textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('已复制分享链接'),()=>toast('浏览器不让复制，请手动选中链接复制'))};
window.v2CopyJson=()=>{const t=$('#v2json').textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('已复制 grade.json'),()=>toast('浏览器不让复制，请手动选中复制'))};
window.v2Submit=()=>{const s=V();if(s.submitted)return;const g=E.grade(s.cfg,node(s),{passLine:CONFIG.masteryLine});const at=new Date(Date.now()+8*3600e3).toISOString().replace('Z','+08:00').replace(/\.\d+/,'');
 const hs=vH();hs.push({no:s.no,score:g.total,att:s.att,seed:s.seed,var:'V2R-'+node(s).proto,hint:0});LS.set('v2h',hs);
 s.submitted={no:s.no,att:s.att,seed:s.seed,at,grade:g};s.check=true;menu=null;dlg=null;vSave(s);rer();toast('已交卷：'+g.total+' 分（模拟判分）');setTimeout(()=>{const c=$('#v2grade');c&&c.scrollIntoView({behavior:'smooth'})},0)};
window.v2Retry=()=>{const s=V();if(!s.submitted&&(s.cfg.servers.length)&&!confirm('这一遍还没提交，重新练习会换一组新节点，这一遍不计成绩。确定吗？'))return;menu=null;dlg=null;LS.set('v2',newAttempt());rer();window.scrollTo(0,0);toast('第 '+V().no+' 次练习 · 已换一组新的练习节点')};
document.addEventListener('click',e=>{if(menu&&!e.target.closest('.v2m')){menu=null;rer()}});
document.addEventListener('keydown',e=>{if(curRoute()!='v2ray'||dlg||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(e.key=='Enter'){e.preventDefault();v2Active()}else if(e.key=='Delete'){v2Del()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='r'){e.preventDefault();v2Test()}});

// ---------------- 路由 / 入口 ----------------
R.v2ray=()=>{menu=null;dlg=null;return`<div id="v2root">${body()}</div>`};
NAMES.v2ray='练习场 › 沙盒实操 › <b>v2ray 节点配置实操</b>';NAVMAP.v2ray='sandbox';
const entry=()=>{const hs=vH(),s=LS.get('v2',null);return`<div class="card" style="margin-top:16px" id="v2entry"><div class="ch"><h2>技术实操 · 售后支持</h2><span class="tag o">模拟判分</span><span class="muted s13">网页模拟版，不连真实节点</span></div>
 <a class="q" href="#/v2ray" style="margin:0"><span class="tag b" style="min-width:64px;text-align:center">新场景</span><div style="flex:1;min-width:0"><div class="row"><span class="mono muted">V2R-01</span><b>v2ray 节点配置实操</b><span class="tag">沙盒实操</span></div><div class="why muted">仿 v2rayN 客户端：添加节点或导入分享链接、设活动服务器、开系统代理、选路由和 DNS，再用检测页核对出口 IP · 每次一组新的练习节点</div></div><div class="s13 muted" style="width:210px">已交卷 ${hs.length} 遍${hs.length?' · 最好 '+Math.max(...hs.map(h=>h.score))+' 分':''}${s&&!s.submitted&&s.cfg.servers.length?' · 有一遍在进行中':''}</div><span class="btn sm p">练 →</span></a></div>`};
const _arV2=R.arena;R.arena=()=>{const h=_arV2();const k='<div class="card" style="margin-top:16px"><div class="ch"><h2>场景掌握度';return h.includes(k)?h.replace(k,entry()+k):h+entry()};
DEMO_NOTES.v2ray=['PRD §22 第一步：网页模拟，判分在浏览器里算（v2ray-engine.js），不连真节点；成绩单标「模拟判分」，不代表真实连通。','节点参数、出口 IP、本机 IP 都是练习数据，用的是文档保留地址段（192.0.2.x / 198.51.100.x / 203.0.113.x）和 .example 域名。','扣分说明集中在 v2ray-engine.js 的 V2_DEDUCT 一张表，文案同学只改这里；字段表见 v2ray-fields.md。','WebRTC 泄露只展示、不计分。','下一版（第二步）接公司服务器上的真实 v2ray 练习节点和检测页，AC-201～AC-211 适用。'];
if(curRoute()=='v2ray'||curRoute()=='arena')go();
})();
