// ===== v2ray-engine.js：v2ray 图形界面实操 · 第一步（网页模拟判分，PRD §22 S-201～S-205） =====
// 纯函数，不碰 DOM：出题（genNode）、分享链接（shareLink / parseLinks）、模拟连接（connect）、模拟检测页（checkPage）、判分（grade）。
// 浏览器里挂在 window.V2E；node 里 require('./v2ray-engine.js')，测试用。
// 同一份配置 + 同一个题目 → 判分结果完全一样（不读时间、不用随机数）。
(function(root){
'use strict';

// ---------------------------------------------------------------------------
// 文案表 ①：界面字段名（客户端里显示的就是这里的字，v2ray-fields.md 也从这里生成）
// ---------------------------------------------------------------------------
const V2_LABELS={
 window:'v2rayN（练习模拟）',
 menu:{server:'服务器',sub:'订阅',setting:'设置',help:'帮助'},
 menuServer:{addVmess:'添加[VMess]服务器',addVless:'添加[VLESS]服务器',addSs:'添加[Shadowsocks]服务器',importClip:'从剪贴板导入',setActive:'设为活动服务器',edit:'编辑服务器',del:'删除服务器',test:'测试真连接延迟'},
 menuSub:{subSetting:'订阅分组设置',subUpdate:'更新订阅'},
 menuSetting:{param:'参数设置',routing:'路由设置'},
 menuHelp:{about:'关于',guide:'练习说明'},
 cols:{type:'类型',alias:'别名',addr:'地址',port:'端口',enc:'加密方式',net:'传输协议',host:'伪装域名',tls:'传输层安全',sub:'订阅',delay:'真连接延迟'},
 fields:{addr:'地址',port:'端口',id:'用户ID（UUID）',pwd:'密码',aid:'额外ID',enc:'加密方式',net:'传输协议',host:'伪装域名',path:'路径',tls:'传输层安全（TLS）',alias:'别名'},
 dialogTitle:{vmess:'编辑或添加[VMess]服务器',vless:'编辑或添加[VLESS]服务器',ss:'编辑或添加[Shadowsocks]服务器'},
 importTitle:'从剪贴板导入',importHint:'粘贴分享链接（vmess:// · vless:// · ss://，一行一条）。练习环境用这个框代替系统剪贴板。',
 paramTitle:'参数设置',socksPort:'本地 SOCKS 监听端口',httpPort:'本地 HTTP 监听端口',dnsLabel:'DNS',
 routingTitle:'路由设置',
 status:{sysProxy:'系统代理',routing:'路由'},
 ok:'确定',cancel:'取消',
 simTag:'模拟',simTagTitle:'这一项是网页模拟出来的结果，不是真实节点或真实检测页测出来的'
};
const SYS_PROXY={clear:'清除系统代理',auto:'自动配置系统代理',keep:'不改变系统代理'};
const ROUTING={global:'全局',rule:'规则分流',direct:'直连'};
const DNS_MODE={remote:'远程 DNS（走代理）',local:'本机 DNS（直连）'};
const PROTO_NAME={vmess:'VMess',vless:'VLESS',ss:'Shadowsocks'};
const NETS=['tcp','ws'];
const VMESS_SEC=['auto','aes-128-gcm','chacha20-poly1305','none','zero'];
const VLESS_ENC=['none'];
const SS_METHODS=['aes-128-gcm','aes-256-gcm','chacha20-ietf-poly1305'];

// ---------------------------------------------------------------------------
// 文案表 ②：检测页检测项 + 判分项（名称、分值）
// ---------------------------------------------------------------------------
const V2_CHECKS=[
 {key:'exit_ip',name:'出口 IP'},
 {key:'match',name:'与任务要求是否一致'},
 {key:'dns_leak',name:'DNS 泄露'},
 {key:'webrtc_leak',name:'WebRTC 泄露'}
];
const V2_ITEMS=[
 {key:'node',name:'节点参数正确',max:35},
 {key:'active',name:'活动服务器选对',max:10},
 {key:'sysproxy',name:'系统代理开启',max:15},
 {key:'routing',name:'路由模式正确',max:10},
 {key:'dns',name:'DNS 走代理',max:10},
 {key:'conn',name:'真连接测试通过',max:10,simulated:true},
 {key:'exit',name:'检测页出口 IP 一致',max:10,simulated:true}
];
// 「节点参数正确」按字段拆分（合计 35）
const V2_NODE_FIELDS=[
 {key:'proto',name:'协议',max:5},
 {key:'addr',name:'地址',max:4},
 {key:'port',name:'端口',max:4},
 {key:'cred',name:'用户ID（UUID）/ 密码',max:8},
 {key:'extra',name:'额外ID / 加密方式',max:2},
 {key:'net',name:'传输协议',max:4},
 {key:'wsopt',name:'伪装域名 / 路径',max:4},
 {key:'tls',name:'传输层安全（TLS）',max:4}
];

// ---------------------------------------------------------------------------
// 文案表 ③：扣分说明（文案同学只改这里；{xx} 是占位，判分时按实际值填）
// ---------------------------------------------------------------------------
const V2_DEDUCT={
 blank_node:'没有添加任何服务器，节点参数无从判断。',
 blank_active:'没有添加任何服务器，没有可选的活动服务器。',
 proto:'协议选成了 {got}，任务节点是 {want}，握手失败。删掉这条，用「添加[{want}]服务器」重新加。',
 addr:'地址填成了「{got}」，应为「{want}」，连不到练习服务器。',
 port:'端口填成了 {got}，应为 {want}，连不上服务器。',
 uuid_seg:'UUID 第 {seg} 段填错，连接被服务器拒绝。把任务给的 UUID 整串复制粘贴进去，别手敲。',
 uuid_format:'UUID 格式不对（应为 8-4-4-4-12 共 5 段），连接被服务器拒绝。把任务给的 UUID 整串复制粘贴进去。',
 uuid_empty:'用户ID（UUID）没填，连接被服务器拒绝。把任务给的 UUID 粘贴进去。',
 pwd:'密码和任务给的不一致，服务器解不开数据，连接失败。把任务给的密码复制粘贴进去。',
 aid:'额外ID 填了 {got}，任务节点要求 0，连接被服务器拒绝。',
 vless_enc:'VLESS 的加密方式要选 none，你选了 {got}，连接失败。',
 ss_method:'加密方式选成了 {got}，任务节点是 {want}，服务器解不开数据。',
 extra_proto:'协议选错了，额外ID 和加密方式也跟着对不上。先把协议改对，这一项会一起恢复。',
 net:'传输协议选了 {got}，任务节点用的是 {want}，连接失败。',
 path:'路径填成了「{got}」，应为「{want}」，服务器找不到这个入口（404）。',
 host:'伪装域名填成了「{got}」，应为「{want}」，服务器不认这个域名。',
 wsopt_net:'传输协议没选 ws，路径和伪装域名填了也不起作用。把传输协议改成 ws。',
 tls_need:'任务节点开了 TLS，你没开，握手失败。传输层安全选 tls。',
 tls_extra:'任务节点没开 TLS，你开了，握手失败。把传输层安全清空。',
 active_none:'没有设为活动服务器（选中服务器后按 Enter，或点「设为活动服务器」）。',
 active_wrong:'活动服务器是「{alias}」，不是任务给的节点。',
 no_server:'还没有活动服务器，这一项没法判断。先把任务给的节点设为活动服务器。',
 sys_clear:'系统代理是「清除系统代理」，浏览器不经过 v2rayN，直接上网。改成「自动配置系统代理」。',
 sys_keep:'系统代理是「不改变系统代理」，练习机原来没设代理，浏览器还是直连。改成「自动配置系统代理」。',
 route_direct:'路由选了「直连」，所有流量都不经过代理。按任务要求重新选路由模式。',
 route_rule_need_global:'任务要求「全局」，你选了「规则分流」。检测页（{host}）在分流规则的直连名单里，访问它不走代理，出口 IP 变回本机。改成「全局」。',
 route_global_need_rule:'任务要求「规则分流」，你选了「全局」，本该直连的网站也会绕道代理，变慢还占用节点流量。改成「规则分流」。',
 dns_local:'DNS 选了「本机 DNS（直连）」，查域名的请求绕开了代理，直接发给本地运营商，你访问过哪些网站对方都看得到。在参数设置里改成「远程 DNS（走代理）」。',
 port_conflict:'本地 SOCKS 端口和 HTTP 端口都是 {port}，v2ray 核心起不来。把两个端口改成不一样的，比如默认的 10808 和 10809。',
 port_range:'本地监听端口 {port} 不在 1–65535 之间，v2ray 核心起不来。',
 conn_linked:'测试真连接延迟：超时。原因同「节点参数正确」：{cause}',
 conn_no_active:'测试真连接延迟：没有活动服务器，测不了。',
 conn_core:'测试真连接延迟：超时。{cause}',
 exit_conn:'检测页看到的是本机真实 IP {real}，连接没建立。原因同「真连接测试通过」。',
 exit_conn_detail:'检测页看到的是本机真实 IP {real}，连接没建立：{cause}',
 exit_sys:'检测页看到的是本机真实 IP {real}。原因同「系统代理开启」：{cause}',
 exit_route:'检测页看到的是本机真实 IP {real}。原因同「路由模式正确」：{cause}',
 cap_not_connected:'浏览器没有走通代理，整回合最高 {cap} 分，判不通过。先按上面的扣分原因把连接改通。',
 exit_no_active:'检测页看到的是本机真实 IP {real}，没有活动服务器。'
};
// 检测页上的说明（不计分的解释文字）
const V2_CHECK_NOTE={
 ok:'流量经过练习节点出去，出口 IP 和任务要求一致。',
 webrtc_on:'系统代理只接管 HTTP/HTTPS，浏览器的 WebRTC 走 UDP 直连，可能暴露本机 IP {real}。本练习不计分，下一期指纹浏览器练习再练。',
 webrtc_off:'流量没有走代理，本机 IP 本来就直接暴露，这一项不判断。',
 dns_off:'流量没有走代理，DNS 也是本机直接查，这一项不判断。'
};
// 没走通代理时整回合封顶（项目负责人定：50；只改这里）
const V2_FAIL_CAP=50;
// 达标线默认值（界面传入 CONFIG.masteryLine 时以界面为准）
const V2_PASS_LINE=80;
const fill=(t,o)=>String(t).replace(/\{([^}]+)\}/g,(m,k)=>o&&o[k]!=null?o[k]:m);

// ---------------------------------------------------------------------------
// 出题：同一个 seed 永远出同一道题（练习数据，全部用文档保留地址段）
// ---------------------------------------------------------------------------
function rng(seed){let a=(Math.imul((Number(seed)>>>0)||1,2654435761)^0x9e3779b9)>>>0;const f=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};f();f();f();return f}
const hex=(r,n)=>Array.from({length:n},()=>'0123456789abcdef'[Math.floor(r()*16)]).join('');
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const WORDS=['ray','ws','api','cdn','edge','sync','gw','data'];
function genNode(seed,opt){const r=rng(seed);opt=opt||{};
 const proto=opt.proto||pick(r,['vmess','vless','ss']);
 const net=proto=='ss'?'tcp':(opt.net||pick(r,NETS));
 const tls=proto=='ss'?false:(opt.tls!=null?!!opt.tls:r()<0.5);
 const nn=String(10+Math.floor(r()*80));
 const useDomain=tls||(net=='ws'&&r()<0.5);
 const addr=useDomain?`n${nn}.lab-proxy.example`:`192.0.2.${10+Math.floor(r()*200)}`;
 const port=tls?443:10000+Math.floor(r()*50000);
 const uuid=`${hex(r,8)}-${hex(r,4)}-4${hex(r,3)}-${'89ab'[Math.floor(r()*4)]}${hex(r,3)}-${hex(r,12)}`;
 const pwd=Array.from({length:16},()=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(r()*56)]).join('');
 const node={seed:Number(seed),proto,addr,port,
  id:proto=='ss'?pwd:uuid,
  aid:proto=='vmess'?0:null,
  enc:proto=='vmess'?'auto':proto=='vless'?'none':pick(r,SS_METHODS),
  net,host:'',path:'',tls,
  alias:'练习节点-'+nn,
  exitIp:'198.51.100.'+(10+Math.floor(r()*200)),
  realIp:'203.0.113.'+(10+Math.floor(r()*200)),
  routeReq:opt.routeReq||(r()<0.5?'global':'rule'),
  baseMs:60+Math.floor(r()*180)};
 if(net=='ws'){node.path='/'+pick(r,WORDS)+'-'+hex(r,4);node.host=useDomain?addr:`cdn${nn}.lab-proxy.example`}
 // 要求「全局」的题：检测页在分流规则的直连名单里（选「规则分流」就会直连）；要求「规则分流」的题：检测页不在名单里
 node.checkHost=node.routeReq=='global'?'check-a.lab.example':'check-b.lab.example';
 node.checkOnDirectList=node.routeReq=='global';
 return node}

