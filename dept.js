// ===== dept.js：部门场景通用练习引擎 + 培训管理后台 + 演示员工部门（r4） =====
const OLD_DEPT={'S-087':'销售','S-124':'销售','S-115':'销售','S-091':'研发','S-132':'运维','S-108':'运维','S-045':'管理层','S-062':'售后','S-076':'售后'};
const DMAP={产品:'产品部门',研发:'研发部门',运维:'运维部门',销售:'销售部门',售后:'售后部门',采购:'采购部门',管理层:'部门管理层',业务线:'业务线负责人'};
const ACTOR=()=>{const o=LS.get('empEdits',{})['陈佳雯']||{};return '陈佳雯（'+(o.role||'一线客服')+'）'};
function audit(object,action,before,after){const a=LS.get('audit',[]);a.unshift({ts:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).slice(0,16),actor:ACTOR(),object,action,before:before==null?'':String(before),after:after==null?'':String(after)});LS.set('audit',a.slice(0,200))}
// ---- 场景读取（scenarios.js + 后台编辑 + 后台新建） ----
function allDeptSc(includeDraft){const ed=LS.get('scEdits',{}),nw=LS.get('scNew',[]);return DEPT_SCENARIOS.map(s=>({...s,...(ed[s.id]||{}),status:(ed[s.id]||{}).status||'已发布',ver:(ed[s.id]||{}).ver||'v1'})).concat(nw).filter(s=>includeDraft||s.status!='草稿')}
const getSc=id=>allDeptSc(true).find(s=>s.id==id)||LEGACY_SC.find(s=>s.id==id);
const oldAsDept=()=>SC.map(c=>({id:c.id,dept:OLD_DEPT[c.id]||'销售',title:c.t,mode:c.mode,old:1,route:/沙盒|故障/.test(c.mode)?'sandbox':c.mode=='文本复述'?'retell':c.id=='S-087'?'session':'session',status:'已发布'}));
const libAll=()=>oldAsDept().concat(allDeptSc(false));
const scRoute=s=>s.id=='S-087'?'#/session':s.id=='S-091'?'#/sandbox':s.id=='S-076'?'#/retell':'#/play?id='+s.id;
// ---- 演示员工 / 部门分配 ----
const myDept=()=>LS.get('myDept','售后');
let assigned=d=>{const A=LS.get('assign',{});return A[d]||libAll().filter(s=>s.dept==d).map(s=>s.id)};
// ---- 通用对话引擎 ----
let DMAXT=4;const setT=sc=>DMAXT=(sc&&+sc.turns)||4;
const MOODS=[{k:'a',lead:'',tag:'原样'},{k:'b',lead:'我时间不多，长话短说。',tag:'更急'},{k:'c',lead:'（停顿了一下）',tag:'更冷淡'}];
const FOLLOW=[null,'你说的这些，能具体点吗？我要的是能落地的东西。','那边界在哪？哪些你能定，哪些定不了？','好，那下一步具体怎么走，什么时候给我答复？'];
const dH=id=>LS.get('dh_'+id,[]);
function dNew(id,avoid){const hs=dH(id),prev=hs.slice(-1)[0];const seq=(LS.get('dseq_'+id,hs.length))+1;LS.set('dseq_'+id,seq);let vi=(seq-1)%3;const bad=new Set([avoid,prev?prev.vi:-1]);for(let k=0;k<3&&bad.has(vi);k++)vi=(vi+1)%3;
 return{id,no:legacyBase(id)+hs.length+1,vi,att:'A-'+id.slice(2)+'-'+pad(seq),seed:id.slice(2)+'-'+pad(seq)+'-'+vi,hint:0,turns:[],start:Date.now(),el:0}}
const dS=id=>LS.get('ds_'+id,null)||(LS.set('ds_'+id,dNew(id)),LS.get('ds_'+id));
const dSave=s=>LS.set('ds_'+s.id,s);
const varId=(id,vi)=>'V-'+id.slice(2)+'-'+MOODS[vi].k;
function gEval(sc,i,t){const has=re=>re.test(t);
 const f={emp:has(/理解|明白|确实|能理解|不容易|辛苦|着急|抱歉|感谢|知道您|换我/),q:has(/[？?]|吗|哪|什么|方便|您看/),spec:has(/\d|周[一二三四五六日]|下周|明天|今天|小时|天内|版本/),path:has(/方案|流程|审批|替代|分阶段|先|评估|变更|规则|标准|按照|升级|复盘|排查|计划/),
  next:has(/约|下周|明天|跟进|同步|回复您|答复|时间|会议|对齐/),cite:t.match(/\{?K-[^\s}，。]+\}?/g)||[]};
 let pm=normRL(t).match(redlineRe(sc.id,sc.dept));if(pm&&/申请|走.{0,4}审批|按.{0,6}流程/.test(t)&&!/回头.{0,3}补|事后.{0,3}补|跳过|不用/.test(t)&&!rlCancel(t))pm=null;
 const d={emp:52+(f.emp?28:0)+(f.q?8:0),val:50+(f.spec?20:0)+(f.path?14:0)+(f.cite.length?6:0),pol:76+(f.path?10:0)+(f.cite.length?6:0),ctl:52+(f.next?24:0)+(f.q?6:0)+(f.spec?6:0)};
 if(pm)d.pol=28;const prevT=(dS(sc.id).turns||[]).filter((x,j)=>j!=i).map(x=>x.t);const rep=prevT.includes(t);if(rep)Object.keys(d).forEach(k=>d[k]-=25);Object.keys(d).forEach(k=>d[k]=Math.max(20,Math.min(96,d[k]-(t.length<12?12:0))));
 const goods=[];if(f.emp)goods.push('先接住了对方的处境');if(f.q)goods.push('用提问弄清对方真实诉求');if(f.spec)goods.push('给了具体的时间或数字');if(f.path)goods.push('讲清了流程 / 方案');if(f.next)goods.push('约定了下一步');if(f.cite.length)goods.push('引用了 '+f.cite.join('、'));
 const K0=(sc.krefs||[])[0]||'{K-待补}',KL=(sc.krefs||[]).slice(-1)[0]||K0;
 const NEED={emp:[f.emp,'没有先回应对方的处境',K0],val:[f.spec&&f.path,'没有给出具体可执行的方案',K0],pol:[f.path,'没有讲清边界和合规路径',KL],ctl:[f.next,'没有约定下一步',K0]};
 const exp=['emp','val','pol','ctl'][i];const misses=[];if(!NEED[exp][0])misses.push(NEED[exp].slice(1));if(rep)misses.unshift(['和前面回合说法重复，没有回应对方这一回合的新问题',K0]);if(t.length<12)misses.push(['回答太短，对方会觉得被敷衍',K0]);
 return{raw:1,gen:1,i,d,goods,misses,red:pm?pm[0]:null,k:pm?KL:(misses[0]?misses[0][1]:K0),bad:!!pm||misses.length>0}}
function gCompose(r){const sc=tAvg(r);if(r.red)return{...r,red:fillT(BAND_COPY.redlineGeneric.card,{'承诺':r.red}),good:'',fix:fillT(BAND_COPY.redlineGeneric.fix,{K:r.k})};
 const b=bandOf(sc);let m=r.misses[0];if(!m&&b!='high'){const w=Object.keys(r.d).sort((x,y)=>r.d[x]-r.d[y])[0];m=[{emp:'没有先回应对方的处境',val:'方案还不够具体',pol:'边界说得不清楚',ctl:'没有约定下一步'}[w],r.k]}
 const pts=r.goods.slice(0,2).join('、');
 if(b=='high')return{...r,good:fillT(BAND_COPY.high.good,{'点':pts||'回应完整','K':r.k}),fix:fillT(BAND_COPY.high.fix,{'下一个要点':['讲清方案','讲清边界','约定下一步','收尾确认'][r.i]||'保持'})};
 if(b=='mid')return{...r,good:fillT(BAND_COPY.mid.good,{'点':pts||'接住了对方的话'}),fix:fillT(BAND_COPY.mid.fix,{'缺的点':m[0].replace(/^没有/,''),'K':m[1]})};
 return{...r,good:r.goods.length?fillT(BAND_COPY.lowGeneric.good,{'可取之处':pts}):'',fix:fillT(BAND_COPY.lowGeneric.fix,{'问题':m[0],'K':m[1]})}}
function gCalc(turns,hint){const sum={emp:0,val:0,pol:0,ctl:0};let red=false;turns.forEach(tr=>{DIMS.forEach(([k])=>sum[k]+=tr.f.d[k]);if(tr.f.red)red=true});const d={};DIMS.forEach(([k])=>d[k]=turns.length?Math.round(sum[k]/turns.length):0);if(red)d.pol=Math.min(d.pol,40);return{d,red,score:turns.length?Math.min(Math.round((d.emp+d.val+d.pol+d.ctl)/4),CAP[hint||0]):null}}
const GDIMS={emp:'共情与倾听',val:'方案与价值',pol:'合规与边界',ctl:'推进与控场'};
const qid=()=>new URLSearchParams(location.hash.split('?')[1]||'').get('id');
let railOpen=LS.get('rail',true);window.toggleRail=()=>{railOpen=!railOpen;LS.set('rail',railOpen);go()};
const tag示例='<span class="tag" title="演示数据">示例</span>';
const isSeed=s=>!!s&&!LS.get('scNew',[]).some(x=>x.id==s.id);const tagEx=s=>isSeed(s)?tag示例:'';
R.play=()=>{const sc=getSc(qid());setT(sc);if(!sc)return'<div class="page">场景不存在。<a href="#/scenarios">回场景库</a></div>';if(sc.mode!='AI 陪练')return playSteps(sc);
 const s=dS(sc.id),c=gCalc(s.turns,s.hint),hs=dH(sc.id),done=s.turns.length>=DMAXT,mood=MOODS[s.vi];
 const role=(sc.role||'').split('，')[0];let chat=`<div class="sys">场景已加载 · ${sc.id} · 第 ${s.no} 次练习 · 变体 ${varId(sc.id,s.vi)}（${mood.tag}）<br>${sc.desc}<br>🎯 目标：${sc.ourGoal} 依据 ${(sc.krefs||[]).map(k=>`<span class="tag g">${k}</span>`).join('、')}</div>`;
 if(consecFailD(hs)>=CONFIG.mentorAfterFails)chat+=`<div class="sys" style="background:var(--yl);color:#7a5a1e">🧑‍🏫 ${COPY_MENTOR}（最近 ${consecFailD(hs)} 遍未达标）</div>`;
 if(s.hint>=3)chat+=`<div class="sys" style="background:var(--yl);color:#7a5a1e">你看了参考思路，这一遍不计入「连续通过」。</div>`;
 for(let i=0;i<DMAXT&&i<=s.turns.length;i++){chat+=`<div class="msg"><div class="av" style="background:#9a8f80">对</div><div><div class="who">${role} · 第 ${i+1} 回合</div><div class="bub">${i==0?mood.lead+sc.opener:FOLLOW[i]}</div></div></div>`;const tr=s.turns[i];if(!tr)break;const f=gCompose(tr.f),ts=tAvg(f);
  chat+=`<div class="msg me"><div class="av" style="background:#4f7462">我</div><div><div class="who" style="text-align:right">我 · 第 ${i+1} 回合</div><div class="bub">${tr.t}</div></div></div><div class="coach">${f.red?`<div class="red">⛔ ${f.red}</div>`:''}<div class="t">✦ AI 教练 · 第 ${i+1} 回合 <span class="tag ${ts>=CONFIG.masteryLine?'g':ts>=CONFIG.midLine?'y':'r'}">${ts} 分</span>${(tr.f.bad||ts<CONFIG.masteryLine)&&!done?`<button class="btn sm ${ts>=CONFIG.midLine&&!f.red?'ghost':'p'}" style="margin-left:auto" onclick="dRetry(${i})">↺ 重练这一回合</button>`:''}</div><ul>${f.good&&!f.red?`<li><span class="up">✓ 做得好：</span>${f.good}</li>`:''}<li><span style="color:var(--o)">△ ${f.red?'正确做法':'可以更好'}：</span>${f.fix}</li><li class="muted s13">引用知识 <span class="tag g">${f.k}</span></li></ul></div>`}
 if(done)chat+=`<div class="sys" style="background:var(--gl);color:var(--g)">${DMAXT} 个回合已完成，输入已关闭。<br><button class="btn p" style="margin-top:6px" onclick="dSubmit()">查看本遍结果 →</button></div>`;
 const HINT=[null,`第 1 级 · 方向：先回应对方的处境，再谈方案。（${(sc.krefs||[])[0]||''}）`,`第 2 级 · 要点：围绕「${sc.ourGoal}」，给一个能兑现的时间或替代方案，讲清哪些需要走流程。（${(sc.krefs||[]).join('、')}）`,`第 3 级 · 参考思路：先认对方的诉求 → 说明边界（${(sc.krefs||[]).slice(-1)[0]||''}）→ 给替代方案和时间 → 约下一步。`];
 setTimeout(()=>{const ch=$('#chat');if(ch)ch.scrollTop=99999});
 return`<div class="sess ${railOpen?'':'norail'}"><div class="sessL"><div class="sbar" style="flex-wrap:wrap;row-gap:6px"><div><div class="row"><span class="mono muted">${sc.id}</span><span class="tag b">${DMAP[sc.dept]}</span><span class="tag g">AI 陪练</span>${tagEx(sc)}</div><h3>${sc.title}</h3></div><div class="m"><span>练习次数</span><b>第 ${s.no} 次</b></div><div class="m"><span>回合</span><b>${Math.min(s.turns.length+1,DMAXT)} / ${DMAXT}</b></div><div class="m"><span>综合评分</span><b style="color:var(--g)">${c.score==null?'—':c.score}</b></div>
 <div class="meta" style="width:100%"><span>attempt <b>${s.att}</b></span><span>变体 <b>${varId(sc.id,s.vi)}</b></span><span>seed <b>${s.seed}</b></span><span>最好成绩 <b>${hs.length?bestOf(hs):'还没有成绩'}</b></span><div class="row" style="margin-left:auto"><button class="btn" onclick="dReset()">↺ 重置这一遍</button><button class="btn" onclick="dFlag()">⚑ 标注场景问题</button><button class="btn p" onclick="dSubmit()">✓ 提交（⌘↵）</button><button class="btn" onclick="toggleRail()" title="折叠/展开右侧面板">${railOpen?'⇥ 收起面板':'⇤ 展开面板'}</button></div></div></div>
 <div class="chat" id="chat">${chat}</div><div class="input"><div class="ladder"><span class="muted s13">提示</span>${['方向','要点','参考思路'].map((n,i)=>`<button class="btn sm ${s.hint>i?'used':''}" ${done?'disabled':''} onclick="dHint(${i+1})">第 ${i+1} 级 · ${n}${i==2?'（不计入连续通过）':''}</button>`).join('')}<span class="r muted s13">得分上限 ${CAP[1]} / ${CAP[2]} / ${CAP[3]}</span>${s.hint?`<div style="width:100%">${HINT.slice(1,s.hint+1).map(x=>`<div class="hintbox">${x}</div>`).join('')}</div>`:''}</div>
 <textarea id="dta" ${done?'disabled':''} placeholder="${done?'本遍回合已满，提交后看结果页':'输入你的回复…（⌘↵ 发送）'}" onkeydown="if((event.metaKey||event.ctrlKey)&&event.key=='Enter'){event.preventDefault();dSend()}"></textarea><div class="row" style="margin-top:6px"><span></span><button class="btn p r" ${done?'onclick="dSubmit()">查看结果 →':'onclick="dSend()">发送'}</button></div></div></div>
 ${railOpen?`<div class="sessR"><h3>双向目的</h3><div class="kref" style="background:var(--bl);margin-top:8px"><div class="muted s13">对方 · ${role}</div>${sc.theirGoal}</div><div class="kref" style="background:var(--gl)"><div class="muted s13">我方</div>${sc.ourGoal}</div><h3 style="margin-top:14px">知识依据</h3>${(sc.krefs||[]).map(k=>`<div class="kref mono s13">${k}</div>`).join('')}<h3 style="margin-top:14px">本遍维度评分</h3><div class="muted s13" style="margin-bottom:8px">达标线 ${CONFIG.masteryLine}</div>${DIMS.map(([k])=>`<div class="dim"><div class="row"><span>${GDIMS[k]}${k=='pol'&&c.red?' <span class="tag r">红线 · 不达标</span>':''}</span><b class="r">${c.score==null?'—':c.d[k]}</b></div>${bar(c.score==null?0:c.d[k],c.d[k]<60?'#b2463b':c.d[k]<75?'#b48a2c':'')}</div>`).join('')}<div class="row"><b>综合</b><b class="r" style="font-size:20px">${c.score==null?'—':c.score}</b></div></div>`:''}</div>`};
