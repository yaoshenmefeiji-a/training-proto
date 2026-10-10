// ===== 练习引擎：状态持久化（localStorage），PRD 5.4.0/5.4.1/5.4.3 对齐 =====
const LS={get:(k,d)=>{try{const v=localStorage.getItem('tp_'+k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>localStorage.setItem('tp_'+k,JSON.stringify(v)),del:k=>localStorage.removeItem('tp_'+k)};
// ===== CONFIG：所有阈值的唯一来源（T 待决策 ①，PRD §7.3 提议 T=80） =====
const CONFIG={
  masteryLine:80,      // T：单遍达标线 = 结果页曲线达标线 = 练习场掌握定义 = 点评最高档门槛
  midLine:65,          // 点评中档下限
  masteryReps:3,       // N：连续 N 遍达标算掌握（待决策 ①）
  masteryVariants:2,   // 这 N 遍至少覆盖的不同变体数（待决策 ①）
  hintCap:[100,100,90,80], // 用到第 0/1/2/3 级提示时本遍得分上限（待决策 ①）
  mentorAfterFails:5,  // X：连续未达标几遍后安排带教（待决策 ②）
  maxTurns:6
};
Object.assign(CONFIG,LS.get('config',{})); // 管理后台「带教与认证」保存的配置覆盖默认值
let PASS=CONFIG.masteryLine, MENTOR_X=CONFIG.mentorAfterFails; const CAP=CONFIG.hintCap;
const DIMS=[['emp','共情与倾听'],['val','价值表达'],['pol','政策合规'],['ctl','谈判控场']];
const VARS=[
 {id:'V-087-c3',who:'李总（模拟）',pct:18,open:'你好，我手上有另一家的报价单，同配置价格比你们低 18%。如果不能给到同样的价格，这次就算了，以后也不再考虑续费了。'},
 {id:'V-087-c4',who:'周经理（模拟）',pct:12,open:'我们比了三家，你们最贵。另一家同配置便宜 12%，还送半年运维。你们要是不跟，我这边只能往上报换供应商了。'},
 {id:'V-087-c5',who:'陈总监（模拟）',pct:25,open:'直说吧，对方报价比你们低 25%。功能介绍我听过了，就想知道你们能不能降。'}];
const T=[
 {c:null,keys:['理解','顾虑','方便','对比','哪些'],sample:'理解您的顾虑，比价很正常。方便看下对方报价包含哪些服务吗？我们逐项对比一下，确保您拿到的是同等价值。',
  g:{d:{emp:90,val:80,pol:85,ctl:80},good:'第 1 回合你先接住了情绪，这正是 K-5.3.1 要的。',fix:'可以再问一句对方最看重什么，后面换算价值更有针对性。（K-5.3.1）',k:'K-5.3.1'},
  w:{d:{emp:60,val:65,pol:80,ctl:62},good:'没有直接让价。',fix:'你还没回应客户的情绪。先共情，再提问。（K-5.3.1）',k:'K-5.3.1'}},
 {c:'服务项都差不多吧，反正就是价格差太多，我们今年采购预算砍了，老板只看总价。',keys:['算','万','小时','SLA','损失'],sample:'完全理解。先不谈折扣，我帮您算笔账：对方是 99.5% SLA，我们是 99.95%，按您每小时停机损失约 2 万计，一年少停机约 39 小时，相当于 78 万风险敞口。这个数字您可以直接带给老板。',
  first:'明白，今年预算压力大。我们这边可以直接给您打 9 折，这样差距就小多了。',
  g:{d:{emp:88,val:90,pol:85,ctl:78},good:'第 2 回合先放下折扣做价值换算，数字具体、能汇报，符合 K-5.3.1 第 2 步。',fix:'可以再给一条合规的降价路径，比如年付或采购量阶梯，留出谈判空间。（K-1.2.3）',k:'K-1.2.3'},
  w:{d:{emp:80,val:50,pol:30,ctl:60},red:'停一下：你承诺的 9 折折扣超出了 K-1.2.3 的范围（年采购额 30 万以下仅标准价）。这一遍政策合规不达标。',good:'识别出了「预算被砍」这个真实动机。',fix:'第 2 回合你直接报了折扣，客户还没说出真实需求。正确做法：在区间内给，或者告诉客户需要申请审批；先把差价换算成价值。（K-5.3.1、K-1.2.3）',k:'K-1.2.3'}},
 {c:'那你们的 SLA 和专属工程师，具体能帮我省多少？我需要一个能跟老板说的数字。',keys:['万','小时','工时','%'],sample:'按往年工单，专属工程师一年能帮您省约 300 工时，折合内部人力约 12 万；加上 SLA 少停机 39 小时，合计风险和成本约 90 万。',
  g:{d:{emp:84,val:88,pol:85,ctl:80},good:'第 3 回合数字口径清晰，客户可以直接拿去汇报。（K-5.3.1）',fix:'说完数字可以停一下，确认客户认不认这个算法。',k:'K-5.3.1'},
  w:{d:{emp:75,val:58,pol:80,ctl:65},good:'回应了客户的问题。',fix:'客户要的是「能汇报的数字」，你还没给出具体金额或工时。（K-5.3.1）',k:'K-5.3.1'}},
 {c:'行，这个账我认。那价格本身还能动吗？',keys:['年付','92','30 万','审批','阶梯'],red:['8 折','85 折','7 折','九折','9 折','八折'],sample:'价格本身是统一的。不过如果改成年付、或者年度采购额到 30 万，可以走 92 折，这是我们的标准阶梯，我可以帮您申请。',
  g:{d:{emp:82,val:80,pol:92,ctl:85},good:'第 4 回合在 K-1.2.3 区间内给出了合规路径，守住了底线。',fix:'可以顺手约下一步，比如把两种方案做成报价单。',k:'K-1.2.3'},
  w:{d:{emp:70,val:65,pol:62,ctl:58},good:'没有越权让价。',fix:'第 4 回合客户已经认了价值，这时可以给一条合规的降价路径（年付 / 采购量阶梯）。（K-1.2.3）',k:'K-1.2.3'},
  r:{d:{emp:72,val:55,pol:30,ctl:55},red:'停一下：你承诺的折扣超出了 K-1.2.3 的范围。这一遍政策合规不达标。正确做法：在 30–80 万区间内给 92 折，或者告诉客户需要申请审批。',good:'想推进成交。',fix:'折扣超权限。（K-1.2.3）',k:'K-1.2.3'}},
 {c:'你刚说的 SLA 换算我没太跟上，能再讲慢点吗？',keys:['慢','确认','举个','比如','明白'],sample:'好，我慢一点。比如去年 3 月那次故障停了 4 小时，按每小时 2 万就是 8 万。我们的 SLA 一年最多停 4.4 小时，对方是 44 小时。这样说清楚吗？',
  g:{d:{emp:92,val:84,pol:85,ctl:80},good:'第 5 回合放慢了，用具体例子讲，还确认了客户是否听懂。（K-5.3.1 第 3 步）',fix:'很好，保持。',k:'K-5.3.1'},
  w:{d:{emp:62,val:70,pol:80,ctl:68},good:'重复了算法。',fix:'第 5 回合应放慢，举一个客户自己的例子，并确认对方听懂了。（K-5.3.1）',k:'K-5.3.1'}},
 {c:'好，我回去和老板汇报一下。',keys:['下周','试用','报价单','约','时间','周'],sample:'好的。我今天下班前把年付和标准价两版报价单发您，周三下午 3 点我们再通个电话，听听老板的意见，可以吗？',
  g:{d:{emp:80,val:78,pol:85,ctl:90},good:'第 6 回合约定了具体的下一步和时间，控场到位。',fix:'无。',k:'K-5.3.1'},
  w:{d:{emp:72,val:70,pol:80,ctl:52},good:'礼貌收尾。',fix:'第 6 回合没约下一步，对照错误示例 S-087-E3「只谈价不收口」。',k:'S-087-E3'}}];
const HINTS=[null,'第 1 级 · 方向：客户在压价，先别急着谈数字。看看 K-5.3.1 的第一步。','第 2 级 · 要点：先承认对方的顾虑，再问对方最看重什么，最后把差价换算成具体价值。依据 K-5.3.1 共情三段式；可让的最大折扣是 K-1.2.3 里的 30–80 万 92 折，超出就要走审批。','第 3 级 · 参考话术：「理解，换谁拿到低 {pct}% 的报价都会犹豫。我想先确认一下，除了价格，您这次最在意的是哪一块？」（K-5.3.1）'];
// 历史：S-087 已提交 7 遍
function seedHist(){return[{no:1,score:42},{no:2,score:55},{no:3,score:51},{no:4,score:63},{no:5,score:58},{no:6,score:70,var:'V-087-c5',dims:{emp:80,val:60,pol:70,ctl:62}},
 {no:7,score:74,var:'V-087-c4',seed:'5087-0007',hint:1,dims:{emp:84,val:72,pol:78,ctl:62},turns:[[0,'g','我理解，比价很正常。对方报价里包含哪些服务，我们一起对比下？'],[1,'g','先不谈折扣，我帮您算笔账：SLA 差 0.45%，一年少停机约 39 小时，约 78 万风险敞口。'],[2,'g','专属工程师一年能省约 300 工时，折合约 12 万。'],[3,'w','价格这块确实是统一的。'],[4,'g','好，我慢一点讲，举个例子……这样清楚吗？'],[5,'w','好的，有问题随时联系。']]}]}
const H=()=>LS.get('hist',null)||(LS.set('hist',seedHist()),LS.get('hist'));
const pad=n=>String(n).padStart(4,'0');
function newSess(vIdx){const no=H().length+1;const prev=H().slice(-1)[0];let vi=vIdx!=null?vIdx:(no+1)%3;if(prev&&VARS[vi].id==prev.var)vi=(vi+1)%3;
 return{no,vi,att:'A-087-'+pad(no),seed:'5087-'+pad(no)+'-'+vi,hint:0,start:Date.now(),el:0,turns:[],retried:{}}}
const S=()=>LS.get('sess',null)||(LS.set('sess',newSess()),LS.get('sess'));
const save=s=>LS.set('sess',s);
function fbOf(tr){if(tr.f)return tr.f;const d=T[tr.i];return d[tr.k]||d.g}
function calc(turns,hint){const sum={emp:0,val:0,pol:0,ctl:0};let red=false;turns.forEach(tr=>{const f=fbOf(tr);DIMS.forEach(([k])=>sum[k]+=f.d[k]);if(f.red)red=true});
 const d={};DIMS.forEach(([k])=>d[k]=turns.length?Math.round(sum[k]/turns.length):0);if(red)d.pol=Math.min(d.pol,40);
 const score=Math.min(Math.round((d.emp+d.val+d.pol+d.ctl)/4),CAP[hint||0]);return{d,score,red}}
const tAvg=f=>Math.round((f.d.emp+f.d.val+f.d.pol+f.d.ctl)/4);
const passOk=h=>h.score>=PASS&&!(h.hint>=3)&&!h.red;
const passStreak=hs=>{let n=0;for(const h of hs.slice().reverse()){if(passOk(h))n++;else break}return n};
const isMastered=hs=>{const k=CONFIG.masteryReps;if(passStreak(hs)<k)return false;const vs=new Set(hs.slice(-k).map(h=>h.var||('v'+h.no)));return vs.size>=CONFIG.masteryVariants};
const consecFail=()=>{let n=0;for(const h of H().slice().reverse()){if(h.score<PASS)n++;else break}return n};
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const elapsed=s=>s.el+(Date.now()-s.start);
const mentorBar=()=>consecFail()>=MENTOR_X?`<div class="sys" style="background:var(--yl);color:#7a5a1e">🧑‍🏫 ${COPY_MENTOR}<span class="muted s13">（最近 ${consecFail()} 遍未达标）</span></div>`:'';
let freshLoad=true;const RECOVER=(()=>{try{const x=JSON.parse(localStorage.getItem('tp_sess'));return !!(x&&x.turns&&x.turns.length)}catch(e){return false}})();let recoverShown=false;
function modal(html){document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="md" onclick="if(event.target==this)this.remove()"><div>${html}</div></div>`)}
window.closeMd=()=>{const m=$('#md');m&&m.remove()};

// ---------- 会话 ----------
function renderSess(){const s=S(),v=VARS[s.vi],c=calc(s.turns,s.hint);let h='';
 if(false){h+=`<div class="sys" style="background:var(--gl);color:var(--g)">刚才断开了，已经帮你回到第 ${Math.min(s.turns.length+1,6)} 回合，用时和得分都还在。</div>`}
 h+=`<div class="sys">场景已加载 · S-087 · 第 ${s.no} 次练习 · 变体 ${v.id}<br>这一遍的客户和上一遍不一样，照真实情况来就行。<br>🎯 目标：不破底线，让客户觉得值。建议三步：先共情，再把价格换成价值，最后走合规的降价路径（<a class="tag g" href="#/kb">K-5.3.1</a><a class="tag g" href="#/kb">K-1.2.3</a>）。</div>`+mentorBar();
 if(s.hint>=3)h+=`<div class="sys" style="background:var(--yl);color:#7a5a1e">你看了参考话术，这一遍不计入「连续通过」。</div>`;
 for(let i=0;i<6;i++){const cust=i==0?v.open:T[i].c;const tr=s.turns.find(x=>x.i==i);if(i>s.turns.length)break;
  h+=`<div class="msg"><div class="av" style="background:#9a8f80">客</div><div><div class="who">客户 · ${v.who} · 第 ${i+1} 回合</div><div class="bub">${cust}</div></div></div>`;
  if(!tr)break;const f=fbOf(tr),sc=tAvg(f);
  h+=`<div class="msg me"><div class="av" style="background:#4f7462">我</div><div><div class="who" style="text-align:right">我 · 第 ${i+1} 回合${s.retried[i]?' · 已重练':''}</div><div class="bub">${tr.t}</div></div></div>`;
  h+=`<div class="coach">${f.red?`<div class="red">⛔ ${f.red}</div>`:''}<div class="t">✦ AI 教练 · 第 ${i+1} 回合 <span class="tag ${sc>=CONFIG.masteryLine?'g':sc>=CONFIG.midLine?'y':'r'}">${sc} 分</span>${tr.k!='g'?`<button class="btn sm ${sc>=CONFIG.midLine&&!f.red?'ghost':''}" style="margin-left:auto" onclick="retryTurn(${i})">↺ 重练这一回合</button>`:''}</div><ul>${f.good&&!f.red?`<li><span class="up">✓ 做得好：</span>${f.good}</li>`:''}<li><span style="color:var(--o)">△ ${f.red?'正确做法':'可以更好'}：</span>${f.fix}</li><li class="muted s13">引用知识 <a href="#/kb" class="tag g">${f.k}</a> · 本回合维度 ${DIMS.map(([k,n])=>n.slice(0,2)+' '+f.d[k]).join(' / ')}</li></ul></div>`}
 if(s.turns.length>=6)h+=`<div class="sys" style="background:var(--gl);color:var(--g)">6 个回合已完成，输入已关闭。<br><button class="btn p" style="margin-top:6px" onclick="submitAtt()">查看本遍结果 →</button></div>`;
 $('#chat').innerHTML=h;$('#chat').scrollTop=99999;
 $('#sc').textContent=c.score;$('#rd').textContent=Math.min(s.turns.length+1,6)+' / 6';$('#rp').innerHTML=rightPanel(s,c);renderInput(s)}
let tab='ref';window.setTab=t=>{tab=t;renderSess()};
function rightPanel(s,c){const tb=`<div class="tabs">${[['ref','引用'],['pur','目的'],['sco','评分']].map(x=>`<span class="${tab==x[0]?'on':''}" onclick="setTab('${x[0]}')">${x[1]}</span>`).join('')}</div>`;const v=VARS[s.vi];
 const last=s.turns.slice(-1)[0],lk=last?fbOf(last).k:'';
 if(tab=='pur')return tb+`<h3>双向目的</h3><div class="kref" style="background:var(--bl);margin-top:8px"><div class="muted s13">客户 · ${v.who}</div>压价至对标 · 拿回本季度 KPI</div><div class="kref" style="background:var(--gl)"><div class="muted s13">我方</div>守住底线 · 转向综合价值</div><div class="muted s13">本遍变体 ${v.id}：对方低 ${v.pct}% · seed ${s.seed}</div>`;
 const scoreHtml=`<h3>本遍维度评分</h3><div class="muted s13" style="margin-bottom:8px">每回合提交后刷新 · 达标线 ${PASS}</div>${DIMS.map(([k,n])=>`<div class="dim"><div class="row"><span>${n}${k=='pol'&&c.red?' <span class="tag r">红线 · 不达标</span>':''}</span><b class="r">${c.d[k]}</b></div>${bar(c.d[k],c.d[k]<60?'#b2463b':c.d[k]<75?'#b48a2c':'')}</div>`).join('')}<div class="row" style="margin-top:6px"><b>综合</b><b class="r" style="font-size:20px">${c.score}</b></div>${s.hint?`<div class="muted s13">已用第 ${s.hint} 级提示 · 本遍上限 ${CAP[s.hint]}</div>`:''}`;
 if(tab=='sco')return tb+scoreHtml;
 return tb+`<h3>对照知识库</h3><div class="muted s13" style="margin:4px 0 8px">点击跳转 · 并在对话中插入引用</div>${[['K-5.3.1','价格异议话术 · 共情三段式','共情 → 价值换算 → 合规降价路径'],['K-1.2.3','企业合同价 · 阶梯折扣规则','30 万以下标准价，30–80 万 92 折'],['K-1.2.5','促销叠加限制','阶梯折扣不可与单品促销同时生效']].map(k=>`<div class="kref ${lk==k[0]?'on':''}" onclick="insRef('${k[0]}')" style="cursor:pointer"><div class="row"><span class="mono">${k[0]}</span>${lk==k[0]?'<span class="tag g ml">刚命中</span>':''}${k[0]=='K-1.2.3'&&c.red?'<span class="tag r">违反</span>':''}</div><b>${k[1]}</b><div class="muted s13">${k[2]}</div></div>`).join('')}<div style="margin-top:14px">${scoreHtml}</div>`}
function renderInput(s){const done=s.turns.length>=6;$('#hl').innerHTML=`<span class="muted s13">提示</span>${['方向','要点','参考话术'].map((n,i)=>`<button class="btn sm ${s.hint>i?'used':''}" onclick="hint(${i+1})" ${done?'disabled':''}>第 ${i+1} 级 · ${n}${i==2?'（不计入连续通过）':''}</button>`).join('')}<span class="r muted s13">得分上限 ${CAP[1]} / ${CAP[2]} / ${CAP[3]}</span>${s.hint?`<div style="width:100%">${HINTS.slice(1,s.hint+1).map(x=>`<div class="hintbox">${x.replace('{pct}',VARS[s.vi].pct)}</div>`).join('')}</div>`:''}`;
 $('#ta').disabled=done;$('#ta').placeholder=done?'本遍回合已满，提交后看结果页':'输入你的回复…（⌘↵ 发送）';}
window.hint=n=>{const s=S();if(n>=3&&s.hint<3&&!confirm('看参考话术后，这一遍不计入「连续通过」。确定看吗？'))return;s.hint=Math.max(s.hint,n);save(s);renderSess()};
window.chip=i=>{const s=S();if(s.turns.length>=6)return;if(s.hint<3){if(!confirm('参考话术算第 3 级提示：看参考话术后，这一遍不计入「连续通过」。确定看吗？'))return;s.hint=3;save(s)}
 $('#ta').value=T[s.turns.length].sample;cnt();renderSess();$('#ta').value=T[s.turns.length].sample;cnt()};
window.insRef=k=>{const ta=$('#ta');if(ta.disabled)return;ta.value+=`（${k}）`;cnt();toast('已插入引用 '+k)};
window.cnt=()=>{$('#wc').textContent=$('#ta').value.length+' 字'};
window.send=()=>{const s=S(),t=$('#ta').value.trim();if(s.turns.length>=6)return;if(!t){toast('先写点什么再发送');return}
 const d=T[s.turns.length];let k=d.keys.some(x=>t.includes(x))?'g':'w';if(d.red&&d.red.some(x=>t.includes(x)))k='r';
 s.turns.push({i:s.turns.length,t,k});save(s);$('#ta').value='';cnt();renderSess()};
window.retryTurn=i=>{const t=prompt('重练第 '+(i+1)+' 回合，输入新的回答：',T[i].sample);if(!t)return;const s=S(),d=T[i];let k=d.keys.some(x=>t.includes(x))?'g':'w';if(d.red&&d.red.some(x=>t.includes(x)))k='r';
 s.turns=s.turns.map(x=>x.i==i?{i,t,k}:x);s.retried[i]=1;save(s);renderSess();toast(k=='g'?'这一回合重练过了，分数已更新':'还没到位，再试一次')};
window.resetAtt=()=>{if(!confirm('重置这一遍？这一遍记为放弃，不计成绩，会换一个新变体。'))return;const s=S();const n=newSess((s.vi+1)%3);save(n);toast('已重置 · 新变体 '+VARS[n.vi].id);renderSess()};
window.submitAtt=()=>{clearInterval(timer);const s=S();if(s.turns.length<6&&!confirm(`还有 ${6-s.turns.length} 个回合没练，确定现在提交？`))return;const c=calc(s.turns,s.hint);
 const hs=H();hs.push({no:s.no,score:c.score,dims:c.d,var:VARS[s.vi].id,seed:s.seed,att:s.att,hint:s.hint,red:c.red,turns:s.turns.map(x=>[x.i,x.k,x.t,x.f]),vi:s.vi});LS.set('hist',hs);LS.del('sess');location.hash='#/review'};
window.flag=()=>{const s=S();modal(`<h2>标注场景问题</h2><div class="meta" style="margin:8px 0"><span>场景 <b>S-087</b></span><span>attempt_id <b>${s.att}</b></span><span>variant_id <b>${VARS[s.vi].id}</b></span><span>回合 <b>第 ${Math.min(s.turns.length,6)} 回合</b></span></div><div class="fil" id="ft" style="margin:8px 0">${['客户人设不真实','评分有误','知识过时','其他'].map((x,i)=>`<span class="${i?'':'on'}" onclick="[...this.parentNode.children].forEach(e=>e.classList.remove('on'));this.classList.add('on')">${x}</span>`).join('')}</div><textarea id="ftx" style="width:100%;height:80px;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit">客户在这一回合让步太快，和「压价至对标」的人设不一致。</textarea><div class="row" style="margin-top:12px"><button class="btn r" onclick="closeMd()">取消</button><button class="btn p" onclick="flagSubmit()">提交反馈</button></div>`)};
window.flagSubmit=()=>{const s=S(),fb=LS.get('fb',[]);const id='F-'+(232+fb.length);fb.unshift({id,type:$('#ft .on').textContent,text:$('#ftx').value,att:s.att,var:VARS[s.vi].id,turn:Math.min(s.turns.length,6)});LS.set('fb',fb);closeMd();toast(`收到，这个问题已记到反馈看板（${id}），不影响你这一遍的成绩。`);setTimeout(()=>location.hash='#/feedback',900)};
window.askMentor=()=>toast(COPY_MENTOR);
let timer;
R.session=()=>{const existed=!!LS.get('sess',null);const s=S();if(RECOVER&&!recoverShown&&s.turns.length){s._recover=1;recoverShown=true}else if(!recoverShown||performance.now()>3000) delete s._recover;s.start=Date.now();save(s);
 const hs=H(),best=Math.max(...hs.map(x=>x.score)),l5=hs.slice(-5).map(x=>x.score).join(' / ');
 clearInterval(timer);timer=setInterval(()=>{const e=$('#tm');if(!e){clearInterval(timer);return}const s2=S();s2.el=elapsed(s2);s2.start=Date.now();save(s2);e.textContent=fmt(s2.el)},1000);if(s._recover)setTimeout(()=>toast('刚才断开了，已经帮你回到第 '+Math.min(s.turns.length+1,6)+' 回合，用时和得分都还在。'),300);
 addEventListener('beforeunload',()=>{const s2=LS.get('sess',null);if(s2){s2.el=elapsed(s2);s2.start=Date.now();save(s2)}},{once:true});
 setTimeout(renderSess);
 return`<div class="sess"><div class="sessL"><div class="sbar" style="flex-wrap:wrap;row-gap:6px"><div><div class="row"><span class="mono muted">S-087</span><span class="tag y">L2</span><span class="tag g">AI 陪练</span><span class="tag r">错题重练</span></div><h3>价格异议：客户拿到竞品低价报价单</h3></div><div class="m"><span>练习次数</span><b>第 ${s.no} 次</b></div><div class="m"><span>本轮用时</span><b id="tm">${fmt(elapsed(s))}</b></div><div class="m"><span>回合</span><b id="rd">-</b></div><div class="m"><span>综合评分</span><b id="sc" style="color:var(--g)">-</b></div><div class="meta" style="width:100%"><span>attempt <b>${s.att}</b></span><span>变体 <b>${VARS[s.vi].id}</b></span><span>seed <b>${s.seed}</b></span><span>最好成绩 <b>${best}</b></span><span>最近 5 次 <b>${l5}</b></span><a style="color:var(--g)" href="javascript:askMentor()">请求带教</a><div class="row" style="margin-left:auto"><button class="btn" onclick="resetAtt()">↺ 重置这一遍</button><button class="btn" onclick="flag()">⚑ 标注场景问题</button><a class="btn p" onclick="submitAtt()" href="javascript:void 0">✓ 提交（⌘↵）</a></div>
 </div></div>
 <div class="chat" id="chat"></div><div class="input"><div class="ladder" id="hl"></div><div class="sugg"><span class="muted" style="border:0;background:none">参考话术（点选 = 第 3 级提示）</span><span onclick="chip(0)">先把差价换成一年能省的钱…</span><span onclick="chip(1)">用工时说明专属工程师的价值…</span><span onclick="chip(2)">给一条合规的降价路径…</span></div><textarea id="ta" oninput="cnt()" onkeydown="if((event.metaKey||event.ctrlKey)&&event.key=='Enter')send()"></textarea><div class="row" style="margin-top:6px"><span class="muted s13">🎙 语音 · 插入引用（点右侧知识卡片） · <span id="wc">0 字</span></span><button class="btn p r" onclick="send()">发送</button></div></div></div><div class="sessR" id="rp"></div></div>`};
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key=='Enter'&&location.hash=='#/session'&&document.activeElement.id!='ta')submitAtt()});

// ---------- 结果页 ----------
function curve(hs){const n=hs.length,W=620,H=240,x=i=>50+i*(W-80)/Math.max(n-1,1),y=v=>H-26-(v-30)*(H-56)/70;
 let mi=-1;for(let i=CONFIG.masteryReps-1;i<n;i++)if(isMastered(hs.slice(0,i+1))){mi=i;break}
 return`<svg viewBox="0 0 ${W} ${H}" width="100%">${[40,60,80,100].map(v=>`<line x1="50" x2="${W-30}" y1="${y(v)}" y2="${y(v)}" stroke="#eeece6"/><text x="42" y="${y(v)+4}" font-size="12" text-anchor="end" fill="#8a8f8b">${v}</text>`).join('')}
 <line x1="50" x2="${W-30}" y1="${y(PASS)}" y2="${y(PASS)}" stroke="#b48a2c" stroke-dasharray="5 4" stroke-width="1.5"/><rect x="52" y="${y(PASS)-22}" width="150" height="18" rx="4" fill="#f6efd9"/><text x="58" y="${y(PASS)-9}" font-size="12" fill="#8a6a1e">达标线 ${PASS}（当前生效阈值）</text>
 <polyline fill="none" stroke="#2f4a3c" stroke-width="2.5" points="${hs.map((h,i)=>x(i)+','+y(h.score)).join(' ')}"/>${hs.map((h,i)=>`<circle cx="${x(i)}" cy="${y(h.score)}" r="${i==n-1?6:4}" fill="${h.hint>=3?'#fff':i==n-1?'#b5652f':'#2f4a3c'}" stroke="${h.hint>=3?'#b5652f':'none'}" stroke-width="2"/><text x="${x(i)}" y="${y(h.score)+20}" text-anchor="middle" font-size="12" fill="#3a403c">${h.score}</text><text x="${x(i)}" y="${H-6}" text-anchor="middle" font-size="12" fill="#8a8f8b">${i+1}</text>`).join('')}
 ${mi>=0?`<text x="${x(mi)}" y="${y(hs[mi].score)-12}" text-anchor="middle" font-size="12" fill="#2f4a3c">★ 掌握</text>`:''}</svg><div class="row muted s13"><span>横轴：第几次练习 · ● 本遍 · ○ 用过第 3 级提示（不计入连续通过）${mi<0?' · 还没有掌握点（连续 '+CONFIG.masteryReps+' 遍 ≥ '+PASS+'）':''}</span><span class="r">点数 ${n} = 已提交 ${n} 遍</span></div>`}
R.review=()=>{const hs=H(),r=hs[hs.length-1],p=hs[hs.length-2],vv=VARS.find(v=>v.id==r.var)||VARS[1];
 const diff=p?r.score-p.score:0;const cmp=!p?'':diff>0?`比上一遍 +${diff}（上一遍 ${p.score}）`:diff<0?`比上一遍 ${diff}（上一遍 ${p.score}）`:'和上一遍一样';
 let streak=passStreak(hs);
 const weakDim=DIMS.slice().sort((a,b)=>r.dims[a[0]]-r.dims[b[0]])[0];
 const status=r.score>=PASS&&r.hint<3?(isMastered(hs)?`这个场景你已经掌握了。1 天后会再出现一次，帮你记牢。`:`这一遍达标了。再连续 ${Math.max(CONFIG.masteryReps-streak,1)} 遍达标，就算掌握这个场景。`):r.score>=PASS?`分数达标，但你看了参考话术，这一遍不计入「连续通过」。`:`还差 ${PASS-r.score} 分达标。主要丢在「${weakDim[1]}」，下面每条都标了该看哪条知识。`;
 const turns=(r.turns||[]).map(([i,k,t,f])=>({i,k,t,f}));const bad=turns.filter(x=>x.k!='g');const left=CONFIG.maxTurns-turns.length;
 return`<div class="page"><div class="hd"><div><div class="eyebrow">结果页 · S-087 价格异议</div><h1>第 ${r.no} 次练习 · ${r.score} 分</h1><div class="sub">${cmp}　${status}</div><div class="meta" style="margin-top:4px"><span>attempt <b>${r.att||'A-087-'+pad(r.no)}</b></span><span>变体 <b>${r.var}</b></span><span>seed <b>${r.seed||'5087-'+pad(r.no)}</b></span><span>提示 <b>${r.hint?'用到第 '+r.hint+' 级':'未使用'}</b></span>${r.red?'<span class="tag r">触发红线 · 政策合规不达标</span>':''}</div></div><div class="act"><a class="btn" href="#/arena">结束</a><button class="btn" onclick="weak('${weakDim[1]}')">针对薄弱点练</button><a class="btn p big" href="#/session">↺ 再练一遍</a></div></div>
 ${mentorBar()}
 <div class="grid g21" style="margin-top:12px"><div class="card"><div class="ch"><h2>进步曲线 · 第几次 × 分数</h2><span class="r muted s13">首遍 ${hs[0].score} → 本遍 ${r.score}</span></div>${curve(hs)}</div>
 <div class="card"><div class="ch"><h2>维度分 vs 上一遍</h2></div>${DIMS.map(([k,n])=>{const a=r.dims[k],b=p&&p.dims?p.dims[k]:null,dd=b==null?'':a-b;return`<div class="dim"><div class="row"><span>${n}</span><span class="r muted s13">${b==null?'':b+' →'}</span><b>${a}</b><span class="${dd<0?'dn':'up'}" style="width:34px;text-align:right">${dd===''?'':dd>0?'+'+dd:dd}</span></div>${bar(a,a<60?'#b2463b':a<75?'#b48a2c':'')}</div>`}).join('')}<div class="muted s13">与对话页右侧「评分」同一套计算</div></div></div>
 <div class="card" style="margin-top:16px"><div class="ch"><h2>扣分点</h2><span class="r muted s13">原话 → 问题 → 去看哪条</span></div>${left>0?`<div class="pt"><span class="tag r">第 ${turns.length+1}–${CONFIG.maxTurns} 回合</span><div style="flex:1">提前提交，这 ${left} 个回合没有练 → 问题：价值换算、合规路径、收口都没有机会体现 → 去看 <a class="tag g" href="#/kb">K-5.3.1</a></div></div>`:''}${bad.length?bad.map(x=>{const f=fbOf(x);return`<div class="pt"><span class="tag ${f.red?'r':'o'}">第 ${x.i+1} 回合</span><div style="flex:1">「${x.t}」 → 问题：${f.red?f.red.replace('停一下：',''):f.fix} → 去看 <a class="tag g" href="#/kb">${f.k}</a></div></div>`}).join(''):(left>0?'':'<div class="muted">这一遍没有扣分点。</div>')}</div>
 <div class="card replay" style="margin-top:16px"><div class="ch"><h2>全文回放 · 逐回合点评</h2><span class="r muted s13">${turns.length} / 6 回合 · 客户 ${vv.who}</span></div><div class="t muted s13" style="padding-top:0"><b>回合</b><b>对话</b><b>AI 教练点评</b></div>
 ${turns.map(x=>{const f=fbOf(x);return`<div class="t"><div><b>第 ${x.i+1} 回合</b><div><span class="tag ${tAvg(f)>=80?'g':'o'}">${tAvg(f)}</span></div></div><div><div class="muted">${vv.who.replace('（模拟）','')}：${x.i==0?vv.open:T[x.i].c}</div><div>我：${x.t}</div></div><div class="s13">${f.red?`<div class="dn">⛔ ${f.red}</div>`:''}${f.good&&!f.red?`<div><span class="up">做得好：</span>${f.good}</div>`:''}<div><span style="color:var(--o)">${f.red?'正确做法':'可以更好'}：</span>${f.fix}</div></div></div>`}).join('')}
 <div class="muted s13" style="margin-top:10px">总评：${r.dims.emp>=80?'这一遍共情到位':'共情还要加强'}，丢分主要在「${weakDim[1]}」。下一遍试试把话题拉回价值。</div></div></div>`};
window.weak=d=>{toast(`下一遍会针对「${d}」出题，客户会更难缠。`);setTimeout(()=>location.hash='#/session',900)};

// ---------- 练习场 / 队列 ----------
function qData(){const hs=H(),last=hs.slice(-1)[0];return[
 ['S-087','价格异议：客户拿到竞品低价报价单','错题重练','r',`上一遍 ${last.score} 分 · 丢在「${DIMS.slice().sort((a,b)=>(last.dims||{})[a[0]]-(last.dims||{})[b[0]])[0][1]}」· K-5.3.1`,hs.map(h=>h.score),'今天到期','session'],
 ['S-124','续费引导 · 客户在犹豫期投诉','间隔复习','y','距上次 3 天 · 记忆曲线提醒',[52,47,60],'今天到期','session'],
 ['S-091','接口鉴权 401：客户生产环境报错','新场景','b','L2 认证必修 · 沙盒实操',[41,55],'今天','sandbox'],
 ['S-062','退款超时：客户要求赔付','巩固','g','已掌握 · 7 天后再巩固一次',[70,76,84,88,90,91,93,90,92,94],'10/17','session'],
 ['S-076','新客户开户：对公发票信息采集','间隔复习','y','文本复述 · 距上次 5 天',[62,70,66,74,63],'明天','retell']]}
let qf='全部';window.qFilter=f=>{qf=f;go()};
queue=function(){return qData().filter(q=>qf=='全部'||q[2]==qf).map(q=>`<a class="q" href="#/${q[7]}"><span class="tag ${q[3]}" style="min-width:64px;text-align:center">${q[2]}</span><div style="flex:1;min-width:0"><div class="row"><span class="mono muted">${q[0]}</span><b>${q[1]}</b></div><div class="why muted">${q[4]}</div></div><div style="width:210px"><div class="s13 muted">已练 ${q[5].length} 遍 · 下一次是第 ${q[5].length+1} 次</div><div class="dots">${q[5].slice(-10).map(v=>`<i class="${v>=PASS?'d':'x'}" title="${v}"></i>`).join('')}</div></div><div class="s13 muted" style="width:64px;text-align:right">${q[6]}</div><span class="btn sm p">练 →</span></a>`)};
R.arena=()=>{const hs=H(),s=LS.get('sess',null),no=hs.length+1,l=hs.slice(-1)[0];const qs=queue();
 return`<div class="page"><div class="hd"><div><div class="eyebrow">第三层 · 练习执行</div><h1>练习场</h1><div class="sub">把每天真实遇到的问题，在这里练到会为止。</div></div><div class="act"><a class="btn" href="#/review">上一遍结果</a><a class="btn" href="#/cert">上岗认证</a><a class="btn" href="#/scenarios">挑选场景</a></div></div>
 <div class="heroCard"><div style="flex:1"><div class="eyebrow" style="color:#b9d1c3">下一遍 · 错题重练</div><h1 style="font-size:24px">S-087 价格异议：客户拿到竞品低价报价单</h1><div class="sub">第 ${s?s.no:no} 次练习${s?' · 进行中，已到第 '+Math.min(s.turns.length+1,6)+' 回合':''} · 上一遍 ${l.score} 分 · 最好成绩 ${Math.max(...hs.map(h=>h.score))} · 预计 6 分钟</div><div class="quote">一次不会练 10 次，10 次不会练 50 次。每一回合都有教练点评。</div></div>
 <div class="stat"><b>12 天</b>连续练习</div><div class="stat"><b>${qs.length} 项</b>今日队列</div><div class="stat"><b>${hs.length} 遍</b>S-087 已练</div><a class="btn big" href="#/session">▶ ${s?'继续这一遍':'开始下一遍'}</a></div>
 ${consecFail()>=MENTOR_X?`<div style="margin-top:12px">${mentorBar()}</div>`:''}
 <div class="grid g21" style="margin-top:16px"><div class="card"><div class="ch"><h2>今日练习队列</h2><span class="muted s13">按遗忘曲线 + 错题优先排序</span><div class="r fil">${['全部','错题重练','间隔复习','新场景','巩固'].map(f=>`<span class="${qf==f?'on':''}" onclick="qFilter('${f}')">${f}</span>`).join('')}</div></div>${qs.join('')||'<div class="muted">今天没有要练的了。想多练可以去场景库挑一个。</div>'}</div>
 <div><div class="card"><div class="ch"><h2>连续练习</h2><span class="ml tag g">🔥 12 天</span></div><div class="heat" style="grid-template-columns:repeat(9,1fr)">${Array.from({length:45},(_,i)=>`<i class="a${i>=33?[3,4,2,3][i%4]:[0,1,2,0,3,1,0,2,4,1][i%10]}"></i>`).join('')}</div><div class="muted s13" style="margin-top:8px">近 45 天 · 最长 21 天</div></div>
 <div class="card" style="margin-top:16px"><div class="ch"><h2>AI 教练建议</h2></div><div class="list s13"><div>你在 3 个场景都是客户一施压就让价，先看 <a style="color:var(--g);font-weight:600" href="#/kb">K-5.3.1 共情三段式</a>。</div><div>技术类场景通过率偏低，本周安排 2 遍 S-091 沙盒。</div><div>S-062 已稳定 90+，转为每周巩固 1 次。</div></div></div></div></div>
 <div class="card" style="margin-top:16px"><div class="ch"><h2>场景掌握度</h2><span class="muted s13">掌握 = 连续 ${CONFIG.masteryReps} 遍 ≥ ${PASS}（T，待决策 ①）、覆盖 ≥ ${CONFIG.masteryVariants} 个变体、未用第 3 级提示</span></div><table><tr><th>场景</th><th>形式</th><th>已练</th><th style="width:220px">掌握进度</th><th>最近 5 次</th><th></th></tr>
 ${qData().map(q=>{const sc=q[5],st=(()=>{let n=0;for(const v of sc.slice().reverse()){if(v>=PASS)n++;else break}return Math.min(n,CONFIG.masteryReps)})(),m=st>=CONFIG.masteryReps?100:Math.round(st/CONFIG.masteryReps*100*0.5+Math.min(sc.slice(-1)[0]/PASS,1)*50);return`<tr><td><span class="mono muted">${q[0]}</span> ${q[1]}</td><td><span class="tag">${q[7]=='sandbox'?'沙盒实操':q[7]=='retell'?'文本复述':'AI 陪练'}</span></td><td>${sc.length} 遍</td><td><div class="row">${bar(m,m>=100?'':m>60?'#b48a2c':'#b5652f')}<b style="width:44px;text-align:right">${m>=100?'已掌握':m+'%'}</b></div></td><td class="mono">${sc.slice(-5).join(' · ')}</td><td><a class="btn sm" href="#/${q[7]}">再练</a></td></tr>`}).join('')}</table></div></div>`};

// ---------- 场景库（筛选 / 搜索） ----------
let sf={pos:'全部',lv:'全部',sort:'推荐'};window.sFilter=(k,v)=>{sf[k]=v;go()};
SC[0].rep=7;
R.scenarios=q=>{let L=SC.filter(c=>(sf.pos=='全部'||c.pos==sf.pos)&&(sf.lv=='全部'||c.lv==sf.lv)&&(!q||(c.t+c.id+c.tag).includes(q)));
 if(sf.sort=='我没练熟')L=L.filter(c=>c.m<90);if(sf.sort=='最热')L=L.slice().sort((a,b)=>b.n-a.n);
 const chips=(k,arr,label)=>`<div class="fil" style="margin-right:20px"><span class="muted">${label}</span>${arr.map(v=>`<span class="${sf[k]==v?'on':''}" onclick="sFilter('${k}','${v}')">${v}</span>`).join('')}</div>`;
 return`<div class="page"><div class="hd"><div><div class="eyebrow">第二层 · 场景化</div><h1>场景练习库</h1><div class="sub">每个场景 = 真实问题 · 双向目的 · 错误示例 · 正确示例（必须引用知识库）</div></div><div class="act"><button class="btn" onclick="exportCsv('场景库',[['编号','标题','岗位','难度','组内达标']].concat(SC.map(c=>[c.id,c.t,c.pos,c.lv,c.pass+'%'])))">导出</button><button class="btn p" onclick="toast('新建场景需要管理权限，切到「管理」后可用')">＋ 新建场景</button></div></div>
 <div class="card row" style="padding:10px 14px;margin-bottom:14px;flex-wrap:wrap">${chips('pos',['全部','客服 / 销售','技术 / 英文','管理岗','运维 / 售后'],'岗位')}${chips('lv',['全部','L1','L2','L3'],'难度')}<div class="r">${chips('sort',['推荐','我没练熟','最热'],'排序')}</div></div>
 <div class="muted s13" style="margin-bottom:10px">场景库共 ${libAll().length} 个场景 · 当前条件下推荐 ${L.length} 个${q?` · 关键词「${q}」 <a style="color:var(--g)" href="#/scenarios">清除</a>`:''}</div>
 <div class="grid g3">${L.length?L.map(c=>{const reps=c.id=='S-087'?H().length:c.rep;return`<a class="card sc" href="#/${/沙盒|故障/.test(c.mode)?'sandbox':c.mode=='文本复述'?'retell':'session'}"><div class="row"><span class="mono muted">${c.id}</span><span class="tag ${lvc(c.lv)}">${c.lv}</span>${c.hot?'<span class="tag r">热门</span>':''}<span class="r muted s13">${c.tag}</span></div><h3 style="margin:6px 0">${c.t}</h3><div class="muted s13">${c.pos} · 引用 ${c.k} 条知识 · ${c.n} 人已练</div><div style="margin:8px 0"><span class="tag">${c.mode}</span></div><div class="row s13"><span class="muted">我的进度</span>${reps?`<b>已练 ${reps} 遍</b>`:'<span class="muted">未开始</span>'}<span class="r muted">组内达标 ${c.pass}%</span></div>${bar(c.m,c.m>85?'':'#b48a2c')}<div class="row" style="margin-top:10px"><span class="btn sm p r">${reps?'再练一遍 →':'开始练 →'}</span></div></a>`}).join(''):`<div class="muted">没找到「${q||'当前条件'}」相关的场景，换个说法试试。</div>`}</div></div>`};

// ---------- 文本复述 ----------
const ORIG='对公开户需提供：单位全称、统一社会信用代码、开户行及账号、注册地址及电话。发票类型分为增值税专用发票与普通发票，专票须与税务登记信息完全一致。';
const QV=['客户：我们财务说你们发票抬头老是开错，这次开户到底要我提供哪些信息？能不能一次说清楚？','客户：我们第一次跟你们签对公合同，开票要准备什么材料？','客户：专票和普票有啥区别？我们该选哪个？','客户：上次发票被退回了，说信息不对，这次我该怎么填？'];
const PTS=[['单位全称 / 统一社会信用代码',['全称','信用代码'],'K-2.2.1 §1'],['开户行及账号',['开户行','账号'],'K-2.2.1 §1'],['先确认要专票还是普票',['专票','普票'],'K-2.2.1 §3'],['抬头不能用简称',['简称'],'K-2.2.4']];
const WRONG=[['专票须与营业执照完全一致',['营业执照'],'应与税务登记信息一致','K-2.2.2 v2.4 修订']];
let rtPaste=false;
window.rtCheck=()=>{const t=$('#rt').value;$('#rwc').textContent=t.length+' 字';const sim=t.length>20&&(ORIG.includes(t.slice(0,20))||t.includes(ORIG.slice(0,20)));$('#rwarn').style.display=(rtPaste||sim)?'block':'none'};
window.rtSubmit=()=>{const t=$('#rt').value;const r=LS.get('rt',{no:5});r.no++;r.text=t;r.paste=rtPaste||ORIG.includes(t.slice(0,20));LS.set('rt',r);rtPaste=false;go();toast('已按知识要点评分')};
R.retell=()=>{const r=LS.get('rt',{no:5}),no=r.no+(r.text!=null?0:1);const t=r.text!=null?r.text:SAMPLE;const q=QV[no%QV.length],pq=QV[(no-1)%QV.length];const paste=r.text!=null?r.paste:true;
 const cov=PTS.filter(p=>p[1].some(k=>t.includes(k))),mis=PTS.filter(p=>!p[1].some(k=>t.includes(k))),wr=WRONG.filter(w=>w[1].some(k=>t.includes(k)));
 const s1=Math.round(cov.length/PTS.length*100),s2=Math.max(40,100-wr.length*25),s3=paste?Math.min(60,70):82;
 setTimeout(()=>{const e=$('#rt');if(!e)return;e.addEventListener('paste',()=>{rtPaste=true;setTimeout(rtCheck)});rtCheck()});
 return`<div class="page"><div class="hd"><div><div class="eyebrow">文本复述 · S-076 新客户开户</div><h1>用自己的话，讲给客户听</h1><div class="meta"><span>第 <b>${no}</b> 次练习</span><span>问法变体 <b>Q-076-${no%QV.length+1}</b>（上一遍是 Q-076-${(no-1)%QV.length+1}，不重复）</span><span>引用 <b>K-2.2.1 · K-2.2.2 · K-2.2.4</b></span></div></div><div class="act"><a class="btn" href="#/arena">结束</a></div></div>
 <div class="grid g2"><div class="card"><div class="ch"><h2>客户这样问</h2></div><div class="msg"><div class="av" style="background:#9a8f80">客</div><div class="bub">${q.replace('客户：','')}</div></div>
 <h3 style="margin-top:16px">我的复述</h3><textarea id="rt" oninput="rtCheck()" style="width:100%;height:150px;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;margin-top:6px">${r.text!=null?'':SAMPLE}</textarea>
 <div class="warn" id="rwarn" style="margin-top:8px;display:none">⚠ 这段和 K-2.2.1 原文几乎一样，请用自己的话说——想象你在电话里跟客户解释。可以提交，但「表达」最高 60 分。</div><div class="row" style="margin-top:10px"><span class="muted s13" id="rwc">0 字</span><button class="btn p r" onclick="rtSubmit()">提交（⌘↵）</button></div></div>
 <div class="card"><div class="ch"><h2>${r.text!=null?'第 '+r.no+' 次':'上一份'}要点评分</h2><span class="r"><span class="tag g">已覆盖 ${cov.length}</span><span class="tag o">遗漏 ${mis.length}</span><span class="tag r">错误 ${wr.length}</span></span></div>
 <div class="grid g3" style="margin-bottom:12px">${[['覆盖度',s1],['准确性',s2],['表达',s3]].map(d=>`<div class="kpi"><div class="l">${d[0]}</div><div class="n" style="font-size:22px">${d[1]}</div>${bar(d[1],d[1]<65?'#b48a2c':'')}</div>`).join('')}</div>
 ${cov.map(p=>`<div class="pt"><span class="tag g">已覆盖</span><div style="flex:1">${p[0]}</div><a class="tag g" href="#/kb">${p[2]}</a></div>`).join('')}${mis.map(p=>`<div class="pt"><span class="tag o">遗漏</span><div style="flex:1">${p[0]}</div><a class="tag g" href="#/kb">${p[2]}</a></div>`).join('')}${wr.map(w=>`<div class="pt"><span class="tag r">错误</span><div style="flex:1">「${w[0]}」→ ${w[2]}</div><a class="tag g" href="#/kb">${w[3]}</a></div>`).join('')}
 ${paste?'<div class="warn" style="margin-top:10px">这一份被判定为照抄原文，「表达」按 60 封顶。</div>':''}</div></div></div>`};
ORIG; // 错误示例用营业执照：默认样例改为含错误点
const SAMPLE=ORIG.replace('税务登记信息','营业执照');
// ---------- 上岗认证（文案 v1） ----------
R.cert=()=>`<div class="page"><div class="hd"><div><div class="eyebrow">个人</div><h1>上岗认证</h1><div class="sub">把一条路径里的场景都练到掌握，再通过一次认证练习，就能拿到证书。</div></div></div>
 <div class="sys" style="background:var(--yl);color:#7a5a1e;margin-bottom:14px;max-width:none">K-5.3.1 更新了，你的「一线客服 · 入门」证书需要复练一次，2026-10-24 前完成就不受影响。 <a class="btn sm" href="#/session" style="margin-left:8px">去复练</a></div>
 <div class="grid g3">
 <div class="card"><div class="row"><h3>一线客服 · 入门</h3><span class="ml tag g">已认证</span></div><div style="margin:12px 0">${bar(100)}</div><div class="muted s13">已认证 · 2026-01-12 通过</div><div class="muted s13">已掌握 6/6 个场景 · 100%</div></div>
 <div class="card"><div class="row"><h3>一线客服 · L2 提级</h3><span class="ml tag o">练习中</span></div><div style="margin:12px 0">${bar(72,'#b48a2c')}</div><div>一线客服 · L2 提级 · 已掌握 13/18 个场景 · 72%</div><div class="muted s13">还有 5 个场景没掌握，全部掌握后就能参加认证练习。</div></div>
 <div class="card" style="opacity:.75"><div class="row"><h3>退换货专线</h3><span class="r tag">🔒 未解锁</span></div><div style="margin:12px 0">${bar(0)}</div><div class="muted s13">先完成「一线客服 · L2 提级」认证，这条路径才会打开。</div></div></div>
 <div class="grid g21" style="margin-top:16px"><div class="card"><div class="ch"><h2>L2 提级 · 还没掌握的 5 个场景</h2><span class="r muted s13">其余 13 个已掌握 · 掌握 = 连续 3 遍 ≥ ${PASS}</span></div><table><tr><th>场景</th><th>已练</th><th>最近 3 次</th><th></th></tr>${[['S-087 价格异议：客户拿到竞品低价报价单',H().length+' 遍',H().slice(-3).map(h=>h.score).join(' · '),'session'],['S-124 续费引导 · 客户在犹豫期投诉','3 遍','52 · 47 · 60','session'],['S-142 投诉升级：客户要求见主管','2 遍','66 · 71','session'],['S-150 发票冲红：月底跨期开错','1 遍','58','retell'],['S-133 物流理赔：包裹破损索赔','0 遍','—','session']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="mono">${r[2]}</td><td><a class="btn sm p" href="#/${r[3]}">去练</a></td></tr>`).join('')}</table>
 <div class="kref" style="margin-top:12px"><div class="row"><b>认证练习</b><span class="r tag">🔒 未解锁</span></div><div class="muted s13">这次的题你之前都没见过，只能用第 1 级提示。练完后{由带教确认}。</div></div></div>
 <div class="card"><div class="ch"><h2>上岗认证证书</h2><span class="ml tag g">有效</span></div><p>陈佳雯 已通过「一线客服 · 入门」认证。</p><div class="meta" style="margin:10px 0"><span>证书编号 <b>C-0348</b></span><span>通过日期 <b>2026-01-12</b></span><span>状态 <b>有效</b></span></div><button class="btn p" onclick="toast('链接已复制。打开的人只能看到证书，看不到你的练习记录。')">复制分享链接</button>
 <div class="kref" style="margin-top:14px;background:#faf9f6"><div class="muted s13">分享页预览（免登录）</div><b>陈佳雯 · 一线客服 · 入门 上岗认证</b><div class="s13">证书编号 C-0348，2026-01-12 通过，当前状态 有效。</div><div class="muted s13">由 {公司名} 培训系统签发。</div></div></div></div></div>`;
// ---------- 反馈看板：新条目 ----------
const _fb=R.feedback;R.feedback=()=>{const L=LS.get('fb',[]);let h=_fb();const tot=7+L.length;h=h.replace(/<div class="l">待修正反馈<\/div><div class="n">7/,`<div class="l">待修正反馈</div><div class="n">${tot}`);
 if(L.length){const n=L[0];h=h.replace('<div class="fq"><div class="on">','<div class="fq">'+L.map((f,i)=>`<div class="${i?'':'on'}"><div class="row s13"><span class="mono muted">${f.id}</span><span class="tag o">场景库</span><span class="tag y">中</span><span class="tag">待处理</span><span class="ml tag g">刚刚</span></div><b>S-087 价格异议 · ${f.type}</b><div>${f.text}</div><div class="muted s13 mono">attempt_id ${f.att} · variant_id ${f.var} · 第 ${f.turn} 回合 · 陈佳雯</div></div>`).join('')+'<div>');
  h=h.replace(/<div class="ch"><h2>修正建议<\/h2><span class="r mono muted">F-231<\/span><\/div>/,`<div class="ch"><h2>修正建议</h2><span class="r mono muted">${n.id}</span></div><div class="kref on"><b>新标注 · ${n.id}</b><div class="mono s13">attempt_id ${n.att} · variant_id ${n.var}</div><div>${n.text}</div><div class="muted s13">AI 正在生成修正建议…（待环境）</div></div><div class="muted s13" style="margin:6px 0">上一条：F-231</div>`)}
 return h};
// ---------- 通用：导出 / 版本历史 / 排队 / 搜索 / 身份切换 / 导航 ----------
window.exportCsv=(name,rows)=>{const b=new Blob(['\ufeff'+rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name+'-2026-10-10.csv';a.click();toast('已导出 '+name+'-2026-10-10.csv（保存在本机下载目录）')};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const t=b.textContent.trim();
 if(t=='版本历史')modal(`<h2>K-1.2.3 版本历史</h2><div class="list" style="margin-top:8px">${[['v2.4','2026-10-08','林老师','退款时效修订，同步阶梯区间说明'],['v2.3','2026-10-05','李老师','新增 200 万+ 协商价档'],['v2.1','2026-08-19','王老师','初版阶梯折扣']].map(v=>`<div><span class="tag b">${v[0]}</span> ${v[1]} · ${v[2]}<div class="muted s13">${v[3]}</div></div>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn r" onclick="closeMd()">关闭</button></div>`);
 if(t=='导出周报'||t=='导出')if(!b.getAttribute('onclick'))exportCsv(t=='导出周报'?'反馈周报':'导出',[['周','场景标注','知识标注'],['W24',16,12],['W25',11,9]]);
 if(t=="排队"){b.textContent="已排队"}
 if(t=='导出周报'&&b.getAttribute('onclick'))return;});
$('#q').addEventListener('keydown',e=>{if(e.key=='Enter'){sf={pos:'全部',lv:'全部',sort:'推荐'};location.hash='#/scenarios?q='+encodeURIComponent(e.target.value.trim())}});
let role=LS.get('role','emp');
$('#role').addEventListener('click',e=>{const v=e.target.dataset.v;if(!v)return;role=v;LS.set('role',v);go();toast(v=='adm'?'已切换到管理视角':'已切换到员工视角')});
const _ov=R.overview;R.overview=()=>{let h=_ov();if(role=='adm')h=h.replace('员工视角 · 陈佳雯','管理视角 · 客服组').replace('早上好，佳雯。','早上好，许敏。').replace(/今日练习队列 5 项.*?熟练<\/div>/,'本周练习 2,417 次 · 待修正 '+fbN()+' 条 · 3 个场景引用了已下线的知识</div>');return h};
Object.assign(NAMES,{retell:'练习场 › 文本复述 › <b>S-076 新客户开户</b>',cert:'个人 › <b>上岗认证</b>',session:'练习场 › AI 陪练 › <b>S-087 价格异议</b>',review:'练习场 › <b>结果页 · S-087</b>'});
const NAVMAP={session:'session',review:'review',retell:'retell',cert:'cert'};
go=function(){const raw=location.hash.slice(2)||'overview';const [r,qs]=raw.split('?');const k=R[r]?r:'overview';const q=qs&&qs.startsWith('q=')?decodeURIComponent(qs.slice(2)):'';
 $('#view').innerHTML=(role=='adm'?'<div class="adminbar">管理视角：数据为全公司演示数据汇总 · 员工个人练习明细仅本人与带教可见</div>':'')+R[k](q);
 $('#crumb').innerHTML=NAMES[k].includes('<b>')?NAMES[k]:'工作台 › <b>'+NAMES[k]+'</b>';
 document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r==(NAVMAP[k]||k)));
 document.querySelectorAll('#role span').forEach(s=>s.classList.toggle('on',s.dataset.v==role));$('#q').value=q;window.scrollTo(0,0);freshLoad=false};
addEventListener('hashchange',()=>go());go();
const _sb=R.sandbox;R.sandbox=()=>{const t0=Date.now()-245000;const iv=setInterval(()=>{const e=$('#sbt');if(!e)return clearInterval(iv);e.textContent=fmt(Date.now()-t0)},1000);return _sb()};
const _go2=go;go=function(){_go2();const n=7+LS.get('fb',[]).length;const c=document.querySelector('#nav a[data-r=feedback] .cnt');if(c)c.textContent=n};go();
// ===== R2：规则评估器 / chip / 重练 / 断线提示 / 弹窗 / 排队 / 标注 =====
const EXPECT=['emp','val','val','pol','emp','ctl'];
function evalReply(i,t){const has=re=>re.test(t);
 const emp=has(/理解|明白|顾虑|确实|换谁|能理解|不容易|辛苦|正常/),q=has(/[？?]|吗|哪|什么|方便/),num=has(/\d/)&&has(/万|小时|工时|%|元|天/),sla=has(/SLA|停机|工程师|工时|风险/),
  cite=(t.match(/K-\d\.\d\.\d/g)||[]),path=has(/年付|92\s*折|30\s*万|审批|阶梯|申请/),next=has(/约|周[一二三四五六日]|明天|下周|报价单|试用|回电|再聊|时间/),slow=has(/慢|举个|比如|例子|清楚吗|听懂/);
 const promise=t.match(/([1-9](\.\d)?|[一二三四五六七八九])\s*折|打折|直接降|便宜\s*\d+/);const red=promise&&!/92\s*折/.test(promise[0])&&!(/申请|审批/.test(t)&&!/直接|就给|可以给/.test(t));
 const d={emp:52+(emp?28:0)+(q?8:0)+(slow?6:0),val:48+(num?24:0)+(sla?12:0)+(cite.length?6:0),pol:78+(path?12:0)+(cite.length?4:0),ctl:52+(next?26:0)+(q?8:0)+(path?6:0)};
 if(red)d.pol=28;Object.keys(d).forEach(k=>d[k]=Math.max(20,Math.min(96,d[k]-(t.length<12?12:0))));
 const good=[],fix=[];
 if(emp)good.push('先接住了客户情绪');if(q)good.push('用提问把话题交回客户');if(num)good.push('给出了具体数字，客户能拿去汇报');if(sla&&!num)good.push('提到了 SLA / 专属工程师的价值');if(path&&!red)good.push('给了 K-1.2.3 区间内的合规降价路径');if(next)good.push('约定了下一步');if(slow)good.push('放慢节奏并确认客户听懂');if(cite.length)good.push('引用了 '+cite.join('、'));
 const need={emp:[emp,'先回应情绪，比如「理解，换谁都会犹豫」（K-5.3.1 第 1 步）'],val:[num,'把差价换成具体数字：停机小时 × 每小时损失、省下的工时（K-5.3.1 第 2 步）'],pol:[path,'客户认了价值后，给一条合规路径：年付或采购额到 30 万走 92 折（K-1.2.3）'],ctl:[next,'收尾约定具体的下一步和时间，别只说「有问题随时联系」（错误示例 S-087-E3）']};
 const e=EXPECT[i];if(!need[e][0])fix.push(need[e][1]);if(i==4&&!slow)fix.push('客户说没听懂，要放慢、举一个他自己的例子，再问一句「这样清楚吗」');
 if(!emp&&i<2&&e!='emp')fix.push('开口前先认一下客户的处境');if(t.length<12)fix.push('回答太短，客户会觉得被敷衍');
 const k=red||e=='pol'||path?'K-1.2.3':e=='ctl'&&!next?'S-087-E3':'K-5.3.1';
 return{d,red:red?`停一下：你承诺的「${promise[0]}」超出了 K-1.2.3 的范围（年采购额 30 万以下仅标准价）。这一遍政策合规不达标。正确做法：在区间内给，或者告诉客户需要申请审批。`:null,
  good:good.length?good.join('；')+'。':'这一回合还没有抓到要点。',fix:fix.length?fix.join('；')+'。':'这一回合到位，保持。',k,bad:!!red||fix.length>0}}
window.send=()=>{const s=S(),t=$('#ta').value.trim();if(s.turns.length>=6){toast('6 个回合已完成，请查看结果');return}if(!t){toast('先写点什么再发送');return}
 const f=evalReply(s.turns.length,t);s.turns.push({i:s.turns.length,t,k:f.bad?'w':'g',f});save(s);$('#ta').value='';cnt();renderSess()};
window.retryTurn=i=>{const s=S();const t=prompt('重练第 '+(i+1)+' 回合，输入新的回答：',(s.turns.find(x=>x.i==i)||{}).t||'');if(!t)return;const f=evalReply(i,t);
 s.turns=s.turns.map(x=>x.i==i?{i,t,k:f.bad?'w':'g',f}:x);s.retried[i]=1;save(s);renderSess();toast(f.bad?'还没到位，看看新的点评再试':'这一回合重练过了，分数已更新')};
const CHIPS=['我帮您算笔账：按每小时停机损失约 2 万计，我们一年少停机约 39 小时。','专属工程师一年能帮您省约 300 工时，折合内部人力约 12 万。','如果改成年付，或年度采购额到 30 万，可以走 92 折，我来帮您申请。'];
window.chip=i=>{const s=S();if(s.turns.length>=6)return;if(s.hint<3){if(!confirm('参考话术算第 3 级提示：看参考话术后，这一遍不计入「连续通过」。确定看吗？'))return;s.hint=3;save(s)}
 const ta=$('#ta'),draft=ta.value,pos=ta.selectionStart!=null&&document.activeElement===ta?ta.selectionStart:draft.length;renderSess();const ta2=$('#ta');
 const ins=(pos>0&&!/\s$/.test(draft.slice(0,pos))?' ':'')+CHIPS[i];ta2.value=draft.slice(0,pos)+ins+draft.slice(pos);ta2.focus();ta2.selectionStart=ta2.selectionEnd=pos+ins.length;cnt()};
// 草稿在重绘时保留
const _rs2=renderSess;renderSess=function(){const ta=$('#ta'),d=ta?ta.value:'';_rs2();const s=S();if($('#ta')&&s.turns.length<6)$('#ta').value=d;cnt&&$('#wc')&&cnt();
 if(!s.turns.length)$('#sc').textContent='—';
 const n=$('#rnote');if(n)n.style.display=s._recover?'block':'none';if(s._recover&&n)n.innerHTML=`刚才断开了，已经帮你回到第 ${Math.min(s.turns.length+1,6)} 回合，用时和得分都还在。 <a href="javascript:void 0" onclick="this.parentNode.style.display='none';const s=S();delete s._recover;save(s)" style="color:var(--g)">知道了</a>`;
 if(s.turns.length>=6){document.querySelectorAll('#hl button,.sugg span[onclick]').forEach(b=>{b.disabled=true;b.style.opacity=.45;b.style.pointerEvents='none'});const sb=document.querySelector('.input .btn.p');if(sb){sb.textContent='查看结果 →';sb.onclick=submitAtt}}};
const _sess2=R.session;R.session=()=>_sess2().replace('<div class="chat" id="chat">','<div id="rnote" class="sys" style="display:none;margin:10px 24px 0;align-self:auto;max-width:none;background:var(--gl);color:var(--g)"></div><div class="chat" id="chat">');
// 标注：回合号 = 当前回合；立即跳转并刷新角标
window.flag=(_f=>()=>{_f();const s=S();const cur=Math.min(s.turns.length+1,6);const m=document.querySelector('#md .meta');if(m)m.lastElementChild.innerHTML='回合 <b>第 '+cur+' 回合</b>'})(window.flag);
window.flagSubmit=()=>{const s=S(),fb=LS.get('fb',[]);const id='F-'+(232+fb.length);fb.unshift({id,type:$('#ft .on').textContent,text:$('#ftx').value,att:s.att,var:VARS[s.vi].id,turn:Math.min(s.turns.length+1,6)});LS.set('fb',fb);closeMd();
 if(location.hash=='#/feedback')go();else location.hash='#/feedback';toast(`收到，这个问题已记到反馈看板（${id}），不影响你这一遍的成绩。`)};
// 弹窗：切页关闭
addEventListener('hashchange',()=>document.querySelectorAll('.modal').forEach(m=>m.remove()));
// 排队：真正移到队尾，持久
const _fb2=R.feedback;R.feedback=()=>{const h=_fb2();setTimeout(applyQueue);return h};
function applyQueue(){const Q=LS.get('queued',[]);const fq=$('.fq');if(!fq)return;Q.forEach(id=>{const it=[...fq.children].find(c=>c.textContent.includes(id)&&c.querySelector('.mono')&&c.querySelector('.mono').textContent==id);if(!it)return;it.classList.remove('on');const tags=it.querySelectorAll('.tag');tags.forEach(t=>{if(t.textContent=='待处理')t.textContent='已排队'});fq.appendChild(it)});
 const cur=document.querySelector('.card .ch .mono');const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()=='排队'||b.textContent.trim()=='已排队');if(btn&&cur&&Q.includes('F-231')&&!LS.get('fb',[]).length){btn.textContent='已排队';btn.disabled=true}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.textContent.trim()!='已排队'||!location.hash.includes('feedback'))return;
 const Q=LS.get('queued',[]);const L=LS.get('fb',[]);const id=L.length?L[0].id:'F-231';if(!Q.includes(id)){Q.push(id);LS.set('queued',Q)}toast(id+' 已排队，移到队列末尾');applyQueue()});
// 重置演示数据
window.resetDemo=()=>{if(!confirm('清空本机演示数据（练习记录、反馈、设置），回到初始状态？'))return;Object.keys(localStorage).filter(k=>k.startsWith('tp_')).forEach(k=>localStorage.removeItem(k));location.hash='#/overview';location.reload()};
document.querySelector('.me').insertAdjacentHTML('afterend','<a href="javascript:resetDemo()" class="muted s13" style="padding:8px 6px 0;display:block">↺ 重置演示数据</a>');
go();
// ===== R3 =====
// 带教通知（中性文案；{带教姓名}/{时限} 待决策 ②/Q5，见 prd-diff.md）
var COPY_MENTOR='已为你安排带教，带教老师会先看你最近几遍的回放，再来找你。';
// ---- 点评分档文案（文案同学只改这里）。档位门槛读 CONFIG.masteryLine / CONFIG.midLine ----
const BAND_COPY={
  high:{good:'这一回合到位：{点}（{K}）', fix:'保持住，下一回合留意 {下一个要点}'},           // score >= CONFIG.masteryLine
  mid: {good:'方向对了：{点}',            fix:'还差一步：{缺的点}，看看 {K}'},                 // CONFIG.midLine <= score < masteryLine
  low: {good:'你注意到了 {可取之处}',     fix:'这一回合没抓到要点：{问题}。先看 {K} 的第 {N} 步'}, // score < CONFIG.midLine；无可取之处时隐藏「做得好」
  redline:{card:'停一下：你承诺的「{承诺}」超出了 K-1.2.3 的范围（年采购额 30 万以下仅标准价）。这一遍政策合规不达标。', fix:'在 K-1.2.3 区间内给（30–80 万 92 折），或者告诉客户需要申请审批；先把差价换算成价值（K-5.3.1）。'},
  // 部门场景（S-2xx）通用：知识依据是占位编号，没有「第 N 步」
  lowGeneric:{good:'你注意到了 {可取之处}', fix:'这一回合没抓到要点：{问题}。先看 {K}'},
  redlineGeneric:{card:'停一下：「{承诺}」这类承诺超出了你的权限，这一遍合规维度不达标。', fix:'先对照 {K} 确认边界，在权限内给方案；超出的部分告诉对方需要走审批或升级。'},
};
const NEXT_TIP=['先接住客户情绪，再问他最看重什么','把差价换成能汇报的数字','给出具体金额或工时','客户认了价值后给一条合规降价路径','客户没听懂时放慢、举例、确认','收尾约定具体的下一步和时间','—'];
const fillT=(t,o)=>t.replace(/\{([^}]+)\}/g,(m,k)=>o[k]!=null?o[k]:m);
function bandOf(sc){return sc>=CONFIG.masteryLine?'high':sc>=CONFIG.midLine?'mid':'low'}
function evalRaw(i,t){const has=re=>re.test(t);
 const f={emp:has(/理解|明白|顾虑|确实|换谁|能理解|不容易|正常/),q:has(/[？?]|吗|哪|什么|方便/),num:has(/\d/)&&has(/万|小时|工时|%|元|天/),sla:has(/SLA|停机|工程师|工时|风险/),
  cite:(t.match(/K-\d\.\d\.\d/g)||[]),path:has(/年付|92\s*折|30\s*万|审批|阶梯|申请/),next:has(/约|周[一二三四五六日]|明天|下周|报价单|试用|回电|再聊|时间/),slow:has(/慢|举个|比如|例子|清楚吗|听懂/)};
 const pm=t.match(redlineRe('S-087'));const red=pm&&!/92\s*折/.test(pm[0])&&!(/申请|审批/.test(t)&&!/直接|就给|可以给/.test(t));
 const d={emp:52+(f.emp?28:0)+(f.q?8:0)+(f.slow?6:0),val:48+(f.num?24:0)+(f.sla?12:0)+(f.cite.length?6:0),pol:78+(f.path?12:0)+(f.cite.length?4:0),ctl:52+(f.next?26:0)+(f.q?8:0)+(f.path?6:0)};
 if(red)d.pol=28;Object.keys(d).forEach(k=>d[k]=Math.max(20,Math.min(96,d[k]-(t.length<12?12:0))));
 const goods=[];if(f.emp)goods.push('先接住了客户情绪');if(f.q)goods.push('用提问把话题交回客户');if(f.num)goods.push('给出了能汇报的具体数字');if(f.sla&&!f.num)goods.push('提到了 SLA / 专属工程师的价值');if(f.path&&!red)goods.push('给了区间内的合规降价路径');if(f.next)goods.push('约定了下一步');if(f.slow)goods.push('放慢并确认客户听懂');if(f.cite.length)goods.push('引用了 '+f.cite.join('、'));
 const NEED={emp:[f.emp,'没有先回应客户情绪','K-5.3.1',1],val:[f.num,'没有把差价换成具体数字','K-5.3.1',2],pol:[f.path,'没有给合规的降价路径','K-1.2.3',1],ctl:[f.next,'没有约定下一步','K-5.3.1',3]};
 const exp=['emp','val','val','pol','emp','ctl'][i];const misses=[];if(!NEED[exp][0])misses.push(NEED[exp].slice(1));if(i==4&&!f.slow)misses.push(['客户说没听懂，你没有放慢举例','K-5.3.1',3]);
 if(t.length<12)misses.push(['回答太短，客户会觉得被敷衍','K-5.3.1',1]);
 return{raw:1,i,d,goods,misses,red:red?pm[0]:null,k:red?'K-1.2.3':(misses[0]?misses[0][1]:(exp=='pol'?'K-1.2.3':'K-5.3.1')),bad:!!red||misses.length>0}}
function compose(r){const sc=tAvg(r);if(r.red)return{...r,red:fillT(BAND_COPY.redline.card,{'承诺':r.red}),good:'',fix:BAND_COPY.redline.fix,k:'K-1.2.3'};
 const b=bandOf(sc),c=BAND_COPY[b];let m=r.misses[0];if(!m&&b!='high'){const w=Object.keys(r.d).sort((x,y)=>r.d[x]-r.d[y])[0];m={emp:['没有先回应客户情绪','K-5.3.1',1],val:['没有把差价换成具体数字','K-5.3.1',2],pol:['没有给合规的降价路径','K-1.2.3',1],ctl:['没有约定下一步','K-5.3.1',3]}[w]}const K=m?m[1]:r.k;const pts=r.goods.slice(0,2).join('、');
 if(b=='high')return{...r,good:fillT(c.good,{'点':pts||'回应完整','K':r.k}),fix:fillT(c.fix,{'下一个要点':NEXT_TIP[r.i+1]})};
 if(b=='mid')return{...r,good:fillT(c.good,{'点':pts||'接住了客户的话'}),fix:fillT(c.fix,{'缺的点':m?m[0].replace(/^没有/,''):NEXT_TIP[r.i+1],'K':K})};
 return{...r,good:r.goods.length?fillT(c.good,{'可取之处':pts}):'',fix:fillT(c.fix,{'问题':m?m[0]:'回应没有对准客户的问题','K':K,'N':m?m[2]:1})}}
const _fbOf3=fbOf;fbOf=function(tr){const f=_fbOf3(tr);return f&&f.raw?compose(f):f};
window.send=()=>{const s=S(),t=$('#ta').value.trim();if(s.turns.length>=CONFIG.maxTurns){toast('6 个回合已完成，请查看结果');return}if(!t){toast('先写点什么再发送');return}
 const f=evalRaw(s.turns.length,t);s.turns.push({i:s.turns.length,t,k:f.bad?'w':'g',f});save(s);$('#ta').value='';lastPos=0;cnt();renderSess()};
window.retryTurn=i=>{const s=S();const t=prompt('重练第 '+(i+1)+' 回合，输入新的回答：',(s.turns.find(x=>x.i==i)||{}).t||'');if(!t)return;const f=evalRaw(i,t);
 s.turns=s.turns.map(x=>x.i==i?{i,t,k:f.bad?'w':'g',f}:x);s.retried[i]=1;save(s);renderSess();toast(f.bad?'还没到位，看看新的点评再试':'这一回合重练过了，分数已更新')};
// ---- 新的一遍：attempt_id 全局递增（含放弃的遍次），变体避开当前与上一遍；提示状态清零 ----
newSess=function(avoid){const hs=H(),no=hs.length+1,prev=hs.slice(-1)[0];const cur=LS.get('sess',null);const seq=Math.max(LS.get('seq',hs.length),no-1,cur&&cur.att?parseInt(cur.att.slice(-4)):0)+1;LS.set('seq',seq);
 const bad=new Set([avoid,prev&&VARS.findIndex(v=>v.id==prev.var)]);let vi=(seq+1)%3;for(let k=0;k<3&&bad.has(vi);k++)vi=(vi+1)%3;
 return{no,vi,att:'A-087-'+pad(seq),seed:'5087-'+pad(seq)+'-'+vi,hint:0,start:Date.now(),el:0,turns:[],retried:{}}};
window.resetAtt=()=>{if(!confirm('重置这一遍？这一遍记为放弃，不计成绩，会换一个新变体。'))return;clearInterval(timer);const s=S();const n=newSess(s.vi);save(n);lastPos=0;go();toast('已重置 · 新的一遍 '+n.att+' · 变体 '+VARS[n.vi].id)};
// ---- chip 插在光标处 ----
let lastPos=null;
document.addEventListener('selectionchange',()=>{const ta=document.activeElement;if(ta&&ta.id=='ta')lastPos=ta.selectionStart});
document.addEventListener('input',e=>{if(e.target.id=='ta')lastPos=e.target.selectionStart});
window.chip=i=>{const s=S();if(s.turns.length>=CONFIG.maxTurns)return;if(!(s.hint>=3)){if(!confirm('参考话术算第 3 级提示：看参考话术后，这一遍不计入「连续通过」，本遍得分上限 '+CAP[3]+'。确定看吗？'))return;s.hint=3;save(s)}
 const ta=$('#ta'),draft=ta.value;const pos=lastPos==null||lastPos>draft.length?draft.length:lastPos;renderSess();const ta2=$('#ta');
 const ins=(pos>0&&!/\s$/.test(draft.slice(0,pos))?' ':'')+CHIPS[i]+(pos<draft.length&&!/^\s/.test(draft.slice(pos))?' ':'');ta2.value=draft.slice(0,pos)+ins+draft.slice(pos);ta2.focus();ta2.selectionStart=ta2.selectionEnd=pos+ins.length;lastPos=pos+ins.length;cnt()};
window.hint=n=>{const s=S();if(n>=3&&!(s.hint>=3)&&!confirm('看参考话术后，这一遍不计入「连续通过」，本遍得分上限 '+CAP[3]+'。确定看吗？'))return;s.hint=Math.max(s.hint||0,n);save(s);renderSess()};
// ⌘/Ctrl+↵ 在 6/6 后只会去结果，不会再发送
document.addEventListener('keydown',e=>{if(e.target.id=='ta'&&(e.metaKey||e.ctrlKey)&&e.key=='Enter'&&S().turns.length>=CONFIG.maxTurns){e.preventDefault();e.stopImmediatePropagation()}},true);
// ---- 反馈看板：列表与「修正建议」同一条目，操作作用于当前条目 ----
applyQueue=function(){};
const FBD=[
 {id:'F-231',src:'场景库',lv:'高',st:'待处理',title:'S-087 价格异议 · 错误示例',text:'错误示例② 的措辞太书面化，客户实际不会这么说',who:'林小雨 · 客服 · 8 人同遇',orig:'「错误示例② 的措辞太书面化，客户实际不会这么说，建议改为『行吧，那我去找他们了』这类口语化回绝。」',ai:'将错误示例② 替换为：「行吧，那我去找他们了，你们这价格真没诚意。」并同步更新 AI 陪练客户人设的口语化程度。',path:'练习 S-087 → 标注 F-231 → 修正场景库 → 回归验证（8 名员工复练）'},
 {id:'F-230',src:'知识库',lv:'高',st:'排查中',title:'K-2.3.1 退款规则 · 超时赔付',text:'「超 7 天需主管审批」和实际执行的 5 天不一致',who:'周明远 · 运维 · 5 人同遇',orig:'「知识里写超 7 天要主管审批，实际系统 5 天就卡审批了。」',ai:'将 K-2.3.1「超 7 天需主管审批」改为「超 5 天」，与系统一致；同步更新 3 个引用场景。',path:'知识 K-2.3.1 → 标注 F-230 → 修正知识库 → 引用场景重新校验'},
 {id:'F-229',src:'场景库',lv:'中',st:'待处理',title:'S-091 接口鉴权 401',text:'沙盒步骤缺少 NTP 偏移检查',who:'陈佳雯 · 客服 · 3 人同遇',orig:'「排查路径里没有 NTP 偏移这一步，但真实根因经常是它。」',ai:'在 S-091 排查路径第 3 步前加入「检查 NTP 偏移」，关联 K-4.2.3。',path:'练习 S-091 → 标注 F-229 → 修正场景库 → 回归验证'},
 {id:'F-227',src:'场景库',lv:'中',st:'已采纳',title:'S-124 续费引导',text:'Step 2 漏掉了价保政策分支',who:'吴佳 · 销售 · 1 人同遇',orig:'「老客户续约涨价时，场景没有价保分支。」',ai:'Step 2 增加价保政策分支，引用 K-1.2.4 续约价保护策略。',path:'练习 S-124 → 标注 F-227 → 已修正（v3.1）'}];
let fbSel=null;
function fbAll(){const L=LS.get('fb',[]).map(f=>({id:f.id,src:'场景库',lv:'中',st:'待处理',title:'S-087 价格异议 · '+f.type,text:f.text,who:'陈佳雯 · 客服 · 刚刚',meta:`attempt_id ${f.att} · variant_id ${f.var} · 第 ${f.turn} 回合`,orig:'「'+f.text+'」',ai:'AI 正在生成修正建议…（待环境）',path:`练习 S-087（${f.att}）→ 标注 ${f.id} → 待处理`,fresh:1}));
 const st=LS.get('fbst',{}),Q=LS.get('queued',[]);let all=L.concat(FBD).map(x=>({...x,st:st[x.id]||x.st}));return all.filter(x=>!Q.includes(x.id)).concat(Q.map(id=>all.find(x=>x.id==id)).filter(Boolean))}
function renderFB(){const fq=$('.fq');if(!fq)return;const all=fbAll();if(!fbSel||!all.find(x=>x.id==fbSel))fbSel=all[0].id;const c=all.find(x=>x.id==fbSel);
 const stc=s=>s=='已采纳'?'g':s=='已驳回'?'r':s=='已排队'?'b':'';
 fq.innerHTML=all.map(f=>`<div class="${f.id==fbSel?'on':''}" onclick="fbSel='${f.id}';renderFB()"><div class="row s13"><span class="mono muted">${f.id}</span><span class="tag ${f.src=='知识库'?'b':'o'}">${f.src}</span><span class="tag ${f.lv=='高'?'r':'y'}">${f.lv}</span><span class="tag ${stc(f.st)}">${f.st}</span>${f.fresh?'<span class="ml tag g">新</span>':''}</div><b>${f.title}</b><div>${f.text}</div><div class="muted s13 ${f.meta?'mono':''}">${f.meta||f.who}</div></div>`).join('');
 const card=[...document.querySelectorAll('.card h2')].find(h=>h.textContent=='修正建议').closest('.card');const done=c.st=='已采纳'||c.st=='已驳回';
 card.innerHTML=`<div class="ch"><h2>修正建议</h2><span class="r mono muted">${c.id}</span></div><span class="tag ${c.src=='知识库'?'b':'o'}">${c.src}</span><span class="tag ${c.lv=='高'?'r':'y'}">严重度 · ${c.lv}</span><span class="tag ${stc(c.st)}">${c.st}</span><h3 style="margin:6px 0">${c.title}</h3>${c.meta?`<div class="mono s13 muted">${c.meta}</div>`:''}<div class="kref"><div class="muted s13">原标注 · ${c.who.split(' · ')[0]}</div>${c.orig}</div><div class="kref on"><b>AI 修正建议</b><br>${c.ai}</div><div class="muted s13" style="margin:8px 0">回流路径：${c.path}</div>
 <div class="row"><button class="btn" ${done?'disabled':''} onclick="fbAct('已驳回')">✕ 驳回</button><button class="btn" ${done||c.st=='已排队'?'disabled':''} onclick="fbAct('已排队')">排队处理</button><button class="btn p r" ${done||c.fresh?'disabled':''} onclick="fbAct('已采纳')">✓ 采纳</button></div>${c.fresh?'<div class="muted s13" style="margin-top:6px">AI 建议生成后才能采纳（待环境）</div>':''}`}
window.fbAct=a=>{const st=LS.get('fbst',{});st[fbSel]=a;LS.set('fbst',st);if(a=='已排队'){const Q=LS.get('queued',[]).filter(x=>x!=fbSel);Q.push(fbSel);LS.set('queued',Q)}toast(fbSel+' '+a);renderFB()};
const _fb3=R.feedback;R.feedback=()=>{const h=_fb3();setTimeout(renderFB);return h};
go();
const _rs3=renderSess;renderSess=function(){_rs3();if(!S().turns.length){document.querySelectorAll('#rp .dim b.r').forEach(b=>b.textContent='—');document.querySelectorAll('#rp .dim .bar i').forEach(i=>i.style.width='0');const z=[...document.querySelectorAll('#rp .row b')].find(b=>b.textContent=='综合');if(z&&z.nextElementSibling)z.nextElementSibling.textContent='—'}};
go();