// ---------------------------------------------------------------------------
// 分享链接：生成 / 解析（vmess:// base64 JSON、vless://、ss:// SIP002 与旧式）
// ---------------------------------------------------------------------------
const b64e=s=>btoa(String.fromCharCode(...new TextEncoder().encode(s)));
function b64d(s){s=String(s).trim().replace(/-/g,'+').replace(/_/g,'/').replace(/\s+/g,'');if(!/^[A-Za-z0-9+/]*=*$/.test(s)||!s)throw new Error('b64');while(s.length%4)s+='=';const bin=atob(s);return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}
function shareLink(n){
 if(n.proto=='vmess')return 'vmess://'+b64e(JSON.stringify({v:'2',ps:n.alias,add:n.addr,port:String(n.port),id:n.id,aid:'0',scy:'auto',net:n.net,type:'none',host:n.host,path:n.path,tls:n.tls?'tls':'',sni:n.tls?(n.host||n.addr):''}));
 if(n.proto=='vless'){const q=new URLSearchParams({encryption:'none',security:n.tls?'tls':'none',type:n.net});if(n.net=='ws'){q.set('host',n.host);q.set('path',n.path)}if(n.tls)q.set('sni',n.host||n.addr);return `vless://${n.id}@${n.addr}:${n.port}?${q.toString()}#${encodeURIComponent(n.alias)}`}
 return `ss://${b64e(n.enc+':'+n.id).replace(/=+$/,'')}@${n.addr}:${n.port}#${encodeURIComponent(n.alias)}`}