const consecFailD=hs=>{let n=0;for(const h of hs.slice().reverse()){if(h.score<CONFIG.masteryLine)n++;else break}return n};
window.dSend=()=>{const sc=getSc(qid());setT(sc);const s=dS(sc.id),t=($('#dta').value||'').trim();if(s.turns.length>=DMAXT){toast('回合已满，请查看结果');return}if(!t){toast('先写点什么再发送');return}s.turns.push({t,f:gEval(sc,s.turns.length,t)});dSave(s);go()};
window.dRetry=i=>{const sc=getSc(qid()),s=dS(sc.id);askText('重练第 '+(i+1)+' 回合','输入新的回答，提交后这一回合重新评分。',s.turns[i].t,t=>{s.turns[i]={t,f:gEval(sc,i,t)};dSave(s);go()})};
window.dHint=n=>{const s=dS(qid());if(n>=3&&!(s.hint>=3)&&!confirm('看参考思路后，这一遍不计入「连续通过」，本遍得分上限 '+CAP[3]+'。确定看吗？'))return;s.hint=Math.max(s.hint||0,n);dSave(s);go()};
window.dReset=()=>{if(!confirm('重置这一遍？这一遍记为放弃，会换一个新变体。'))return;const s=dS(qid());const n=dNew(s.id,s.vi);dSave(n);go();toast('已重置 · '+n.att+' · 变体 '+varId(n.id,n.vi))};
window.dSubmit=()=>{const id=qid(),s=dS(id);setT(getSc(id));if(!s.turns.length){toast('至少练一个回合再提交');return}if(s.turns.length<DMAXT&&!confirm(`还有 ${DMAXT-s.turns.length} 个回合没练，确定现在提交？`))return;const c=gCalc(s.turns,s.hint);const hs=dH(id);hs.push({no:s.no,score:c.score,dims:c.d,var:varId(id,s.vi),vi:s.vi,att:s.att,seed:s.seed,hint:s.hint,red:c.red,nc:c.red||undefined,turns:s.turns});LS.set('dh_'+id,hs);LS.del('ds_'+id);location.hash='#/dresult?id='+id};
window.dFlagNow=()=>{const s=dS(qid());const fb=LS.get('fb',[]);const id='F-'+(232+fb.length);fb.unshift({id,sid:s.id,stitle:getSc(s.id).title,type:'场景问题',text:'演示：'+s.id+' 第 '+Math.min(s.turns.length+1,DMAXT)+' 回合，对方追问与场景描述不符。',att:s.att,var:varId(s.id,s.vi),turn:Math.min(s.turns.length+1,DMAXT)});LS.set('fb',fb);location.hash='#/feedback';toast('收到，这个问题已记到反馈看板（'+id+'），不影响你这一遍的成绩。')};
// ---- 沙盒 / 文本复述 / 话术模拟（步骤或要点覆盖） ----
const bigr=x=>{const a=[];for(let i=0;i<x.length-1;i++)a.push(x.slice(i,i+2));return a};
function playSteps(sc){const hs=dH(sc.id),last=hs.slice(-1)[0],sandbox=sc.mode=='沙盒实操';const no=hs.length+1;
 return`<div class="page"><div class="hd"><div><div class="eyebrow">${sc.mode} · ${DMAP[sc.dept]}</div><h1>${sc.id} ${sc.title} ${tagEx(sc)}</h1><div class="meta"><span>第 <b>${no}</b> 次练习</span><span>知识依据 ${(sc.krefs||[]).map(k=>`<b>${k}</b>`).join('、')}</span><span>最好成绩 <b>${hs.length?bestOf(hs):'还没有成绩'}</b></span></div></div><div class="act"><a class="btn" href="#/scenarios">回场景库</a></div></div>
 <div class="grid g21"><div class="card"><div class="ch"><h2>${sandbox?'排查任务':'任务'}</h2></div><p>${sc.desc}</p>
 ${sandbox?sc.steps.map((st,i)=>`<div style="margin-top:12px"><b>第 ${i+1} 步 · ${st}</b><textarea class="stp" placeholder="这一步你会做什么、看什么、得出什么判断？" style="width:100%;height:60px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;margin-top:4px"></textarea></div>`).join(''):`<div class="muted s13" style="margin-top:8px">要点：${sc.steps.join(' · ')}</div><textarea id="rtx" placeholder="用自己的话写，想象你在跟对方说。" style="width:100%;height:180px;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;margin-top:8px" oninput="if(this.value.includes('${sc.desc.slice(0,12)}'))$('#cw').style.display='block'"></textarea><div class="warn" id="cw" style="display:none;margin-top:8px">⚠ 这段和场景描述几乎一样，请用自己的话说。</div>`}
 <div class="row" style="margin-top:12px"><button class="btn p r" onclick="stepSubmit()">提交（⌘↵）</button></div></div>
 <div class="card"><div class="ch"><h2>${last?'第 '+last.no+' 次结果':'结果'}</h2>${last?`<span class="r tag ${last.score>=CONFIG.masteryLine?'g':'o'}">${last.score} 分</span>`:''}</div>${last?last.pts.map(p=>`<div class="pt"><span class="tag ${p.ok?'g':'o'}">${p.ok?'已覆盖':'遗漏'}</span><div style="flex:1">${p.s}</div><span class="tag g">${(sc.krefs||[])[0]||''}</span></div>`).join('')+(hs.length>1?`<div style="margin-top:10px">${curve(hs)}</div>`:''):'<div class="muted">练完第一遍，这里会出现你的成绩曲线。</div>'}</div></div></div>`}
window.stepSubmit=()=>{const sc=getSc(qid());let pts;if(sc.mode=='沙盒实操'){const v=[...document.querySelectorAll('.stp')].map(x=>x.value.trim());pts=sc.steps.map((s,i)=>({s,ok:v[i].length>=6}))}else{const t=$('#rtx').value;pts=sc.steps.map(s=>({s,ok:bigr(s).some(b=>t.includes(b))}))}
 const score=Math.round(100*pts.filter(p=>p.ok).length/pts.length);const hs=dH(sc.id);hs.push({no:legacyBase(sc.id)+hs.length+1,score,pts,var:'V-'+sc.id.slice(2)+'-a',hint:0});LS.set('dh_'+sc.id,hs);go();toast('已按要点评分：'+score+' 分')};
// ---- 部门对话结果页 ----
R.dresult=()=>{const id=qid(),sc=getSc(id),hs=dH(id),r=hs.slice(-1)[0];if(!r)return'<div class="page">还没有成绩。</div>';const p=r.red||r.hint>=3?null:prevCounted(hs);const diff=p?r.score-p.score:null;
 return`<div class="page"><div class="hd"><div><div class="eyebrow">结果页 · ${sc.id} ${sc.title}</div><h1>第 ${r.no} 次练习 · ${r.score} 分</h1><div class="sub">${r.red?'这一遍触发了红线，不计入掌握，也不和上一遍比较。':r.hint>=3?'这一遍看过完整提示，不计入掌握，也不和上一遍比较。':p?(diff>0?`比上一遍 +${diff}（上一遍计入的第 ${p.no} 次 ${p.score}）`:diff<0?`比上一遍 ${diff}（上一遍计入的第 ${p.no} 次 ${p.score}）`:`和上一遍一样（上一遍计入的第 ${p.no} 次 ${p.score}）`):''}　${r.red?'':r.score>=CONFIG.masteryLine?'这一遍达标了。':'还差 '+(CONFIG.masteryLine-r.score)+' 分达标。'}</div><div class="meta"><span>attempt <b>${r.att}</b></span><span>变体 <b>${r.var}</b></span>${r.red?'<span class="tag r">触发红线</span>':''}</div></div><div class="act"><a class="btn" href="#/arena">结束</a><a class="btn ${retryPrimary(r)?'p ':''}big" id="retryBtn" href="#/play?id=${id}">↺ 再练一遍</a></div></div>
 <div class="grid g21"><div class="card"><div class="ch"><h2>进步曲线</h2></div>${curve(hs)}</div><div class="card"><div class="ch"><h2>维度分</h2></div>${DIMS.map(([k])=>`<div class="dim"><div class="row"><span>${GDIMS[k]}</span><b class="r">${r.dims[k]}</b></div>${bar(r.dims[k])}</div>`).join('')}</div></div>
 <div class="card replay" style="margin-top:16px"><div class="ch"><h2>全文回放 · 逐回合点评</h2></div>${r.turns.map((tr,i)=>{const f=gCompose(tr.f);return`<div class="t"><div><b>第 ${i+1} 回合</b><div><span class="tag ${tAvg(f)>=CONFIG.masteryLine?'g':'o'}">${tAvg(f)}</span></div></div><div><div class="muted">${i==0?sc.opener:FOLLOW[i]}</div><div>我：${tr.t}</div></div><div class="s13">${f.red?`<div class="dn">⛔ ${f.red}</div>`:''}${f.good&&!f.red?`<div><span class="up">做得好：</span>${f.good}</div>`:''}<div><span style="color:var(--o)">${f.red?'正确做法':'可以更好'}：</span>${f.fix}</div></div></div>`}).join('')}</div></div>`};
// ---- 场景库：部门筛选 ----
let dchip='全部';window.dFilter=d=>{dchip=d;go()};
R.scenarios=q=>{const all=libAll();let L=all.filter(s=>(dchip=='全部'||s.dept==dchip)&&(!q||(s.title+s.id).includes(q)));
 return`<div class="page"><div class="hd"><div><div class="eyebrow">第二层 · 场景化</div><h1>场景练习库</h1><div class="sub">每个场景 = 真实问题 · 双向目的 · 错误示例 · 正确示例（必须引用知识库）。</div></div><div class="act"><button class="btn" onclick="exportCsv('场景库',[['编号','部门','标题','形式']].concat(libAll().slice().sort((a,b)=>a.id<b.id?-1:1).map(s=>[s.id,s.dept,s.title,s.mode])))">导出</button></div></div>
 <div class="card" style="padding:10px 14px;margin-bottom:14px"><div class="fil"><span class="muted">部门</span>${DEPT_CHIPS.map(d=>`<span class="${dchip==d?'on':''}" onclick="dFilter('${d}')">${d=='全部'?d:DMAP[d]} <span class="muted s13">${d=='全部'?all.length:all.filter(s=>s.dept==d).length}</span></span>`).join('')}</div></div>
 <div class="muted s13" style="margin-bottom:10px">共 ${L.length} 个场景${dchip!='全部'?' · '+DMAP[dchip]:''}${q?` · 关键词「${q}」 <a style="color:var(--g)" href="#/scenarios">清除</a>`:''}</div>
 <div class="cards">${L.map(s=>{const hs=s.old?(s.id=='S-087'?H():[]):dH(s.id);const ds=s.old?SC.find(c=>c.id==s.id):null;return`<a class="card sc" href="${scRoute(s)}"><div class="row"><span class="mono muted">${s.id}</span><span class="tag b">${DMAP[s.dept]}</span>${tagEx(s)}<span class="ml tag">${s.mode}</span></div><h3 style="margin:6px 0">${s.title}</h3><div class="muted s13" style="min-height:42px">${s.old?LEGACY_DESC[s.id]:(s.desc||'')}</div><div class="row s13" style="margin-top:8px"><span class="muted">我的进度</span>${repsOf(s)?`<b>已练 ${repsOf(s)} 遍</b>`:'<span class="muted">未开始</span>'}<span class="btn sm p r">练 →</span></div></a>`}).join('')||'<div class="muted">没找到相关场景，换个说法试试。</div>'}</div></div>`};
// ---- 练习场：部门场景 + 今日首条 = 本部门场景 ----
const repsOf=s=>s.id=='S-087'?H().length:s.old?(SC.find(c=>c.id==s.id)||{}).rep||0:dH(s.id).length;
const firstOf=()=>{const d=myDept();return assigned(d).map(id=>libAll().find(s=>s.id==id)).filter(Boolean)[0]};
function firstRowHTML(){const d=myDept(),first=firstOf();return first?`<a class="q" href="${scRoute(first)}" style="border-color:#b9d1c3;background:#f7fbf8"><span class="tag b" style="min-width:64px;text-align:center">本部门必练</span><div style="flex:1;min-width:0"><div class="row"><span class="mono muted">${first.id}</span><b>${first.title}</b>${tagEx(first)}</div><div class="why muted">${DMAP[d]} · 由管理后台分配 · ${first.mode}</div></div><div class="s13 muted" style="width:210px">已练 ${repsOf(first)} 遍</div><div class="s13 muted" style="width:64px;text-align:right">今天</div><span class="btn sm p">练 →</span></a>`:''}
const _arena4=R.arena;R.arena=()=>{let h=_arena4();const d=myDept();const firstRow=firstRowHTML();
 h=h.replace(/(<h2>今日练习队列<\/h2>[\s\S]*?<\/div><\/div>)/,'$1'+firstRow);
 const card=`<div class="card" style="margin-top:16px"><div class="ch"><h2>部门场景</h2><span class="muted s13">当前演示员工：陈佳雯 · ${DMAP[d]}（侧栏可切换）</span><div class="r fil">${DEPT_CHIPS.slice(1).map(x=>`<span class="${x==(window._adept||d)?'on':''}" onclick="window._adept='${x}';go()">${DMAP[x]}</span>`).join('')}</div></div><div class="cards">${libAll().filter(s=>s.dept==(window._adept||d)).map(s=>`<a class="q" href="${scRoute(s)}" style="margin:0"><div style="flex:1"><div class="row"><span class="mono muted">${s.id}</span><b>${s.title}</b></div><div class="muted s13">${s.mode}${isSeed(s)?' · 示例':''}</div></div><span class="btn sm">练</span></a>`).join('')}</div></div>`;
 return h.replace('<div class="card" style="margin-top:16px"><div class="ch"><h2>场景掌握度',card+'<div class="card" style="margin-top:16px"><div class="ch"><h2>场景掌握度')};
// ---- 上岗认证：追加后台新建的路径 ----
const _cert4=R.cert;R.cert=()=>{let h=_cert4();const P=LS.get('certPaths',[]);if(!P.length)return h;const passed=n=>n=='一线客服 · 入门';
 const cards=P.map(p=>{const open=!p.pre||passed(p.pre);return`<div class="card" ${open?'':'style="opacity:.75"'}><div class="row"><h3>${p.name}</h3><span class="r tag ${open?'o':''}">${open?'练习中':'🔒 未解锁'}</span></div><div style="margin:12px 0">${bar(0)}</div><div>${p.name} · 已掌握 0/${p.sc.length} 个场景 · 0%</div><div class="muted s13">${open?'场景：'+p.sc.join('、'):'先完成「'+p.pre+'」认证，这条路径才会打开。'}</div><div class="muted s13">后台新建 · ${p.dept?DMAP[p.dept]:''}</div></div>`}).join('');
 return h.replace('<div class="grid g21" style="margin-top:16px">',`<div class="grid g3" style="margin-top:16px">${cards}</div><div class="grid g21" style="margin-top:16px">`)};
// ====================== 培训管理后台 ======================
let admTab=LS.get('admTab','sc');window.admGo=t=>{admTab=t;LS.set('admTab',t);go()};
const EMP=[['陈佳雯','售后','一线客服'],['林小雨','售后','一线客服'],['周明远','运维','值班工程师'],['吴佳','销售','客户经理'],['王小川','产品','产品经理'],['老周','研发','资深工程师'],['赵一凡','研发','后端工程师'],['郑可','采购','采购专员'],['孙婷','管理层','客服组长'],['冯远','业务线','业务线负责人'],['刘洋','销售','销售主管'],['钱多多','采购','采购经理']];
R.admin=()=>{const tabs=[['sc','场景与知识'],['org','员工与部门'],['data','练习数据'],['cfg','带教与认证'],['log','审计日志']];
 return`<div class="page"><div class="hd"><div><div class="eyebrow">管理视角</div><h1>培训管理后台</h1><div class="sub">管理场景与知识、员工与部门、练习数据、带教与认证规则。</div></div><div class="act"><a class="btn" href="#/overview" onclick="LS.set('role','emp')">返回员工端</a></div></div>
 <div class="tabs" style="max-width:760px">${tabs.map(t=>`<span class="${admTab==t[0]?'on':''}" onclick="admGo('${t[0]}')">${t[1]}</span>`).join('')}</div>${({sc:admSc,org:admOrg,data:admData,cfg:admCfg,log:admLog})[admTab]()}</div>`};
let editId=null;window.admEdit=id=>{editId=id;go()};
function admSc(){const L=allDeptSc(true),e=editId?(editId=='new'?{id:'S-'+(280+LS.get('scNew',[]).length),dept:'',title:'',desc:'',role:'',opener:'',theirGoal:'',ourGoal:'',mode:'AI 陪练',krefs:[],steps:[],status:'草稿',ver:'v0'}:getSc(editId)):null;
 const atoms=[...new Set(DEPT_SCENARIOS.flatMap(s=>s.krefs))].concat(['K-5.3.1','K-1.2.3','K-1.2.5','K-2.2.1','K-4.2.3']);
 return`<div class="grid ${e?'g21':''}" style="${e?'':'grid-template-columns:1fr'}"><div class="card"><div class="ch"><h2>场景管理</h2><span class="muted s13">${L.length} 个部门场景（另有 ${SC.length} 个早期场景）</span><button class="btn p r" onclick="admEdit('new')">＋ 新建场景</button></div><table><tr><th>编号</th><th>部门</th><th>标题</th><th>形式</th><th>知识原子</th><th>版本</th><th>状态</th><th></th></tr>${L.map(s=>`<tr><td class="mono">${s.id}</td><td class="nw" title="${DMAP[s.dept]||s.dept}">${s.dept}</td><td>${s.title}</td><td><span class="tag">${s.mode}</span></td><td class="s13">${(s.krefs||[]).length} 条</td><td>${s.ver}</td><td><span class="tag ${s.status=='草稿'?'y':'g'}">${s.status}</span></td><td><button class="btn sm" onclick="admEdit('${s.id}')">编辑</button></td></tr>`).join('')}</table></div>
 ${e?`<div class="card" id="scForm"><div class="ch"><h2>${editId=='new'?'新建场景':'编辑 '+e.id}</h2><span class="r tag">${e.ver} · ${e.status}</span></div>
 ${[['title','标题',e.title],['role','AI 扮演',e.role],['opener','开场白',e.opener],['theirGoal','对方目的',e.theirGoal],['ourGoal','我方目的',e.ourGoal],['desc','场景描述',e.desc]].map(f=>`<label class="fl">${f[1]}<textarea name="${f[0]}" rows="${f[0]=='title'?1:2}">${f[2]||''}</textarea></label>`).join('')}
 <label class="fl">归属部门<span class="muted s13" style="display:block;font-weight:400">负责维护这个场景的部门，只能选一个</span><select name="dept" required><option value="" ${e.dept?'':'selected'}>请选择归属部门（必填）</option>${DEPT_CHIPS.slice(1).map(d=>`<option value="${d}" ${d==e.dept?'selected':''}>${DMAP[d]}</option>`).join('')}</select></label><label class="fl">回合数（AI 陪练）<input type="number" name="turns" min="2" max="8" value="${e.turns||4}"></label><label class="fl">步骤 / 要点（沙盒、文本复述必填，每行一条）<textarea name="steps" rows="3">${(e.steps||[]).join('\n')}</textarea></label><label class="fl">形式<select name="mode">${['AI 陪练','沙盒实操','文本复述','话术模拟'].map(m=>`<option ${m==e.mode?'selected':''}>${m}</option>`).join('')}</select></label>
 <div class="fl">关联知识原子（至少 1 条才能发布）<div class="atoms">${atoms.map(a=>`<label class="s13"><input type="checkbox" name="k" value="${a}" ${(e.krefs||[]).includes(a)?'checked':''}> ${a}</label>`).join('')}</div></div>
 <div id="fmsg" class="s13" style="margin:6px 0"></div><div class="row"><button class="btn" onclick="admEdit(null)">取消</button><button class="btn r" onclick="scSave('草稿')">保存草稿</button><button class="btn p" onclick="scSave('已发布')">发布</button></div></div>`:''}</div>`}
window.scSave=st=>{const F=$('#scForm'),g=n=>F.querySelector(`[name=${n}]`).value.trim();const k=[...F.querySelectorAll('[name=k]:checked')].map(x=>x.value);
 if(st=='已发布'&&!k.length){$('#fmsg').innerHTML='<span class="dn">没有关联知识原子，只能保存为草稿。</span>';return}if(!g('title')){$('#fmsg').innerHTML='<span class="dn">请填写标题。</span>';return}
 const data={title:g('title'),role:g('role'),opener:g('opener'),theirGoal:g('theirGoal'),ourGoal:g('ourGoal'),desc:g('desc'),dept:g('dept'),mode:g('mode'),krefs:k,status:st,turns:Math.max(2,Math.min(8,+g('turns')||4)),steps:g('steps').split('\n').map(x=>x.trim()).filter(Boolean)};if(st=='已发布'){const dlg=data.mode=='AI 陪练'||data.mode=='话术模拟';const miss=dlg?[!data.opener&&'开场白',!data.ourGoal&&'我方目的'].filter(Boolean):(data.steps.length<2?['至少 2 条步骤 / 要点']:[]);if(miss.length){$('#fmsg').innerHTML='<span class="dn">发布前请补齐：'+miss.join('、')+'。可以先保存草稿。</span>';return}}
 if(editId=='new'){const nw=LS.get('scNew',[]);const id='S-'+(280+nw.length);nw.push({id,...data,ver:st=='已发布'?'v1':'v0'});LS.set('scNew',nw);audit('场景 '+id,'新建 · '+st,'',data.title);editId=id}
 else{const ed=LS.get('scEdits',{}),cur=getSc(editId);const vn='v'+(parseInt((cur.ver||'v1').slice(1))+1);ed[editId]={...(ed[editId]||{}),...data,ver:vn};LS.set('scEdits',ed);
  if(editId.startsWith('S-28')){const nw=LS.get('scNew',[]).map(x=>x.id==editId?{...x,...data,ver:vn}:x);LS.set('scNew',nw)}audit('场景 '+editId,'编辑 · '+st+' · '+vn,cur.title,data.title)}
 if(st=='已发布')editId=null;toast(st=='已发布'?'已发布，场景库可见':'已保存为草稿');go()};
function admOrg(){const sel=window._odept||'售后',A=assigned(sel),L=libAll();
 return`<div class="grid" style="grid-template-columns:260px 1fr 1fr"><div class="card"><div class="ch"><h2>组织架构</h2></div><div class="tree">${DEPT_CHIPS.slice(1).map(d=>`<div class="${d==sel?'on':''}" onclick="window._odept='${d}';go()">${DMAP[d]}<span>${DDATA[d][0]} 人</span></div>`).join('')}</div></div>
 <div class="card"><div class="ch"><h2>${DMAP[sel]} · 分配场景</h2><button class="btn p r" onclick="saveAssign('${sel}')">保存分配</button></div><div class="muted s13" style="margin-bottom:8px">勾选顺序 = 员工端「今日练习」推荐顺序，第一项为今日首条</div><div class="atoms" id="asg" style="grid-template-columns:1fr">${L.filter(s=>s.dept==sel).concat(L.filter(s=>s.dept!=sel&&A.includes(s.id))).map(s=>`<label><input type="checkbox" value="${s.id}" ${A.includes(s.id)?'checked':''}> <span class="mono">${s.id}</span> ${s.title}</label>`).join('')}</div></div>
 <div class="card"><div class="ch"><h2>员工</h2><span class="muted s13">共 ${headTotal()} 人，这里列出 ${EMP.length} 位</span></div><table><tr><th>姓名</th><th>部门</th><th>角色</th></tr>${EMP.map((e,i)=>{const o=i==0?{dept:meInfo().dept,role:meInfo().role}:(LS.get('empEdits',{})[e[0]]||{});const dd=o.dept||e[1];return`<tr><td>${e[0]}${i==0?' <span class="tag g">演示员工</span>':''}</td><td><select onchange="empSet('${e[0]}','dept',this.value)">${DEPT_CHIPS.slice(1).map(d=>`<option ${d==dd?'selected':''}>${d}</option>`).join('')}</select></td><td><select onchange="empSet('${e[0]}','role',this.value)">${['一线客服','值班工程师','客户经理','产品经理','资深工程师','后端工程师','采购专员','客服组长','业务线负责人','销售主管','采购经理','培训管理员'].map(r=>`<option ${r==(o.role||e[2])?'selected':''}>${r}</option>`).join('')}</select></td></tr>`}).join('')}</table></div></div>`}
window.saveAssign=d=>{const v=[...document.querySelectorAll('#asg input:checked')].map(x=>x.value);const A=LS.get('assign',{});const before=(A[d]||[]).join(',');A[d]=v;LS.set('assign',A);audit('部门分配 '+DMAP[d],'修改场景分配',before,v.join(','));toast('已保存：'+DMAP[d]+' 分配 '+v.length+' 个场景')};
window.empSet=(n,k,v)=>{const E=LS.get('empEdits',{});const base=EMP.find(e=>e[0]==n)||[];const before=(E[n]||{})[k]||(k=='dept'?base[1]:base[2])||'';E[n]={...(E[n]||{}),[k]:v};LS.set('empEdits',E);if(n=='陈佳雯'&&k=='dept'){LS.set('myDept',v)}audit('员工 '+n,'修改'+(k=='dept'?'部门':'角色'),before,v);toast(n+' 的'+(k=='dept'?'部门':'角色')+'已改为 '+v+(n=='陈佳雯'&&k=='dept'?'，今日推荐已更新':''))};
function spark(seed){const pts=Array.from({length:8},(_,i)=>40+((seed*7+i*13)%30)+i*3);return`<svg viewBox="0 0 120 32" width="120" height="32"><polyline fill="none" stroke="#2f4a3c" stroke-width="2" points="${pts.map((v,i)=>i*16+','+(32-(v-30)/2.5)).join(' ')}"/></svg>`}
function admData(){const ks=Object.keys(DDATA),tot=ks.reduce((a,k)=>a+DDATA[k][0],0);
 return`<div class="grid g4" style="margin-bottom:16px">${[['在册员工',tot+' 人'],['本周练习',fmtN(weeklyPractice())+' 次'],['平均完成率',Math.round(ks.reduce((a,k)=>a+DDATA[k][1]*DDATA[k][0],0)/tot)+'%'],['平均掌握率',Math.round(ks.reduce((a,k)=>a+DDATA[k][2]*DDATA[k][0],0)/tot)+'%']].map(k=>`<div class="card kpi"><div class="l">${k[0]}</div><div class="n">${k[1]}</div><div class="muted s13">按人数加权</div></div>`).join('')}</div>
 <div class="card"><div class="ch"><h2>各部门练习情况</h2><span class="muted s13">部门合计 = 全公司合计（${tot} 人）</span><button class="btn r" onclick="exportCsv('部门练习数据',[['部门','人数','完成率','掌握率','薄弱维度']].concat(Object.keys(DDATA).map(k=>[DMAP[k],...DDATA[k]])).concat([['全公司',headTotal(),Math.round(Object.values(DDATA).reduce((a,v)=>a+v[1]*v[0],0)/headTotal()),Math.round(Object.values(DDATA).reduce((a,v)=>a+v[2]*v[0],0)/headTotal()),'']]))">导出</button></div><table><tr><th>部门</th><th>人数</th><th style="width:22%">完成率</th><th style="width:22%">掌握率</th><th>薄弱维度</th><th>近 8 周趋势</th></tr>${ks.map((k,i)=>`<tr><td>${DMAP[k]}</td><td>${DDATA[k][0]}</td><td><div class="row">${bar(DDATA[k][1])}<b style="width:40px">${DDATA[k][1]}%</b></div></td><td><div class="row">${bar(DDATA[k][2],'#b48a2c')}<b style="width:40px">${DDATA[k][2]}%</b></div></td><td><span class="tag o">${DDATA[k][3]}</span></td><td>${spark(i+1)}</td></tr>`).join('')}<tr><td><b>全公司</b></td><td><b>${tot}</b></td><td colspan="4"></td></tr></table></div>`}
function admCfg(){const P=LS.get('certPaths',[]);
 return`<div class="grid g2"><div class="card" id="cfgForm"><div class="ch"><h2>带教与掌握规则</h2><span class="r tag y">待决策 ①②</span></div>
 ${[['masteryLine','达标线 T（结果页曲线 / 掌握定义 / 点评最高档）'],['midLine','点评中档下限'],['masteryReps','连续几遍达标算掌握 N'],['masteryVariants','掌握需覆盖的变体数'],['mentorAfterFails','连续未达标几遍后安排带教 X']].map(f=>`<label class="fl">${f[1]}<input type="number" name="${f[0]}" value="${CONFIG[f[0]]}"></label>`).join('')}
 <label class="fl">提示得分上限（第 1 / 2 / 3 级）<div class="row">${[1,2,3].map(i=>`<input type="number" name="cap${i}" value="${CONFIG.hintCap[i]}" style="width:90px">`).join('')}</div></label>
 <div class="row"><button class="btn" onclick="if(confirm('恢复默认配置？')){const b=JSON.stringify(LS.get('config',{}));LS.del('config');audit('CONFIG','恢复默认',b,'');location.reload()}">恢复默认</button><button class="btn p r" onclick="cfgSave()">保存并生效</button></div></div>
 <div class="card" id="cpForm"><div class="ch"><h2>认证路径</h2></div><table><tr><th>路径</th><th>前置</th><th>场景</th></tr><tr><td>一线客服 · 入门</td><td>—</td><td>6</td></tr><tr><td>一线客服 · L2 提级</td><td>一线客服 · 入门</td><td>18</td></tr><tr><td>退换货专线</td><td>一线客服 · L2 提级</td><td>5</td></tr>${P.map(p=>`<tr><td>${p.name} <span class="tag g">新建</span></td><td>${p.pre||'—'}</td><td>${p.sc.length}</td></tr>`).join('')}</table>
 <h3 style="margin-top:14px">新建认证路径</h3><label class="fl">名称<input name="name" placeholder="例：售后 · 投诉升级专线"></label><label class="fl">部门<select name="dept">${DEPT_CHIPS.slice(1).map(d=>`<option>${d}</option>`).join('')}</select></label><label class="fl">前置路径<select name="pre"><option value="">无</option>${['一线客服 · 入门','一线客服 · L2 提级','退换货专线'].concat(P.map(p=>p.name)).map(n=>`<option>${n}</option>`).join('')}</select></label>
 <div class="fl">场景包<div class="atoms">${libAll().map(s=>`<label class="s13"><input type="checkbox" name="sc" value="${s.id}"> ${s.id}</label>`).join('')}</div></div><div id="cpmsg" class="s13"></div><button class="btn p" onclick="cpSave()">创建路径</button></div></div>`}