const IMPORT_ERR={
 empty:'剪贴板里没有内容。',
 scheme:'第 {line} 行不是支持的分享链接（只认 vmess:// · vless:// · ss://）。',
 vmess_b64:'第 {line} 行 vmess 链接解码失败：不是有效的 base64。',
 vmess_json:'第 {line} 行 vmess 链接解出来不是 JSON。',
 missing:'第 {line} 行缺少{what}。',
 port:'第 {line} 行端口「{port}」不是 1–65535 的数字。',
 ss_user:'第 {line} 行 ss 链接里解不出「加密方式:密码」。',
 ss_method:'第 {line} 行 ss 加密方式「{m}」练习客户端不支持。'
};
function portOk(p){return /^\d{1,5}$/.test(String(p).trim())&&+p>=1&&+p<=65535}
function parseOne(link,line){const L=String(link).trim();const err=(k,o)=>({error:fill(IMPORT_ERR[k],Object.assign({line},o||{}))});
 const m=L.match(/^([a-z]+):\/\/(.*)$/i);if(!m)return err('scheme');const sch=m[1].toLowerCase(),rest=m[2];
 if(sch=='vmess'){let txt,j;try{txt=b64d(rest.split('#')[0])}catch(e){return err('vmess_b64')}try{j=JSON.parse(txt)}catch(e){return err('vmess_json')}
  if(!j||typeof j!='object')return err('vmess_json');
  const miss=[!j.add&&'地址（add）',!j.port&&'端口（port）',!j.id&&'用户ID（id）'].filter(Boolean);if(miss.length)return err('missing',{what:miss.join('、')});
  if(!portOk(j.port))return err('port',{port:j.port});
  return{server:{proto:'vmess',addr:String(j.add).trim(),port:+j.port,id:String(j.id).trim(),aid:j.aid==null||j.aid===''?0:+j.aid,enc:j.scy||'auto',net:j.net||'tcp',host:j.host||'',path:j.path||'',tls:j.tls=='tls'?'tls':'',alias:j.ps||String(j.add)}}}
 if(sch=='vless'){const hm=rest.match(/^([^@]*)@([^:/?#]+):([^/?#]*)\/?(?:\?([^#]*))?(?:#(.*))?$/);if(!hm)return err('missing',{what:'用户ID@地址:端口'});
  const [,uid,host,port,qs,frag]=hm;if(!uid)return err('missing',{what:'用户ID'});if(!portOk(port))return err('port',{port});
  const q=new URLSearchParams(qs||'');let alias=host;try{if(frag)alias=decodeURIComponent(frag)}catch(e){alias=frag}
  return{server:{proto:'vless',addr:host,port:+port,id:decodeURIComponent(uid),aid:null,enc:q.get('encryption')||'none',net:q.get('type')||'tcp',host:q.get('host')||'',path:q.get('path')||'',tls:q.get('security')=='tls'?'tls':'',alias}}}
 if(sch=='ss'){let body=rest,alias='';const hi=body.indexOf('#');if(hi>=0){try{alias=decodeURIComponent(body.slice(hi+1))}catch(e){alias=body.slice(hi+1)}body=body.slice(0,hi)}
  body=body.split('?')[0].replace(/\/$/,'');let user,hp;
  if(body.includes('@')){const at=body.lastIndexOf('@');user=body.slice(0,at);hp=body.slice(at+1);if(!user.includes(':')){try{user=b64d(decodeURIComponent(user))}catch(e){return err('ss_user')}}else{try{user=decodeURIComponent(user)}catch(e){}}}
  else{let all;try{all=b64d(body)}catch(e){return err('ss_user')}const at=all.lastIndexOf('@');if(at<0)return err('missing',{what:'地址:端口'});user=all.slice(0,at);hp=all.slice(at+1)}
  const ci=user.indexOf(':');if(ci<1)return err('ss_user');const method=user.slice(0,ci),pwd=user.slice(ci+1);
  const pm=hp.match(/^([^:]+):(.*)$/);if(!pm)return err('missing',{what:'地址:端口'});if(!portOk(pm[2]))return err('port',{port:pm[2]});
  if(!SS_METHODS.includes(method.toLowerCase()))return err('ss_method',{m:method});
  return{server:{proto:'ss',addr:pm[1],port:+pm[2],id:pwd,aid:null,enc:method.toLowerCase(),net:'tcp',host:'',path:'',tls:'',alias:alias||pm[1]}}}
 return err('scheme')}
// 批量导入：返回 {servers, errors}；一条坏链接不影响其他行，也不会抛异常
function parseLinks(text){const lines=String(text==null?'':text).split(/\r?\n/).map(x=>x.trim());const out={servers:[],errors:[]};
 if(!lines.some(Boolean)){out.errors.push(IMPORT_ERR.empty);return out}
 lines.forEach((l,i)=>{if(!l)return;let r;try{r=parseOne(l,i+1)}catch(e){r={error:fill(IMPORT_ERR.scheme,{line:i+1})}}if(r.server)out.servers.push(r.server);else out.errors.push(r.error)});return out}

// ---------------------------------------------------------------------------
// 客户端状态（练习初始状态：没有服务器、清除系统代理、直连、本机 DNS；默认值不得分）
// ---------------------------------------------------------------------------
function blankConfig(){return{servers:[],active:-1,sysProxy:'clear',routing:'direct',dns:'local',socks:10808,http:10809}}
function newServer(proto){return{proto,addr:'',port:'',id:'',aid:proto=='vmess'?0:null,enc:proto=='vmess'?'auto':proto=='vless'?'none':SS_METHODS[1],net:'tcp',host:'',path:'',tls:'',alias:''}}
const norm=v=>String(v==null?'':v).trim();
const lc=v=>norm(v).toLowerCase();
const normPath=p=>{p=norm(p);return p&&p[0]!='/'?'/'+p:p};

// 逐字段对照任务节点（顺序就是成绩单上的顺序）
function fieldChecks(s,n){const F={};const want=PROTO_NAME[n.proto],got=PROTO_NAME[s.proto]||s.proto;
 F.proto=s.proto==n.proto?null:{code:'proto',got,want};
 F.addr=lc(s.addr)==lc(n.addr)?null:{code:'addr',got:norm(s.addr)||'（空）',want:n.addr};
 F.port=norm(s.port)===String(n.port)?null:{code:'port',got:norm(s.port)||'（空）',want:n.port};
 if(n.proto=='ss'){F.cred=norm(s.id)===n.id?null:{code:'pwd'}}
 else{const g=lc(s.id),w=n.id;if(g===w)F.cred=null;else if(!g)F.cred={code:'uuid_empty'};else{const gs=g.split('-'),ws=w.split('-');if(gs.length!=5)F.cred={code:'uuid_format'};else{const i=ws.findIndex((x,k)=>x!==gs[k]);F.cred={code:'uuid_seg',seg:i+1}}}}
 if(s.proto!=n.proto)F.extra={code:'extra_proto'};
 else if(n.proto=='vmess'){const a=norm(s.aid);F.extra=a===''||a==='0'?null:{code:'aid',got:a}}
 else if(n.proto=='vless')F.extra=lc(s.enc)=='none'?null:{code:'vless_enc',got:s.enc||'（空）'};
 else F.extra=lc(s.enc)==n.enc?null:{code:'ss_method',got:s.enc||'（空）',want:n.enc};
 const sNet=s.proto=='ss'?'tcp':(s.net||'tcp');
 F.net=sNet==n.net?null:{code:'net',got:sNet,want:n.net};
 if(n.net=='ws'){if(sNet!='ws')F.wsopt={code:'wsopt_net'};else if(normPath(s.path)!==n.path)F.wsopt={code:'path',got:norm(s.path)||'（空）',want:n.path};else if(lc(s.host)&&lc(s.host)!==n.host)F.wsopt={code:'host',got:norm(s.host),want:n.host};else if(!lc(s.host)&&n.host!==n.addr)F.wsopt={code:'host',got:'（空）',want:n.host};else F.wsopt=null}
 else F.wsopt=null;
 const sTls=s.proto=='ss'?false:s.tls=='tls';
 F.tls=sTls==n.tls?null:{code:n.tls?'tls_need':'tls_extra'};
 return F}
const fieldScore=F=>V2_NODE_FIELDS.reduce((a,f)=>a+(F[f.key]?0:f.max),0);
const causeText=c=>fill(V2_DEDUCT[c.code],c);
// 服务器失败时的主要原因（按真实握手顺序：地址 → 端口 → 协议 → TLS → 传输 → 路径/域名 → 账号）
const CONN_ORDER=['addr','port','proto','tls','net','wsopt','cred','extra'];
function localPortProblem(cfg){for(const p of [cfg.socks,cfg.http])if(!portOk(p))return{code:'port_range',port:norm(p)||'（空）'};if(String(+cfg.socks)===String(+cfg.http))return{code:'port_conflict',port:+cfg.socks};return null}
function connect(cfg,n){const lp=localPortProblem(cfg);if(lp)return{ok:false,ms:-1,reason:lp,core:true};
 const s=cfg.servers[cfg.active];if(!s)return{ok:false,ms:-1,reason:{code:'no_server'},noActive:true};
 const F=fieldChecks(s,n);for(const k of CONN_ORDER)if(F[k])return{ok:false,ms:-1,reason:F[k],field:k};
 return{ok:true,ms:n.baseMs}}
// 每台服务器单独测延迟（客户端列表里的「真连接延迟」列）
function testServer(cfg,n,i){const c=Object.assign({},cfg,{active:i});return connect(c,n)}

function trafficPath(cfg,n,conn){
 if(!conn.ok)return{proxied:false,why:'conn'};
 if(cfg.sysProxy!='auto')return{proxied:false,why:'sys'};
 if(cfg.routing=='direct')return{proxied:false,why:'route_direct'};
 if(cfg.routing=='rule'&&n.checkOnDirectList)return{proxied:false,why:'route_rule_need_global'};
 return{proxied:true}}

// 检测页（模拟）：按当前配置推出来，同一配置结果一样
function checkPage(cfg,n){const conn=connect(cfg,n),tp=trafficPath(cfg,n,conn);
 const exit=tp.proxied?n.exitIp:n.realIp,match=exit===n.exitIp;
 const notes=[];
 if(tp.proxied)notes.push(V2_CHECK_NOTE.ok);
 else if(tp.why=='conn')notes.push(conn.noActive?fill(V2_DEDUCT.exit_no_active,{real:n.realIp}):fill(V2_DEDUCT.exit_conn_detail,{real:n.realIp,cause:conn.core?causeText(conn.reason):causeText(conn.reason)}));
 else if(tp.why=='sys')notes.push(fill(V2_DEDUCT.exit_sys,{real:n.realIp,cause:V2_DEDUCT[cfg.sysProxy=='keep'?'sys_keep':'sys_clear']}));
 else notes.push(fill(V2_DEDUCT.exit_route,{real:n.realIp,cause:fill(V2_DEDUCT[tp.why],{host:n.checkHost})}));
 const dnsLeak=tp.proxied?cfg.dns!='remote':null;
 if(dnsLeak)notes.push(V2_DEDUCT.dns_local);else if(dnsLeak===null)notes.push(V2_CHECK_NOTE.dns_off);
 notes.push(tp.proxied?fill(V2_CHECK_NOTE.webrtc_on,{real:n.realIp}):V2_CHECK_NOTE.webrtc_off);
 return{url:'https://'+n.checkHost+'/',exit_ip:exit,expected_ip:n.exitIp,match,dns_leak:dnsLeak,webrtc_leak:tp.proxied?true:null,proxied:tp.proxied,notes}}

// ---------------------------------------------------------------------------
// 判分：100 分 = 各项之和；每条扣分写清原因；同一原因连带的项把说明连起来
// ---------------------------------------------------------------------------
function candidateIndex(cfg,n){let best=-1,bs=-1;cfg.servers.forEach((s,i)=>{const sc=fieldScore(fieldChecks(s,n))+(i===cfg.active?0.5:0);if(sc>bs){bs=sc;best=i}});return best}
function grade(cfg,n,opt){const passLine=opt&&opt.passLine!=null?opt.passLine:V2_PASS_LINE;cfg=cfg||blankConfig();const servers=Array.isArray(cfg.servers)?cfg.servers:[];cfg=Object.assign(blankConfig(),cfg,{servers});
 const items=[];const add=(key,score,deductions,evidence)=>{const def=V2_ITEMS.find(x=>x.key==key);const it={key,name:def.name,max:def.max,score,deductions,evidence};if(def.simulated)it.simulated=true;items.push(it)};
 const act=servers[cfg.active]||null;
 // 1 节点参数
 const ci=candidateIndex(cfg,n);
 if(ci<0)add('node',0,[{code:'blank_node',text:V2_DEDUCT.blank_node,points:35}],{fields:[]});
 else{const F=fieldChecks(servers[ci],n);const fields=V2_NODE_FIELDS.map(f=>({key:f.key,name:f.name,max:f.max,score:F[f.key]?0:f.max,cause:F[f.key]?causeText(F[f.key]):''}));
  add('node',fieldScore(F),fields.filter(f=>f.cause).map(f=>({code:F[f.key].code,field:f.name,text:f.cause,points:f.max})),{server_index:ci,alias:servers[ci].alias||servers[ci].addr,fields})}
 // 2 活动服务器
 if(!servers.length)add('active',0,[{code:'blank_active',text:V2_DEDUCT.blank_active,points:10}],{active:null});
 else if(!act)add('active',0,[{code:'active_none',text:V2_DEDUCT.active_none,points:10}],{active:null});
 else if(cfg.active!==ci)add('active',0,[{code:'active_wrong',text:fill(V2_DEDUCT.active_wrong,{alias:act.alias||act.addr}),points:10}],{active:cfg.active,expected:ci});
 else add('active',10,[],{active:cfg.active});
 // 3 系统代理
 const gate=(key,max)=>act?null:[{code:'no_server',text:V2_DEDUCT.no_server,points:max}];
 let g=gate('sysproxy',15);
 if(g)add('sysproxy',0,g,{mode:SYS_PROXY[cfg.sysProxy]});
 else if(cfg.sysProxy!='auto')add('sysproxy',0,[{code:cfg.sysProxy=='keep'?'sys_keep':'sys_clear',text:V2_DEDUCT[cfg.sysProxy=='keep'?'sys_keep':'sys_clear'],points:15}],{mode:SYS_PROXY[cfg.sysProxy]});
 else add('sysproxy',15,[],{mode:SYS_PROXY[cfg.sysProxy]});
 // 4 路由
 g=gate('routing',10);const rEv={mode:ROUTING[cfg.routing],required:ROUTING[n.routeReq]};
 if(g)add('routing',0,g,rEv);
 else if(cfg.routing==n.routeReq)add('routing',10,[],rEv);
 else{const code=cfg.routing=='direct'?'route_direct':cfg.routing=='rule'?'route_rule_need_global':'route_global_need_rule';add('routing',0,[{code,text:fill(V2_DEDUCT[code],{host:n.checkHost}),points:10}],rEv)}
 // 5 DNS
 g=gate('dns',10);
 if(g)add('dns',0,g,{mode:DNS_MODE[cfg.dns]});
 else if(cfg.dns!='remote')add('dns',0,[{code:'dns_local',text:V2_DEDUCT.dns_local,points:10}],{mode:DNS_MODE[cfg.dns]});
 else add('dns',10,[],{mode:DNS_MODE[cfg.dns]});
 // 6 真连接（交卷时按活动服务器重测一次）
 const conn=connect(cfg,n);
 if(conn.ok)add('conn',10,[],{delay_ms:conn.ms});
 else{let code,text;if(conn.core){code=conn.reason.code;text=fill(V2_DEDUCT.conn_core,{cause:causeText(conn.reason)})}else if(conn.noActive){code='conn_no_active';text=V2_DEDUCT.conn_no_active}else{code=conn.reason.code;text=fill(V2_DEDUCT.conn_linked,{cause:causeText(conn.reason)})}
  add('conn',0,[{code,text,points:10,linked:conn.field?'node':conn.core?null:'active'}],{delay:'超时'})}
 // 7 检测页出口 IP（交卷时按当前配置重新打开一次）
 const cp=checkPage(cfg,n);
 if(cp.match)add('exit',10,[],{exit_ip:cp.exit_ip,expected_ip:cp.expected_ip});
 else{const tp=trafficPath(cfg,n,conn);let code,text,linked;
  if(tp.why=='conn'){if(conn.noActive){code='exit_no_active';text=fill(V2_DEDUCT.exit_no_active,{real:n.realIp})}else{code='exit_conn';text=fill(V2_DEDUCT.exit_conn,{real:n.realIp});linked='conn'}}
  else if(tp.why=='sys'){code='exit_sys';text=fill(V2_DEDUCT.exit_sys,{real:n.realIp,cause:V2_DEDUCT[cfg.sysProxy=='keep'?'sys_keep':'sys_clear']});linked='sysproxy'}
  else{code='exit_route';text=fill(V2_DEDUCT.exit_route,{real:n.realIp,cause:fill(V2_DEDUCT[tp.why],{host:n.checkHost})});linked='routing'}
  add('exit',0,[{code,text,points:10,linked}],{exit_ip:cp.exit_ip,expected_ip:cp.expected_ip})}
 const raw=items.reduce((a,x)=>a+x.score,0);
 // 没走通代理（真连接失败，或检测页出口 IP 不一致）→ 整回合封顶 V2_FAIL_CAP，判不通过
 const connected=conn.ok&&cp.match;
 const cap=connected?null:{reason:'cap_not_connected',text:fill(V2_DEDUCT.cap_not_connected,{cap:V2_FAIL_CAP}),value:V2_FAIL_CAP,applied:raw>V2_FAIL_CAP};
 const total=cap?Math.min(raw,V2_FAIL_CAP):raw;
 const passed=connected&&total>=passLine;
 return{schema:'v2ray-gui-sim/1',grading:'模拟判分',note:'网页模拟判分，不连真实节点，不代表真实连通。',seed:n.seed,
  task:{protocol:PROTO_NAME[n.proto],address:n.addr,port:n.port,net:n.net,host:n.host,path:n.path,tls:n.tls,routing_required:ROUTING[n.routeReq],expected_exit_ip:n.exitIp,check_page:'https://'+n.checkHost+'/'},
  total,raw_total:raw,max:100,connected,cap,passed,verdict:passed?'通过':'不通过',pass_line:passLine,items,
  check_page:{exit_ip:cp.exit_ip,exit_ip_simulated:true,match:cp.match,dns_leak:cp.dns_leak,webrtc_leak:cp.webrtc_leak},
  config:{servers:servers.map(s=>({protocol:PROTO_NAME[s.proto]||s.proto,address:norm(s.addr),port:norm(s.port),id:norm(s.id),aid:s.aid,enc:s.enc,net:s.net,host:norm(s.host),path:norm(s.path),tls:s.tls=='tls',alias:norm(s.alias)})),active:act?cfg.active:null,sys_proxy:SYS_PROXY[cfg.sysProxy],routing:ROUTING[cfg.routing],dns:DNS_MODE[cfg.dns],socks_port:cfg.socks,http_port:cfg.http}}}

// 参考答案（测试和演示用）：按任务节点填好的一份配置
function referenceConfig(n){const c=blankConfig();c.servers=[{proto:n.proto,addr:n.addr,port:n.port,id:n.id,aid:n.aid,enc:n.enc,net:n.net,host:n.host,path:n.path,tls:n.tls?'tls':'',alias:n.alias}];c.active=0;c.sysProxy='auto';c.routing=n.routeReq;c.dns='remote';return c}

const V2E={V2_FAIL_CAP,V2_PASS_LINE,V2_LABELS,SYS_PROXY,ROUTING,DNS_MODE,PROTO_NAME,NETS,VMESS_SEC,VLESS_ENC,SS_METHODS,V2_CHECKS,V2_ITEMS,V2_NODE_FIELDS,V2_DEDUCT,V2_CHECK_NOTE,IMPORT_ERR,
 fill,genNode,shareLink,parseLinks,blankConfig,newServer,fieldChecks,connect,testServer,checkPage,grade,referenceConfig,portOk};
if(typeof module!='undefined'&&module.exports)module.exports=V2E;else root.V2E=V2E;
})(typeof window!='undefined'?window:globalThis);