window.cfgSave=()=>{const F=$('#cfgForm'),n=k=>+F.querySelector(`[name=${k}]`).value;const c={masteryLine:n('masteryLine'),midLine:n('midLine'),masteryReps:n('masteryReps'),masteryVariants:n('masteryVariants'),mentorAfterFails:n('mentorAfterFails'),hintCap:[100,n('cap1'),n('cap2'),n('cap3')]};
 if(!(c.midLine<c.masteryLine&&c.masteryLine<=100)){toast('需要 中档下限 < 达标线 ≤ 100');return}Object.keys(c).forEach(k=>{if(JSON.stringify(CONFIG[k])!=JSON.stringify(c[k]))audit('CONFIG.'+k,'修改',JSON.stringify(CONFIG[k]),JSON.stringify(c[k]))});LS.set('config',c);const cap=c.hintCap;delete c.hintCap;Object.assign(CONFIG,c);cap.forEach((v,i)=>CONFIG.hintCap[i]=v);PASS=CONFIG.masteryLine;MENTOR_X=CONFIG.mentorAfterFails;toast('已保存，立即生效');go()};
window.cpSave=()=>{const F=$('#cpForm'),name=F.querySelector('[name=name]').value.trim(),sc=[...F.querySelectorAll('[name=sc]:checked')].map(x=>x.value);if(!name||!sc.length){$('#cpmsg').innerHTML='<span class="dn">请填写名称并至少选 1 个场景。</span>';return}
 const P=LS.get('certPaths',[]);P.push({name,dept:F.querySelector('[name=dept]').value,pre:F.querySelector('[name=pre]').value,sc});LS.set('certPaths',P);audit('认证路径 '+name,'新建','',sc.join(','));toast('已创建，员工端「上岗认证」可见');go()};
let logF={actor:'',obj:''};window.logSet=(k,v)=>{logF[k]=v;go()};
function admLog(){const A=LS.get('audit',[]);const actors=[...new Set(A.map(a=>a.actor))];const L=A.filter(a=>(!logF.actor||a.actor==logF.actor)&&(!logF.obj||a.object.includes(logF.obj)));
 return`<div class="card"><div class="ch"><h2>审计日志</h2><span class="muted s13">每次配置、场景、分配、员工变更都会记录（本机）</span></div><div class="row" style="margin-bottom:10px"><label class="s13">操作人 <select onchange="logSet('actor',this.value)"><option value="">全部</option>${actors.map(a=>`<option ${a==logF.actor?'selected':''}>${a}</option>`).join('')}</select></label><label class="s13">对象 <input placeholder="如 CONFIG / 场景 S-201" value="${logF.obj}" oninput="logF.obj=this.value;logFilter()"></label><span class="r muted s13" id="logc">${L.length} / ${A.length} 条</span></div>
 <table><tr><th>时间（UTC+8）</th><th>操作人</th><th>对象</th><th>操作</th><th>修改前</th><th>修改后</th></tr>${L.map(a=>`<tr class="lr" data-o="${a.object}" data-a="${a.actor}"><td class="mono">${a.ts}</td><td>${a.actor}</td><td>${a.object}</td><td>${a.action}</td><td class="s13 muted">${a.before}</td><td class="s13">${a.after}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">还没有记录。</td></tr>'}</table></div>`}
// ---- 身份切换 → 后台；演示员工部门切换 ----
document.querySelector('#role').addEventListener('click',e=>{const v=e.target.dataset.v;if(!v)return;setTimeout(()=>{location.hash=v=='adm'?'#/admin':'#/overview'},0)});
document.querySelector('.me').insertAdjacentHTML('afterend',`<label class="s13 muted" style="padding:8px 6px 0;display:block">演示员工部门 <select id="mydept" onchange="const _b=(LS.get('empEdits',{})['陈佳雯']||{}).dept||LS.get('myDept','售后');LS.set('myDept',this.value);const E=LS.get('empEdits',{});E['陈佳雯']={...(E['陈佳雯']||{}),dept:this.value};LS.set('empEdits',E);audit('员工 陈佳雯','切换演示部门',_b,this.value);window._adept=null;go()">${DEPT_CHIPS.slice(1).map(d=>`<option>${d}</option>`).join('')}</select></label>`);
Object.assign(NAMES,{play:'练习场 › <b>部门场景</b>',dresult:'练习场 › <b>结果页</b>',admin:'管理视角 › <b>培训管理后台</b>'});
const _go4=go;go=function(){document.querySelectorAll('.modal').forEach(m=>m.remove());_go4();const md=$('#mydept');if(md)md.value=myDept();const k=(location.hash.slice(2)||'').split('?')[0];document.querySelectorAll('#nav a').forEach(a=>{if(k=='play'||k=='dresult')a.classList.toggle('on',a.dataset.r=='arena');if(k=='admin')a.classList.remove('on')})};
go();
const _go5=go;go=function(){_go5();const c=document.querySelector('#nav a[data-r=scenarios] .cnt');if(c)c.textContent=libAll().length};go();
// ===================== r5：QA r4 修复 =====================
// 反馈计数唯一来源
// 人数唯一来源：DDATA（组织架构 / 看板 / 总览都从这里算）
// 标注也写审计日志
const _lsset=LS.set;LS.set=function(k,v){if(k=='fb'){const o=LS.get('fb',[]);if(Array.isArray(v)&&v.length>o.length){const f=v[0];_lsset.call(LS,k,v);audit('反馈 '+f.id,'标注场景问题 · '+(f.type||''),'',(f.att||'')+' / '+(f.var||''));return}}return _lsset.call(LS,k,v)};
// S-087 评分看回合：重复前面回合的说法要扣分
const _er5=evalRaw;evalRaw=function(i,t){const r=_er5(i,t);const s=S();const prev=(s.turns||[]).filter(x=>x.i!=i).map(x=>x.t);if(prev.includes(t.trim())||prev.includes(t)){Object.keys(r.d).forEach(k=>r.d[k]=Math.max(20,r.d[k]-25));r.bad=true;r.misses=[['和前面回合说法重复，没有回应客户这一回合的新问题','K-5.3.1',1]].concat(r.misses||[]);r.goods=[]}return r};
// 角色 / 部门可见：侧栏用户行 + 权限
const MANAGER_ROLES=['客服组长','业务线负责人','销售主管','采购经理'];
function meInfo(){const o=LS.get('empEdits',{})['陈佳雯']||{};const role=o.role||'一线客服',dept=o.dept||myDept();return{role,dept,mgr:MANAGER_ROLES.includes(role)}}
function paintMe(){const m=meInfo(),el=document.querySelector('.me .muted');if(el)el.innerHTML=`${DMAP[m.dept]} · ${m.role}<br><span class="tag ${m.mgr||canAdmin()?'b':''}" style="margin-top:3px;display:inline-block">${canAdmin()?'权限：员工 + 管理后台':m.mgr?'权限：员工 + 团队数据':'权限：员工'}</span>`;
 const nav=document.querySelector('#nav');let t=document.querySelector('#nav a[data-r=team]');if(m.mgr&&!t)nav.insertAdjacentHTML('beforeend','<a href="#/team" data-r="team"><span class="ic">◔</span>我的团队</a>');if(!m.mgr&&t)t.remove()}
R.team=()=>{const m=meInfo();if(!m.mgr)return R.forbidden();const d=DDATA[m.dept];return`<div class="page"><div class="hd"><div><div class="eyebrow">${m.role} 可见</div><h1>我的团队 · ${DMAP[m.dept]}</h1><div class="sub">只读视图。</div></div></div><div class="grid g4">${[['人数',d[0]+' 人'],['完成率',d[1]+'%'],['掌握率',d[2]+'%'],['薄弱维度',d[3]]].map(k=>`<div class="card kpi"><div class="l">${k[0]}</div><div class="n">${k[1]}</div></div>`).join('')}</div><div class="card" style="margin-top:16px"><div class="ch"><h2>本部门场景</h2></div>${libAll().filter(s=>s.dept==m.dept).map(s=>`<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="mono muted">${s.id}</span>${s.title}<span class="ml muted s13">团队已练 ${LS.get('scNew',[]).some(x=>x.id==s.id)?0:(d[0]*3+s.id.charCodeAt(4))%60} 遍</span></div>`).join('')}</div></div>`};
// 无权限演示页（真实 403 待环境）
R.forbidden=()=>`<div class="page"><div class="card" style="max-width:560px;margin:60px auto;text-align:center;padding:40px"><div style="font-size:40px">🔒</div><h1 style="margin:10px 0">无权限</h1><p class="muted">当前身份（${meInfo().role}）不能访问这个页面。需要管理权限时，请联系培训管理员。</p><a class="btn p" href="#/overview">回总览</a></div></div>`;
const _adm5=R.admin;R.admin=()=>LS.get('role','emp')=='adm'?_adm5():R.forbidden();
Object.assign(NAMES,{team:'个人 › <b>我的团队</b>',forbidden:'<b>无权限</b>'});
// 总览「我的今日练习」首条 = 练习场同源
const _ov5=R.overview;R.overview=()=>{let h=_ov5();const fr=firstRowHTML();return h.replace(/(<h2>我的今日练习<\/h2>[\s\S]*?<\/div>)(<a class="q"[\s\S]*?<\/a>)/,(m0,a)=>a+fr)};
const _go6=go;go=function(){_go6();const c=document.querySelector('#nav a[data-r=feedback] .cnt');if(c)c.textContent=fbN();paintMe()};go();
const _es5=window.empSet;window.empSet=(n,k,v)=>{_es5(n,k,v);if(n=='陈佳雯')paintMe()};
// ===================== r6：QA r5 修复 =====================
// 7 审计日志：输入/粘贴即筛选，不重绘输入框
window.logFilter=()=>{const rows=[...document.querySelectorAll('tr.lr')];let n=0;rows.forEach(r=>{const ok=(!logF.actor||r.dataset.a==logF.actor)&&(!logF.obj||r.dataset.o.includes(logF.obj));r.style.display=ok?'':'none';if(ok)n++});const c=$('#logc');if(c)c.textContent=n+' / '+rows.length+' 条'};
// 3 「管理」切换按角色：只有「培训管理员」可进；侧栏可切演示角色
function canAdmin(){return ['培训管理员'].includes(meInfo().role)}
document.querySelector('#role').addEventListener('click',e=>{if(e.target.dataset.v=='adm'&&!canAdmin()){e.stopImmediatePropagation();e.preventDefault();LS.set('role','emp');location.hash='#/forbidden';toast('当前角色没有管理权限')}},true);
const _adm6=R.admin;R.admin=()=>canAdmin()?_adm6():R.forbidden();
const ROLES=['一线客服','客服组长','值班工程师','客户经理','产品经理','后端工程师','采购专员','销售主管','采购经理','业务线负责人','培训管理员'];
document.querySelector('#mydept').parentElement.insertAdjacentHTML('afterend',`<label class="s13 muted" style="padding:4px 6px 0;display:block">演示员工角色 <select id="myrole" style="border:1px solid var(--line);border-radius:6px;font:inherit;font-size:13px" onchange="setMyRole(this.value)">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select></label>`);
window.setMyRole=v=>{const E=LS.get('empEdits',{}),base=EMP[0];const before=(E['陈佳雯']||{}).role||base[2];E['陈佳雯']={...(E['陈佳雯']||{}),role:v};LS.set('empEdits',E);audit('员工 陈佳雯','修改角色',before,v);if(!canAdmin()&&LS.get('role','emp')=='adm'){LS.set('role','emp')}go()};
// 6 问候语：标题只放姓名，副标题放 角色 · 部门
const tod=()=>{const h=new Date().getHours();return h<11?'早上好':h<13?'中午好':h<18?'下午好':'晚上好'};
const _ov6=R.overview;R.overview=()=>{const m=meInfo();return _ov6().replace(/<h1>(早上好|中午好|下午好|晚上好)，[^<]*。<\/h1>/,LS.get('role','emp')=='adm'?`<h1>${tod()}，许敏。</h1><div class="sub">培训管理员 · 管理视角</div>`:`<h1>${tod()}，陈佳雯。</h1><div class="sub">${m.role} · ${DMAP[m.dept]}</div>`)};
// 5 队列去重：同一场景合并成一条，原因合并
function dedupeQ(){document.querySelectorAll('.card').forEach(card=>{const seen={};card.querySelectorAll(':scope a.q, :scope > div a.q').forEach(q=>{const id=(q.querySelector('.mono')||{}).textContent;if(!id)return;if(seen[id]){const why=seen[id].querySelector('.why'),tag=q.querySelector('.tag');if(why&&tag&&!why.textContent.includes(tag.textContent))why.textContent+=' · 另：'+tag.textContent;q.remove()}else seen[id]=q})})}
const _go7=go;go=function(){_go7();dedupeQ();const r=$('#myrole');if(r)r.value=meInfo().role;const rs=document.querySelector('#role');if(rs){const a=rs.querySelector('[data-v=adm]');if(a)a.title=canAdmin()?'进入培训管理后台':'当前角色没有管理权限'}};go();

// ===================== r7：QA r6 修复 =====================
// 6 应用内输入弹窗（替代原生 prompt）
window.askText=(title,sub,def,cb)=>{closeMd();modal(`<h2>${title}</h2><div class="muted s13" style="margin:4px 0 10px">${sub}</div><textarea id="askv" style="width:100%;height:110px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit">${(def||'').replace(/</g,'&lt;')}</textarea><div id="askm" class="s13 dn" style="min-height:18px"></div><div class="row" style="margin-top:8px"><button class="btn ml" onclick="closeMd()">取消</button><button class="btn p" id="askok">提交这一回合</button></div>`);
 const ta=$('#askv');ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);const ok=()=>{const v=ta.value.trim();if(!v){$('#askm').textContent='先写点什么再提交';return}closeMd();cb(v)};$('#askok').onclick=ok;ta.onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key=='Enter'){e.preventDefault();e.stopPropagation();ok()}if(e.key=='Escape')closeMd()}};
// 2/3 视角与角色同步：管理员可直接打开 #/admin；非管理员一律回到员工视角
function setView(v){role=v;LS.set('role',v)}
const _go8=go;go=function(){const k=(location.hash.slice(2)||'').split('?')[0];if(k=='admin'&&canAdmin()&&role!='adm')setView('adm');if(!canAdmin()&&role=='adm')setView('emp');_go8()};
const _smr=window.setMyRole;window.setMyRole=v=>{_smr(v);if(!canAdmin()){setView('emp');go()}};
const _es7=window.empSet;window.empSet=(n,k,v)=>{_es7(n,k,v);if(n=='陈佳雯'){if(!canAdmin())setView('emp');go()}};
go();
// ===================== r8：演示说明（所有开发说明集中在这里，页面上不再散落） =====================
const DEMO_NOTES={
 _all:['所有人名、数字、公司均为演示数据；「示例」标签只标在演示种子场景上，后台新建的场景不带。','所有修改只存在本机浏览器（localStorage），侧栏「重置演示数据」可清空。','阈值读 CONFIG：达标线 T = CONFIG.masteryLine（默认 80，待决策 ①），中档线 CONFIG.midLine，带教触发 X = CONFIG.mentorAfterFails（待决策 ②）。'],
 overview:['人数、反馈计数与组织架构、看板同源（DDATA / fbN）。','管理视角的数字为全公司演示数据汇总。'],
 arena:['掌握定义 = 连续 N 遍 ≥ T（N、T、变体数待决策 ①）。','带教通知里的 {带教姓名} / {时限} 为待决策占位（② / Q5），界面暂用中性文案；通知发送待环境。'],
 session:['红线识别目前是规则演示，覆盖不完整；实际依赖 AI 模型判断（待环境）。','达标线读 CONFIG.masteryLine。','提示得分上限读 CONFIG.hintCap（待决策 ①）。'],
 play:['知识依据 {K-部门.x.x} 为占位编号，接入知识库后替换（文案稿保留原样，未编造政策）。','达标线读 CONFIG.masteryLine。','红线识别目前是规则演示，覆盖不完整；实际依赖 AI 模型判断（待环境）。'],
 dresult:['知识依据为占位编号，接入知识库后替换。'],
 review:['分享链接、种子回放等后端能力待环境。'],
 scenarios:['场景与数字均为演示数据；部门场景文案来自 copy 稿，可整体替换 scenarios.js。'],
 feedback:['AI 修正建议生成待环境（界面显示「正在生成」）。','AI 建议生成后才能采纳（待环境）。','计数与总览、侧栏角标同源（fbN）。'],
 cert:['证书分享页、复训通知待环境。','后台新建的认证路径保存在本机。'],
 admin:['本地原型：所有修改保存在本机浏览器（localStorage），数据为演示数据。','员工人数与组织架构、看板同源（DDATA）。','练习数据：明细接口一致性校验待环境；部门 KPI 按人数加权，为演示数据。','带教与掌握规则即 CONFIG；T / N / 变体数 / hintCap 待决策 ①，带教触发 X 待决策 ②。','导出 SHA 一致性、后台接口 403 待环境。'],
 team:['只读视图，数据为演示数据。'],
 forbidden:['真实接口鉴权（403）待环境；这里只是前端演示拦截。'],
 retell:['粘贴检测为前端演示；正式评分依赖 AI（待环境）。']};
document.querySelector('.top').insertAdjacentHTML('beforeend','<span class="tag" id="demoTag" style="cursor:pointer;margin-left:8px" onclick="demoNotes()">演示说明</span>');
const curRoute=()=>(location.hash.slice(2)||'overview').split('?')[0];
window.demoNotes=()=>{const old=$('#demoPop');if(old){old.remove();return}const r=curRoute(),L=(DEMO_NOTES[r]||[]).concat(DEMO_NOTES._all);
 document.body.insertAdjacentHTML('beforeend',`<div id="demoPop" class="card" style="position:fixed;top:56px;right:16px;width:380px;z-index:60;box-shadow:0 8px 28px rgba(0,0,0,.12)"><div class="row"><b>演示说明 · ${(NAMES[r]||r).replace(/<[^>]+>/g,'')}</b><button class="btn sm ml" onclick="$('#demoPop').remove()">关闭</button></div><ul style="margin:8px 0 0 18px;padding:0;line-height:1.7" class="s13">${L.map(x=>`<li>${x}</li>`).join('')}</ul></div>`)};
addEventListener('hashchange',()=>{const p=$('#demoPop');p&&p.remove()});
// ===================== r9：深度测试修复 =====================
FOLLOW.push('如果这个方案不行，你的备选是什么？','我还需要跟老板交代，你能帮我总结一下吗？','那我们就按这个来，你那边谁负责跟进？','最后确认一下，还有什么我需要准备的？');
// —— 无变化的修改不写审计
const _audit9=audit;audit=function(o,a,b,c){if(b!=null&&c!=null&&String(b)===String(c)&&String(b)!=='')return;_audit9(o,a,b,c)};
// —— 人数随员工调部门变化（总数不变）
const DBASE=Object.fromEntries(Object.entries(DDATA).map(([k,v])=>[k,v[0]]));window.__DBASE=DBASE;
function applyMoves(){Object.keys(DDATA).forEach(k=>DDATA[k][0]=DBASE[k]);const E=LS.get('empEdits',{});EMP.forEach(e=>{const to=e[0]=='陈佳雯'?meInfo().dept:(E[e[0]]||{}).dept;if(to&&to!=e[1]&&DDATA[to]){DDATA[e[1]][0]--;DDATA[to][0]++}})}
// —— 身份：角色受部门限制；「我的团队」按范围
meInfo=function(){const o=LS.get('empEdits',{})['陈佳雯']||{};const dept=o.dept||LS.get('myDept','售后');let role=o.role||'一线客服';if(!rolesOf(dept).includes(role))role=rolesOf(dept)[0];const scope=TEAM_SCOPE(role);return{role,dept,mgr:!!scope,scope}};
function fixRole(name,dept){const E=LS.get('empEdits',{}),base=EMP.find(e=>e[0]==name)||[];const cur=(E[name]||{}).role||base[2];if(!rolesOf(dept).includes(cur)){const nr=rolesOf(dept)[0];E[name]={...(E[name]||{}),role:nr};LS.set('empEdits',E);audit('员工 '+name,'修改角色（随部门调整）',cur,nr)}}
const _es9=window.empSet;window.empSet=(n,k,v)=>{const E=LS.get('empEdits',{}),base=EMP.find(e=>e[0]==n)||[];const before=(E[n]||{})[k]||(n=='陈佳雯'&&k=='dept'?meInfo().dept:n=='陈佳雯'&&k=='role'?meInfo().role:(k=='dept'?base[1]:base[2]));if(before===v)return;_es9(n,k,v);if(k=='dept')fixRole(n,v);go()};
const _md9=$('#mydept').onchange;$('#mydept').onchange=null;$('#mydept').removeAttribute('onchange');$('#mydept').addEventListener('change',function(){const v=this.value,b=meInfo().dept;if(v==b)return;LS.set('myDept',v);const E=LS.get('empEdits',{});E['陈佳雯']={...(E['陈佳雯']||{}),dept:v};LS.set('empEdits',E);audit('员工 陈佳雯','切换演示部门',b,v);fixRole('陈佳雯',v);window._adept=null;go()});
const _smr9=window.setMyRole;window.setMyRole=v=>{if(v==meInfo().role)return;_smr9(v)};
R.team=()=>{const m=meInfo();if(!m.mgr)return R.forbidden();const ds=m.scope=='all'?Object.keys(DDATA):m.scope=='line'?LINE_DEPTS:[m.dept];const newIds=LS.get('scNew',[]).map(x=>x.id);
 return`<div class="page"><div class="hd"><div><div class="eyebrow">${m.role} 可见</div><h1>我的团队</h1><div class="sub">范围：${ds.map(d=>DMAP[d]).join('、')} · 只读</div></div></div>
 <div class="card"><table><tr><th>部门</th><th>人数</th><th>完成率</th><th>掌握率</th><th>薄弱维度</th></tr>${ds.map(d=>`<tr><td>${DMAP[d]}</td><td>${DDATA[d][0]}</td><td>${DDATA[d][1]}%</td><td>${DDATA[d][2]}%</td><td><span class="tag o">${DDATA[d][3]}</span></td></tr>`).join('')}</table></div>
 <div class="card" style="margin-top:16px"><div class="ch"><h2>范围内场景</h2></div>${libAll().filter(s=>ds.includes(s.dept)).map(s=>`<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="mono muted">${s.id}</span>${s.title}<span class="ml muted s13">团队已练 ${newIds.includes(s.id)?0:(DDATA[s.dept][0]*3+s.id.charCodeAt(4))%60} 遍</span></div>`).join('')}</div></div>`};
// —— 员工端看不到 {K-…} 占位；后台看原文
const hideK=h=>h.replace(/\{K-[^}]*\}/g,'引用知识待补充');
const _play9=R.play;R.play=()=>hideK(_play9());const _dres9=R.dresult;R.dresult=()=>{setT(getSc(qid()));return hideK(_dres9())};
// —— 练习场主推跟随部门
const _ar9=R.arena;R.arena=()=>{let h=_ar9();const f=firstOf();if(!f||f.id=='S-087')return h;const n=legacyBase(f.id)+dH(f.id).length+(f.id=='S-087'?H().length:0);const best=dH(f.id).length?bestOf(dH(f.id)):null;
 return h.replace(/<div class="heroCard">[\s\S]*?<\/a><\/div>/,`<div class="heroCard"><div style="flex:1"><div class="eyebrow" style="color:#b9d1c3">下一遍 · ${DMAP[f.dept]}必练</div><h1 style="font-size:24px">${f.id} ${f.title}</h1><div class="sub">第 ${n+1} 次练习 · ${f.mode} · 最好成绩 ${best==null?'还没有成绩':best}</div><div class="quote">一次不会练 10 次，10 次不会练 50 次。每一回合都有教练点评。</div></div><div class="stat"><b>12 天</b>连续练习</div><div class="stat"><b>${document.createElement('div')&&(h.match(/<b>(\d+) 项<\/b>今日队列/)||[0,'—'])[1]} 项</b>今日队列</div><div class="stat"><b>${n} 遍</b>${f.id} 已练</div><a class="btn big" href="${scRoute(f)}">▶ 开始下一遍</a></div>`)};
// —— 复盘记录收录所有场景
const _rev9=R.review;R.review=()=>{const L=libAll().filter(s=>s.id!='S-087'&&dH(s.id).length);const card=`<div class="card" style="margin-top:16px"><div class="ch"><h2>其他场景的复盘</h2><span class="muted s13">${L.length} 个场景有练习记录</span></div>${L.length?`<table><tr><th>场景</th><th>部门</th><th>已练</th><th>最近成绩</th><th></th></tr>${L.map(s=>{const hs=dH(s.id),l=hs.slice(-1)[0];return`<tr><td><span class="mono muted">${s.id}</span> ${s.title}</td><td>${DMAP[s.dept]}</td><td>${legacyBase(s.id)+hs.length} 次</td><td>${hs.slice(-3).map(x=>x.score).join(' · ')}</td><td><a class="btn sm" href="${l.turns?'#/dresult?id='+s.id:scRoute(s)}">看复盘</a></td></tr>`}).join('')}</table>`:'<div class="muted">练完其他场景后，会在这里出现。</div>'}</div>`;return _rev9().replace(/<\/div>\s*$/,card+'</div>')};
// —— 上岗认证：占位符改中性文案；去练按场景跳转；路径按部门
const _cert9=R.cert;R.cert=()=>{let h=_cert9();
 h=h.replace(/<tr><td>(S-\d+)([^<]*)<\/td>([\s\S]*?)<a class="btn sm p" href="#\/[a-z]+">去练<\/a>/g,(m0,id,t,mid)=>{const s=libAll().find(x=>x.id==id);return`<tr><td>${id}${t}</td>${mid}${s?`<a class="btn sm p" href="${scRoute(s)}">去练</a>`:'<span class="btn sm" title="场景还没上线" style="opacity:.6;cursor:default">即将上线</span>'}`});
 const me=meInfo();const P=LS.get('certPaths',[]);const hidden=P.filter(p=>p.dept&&p.dept!=me.dept).map(p=>p.name);hidden.forEach(n=>{h=h.replace(new RegExp('<div class="card"[^>]*><div class="row"><h3>'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'</h3>[\\s\\S]*?后台新建 · [^<]*</div></div>'),'')});
 P.filter(p=>!p.dept||p.dept==me.dept).forEach(p=>{const ok=p.sc.filter(id=>{const hs=id=='S-087'?H():dH(id);let n=0;for(const x of hs.slice().reverse()){if(x.score>=CONFIG.masteryLine)n++;else break}return n>=CONFIG.masteryReps}).length;h=h.replace(`${p.name} · 已掌握 0/${p.sc.length} 个场景 · 0%`,`${p.name} · 已掌握 ${ok}/${p.sc.length} 个场景 · ${Math.round(ok/p.sc.length*100)}%`)});return h};
// —— 标注先轻确认
window.dFlag=()=>{const s=dS(qid());closeMd();modal(`<h2>标注场景问题</h2><div class="muted s13" style="margin:4px 0 10px">${s.id} · attempt ${s.att} · 变体 ${varId(s.id,s.vi)} · 第 ${Math.min(s.turns.length+1,DMAXT)} 回合</div><div class="fil" id="dft">${['对方说法不真实','场景描述不清','评分不合理','其他'].map((x,i)=>`<span class="${i?'':'on'}" onclick="[...this.parentNode.children].forEach(c=>c.classList.remove('on'));this.classList.add('on')">${x}</span>`).join('')}</div><textarea id="dftx" style="width:100%;height:80px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;margin-top:8px" placeholder="补一句哪里不对（可不填）"></textarea><div class="row" style="margin-top:8px"><span class="muted s13">提交后进入反馈看板，不影响这一遍成绩</span><button class="btn ml" onclick="closeMd()">取消</button><button class="btn p" id="dfok">确认提交</button></div>`);
 $('#dfok').onclick=()=>{const fb=LS.get('fb',[]);const id='F-'+(232+fb.length),turn=Math.min(s.turns.length+1,DMAXT);const tx=$('#dftx').value.trim()||($('#dft .on').textContent+'：'+s.id+' 第 '+turn+' 回合');fb.unshift({id,sid:s.id,stitle:getSc(s.id).title,type:$('#dft .on').textContent,text:tx,att:s.att,var:varId(s.id,s.vi),turn});LS.set('fb',fb);closeMd();location.hash='#/feedback';toast('收到，这个问题已记到反馈看板（'+id+'），不影响你这一遍的成绩。')}};
// —— CSV：转义、动态日期、导出写审计
window.exportCsv=(name,rows)=>{const esc=v=>{v=v==null?'':String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};const d=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});const fn=name+'-'+d+'.csv';const b=new Blob(['\ufeff'+rows.map(r=>r.map(esc).join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fn;a.click();audit('导出 '+name,'导出 CSV','',fn+'（'+(rows.length-1)+' 行）');toast('已导出 '+fn+'（保存在本机下载目录）')};
// —— 沙盒 / 文本复述：作答自动保存 + 更严格的规则评分
const DRAFT=id=>LS.get('draft_'+id,{});window.saveDraft=()=>{const id=qid();LS.set('draft_'+id,{stp:[...document.querySelectorAll('.stp')].map(x=>x.value),rtx:($('#rtx')||{}).value||''})};
playSteps=function(sc){const hs=dH(sc.id),last=hs.slice(-1)[0],sandbox=sc.mode=='沙盒实操',dr=DRAFT(sc.id),no=legacyBase(sc.id)+hs.length+1,steps=sc.steps||[];const esc=x=>(x||'').replace(/</g,'&lt;');
 if(!steps.length)return`<div class="page"><div class="card">这个场景还没有配置步骤 / 要点，暂时不能练习。请在后台补齐后再发布。</div></div>`;
 return`<div class="page"><div class="hd"><div><div class="eyebrow">${sc.mode} · ${DMAP[sc.dept]}</div><h1>${sc.id} ${sc.title} ${tagEx(sc)}</h1><div class="meta"><span>第 <b>${no}</b> 次练习</span><span>知识依据 ${(sc.krefs||[]).map(k=>`<b>${k}</b>`).join('、')}</span><span>最好成绩 <b>${hs.length?bestOf(hs):'还没有成绩'}</b></span><span class="muted">作答自动保存</span></div></div><div class="act"><a class="btn" href="#/scenarios">回场景库</a></div></div>
 <div class="grid g21"><div class="card"><div class="ch"><h2>${sandbox?'排查任务':'任务'}</h2></div><p>${sc.desc||''}</p>
 ${sandbox?steps.map((st,i)=>`<div style="margin-top:12px"><b>第 ${i+1} 步 · ${st}</b><textarea class="stp" oninput="saveDraft()" placeholder="这一步你会做什么、看什么、得出什么判断？" style="width:100%;height:60px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit;margin-top:4px">${esc((dr.stp||[])[i])}</textarea></div>`).join(''):`<div class="muted s13" style="margin-top:8px">要点：${steps.join(' · ')}</div><textarea id="rtx" oninput="saveDraft();$('#cw').style.display=pasted(this.value,getSc(qid()))?'block':'none'" placeholder="用自己的话写，想象你在跟对方说。" style="width:100%;height:180px;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;margin-top:8px">${esc(dr.rtx)}</textarea><div class="warn" id="cw" style="display:none;margin-top:8px">⚠ 这段和场景描述几乎一样，请用自己的话说；照抄会扣分。</div>`}
 <div class="row" style="margin-top:12px"><button class="btn p r" onclick="stepSubmit()">提交</button></div></div>
 <div class="card"><div class="ch"><h2>${last?'第 '+last.no+' 次结果':'结果'}</h2>${last?`<span class="r tag ${last.score>=CONFIG.masteryLine?'g':'o'}">${last.score} 分</span>`:''}</div>${last?(last.pen||[]).map(x=>`<div class="pt"><span class="tag r">扣分</span><div style="flex:1">${x}</div></div>`).join('')+last.pts.map(p=>`<div class="pt"><span class="tag ${p.ok?'g':p.half?'y':'o'}">${p.ok?'已覆盖':p.half?'不完整':'遗漏'}</span><div style="flex:1">${p.s}${p.why?`<div class="muted s13">${p.why}</div>`:''}</div><span class="tag g">${(sc.krefs||[])[0]||''}</span></div>`).join('')+(hs.length>1?`<div style="margin-top:10px">${curve(hs)}</div>`:''):'<div class="muted">练完第一遍，这里会出现你的成绩曲线。</div>'}</div></div></div>`};
const srcOf=sc=>[sc.desc||'',sc.modeDetail||'',sc.ourGoal||'',sc.opener||''].concat(sc.steps||[]).join('|');
function overlapRatio(t,sc){const src=srcOf(sc),x=String(t).replace(/\s+/g,'');if(x.length<8)return 0;let hit=0,n=0;for(let i=0;i+6<=x.length;i++){n++;if(src.replace(/\s+/g,'').includes(x.slice(i,i+6)))hit++}return n?hit/n:0}
function pasted(t,sc){const src=srcOf(sc);for(let i=0;i+12<=t.length;i+=3){const seg=t.slice(i,i+12);if(!/^\s+$/.test(seg)&&src.includes(seg))return true}return false}
const kwOnly=t=>{const tok=t.trim().split(/[、,，\/\s;；]+/).filter(Boolean);return tok.length>=2&&tok.every(x=>x.length<=5)&&!/[。？！]/.test(t)};
window.stepSubmit=()=>{const sc=getSc(qid()),steps=sc.steps||[];if(!steps.length)return;let pts,pen=[];
 if(sc.mode=='沙盒实操'){const v=[...document.querySelectorAll('.stp')].map(x=>x.value.trim());const cnt={};v.forEach(x=>{if(x)cnt[x]=(cnt[x]||0)+1});
  pts=steps.map((s,i)=>{const t=v[i];if(!t||t.length<6)return{s,ok:false,why:'这一步没写或太短'};if(cnt[t]>1)return{s,ok:false,why:'和其他步骤写的一模一样，这一步记 0 分'};if(kwOnly(t))return{s,ok:false,half:true,why:'只列了关键词，没写怎么做、得出什么判断'};return{s,ok:true}});
  if(v.some(t=>pasted(t,sc)))pen.push('有步骤照抄了任务描述，扣 20 分')}
 else{const t=$('#rtx').value;pts=steps.map(s=>({s,ok:bigr(s).some(b=>t.includes(b))}));if(kwOnly(t)){pen.push('只列了关键词，没有用完整的话讲出来，扣 25 分')}const ov=overlapRatio(t,sc);if(ov>=0.5)pen.push('和场景原文高度重合（'+Math.round(ov*100)+'%），扣 30 分，本遍不计入掌握');else if(pasted(t,sc))pen.push('部分照抄了场景描述，扣 20 分')}
 const cred=pts.reduce((a,p)=>a+(p.ok?1:p.half?0.5:0),0);let score=Math.round(100*cred/steps.length);if(pen.some(x=>x.includes('25')))score-=25;if(pen.some(x=>x.includes('20 分')))score-=20;if(pen.some(x=>x.includes('30 分')))score=Math.min(score-30,CONFIG.masteryLine-1);score=Math.max(0,Math.min(100,score));
 const hs=dH(sc.id);hs.push({no:legacyBase(sc.id)+hs.length+1,score,pts,pen,nc:pen.some(x=>x.includes('不计入掌握'))||undefined,var:'V-'+sc.id.slice(2)+'-a',hint:0});LS.set('dh_'+sc.id,hs);LS.del('draft_'+sc.id);go();toast('已评分：'+score+' 分')};
// —— 侧栏 AI 陪练 / 沙盒 / 复述入口跟随部门
function paintSideLinks(){const d=meInfo().dept,L=libAll().filter(s=>s.dept==d);const pick=re=>L.find(s=>re.test(s.mode));[['session',/AI 陪练|话术/],['sandbox',/沙盒|故障/],['retell',/复述|案例/]].forEach(([r,re])=>{const a=document.querySelector(`#nav a[data-r=${r}]`);if(!a)return;const s=pick(re);a.setAttribute('href',s?scRoute(s):'#/scenarios');a.title=s?s.id+' '+s.title:'本部门暂无此类场景，去场景库挑选'})}
// —— 演示角色下拉按部门；后台员工表角色按部门
function paintRoleSel(){const r=$('#myrole');if(!r)return;const m=meInfo();r.innerHTML=rolesOf(m.dept).map(x=>`<option ${x==m.role?'selected':''}>${x}</option>`).join('')}
const _org9=admOrg;admOrg=function(){return _org9().replace(/<td><select onchange="empSet\('([^']+)','dept'[\s\S]*?<\/select><\/td><td><select onchange="empSet\('\1','role',this.value\)">[\s\S]*?<\/select><\/td>/g,(m0,n)=>{const i=EMP.findIndex(e=>e[0]==n),e=EMP[i],o=i==0?meInfo():(LS.get('empEdits',{})[n]||{});const dd=o.dept||e[1],rr=(i==0?o.role:o.role||e[2]);const R2=rolesOf(dd);return`<td><select onchange="empSet('${n}','dept',this.value)">${DEPT_CHIPS.slice(1).map(d=>`<option ${d==dd?'selected':''}>${d}</option>`).join('')}</select></td><td><select onchange="empSet('${n}','role',this.value)">${R2.map(r=>`<option ${r==(R2.includes(rr)?rr:R2[0])?'selected':''}>${r}</option>`).join('')}</select></td>`})};
const _go9=go;go=function(){applyMoves();_go9();paintRoleSel();paintSideLinks()};go();
// —— 演示说明补充
DEMO_NOTES.session.push('评分为规则演示，正式评分待环境（AI）。');DEMO_NOTES.session.push('红线关键词规则到 R14 为止不再扩充；其他说法上的漏判留给 AI 判断（待环境）。');DEMO_NOTES.play.push('红线关键词规则到 R14 为止不再扩充；其他说法上的漏判留给 AI 判断（待环境）。');DEMO_NOTES.play.push('评分为规则演示，正式评分待环境（AI）。','回合数可按场景配置（S-087 为 6 回合，部门场景默认 4 回合）。','员工端把 {K-…} 占位显示为「引用知识待补充」，后台显示原文。','标注前有一步轻确认，确认后才进反馈看板。');
DEMO_NOTES.retell.push('评分为规则演示，正式评分待环境（AI）。');DEMO_NOTES.cert.push('「练完后，结果会经过确认再生效」原为占位 {由带教确认}，「由公司培训系统签发」原为占位 {公司名}，待决策后替换。','后台新建的认证路径只对目标部门的员工显示。','S-142 / S-150 / S-133 还没上线，按钮显示「即将上线」。');
DEMO_NOTES.overview.push('本周练习次数、人均遍数、达标率都由 DDATA 计算（与后台一致）。');DEMO_NOTES.admin.push('演示角色按部门限定；「培训管理员」是跨部门角色，只有它能进后台。','「我的团队」：带教 / 组长类看本部门，部门负责人看全部，业务线负责人看所辖部门。','员工调部门后，组织架构人数跟着变，全公司总数不变。','导出 CSV 会写审计日志，文件名带当天日期。');
DEMO_NOTES.team=['范围：带教 / 组长类 → 本部门；部门负责人 → 全部部门；业务线负责人 → 产品、研发、运维、销售、售后。','只读视图，数据为演示数据。'];
// ===================== r10：我的团队范围 + 练习场带教提示 =====================
const BIZLINE=()=>LS.get('bizline',BIZLINE_DEFAULT);
// 成员练习数据：按姓名生成的固定演示数字（同一人每次一样）
const hsh=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))%9973,7);
const memberRow=(n,d)=>{const h=hsh(n),reps=4+h%23,last=48+h%47,fails=last<CONFIG.masteryLine?1+h%4:0;return{n,d,reps,last,fails,pass:last>=CONFIG.masteryLine}};
function teamMembers(m){if(m.scope=='mentees')return(DEMO_MENTEES[m.dept]||[]).map(n=>memberRow(n,m.dept));if(m.scope=='group')return(DEMO_GROUPS[m.dept]||{m:[]}).m.map(n=>memberRow(n,m.dept));return null}
R.team=()=>{const m=meInfo();if(!m.mgr)return R.forbidden();const T={mentees:'分给我的学员',group:'本组 · '+((DEMO_GROUPS[m.dept]||{}).g||''),dept:'本部门全部 · '+DMAP[m.dept],line:'所辖业务线'}[m.scope];const mem=teamMembers(m);
 const ds=m.scope=='line'?BIZLINE():[m.dept];
 const memTable=mem?`<div class="card"><div class="ch"><h2>${T}</h2><span class="muted s13">${mem.length} 人</span></div>${mem.length?`<table><tr><th>姓名</th><th>已练</th><th>最近成绩</th><th>连续未达标</th><th>状态</th></tr>${mem.map(r=>`<tr><td>${r.n}</td><td>${r.reps} 次</td><td>${r.last}</td><td>${r.fails?r.fails+' 遍':'—'}</td><td><span class="tag ${r.pass?'g':r.fails>=CONFIG.mentorAfterFails?'r':'y'}">${r.pass?'达标':r.fails>=CONFIG.mentorAfterFails?'需要带教介入':'练习中'}</span></td></tr>`).join('')}</table>`:'<div class="muted">还没有分给你的学员。</div>'}</div>`:'';
 const deptTable=mem?'':`<div class="card"><div class="ch"><h2>${T}</h2>${m.scope=='line'?'<span class="tag">示例</span><span class="muted s13">业务线包含的部门可在后台配置</span>':''}</div><table><tr><th>部门</th><th>人数</th><th>完成率</th><th>掌握率</th><th>薄弱维度</th></tr>${ds.map(d=>`<tr><td>${DMAP[d]}</td><td>${DDATA[d][0]}</td><td>${DDATA[d][1]}%</td><td>${DDATA[d][2]}%</td><td><span class="tag o">${DDATA[d][3]}</span></td></tr>`).join('')}</table></div>`;
 const newIds=LS.get('scNew',[]).map(x=>x.id);
 return`<div class="page"><div class="hd"><div><div class="eyebrow">${m.role} 可见</div><h1>我的团队</h1><div class="sub">范围：${T}${m.scope=='line'?'（'+ds.map(d=>DMAP[d]).join('、')+'）':''} · 只读</div></div></div>${memTable}${deptTable}
 <div class="card" style="margin-top:16px"><div class="ch"><h2>范围内场景</h2></div>${libAll().filter(s=>ds.includes(s.dept)).map(s=>`<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="mono muted">${s.id}</span>${s.title}<span class="ml muted s13">${mem?'成员':'团队'}已练 ${newIds.includes(s.id)?0:mem?mem.reduce((a,r)=>a+(hsh(r.n+s.id)%4),0):(DDATA[s.dept][0]*3+s.id.charCodeAt(4))%60} 遍</span></div>`).join('')}</div></div>`};
// 后台：业务线范围配置
const _cfg10=admCfg;admCfg=function(){const B=BIZLINE();return _cfg10()+`<div class="card" style="margin-top:16px" id="blForm"><div class="ch"><h2>业务线范围</h2><span class="tag">示例</span><span class="muted s13">「业务线负责人」在「我的团队」里能看到的部门</span></div><div class="atoms" style="grid-template-columns:repeat(4,1fr)">${DEPT_CHIPS.slice(1).filter(d=>d!='业务线').map(d=>`<label><input type="checkbox" value="${d}" ${B.includes(d)?'checked':''}> ${DMAP[d]}</label>`).join('')}</div><div class="row" style="margin-top:8px"><button class="btn" onclick="LS.del('bizline');audit('BIZLINE','恢复默认','${B.join(',')}','${BIZLINE_DEFAULT.join(',')}');go()">恢复示例</button><button class="btn p ml" onclick="blSave()">保存</button></div></div>`};
window.blSave=()=>{const v=[...document.querySelectorAll('#blForm input:checked')].map(x=>x.value);if(!v.length){toast('至少选 1 个部门');return}const b=BIZLINE().join(',');LS.set('bizline',v);audit('BIZLINE','修改业务线范围',b,v.join(','));toast('已保存业务线范围');go()};
// 练习场带教提示：按当前主推场景计数
const _ar10=R.arena;R.arena=()=>{const h=_ar10();const f=firstOf();if(!f||f.id=='S-087')return h;const n=consecFailD(dH(f.id));const bar=n>=CONFIG.mentorAfterFails?`<div style="margin-top:12px"><div class="sys" style="background:var(--yl);color:#7a5a1e">🧑‍🏫 ${COPY_MENTOR}<span class="muted s13">（${f.id} 最近 ${n} 遍未达标）</span></div></div>`:'';
 return h.replace(/<div style="margin-top:12px"><div class="sys"[^>]*>🧑‍🏫[\s\S]*?<\/span><\/div><\/div>/,bar)};
DEMO_NOTES.team=['范围：带教 → 分给自己的学员；组长 / 主管 / 采购经理 → 本组；部门负责人 → 本部门全部；业务线负责人 → 后台配置的业务线部门。','业务线范围目前是示例（产品、研发、运维、销售、售后），待用户决策。','学员、小组成员和成绩都是演示数据。'];
DEMO_NOTES.admin.push('业务线范围（BIZLINE）为示例，待用户决策。');DEMO_NOTES.arena.push('带教提示按当前主推场景的连续未达标次数计算（阈值 X）。');
go();
// ===================== r11：QA r9 修复 =====================
// 5 人员归属唯一来源：员工当前部门（后台调整后实时生效）
function liveDept(n){if(n=='陈佳雯')return meInfo().dept;const E=LS.get('empEdits',{});if((E[n]||{}).dept)return E[n].dept;const e=EMP.find(x=>x[0]==n);if(e)return e[1];const g=Object.keys(DEMO_GROUPS).find(k=>DEMO_GROUPS[k].m.includes(n));return g||null}
function liveCount(d){let c=DBASE[d];EMP.forEach(e=>{const to=liveDept(e[0]);if(to!=e[1]){if(e[1]==d)c--;if(to==d)c++}});return c}
function liveGroup(d){const all=[...new Set(Object.values(DEMO_GROUPS).flatMap(g=>g.m))];const base=(DEMO_GROUPS[d]||{m:[]}).m.filter(n=>liveDept(n)==d);const moved=EMP.map(e=>e[0]).filter(n=>n!='陈佳雯'&&liveDept(n)==d&&!base.includes(n)&&(all.includes(n)||EMP.find(e=>e[0]==n)[1]!=d));return base.concat(moved)}
applyMoves=function(){Object.keys(DDATA).forEach(k=>DDATA[k][0]=liveCount(k))};
teamMembers=function(m){if(m.scope=='mentees')return(DEMO_MENTEES[m.dept]||[]).filter(n=>liveDept(n)==m.dept).map(n=>memberRow(n,m.dept));if(m.scope=='group')return liveGroup(m.dept).map(n=>memberRow(n,m.dept));return null};
const _team11=R.team;R.team=()=>{applyMoves();return _team11()};
// 7 演示说明：业务线部门读配置
Object.defineProperty(DEMO_NOTES,'team',{configurable:true,get(){return['范围：带教 → 分给自己的学员；组长 / 主管 / 采购经理 → 本组；部门负责人 → 本部门全部；业务线负责人 → 后台配置的业务线部门。','当前业务线范围：'+BIZLINE().map(d=>DMAP[d]).join('、')+(LS.get('bizline',null)?'（后台已配置）':'（示例，待用户决策）')+'。','小组成员按员工当前部门实时计算；学员和成绩是演示数据。']},set(){}});
// 6 本周练习次数：基线 + 本机实际练习遍数
const SEEDN=(typeof seedHist=='function')?seedHist().length:0;
function localReps(){let n=Math.max(0,H().length-SEEDN);libAll().forEach(s=>{if(s.id!='S-087')n+=dH(s.id).length});const r=LS.get('rt',null);if(r)n+=Math.max(0,r.no-5);return n}
const _wp11=weeklyPractice;weeklyPractice=function(){return _wp11()+localReps()};
// 3 认证页跟随部门（售后保留原一线客服路径）
const _cert11=R.cert;R.cert=()=>{const me=meInfo();if(me.dept=='售后')return _cert11();const d=me.dept,L=libAll().filter(s=>s.dept==d);
 const mast=s=>{const hs=s.id=='S-087'?H():dH(s.id);let n=0;for(const x of hs.slice().reverse()){if(x.score>=CONFIG.masteryLine)n++;else break}return n>=CONFIG.masteryReps};const ok=L.filter(mast).length,pct=L.length?Math.round(ok/L.length*100):0,nm=DMAP[d]+' · 入门';
 const P=LS.get('certPaths',[]).filter(p=>p.dept==d);
 const pc=P.map(p=>{const k=p.sc.filter(id=>{const s=libAll().find(x=>x.id==id);return s&&mast(s)}).length;return`<div class="card"><div class="row"><h3>${p.name}</h3><span class="ml tag o">练习中</span></div><div style="margin:12px 0">${bar(Math.round(k/p.sc.length*100),'#b48a2c')}</div><div>${p.name} · 已掌握 ${k}/${p.sc.length} 个场景 · ${Math.round(k/p.sc.length*100)}%</div><div class="muted s13">后台新建 · ${DMAP[d]}</div></div>`}).join('');
 return`<div class="page"><div class="hd"><div><div class="eyebrow">个人 · ${DMAP[d]}</div><h1>上岗认证</h1><div class="sub">把一条路径里的场景都练到掌握，再通过一次认证练习，就能拿到证书。</div></div></div>
 <div class="grid g3"><div class="card"><div class="row"><h3>${nm}</h3><span class="ml tag ${ok==L.length&&L.length?'g':'o'}">${ok==L.length&&L.length?'可认证':'练习中'}</span></div><div style="margin:12px 0">${bar(pct,'#b48a2c')}</div><div>${nm} · 已掌握 ${ok}/${L.length} 个场景 · ${pct}%</div><div class="muted s13">掌握 = 连续 ${CONFIG.masteryReps} 遍 ≥ ${CONFIG.masteryLine}</div></div>${pc}</div>
 <div class="card" style="margin-top:16px"><div class="ch"><h2>${nm} · 场景</h2></div><table><tr><th>场景</th><th>形式</th><th>已练</th><th>状态</th><th></th></tr>${L.map(s=>`<tr><td><span class="mono muted">${s.id}</span> ${s.title}</td><td><span class="tag">${s.mode}</span></td><td>${repsOf(s)} 遍</td><td><span class="tag ${mast(s)?'g':'y'}">${mast(s)?'已掌握':'未掌握'}</span></td><td><a class="btn sm p" href="${scRoute(s)}">去练</a></td></tr>`).join('')}</table><div class="muted s13" style="margin-top:8px">证书由公司培训系统签发。练完后，结果会经过确认再生效。</div></div></div>`};
// LOW 无权限页面包屑中性化
const _go11=go;go=function(){_go11();if(document.querySelector('#view h1')&&$('#view').textContent.includes('无权限')&&$('#view').querySelector('.page .card h1')&&$('#view').querySelector('.page .card h1').textContent=='无权限')$('#crumb').innerHTML='工作台 › <b>无权限</b>';const r=curRoute();if((r=='play'||r=='dresult')&&qid()){const sc=getSc(qid());if(sc)$('#crumb').innerHTML='练习场 › '+(r=='play'?sc.mode:'结果页')+' › <b>'+sc.id+' '+sc.title.split(/[：:·，]/)[0].trim()+'</b>'}};
go();
// ===================== r12：PM 决策修复 =====================
// 1 红线：触发即本遍进入低档（< midLine），且不计入掌握；红线回合本身也落在低档
const RL_CAP=()=>CONFIG.midLine-25; // 默认 40，明显低于任何合规回答
const _gEval12=gEval;gEval=function(sc,i,t){const r=_gEval12(sc,i,t);if(r.red){const q=rlQuote(t,redlineRe(sc.id,sc.dept));if(q)r.red=q;r.d.pol=RL_CAP()}else if(r.red)r.d.pol=RL_CAP();return r};
const _evalRaw12=evalRaw;evalRaw=function(i,t){const r=_evalRaw12(i,t);if(r.red){if(!r.stack){const q=rlQuote(t,redlineRe('S-087'));if(q)r.red=q}r.d.pol=RL_CAP()}return r};
const _gCalc12=gCalc;gCalc=function(turns,hint){const c=_gCalc12(turns,hint);if(c.red&&c.score!=null)c.score=Math.min(c.score,RL_CAP());return c};
const _calc12=calc;calc=function(turns,hint){const c=_calc12(turns,hint);if(c.red)c.score=Math.min(c.score,RL_CAP());return c};
// 2 复述重合度：原文与作答都去掉标点 / 分隔符再比（原来步骤用「|」拼接、界面显示用「 · 」，跨分隔符的 6 字片段全部算不重合，整段照抄只有约 51%）
const normOv=x=>String(x).replace(/[\s\p{P}\p{S}]/gu,'');
overlapRatio=function(t,sc){const src=normOv(srcOf(sc).split('|').join(''))+'|'+srcOf(sc).split('|').map(normOv).join('|'),x=normOv(t);if(x.length<8)return 0;let hit=0,n=0;for(let i=0;i+6<=x.length;i++){n++;if(src.includes(x.slice(i,i+6)))hit++}return n?hit/n:0};
// 5 新建场景：先存草稿；「分配部门」默认不选；发布时才写入所选部门的分配列表
const newIds12=()=>LS.get('scNew',[]).map(x=>x.id);
const _assigned12=assigned;assigned=d=>{const A=LS.get('assign',{});if(A[d])return A[d].filter(id=>{const s=libAll().find(x=>x.id==id);return s});return libAll().filter(s=>s.dept==d&&!newIds12().includes(s.id)).map(s=>s.id)};
const _admSc12=admSc;admSc=function(){let h=_admSc12();if(!editId)return h;const isNew=editId=='new'||newIds12().includes(editId);if(!isNew)return h;
 const cur=editId=='new'?{status:'草稿',depts:[]}:LS.get('scNew',[]).find(x=>x.id==editId)||{};const D=cur.depts||[];
 const box=`<div class="fl" id="asgDepts">分配部门<span class="muted s13" style="display:block;font-weight:400">哪些部门的员工要练，可多选。发布后才会出现在他们的练习列表里。</span><div class="atoms adg">${DEPT_CHIPS.slice(1).map(d=>`<label class="s13"><input type="checkbox" name="ad" value="${d}" ${D.includes(d)?'checked':''}> ${DMAP[d]}</label>`).join('')}</div></div>`;
 const st=`<div class="sys" style="background:var(--yl);color:#7a5a1e;max-width:none;margin:0 0 8px">状态：<b>${cur.status||'草稿'}</b>${(cur.status||'草稿')=='草稿'?' · 员工端不可见，未分配到任何部门。选好分配部门后点「发布」。':' · 已分配：'+(D.map(d=>DMAP[d]).join('、')||'无')}</div>`;
 h=h.replace('<div id="fmsg"',box+'<div id="fmsg"');h=h.replace(/(<form[^>]*id="scForm"[^>]*>|<div[^>]*id="scForm"[^>]*>)/,'$1'+st);
 if(editId=='new')h=h.replace(/<button class="btn p" onclick="scSave\('已发布'\)">发布<\/button>/,'<span class="muted s13">新建场景先保存为草稿，再分配部门并发布</span>');return h};
const _scSave12=scSave;window.scSave=scSave=st=>{const F=$('#scForm');const ad=F?[...F.querySelectorAll('[name=ad]:checked')].map(x=>x.value):[];const wasNew=editId=='new',id0=editId;const isNew=wasNew||newIds12().includes(editId);
 if(wasNew)st='草稿';if(isNew&&st=='已发布'&&!ad.length){$('#fmsg').innerHTML='<span class="dn">请先选择至少 1 个分配部门再发布。</span>';return}
 const before=LS.get('scNew',[]).length;_scSave12(st);const nw=LS.get('scNew',[]);const id=wasNew?(nw.length>before?nw[nw.length-1].id:null):id0;if(!id||!isNew)return;
 const x=nw.find(s=>s.id==id);if(!x)return;x.depts=ad;LS.set('scNew',nw);
 if(x.status=='已发布'){const A=LS.get('assign',{});DEPT_CHIPS.slice(1).forEach(d=>{const cur=A[d]||assigned(d);if(ad.includes(d)){if(!cur.includes(id))A[d]=cur.concat(id)}else if(A[d])A[d]=A[d].filter(v=>v!=id)});LS.set('assign',A);audit('场景 '+id,'发布并分配','',ad.map(d=>DMAP[d]).join('、'))}go()};
go();
// ===================== r13：PM 决策修复 =====================
// 1 部门示例红线（示例 · 待业务确认）：组合关键词规则，只作用于该部门的场景；更宽泛的说法靠 AI 判断（待环境）
const RL_TAG='<span class="tag" title="示例红线，待业务确认">示例 · 待业务确认</span>';
const NB='[^。！？!?；;]';const W=n=>NB+'{0,'+n+'}';
const DEPT_REDLINES={
 销售:[{t:'私自承诺额外折扣或返点',d:'pol',re:['(给你|帮你|私下|额外|再|多)'+W(8)+'(折扣|返点|回扣|返利|[0-9一二三四五六七八九]折)','(返点|回扣|返利)'],ok:'申请|审批',fix:'折扣只在授权区间内给，超出的部分告诉客户需要走审批，不私下承诺返点。'},
  {t:'承诺做不到的交付时间',d:'pol',re:['(保证|肯定|一定|包)'+W(8)+'(明天|今天|今晚|下周|[0-9一二两三]+天)'+W(6)+'(交付|上线|到货|发货|交|做完|搞定)'],fix:'交付时间先和交付团队确认再答复客户，给能兑现的时间。'},
  {t:'贬低竞品时编造事实',d:'pol',re:['(他们|对方|竞品|那家|友商)'+W(10)+'(要倒闭|快倒闭|快不行|被罚|泄露过|出过大事故|是骗子|抄袭|都是假的)'],fix:'只讲我方能证明的差异，不评价、不编造竞品的情况。'}],
 售后:[{t:'泄露客户隐私',d:'pol',re:['(其他|别的)客户'+W(10)+'(电话|手机|地址|订单|信息|资料)','(他|她|客户)的(手机号|电话|身份证|住址|地址)'+W(6)+'(告诉|发给|给你)'],fix:'客户信息只用于本人的业务办理，不向任何第三方透露。'},
  {t:'未经核实就承诺退款或赔偿',d:'pol',re:['(马上|立刻|现在就|直接|肯定|保证|一定)'+W(6)+'(退款|退钱|全额退|赔偿|赔你|补偿)'],ok:'核实|查清|查一下|确认后|审核',fix:'先核实订单和退款规则，再告诉客户能退什么、什么时候到账。'},
  {t:'把责任推给客户或其他部门',d:'pol',re:['(是你|你自己|你们自己)'+W(6)+'(操作|搞错|填错|弄错|的问题|的责任)','(这是|都是|是)(物流|仓库|财务|技术|研发|那边|其他部门)'+W(4)+'(的问题|的错|的责任|搞的)','(不关|不归)我们'],fix:'先代表公司把问题接下来，跟客户道个歉，再告诉他这件事由谁跟进、什么时候给他答复。'}],
 研发:[{t:'直接修改生产数据',d:'pol',re:['(直接|先|手动|手工)'+W(6)+'(改|修改|更新|删|update|delete)'+W(6)+'(生产|线上|prod)'+W(4)+'(数据|库|表)','(生产|线上)(库|数据库|数据)'+W(4)+'(直接|手动)(改|删)'],fix:'生产数据变更走数据变更工单，经审核后由有权限的人执行并留痕。'},
  {t:'跳过代码评审上线',d:'pol',re:['(跳过|不用|不走|绕过|免)'+W(4)+'(代码)?(评审|review|CR|审查)','(先上线|直接上线|直接合)'+W(8)+'(回头|事后|再)'+W(4)+'(评审|review|补)'],fix:'再急也要过代码评审，可以申请加急评审，而不是跳过。'},
  {t:'把密钥或账号写进代码或发到群里',d:'pol',re:['(密钥|秘钥|密码|账号|token|AK|SK)'+W(10)+'(写进|写到|硬编码|提交到|发到|发群|贴到|发在)','(发到|贴到)群里'+W(6)+'(密钥|密码|账号|token)'],fix:'密钥放进密钥管理系统，按权限申请使用，不写进代码、不发到群里。'}],
 运维:[{t:'未经审批开通权限',d:'pol',re:['(先|直接|马上|立刻)'+W(4)+'(开|给|开通)'+W(8)+'权限','(回头|事后|之后|下周[一二三四五六日]?)'+W(4)+'补'+W(2)+'(审批|流程|单)','(不用|跳过|免)审批','(现在就|马上就?|立刻|直接|先)'+W(3)+'(开|给你开|给开)'+W(10)+'权限','(下周|以后|事后|回头|改天)'+W(4)+'(提|补)'+W(2)+'申请'+W(20)+'(现在就(给你)?开|马上(给你)?开|立刻(给你)?开|直接(给你)?开|先(给你)?开|直接给你)','(审批|审核|批下来)(通过)?(之|以)?后再?补'+W(20)+'(现在先?给你?开|现在先给|现在就(给你)?开|先(给你)?开|先给你|马上(给你)?开|直接(给你)?开|立刻(给你)?开|先用着)','(太慢|不用等|先不管)'+W(10)+'(直接|先|马上|现在就|立刻)'+W(4)+'(开|给)'],fix:'告诉对方权限要等审批通过才能开，帮他现在就把申请提上去，说清楚大概多久能批；着急的话，帮他走加急或者找审批人催一下。'},
  {t:'跳过变更流程操作生产环境',d:'pol',re:['(跳过|不走|绕过|不用)'+W(4)+'变更','(直接|先)'+W(4)+'(在|上)?(生产|线上)'+W(6)+'(操作|改|重启|执行|发布)'],fix:'生产操作先提变更单，紧急情况走紧急变更流程并事后复盘。'},
  {t:'没查清根因就对外宣布已恢复',d:'pol',re:['(已经|已)(恢复|修复|解决)'+W(10)+'(根因|原因)'+W(4)+'(还没|没|不|待)','(根因|原因)'+W(6)+'(还没|没|不清楚|未)'+W(10)+'(宣布|通知|说)'+W(4)+'(已经|已)?(恢复|修复|解决)','(先|直接)(宣布|通知|发)'+W(6)+'(已)?(恢复|修复)'],fix:'对外只说已确认的事实（服务已恢复、根因排查中），查清根因后再发结论。'},
  {t:'把自己的账号借给别人用，或者先给账号、流程以后再补',d:'pol',noOk:1,neg:'(不能|不可以|不会|不|别|禁止)(外)?借',lend:'借你|借给你|借用|先用我的|用我的|登我的|我的账号|先借',re:['(借你|借给你|借给|借用|借我)'+W(6)+'账号','(用|借|登)'+W(4)+'我的?账号','我的?账号'+W(6)+'(给你|借你|你用|登)','账号'+W(10)+'(先给|先发|今天先|直接给|先借)','先用'+W(4)+'账号'],card:'停一下：你要把账号先给对方用，流程以后再补。账号借给别人用，出了问题查不到是谁操作的，比提前开权限更严重。这一遍{维度}不达标。',fix:'告诉对方账号不能外借，帮他现在就把申请提上去，说清楚大概多久能批下来；着急的话，帮他找审批人催一下。'}],
 产品:[{t:'未经评审向客户承诺功能或上线日期',d:'pol',re:['(保证|一定|肯定|答应|承诺)'+W(10)+'(下个版本|下版本|这周|下周|下个月|[0-9]+月|月底|这个迭代|本迭代)'+W(8)+'(上线|加上|排上|做出来|给你)','这周一定排上|保证加进去|直接插队'],ok:'评审|评估后',fix:'需求先进评审，评审通过后再给客户可承诺的版本和日期。'},
  {t:'向外部透露未公开的产品路线图',d:'pol',re:['(路线图|roadmap|规划)'+W(10)+'(发给|发你|给你看|告诉你|透露)','(还没公开|没公开|未公开|内部)'+W(8)+'(规划|路线图|计划)'+W(6)+'(告诉|给你|发你)'],fix:'只讲已发布的能力，未公开的规划不对外透露。'}],
 采购:[{t:'收受供应商好处或私下接触',d:'pol',re:['(收|拿)'+W(4)+'(红包|好处|礼品|购物卡|回扣|返点)','(私下|单独)'+W(4)+'(吃饭|见面|聊|约)'],fix:'婉拒供应商的任何好处，沟通走公开渠道并留记录。'},
  {t:'绕过比价或招标直接定供应商',d:'pol',re:['(跳过|不用|不走|绕过|免)'+W(4)+'(比价|招标|询价)','(直接|就)(定|选|用)'+W(4)+'(你们|他们|这家)'],fix:'按规定完成比价或招标，再根据结果确定供应商。'},
  {t:'未经审批签合同或付款',d:'pol',re:['(先|直接)'+W(3)+'(签合同|签约|签了|付款|打款|付钱|下单)','(回头|事后)'+W(3)+'补'+W(2)+'(审批|合同)'],ok:'审批通过后|审批后|走完审批',fix:'合同和付款都要审批通过后再办理，急的话申请加急审批。'}],
 管理层:[{t:'当众谈论员工的薪资、绩效或处分',d:'pol',re:['(当着|当众|会上|群里|大家面前|大家都)'+W(10)+'(薪资|工资|绩效|处分|扣钱|奖金|考核)','(他|她)的(工资|薪资|绩效|处分|奖金)'+W(6)+'(是|拿|只有|才|被)'],fix:'薪资、绩效和处分只和本人一对一沟通，不在公开场合谈论。'},
  {t:'绕过制度口头答应例外',d:'pol',re:['(口头|私下)'+W(6)+'(答应|同意|批|给你)','(这次|你这)'+W(4)+'(破例|例外|特殊处理)'+W(6)+'(可以|没问题|答应|行)','(不用管|不管)'+W(2)+'(制度|规定)'],fix:'例外按制度走书面审批，不口头答应。'}],
 业务线:[{t:'对外承诺超出授权的价格或合同条款',d:'pol',re:['(我|我们)'+W(4)+'(做主|拍板)'+W(8)+'(价格|折|条款|合同|账期|赔付)','(价格|条款|账期)'+W(6)+'(都可以|随便|你定|都能)','都可以答应'],ok:'授权|审批|法务',fix:'价格和合同条款只在授权范围内谈，超出的走审批或法务。'},
  {t:'为完成指标要求下属跳过合规流程',d:'pol',re:['(跳过|不走|绕过|别管|省掉|先不走)'+W(6)+'(合规|流程|审核|审批|风控)'+W(10)+'(指标|业绩|完成|冲)','(为了|冲)'+W(6)+'(指标|业绩|KPI)'+W(10)+'(跳过|不走|绕过|先不管|别管)'],fix:'指标再紧也按合规流程走，卡住的环节由我出面协调提速。'}]};
// r14：豁免取消词改用 scenarios.js 的共用词表 RL_CANCEL / rlCancel
// r13c：组合规则不看顺序——同一句里每组词都出现就算命中（只按 。！？； 断句；不增加关键词）
const RL_SEP=/\[\^。！？!\?；;\]\{0,\d+\}/;
// 同一句里讲明合规路径（申请 / 审批通过后 / 走审批 / 按流程 / 工单），且没有「跳过、回头补」等绕过说法时不判（与 r5 旧规则的豁免一致）
const RL_COMPLIANT=/申请|审批通过|审批后|审核后|走.{0,4}审批|按.{0,6}流程|工单|变更单/;
// r14：豁免收紧——同一句里有「先做后补 / 拖后申请 / 嫌流程慢」的说法时不豁免。
// 顺序处理：「审批通过后 / 审核后 / 批下来后 …」后面的「马上给你开通」是合规的先后顺序，先去掉这段再判断
const rlGroups=alt=>alt.split(RL_SEP).filter(Boolean).map(g=>new RegExp(g,'i'));
function deptRedline(dept,t){const raw=String(t).split(/[。！？!?；;]/),sents=raw.map(normRL);for(const r of (DEPT_REDLINES[dept]||[])){for(let k=0;k<sents.length;k++){const n=sents[k];if(!n)continue;const alt=r.re.find(a=>rlGroups(a).every(g=>g.test(n)));if(!alt)continue;if(r.neg&&new RegExp(r.neg).test(n)){const NG=new RegExp(r.neg),LD=new RegExp(r.lend||'$^');if(!n.split(/[，,]/).some(c=>c&&!NG.test(c)&&(LD.test(c)||r.re.some(a=>rlGroups(a).every(g=>g.test(c))))))continue;return{...r,quote:raw[k].trim()}}if(!r.noOk&&!rlCancel(n)&&((r.ok&&new RegExp(r.ok).test(n))||RL_COMPLIANT.test(n)))continue;return{...r,quote:raw[k].trim()}}}return null}
const _gEval13=gEval;gEval=function(sc,i,t){const r=_gEval13(sc,i,t);if(r.red)r.d.pol=RL_CAP();const hit=deptRedline(sc.dept,t);if(hit){r.rl=hit;r.red=hit.quote;r.bad=true;r.d.pol=RL_CAP();r.k=(sc.krefs||[]).slice(-1)[0]||r.k}return r};
const _gCompose13=gCompose;gCompose=function(r){const c=_gCompose13(r);if(r.rl)return{...c,red:(r.rl.card?fillT(r.rl.card,{'维度':GDIMS[r.rl.d]}):'停一下：'+r.rl.t+'。这一遍'+GDIMS[r.rl.d]+'不达标。')+' '+RL_TAG+'<div class="s13" style="color:var(--t);margin-top:4px">你的原话：「'+String(r.rl.quote).replace(/</g,'&lt;')+'」</div>',fix:r.rl.fix+'（本遍已封顶 '+RL_CAP()+' 分，不计入掌握。）',good:''};return c};
const rlPanel=dept=>{const L=DEPT_REDLINES[dept]||[];return L.length?`<h3 style="margin-top:14px">本部门红线 ${RL_TAG}</h3><ul class="s13" style="margin:6px 0 0 18px;padding:0;line-height:1.7">${L.map(r=>`<li>${r.t}</li>`).join('')}</ul><div class="muted s13">按组合关键词识别；更宽泛的说法待环境（AI 判断）。触发后本遍封顶 ${RL_CAP()} 分，不计入掌握。</div>`:''};
const _play13=R.play;R.play=()=>{let h=_play13();const sc=getSc(qid());if(sc&&sc.mode=='AI 陪练'&&h.includes('<h3 style="margin-top:14px">知识依据</h3>'))h=h.replace('<h3 style="margin-top:14px">知识依据</h3>',rlPanel(sc.dept)+'<h3 style="margin-top:14px">知识依据</h3>');return h};
// 2 第 3 级提示解锁：每个场景单独计数（与掌握无关）；提交过至少 1 个回合的遍次都算（含重置 / 红线 / 不计入），0 回合的重置不算
const UNLOCK_N=2;
const ucDefault=id=>id=='S-087'?H().length:dH(id).length+legacyBase(id);
const ucGet=id=>LS.get('uc_'+id,null)??ucDefault(id);
const ucBump=(id,base)=>LS.set('uc_'+id,base+1);
const l3Left=id=>Math.max(0,UNLOCK_N-ucGet(id));
const L3CONFIRM='看完整提示后，这一遍不计入掌握。确定看吗？';
function lockL3(id,used){const b=[...document.querySelectorAll('button')].find(x=>/^(d)?[Hh]int\(3\)$/.test((x.getAttribute('onclick')||'').trim()));if(!b)return;const n=l3Left(id);document.querySelectorAll('.l3lock').forEach(e=>e.remove());if(used||n<=0)return;
 b.disabled=true;b.classList.add('locked');b.title='再练 '+n+' 遍可查看完整提示';b.insertAdjacentHTML('afterend',`<span class="l3lock" id="l3lock">再练 ${n} 遍可查看完整提示，先自己想想</span>`);
 document.querySelectorAll('.sugg span[onclick]').forEach(c=>{c.style.opacity=.45;c.style.pointerEvents='none';c.title='再练 '+n+' 遍可查看参考话术'})}
window.hint=n=>{const s=S();if(n>=3&&!(s.hint>=3)){if(l3Left('S-087')>0){toast('再练 '+l3Left('S-087')+' 遍可查看完整提示，先自己想想');return}if(!confirm(L3CONFIRM))return}s.hint=Math.max(s.hint||0,n);save(s);renderSess()};
const _chip13=window.chip;window.chip=i=>{if(!(S().hint>=3)&&l3Left('S-087')>0){toast('再练 '+l3Left('S-087')+' 遍可查看完整提示，先自己想想');return}_chip13(i)};
window.dHint=n=>{const s=dS(qid());if(n>=3&&!(s.hint>=3)){if(l3Left(s.id)>0){toast('再练 '+l3Left(s.id)+' 遍可查看完整提示，先自己想想');return}if(!confirm(L3CONFIRM))return}s.hint=Math.max(s.hint||0,n);dSave(s);go()};
const _rs13=renderSess;renderSess=function(){_rs13();lockL3('S-087',S().hint>=3)};
const _submit13=window.submitAtt;window.submitAtt=()=>{const s=S(),b=ucGet('S-087'),n0=H().length,had=s.turns.length;_submit13();if(H().length>n0&&had>0)ucBump('S-087',b)};
const _reset13=window.resetAtt;window.resetAtt=()=>{const s=S(),b=ucGet('S-087'),had=s.turns.length,a0=s.att;_reset13();if(S().att!=a0&&had>0){ucBump('S-087',b);go()}};
const _dsub13=window.dSubmit;window.dSubmit=()=>{const id=qid(),b=ucGet(id),n0=dH(id).length;_dsub13();if(dH(id).length>n0)ucBump(id,b)};
const _drs13=window.dReset;window.dReset=()=>{const id=qid(),s=dS(id),b=ucGet(id),had=s.turns.length,a0=s.att;_drs13();if(dS(id).att!=a0&&had>0){ucBump(id,b);go()}};
// A 文本复述：每个要点一组同义词；照抄最高 70，自己的话覆盖全部要点可到 100（同样覆盖时自己的话不会低于照抄）
const SYN={'影响范围':/影响|范围|波及|涉及|受影响|用户|订单|商户/,'时间线':/时间线|时间|几点|点钟|先后|经过|期间|分钟|\d+[:：]\d+|开始|随后|接着|之后/,'原因':/原因|根因|因为|由于|导致|引起|起因/,'已做处置':/处置|处理|切换|回滚|重启|扩容|修复|止损|采取|措施|限流|降级|紧急|恢复/,'后续改进':/后续|改进|以后|今后|下一步|防止|避免|优化|复盘|整改|加固/,'不甩锅':/甩锅|抱歉|道歉|致歉|对不起|责任在我们|我们的责任|我们负责|承担|歉意/,
 '写清分配决定':/决定|分配|定为|比例|各占/,'说明依据（贡献、事实、数据）':/依据|贡献|事实|数据|因为/,'回应两组各自的顾虑':/顾虑|担心|两组|双方|各自|理解/,'说明后续怎么避免同类分歧':/后续|以后|今后|避免|提前|约定|规则/};
const ptHit=(s,t)=>SYN[s]?SYN[s].test(t):bigr(s).some(b=>t.includes(b));
const PASTE_MAX=70;
window.stepSubmit=(_ss=>()=>{const sc=getSc(qid());if(!sc||sc.mode=='沙盒实操'||!(sc.steps||[]).length)return _ss();const steps=sc.steps,t=$('#rtx').value;const pen=[];
 const pts=steps.map(s=>({s,ok:ptHit(s,t),why:SYN[s]?'':undefined}));const cov=Math.round(100*pts.filter(p=>p.ok).length/steps.length);let score=cov,nc;
 const ov=overlapRatio(t,sc);if(kwOnly(t)){pen.push('只列了关键词，没有用完整的话讲出来，扣 25 分');score-=25}
 if(ov>=0.5){pen.push('和场景原文高度重合（'+Math.round(ov*100)+'%），照抄最高 '+PASTE_MAX+' 分，本遍不计入掌握');score=Math.min(score,PASTE_MAX);nc=true}else if(pasted(t,sc)){pen.push('部分照抄了场景描述，扣 20 分');score-=20}
 score=Math.max(0,Math.min(100,score));const hs=dH(sc.id);hs.push({no:legacyBase(sc.id)+hs.length+1,score,pts,pen,nc:nc||undefined,var:'V-'+sc.id.slice(2)+'-a',hint:0});LS.set('dh_'+sc.id,hs);LS.del('draft_'+sc.id);go();toast('已评分：'+score+' 分')})(window.stepSubmit);
const _ps13=playSteps;playSteps=function(sc){let h=_ps13(sc);if(sc.mode!='沙盒实操')h=h.replace(/(<div class="card"><div class="ch"><h2>(第 \d+ 次结果|结果)<\/h2>[\s\S]*?<\/div>)/,'$1<div class="muted s13" style="margin-bottom:6px">要点按同义词规则判断（如「时间线」也认 几点 / 先后 / 经过 / 时间）；语义评分 <span class="tag">待环境</span> · 照抄最高 '+PASTE_MAX+' 分</div>');return h};
// D 新建 / 编辑场景：归属部门必填
window.scSave=scSave=(_sv=>st=>{const F=$('#scForm');const d=F&&F.querySelector('[name=dept]');if(d&&!d.value){$('#fmsg').innerHTML='<span class="dn">请选择归属部门，再保存。</span>';d.focus();return}_sv(st)})(scSave);
const _go13=go;go=function(){_go13();if(curRoute()=='play'&&qid()){const sc=getSc(qid());if(sc&&sc.mode=='AI 陪练')lockL3(sc.id,dS(sc.id).hint>=3)}};
DEMO_NOTES.play.push('部门红线为示例（示例 · 待业务确认），按组合关键词识别，不看词序；更宽泛的说法待环境。','合规路径豁免：同一句讲明申请 / 审批通过后 / 走审批 / 按流程 / 工单，且没有跳过、回头补等说法时不判红线。这是原型的权宜做法，真正判断待环境（接入 AI 后再定）。','第 3 级提示：每个场景提交过 2 遍（含重置 / 红线，至少提交过 1 个回合）后才能看。','文本复述按要点同义词判断，语义评分待环境；照抄最高 70 分。');
DEMO_NOTES.session.push('第 3 级提示：提交过 2 遍后才能看（与掌握计数分开）。');
go();

// r14：S-087 在场景库里有，#/play?id=S-087 直接打开它的练习页（#/session）
const _play14=R.play;R.play=()=>{if(qid()=='S-087'){setTimeout(()=>location.replace('#/session'),0);return '<div class="page muted">正在打开 S-087 价格异议…</div>'}return _play14()};
