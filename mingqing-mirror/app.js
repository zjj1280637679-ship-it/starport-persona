import {AXES,QUESTIONS,QUESTION_MAP,CHARACTERS,MODES} from "./data.js";
import {art} from "./media.js";
import {aiEnabled,analyzeAnswer,rewriteQuestion} from "./ai-client.js";
const KEY="mingqing-mirror:records-v1",DRAFT="mingqing-mirror:draft-v1";
const root=document.querySelector("#app");
const state={draft:read(DRAFT,null),records:read(KEY,[]),showId:null};
let submitBusy=false;
function read(k,f){try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}}
function persist(){try{localStorage.setItem(DRAFT,JSON.stringify(state.draft));localStorage.setItem(KEY,JSON.stringify(state.records))}catch{}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(s){const e=document.querySelector("#toast");e.textContent=s;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2800)}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const label=(a,sign)=>sign<0?a[1]:sign>0?a[2]:"两者之间";
const K={
 ei:[["单独","独自","自己思考","先思考","独谋","独立判断","私下"],["共同","讨论","协商","召集","团队","听取","集思广益"]],
 sn:[["账目","实证","事实","细节","经验","证据","当下"],["推演","长远","未来","趋势","布局","可能性","预判"]],
 tf:[["原则","证据","法度","逻辑","责任","公平","核查"],["体谅","情面","感情","民心","宽恕","同情","人情"]],
 jp:[["计划","预案","制度","步骤","规划","落实","秩序"],["随机应变","变通","调整","见机","灵活","试探","临机"]],
 power:[["朝廷统一","中央掌权","中央决断","中央统筹","官府接管","统一指挥"],["分权","地方自主","地方决定","授权地方","乡约自治","多方协商"]],
 reform:[["守成","旧制","传统制度","维持原制","遵从惯例"],["改革","重建","重新设计","变革","改制","打破旧制"]],
 method:[["礼法","承诺","守约","原则","道义","名分","遵守程序"],["效率","变通","务实","成效","结果优先","灵活处置"]],
 autonomy:[["严格监管","强制执行","官府接管","集中监督","朝廷控制"],["自治","民间自理","自愿","保障权利","自主管理","参与决策"]],
 economy:[["农本","农田","田赋优先","耕作","农业优先"],["商税","贸易","商路","互市","重商","商人"]],
 diplomacy:[["出兵","征伐","决战","战事优先","武力解决"],["议和","谈判","和议","协商","互市","和平"]],
 han:[["反对明制","否定旧朝文化"],["支持明制","保留旧朝衣冠","延续汉文化","尊重明代礼制","保护旧朝祠庙"]],
 man:[["反对八旗制度","否定清初制度"],["认可清初治理","支持后金联盟","认同八旗制度","吸纳八旗制度","赞成清初统合"]],
 hui:[["反对西北社群自治","排斥回民盟约"],["西北回民自治","尊重回民自治","维护西北盟约","支持回民社群自决"]],
 meng:[["反对草原自治","反对蒙古诸部盟约"],["草原自主","草原诸部自治","保护牧道","维护蒙古诸部","支持草原盟约"]]
};
const POLES={
 ei:["独自判断","聚众议事"],sn:["核实细节","推演远景"],tf:["法理原则","人情关怀"],jp:["预设计划","灵活应变"],
 power:["中央统筹","地方分权"],reform:["延续修补","重建变革"],method:["坚持礼法","务实权变"],
 autonomy:["官府监管","民间自治"],economy:["农田优先","商贸优先"],diplomacy:["军事施压","协商议和"],
 han:["文化归属暂缓","认同保留旧朝文化"],man:["对联盟旧制保留","认同清初军政统合"],
 hui:["对西北社群诉求保留","认同西北社群自治"],meng:["对草原自治保留","认同草原诸部自主"]
};
const GROUPS={personality:"处世禀性",politics:"治世政略",camp:"乱世阵营",wit:"智谋试炼"};
const SIGN={ei:"外向与内向互动偏好",sn:"经验与想象",tf:"决策依据",jp:"计划与变化"};
function header(k,t,sub=""){return '<div class="page-head"><div class="kicker" style="justify-content:center">'+k+'</div><h1>'+t+'</h1><p>'+sub+'</p></div>'}
function page(){let h=location.hash.replace(/^#/,"")||"home";return h}
function navigate(id){location.hash="#"+id;if(page()===id)render();window.scrollTo({top:0,behavior:"instant"})}
function start(mode){state.draft={mode,step:0,answers:{},aiConsent:!!(aiEnabled&&document.querySelector("#ai-consent")?.checked),rewriteCache:{},began:new Date().toISOString()};persist();navigate("quiz")}
function currentIds(){return MODES[state.draft?.mode]?.ids||MODES.quick.ids}
function currentQuestion(){return QUESTION_MAP.get(currentIds()[state.draft.step])}
function qAnswer(q){return state.draft?.answers?.[q.id]||{text:"",lean:"",choice:""}}
function intro(){
 return '<section class="hero"><div class="hero-text"><div class="kicker">LATE MING · EARLY QING / HISTORICAL MIRROR</div><h1>明清<em>人物镜</em></h1><p class="hero-sub">如果甲申之变再临，你会成为谁？</p><p class="lead">二十八道历史抉择，四重镜面照见人格、政见、历史阵营与智谋。不是问你属于哪一种血统，而是置身易代关头，你将如何行事——最终，哪位人物与你的选择最为相似？</p><div class="hero-actions"><button class="btn primary" data-action="enter">启封入卷　↗</button>'+(state.draft?'<button class="btn" data-action="continue">续读未竟之卷</button>':'<a href="#about" class="btn">阅览测试规则</a>')+'</div><p class="note" style="margin-top:26px">免费体验 · 无需账号或自备 API · '+(aiEnabled?'可选 DeepSeek AI 分析（需同意）':'离线规则分析版本')+'</p></div><div class="hero-art">'+art("home.hero","hero")+'<div class="stamp">乱世鉴书</div></div></section>'+
 '<section class="section"><div class="kicker">FOUR MIRRORS</div><h2 class="section-title">四镜相合，方见其人</h2><div class="three-up"><div class="pane"><span class="pane-index">壹</span><h3>禀性与政略</h3><p>四组隐性人格偏好与六轴政治取向独立计算，不拿民族阵营代替性格。</p></div><div class="pane"><span class="pane-index">贰</span><h3>阵营与智谋</h3><p>血汉、血满、血回、血蒙为历史阵营共鸣的娱乐称谓；智谋题解锁人物地位。</p></div><div class="pane"><span class="pane-index">叁</span><h3>最近人物镜像</h3><p>先按智谋限制入池，再跨四维寻找最接近的人物，即使相似度不高，也照实说明。</p></div></div></section>'+
 '<section class="section"><div class="kicker">ART PIPELINE</div><h2 class="section-title">图形 · 图片 · 动态影像</h2><div class="paper"><div class="paper-content"><div class="tagline">每一幅插画都已留有自己的位置。</div><p class="muted">目前以原生线描图形构成世界观；未来加入人物肖像、历史场景、题面插画，最后将局部升级成 GIF。页面交互与评分规则始终独立。</p><a href="#about" class="btn small">查看美术槽位规范 ↗</a></div></div></section>';
}
function setup(){
 return header("CHOOSE YOUR CHRONICLE","择卷入史","从短暂一瞥到一部完整的乱世问答，选择自己的入局方式。")+
 '<div class="mode-grid"><button class="mode" data-action="start" data-mode="quick"><div class="mode-tag">QUICK · 12</div><span class="corner">简</span><strong>速鉴十二问</strong><p>四个维度各取三题。适合初见乱世的游客，结果更接近趣味速写。</p><footer>约 6–10 分钟 · 启封 →</footer></button><button class="mode" data-action="start" data-mode="standard"><div class="mode-tag">STANDARD · 28</div><span class="corner">详</span><strong>史鉴二十八问</strong><p>每一类七问；涵盖开局、政略、认同与可校准的谋略题，提供较完整的镜像画像。</p><footer>约 15–25 分钟 · 启封 →</footer></button></div>'+
 (aiEnabled?'<div class="ai-consent"><label><input type="checkbox" id="ai-consent"/> 同意本次测试将填写的自由文本发往 DeepSeek，辅助语义分析与安全措辞改写。不勾选仍可完成离线测试。</label></div>':'')+
 '<p class="note" style="text-align:center">题目为架空历史情境，人物特征为游戏化史料推定。'+(aiEnabled?'只有勾选才会发送回答到 DeepSeek。':'当前无云端 AI 调用，回答保存在本机。')+'</p>';
}
function safeRewrite(q){
 // 严格白名单。句柄必须是该游客之前答案中出现的原文，保持原题 ID 和评分元数据。
 if(!q.rewrites?.length||!state.draft)return q;
 const prior=currentIds().slice(0,state.draft.step).map(id=>state.draft.answers[id]?.text||"").filter(Boolean);
 if(state.draft.aiConsent&&aiEnabled){
  const proposed=state.draft.rewriteCache?.[q.id];
  if(typeof proposed==="string"&&q.rewrites.some(r=>prior.filter(t=>t.includes(r.handle)).length===1&&proposed===q.scene.replace(r.phrase,r.replace)))return {...q,scene:proposed,adapted:true};
  return q;
 }
 for(const rule of q.rewrites){
  const hits=prior.filter(t=>t.includes(rule.handle));
  if(hits.length===1&&q.scene.includes(rule.phrase)&&rule.replace.includes(rule.handle)){
   return {...q,scene:q.scene.replace(rule.phrase,rule.replace),adapted:true};
  }
 }
 return q;
}
function quiz(){
 if(!state.draft)return setup();
 const ids=currentIds(), q=currentQuestion();if(!q)return header("ERROR","卷宗暂不可读");
 const a=qAnswer(q),m=MODES[state.draft.mode],qShown=safeRewrite(q),wit=q.group==="wit",i=state.draft.step;
 const options=wit?'<div class="choice-list" role="group" aria-label="智谋题选项">'+q.options.map((opt,n)=>'<button class="choice '+(String(a.choice)===String(n)?"selected":"")+'" data-action="choice" data-value="'+n+'"><span>'+String.fromCharCode(65+n)+'</span>'+esc(opt)+'</button>').join("")+'</div>': '<textarea class="answerbox" id="answer" maxlength="1800" placeholder="写下你会如何处理，以及做出这个判断的理由……">'+esc(a.text)+'</textarea><p class="muted" style="font-size:12px;margin:7px 0">开放作答 · 写具体理由更有利于未来 AI 分析。当前使用本地词库辅助识别。</p>'+leanUI(q,a);
 return '<div class="quiz-layout"><div class="quiz-head"><div class="kicker">'+GROUPS[q.group]+'</div><div class="state-line">第 '+(i+1)+' / '+ids.length+' 问 · '+m.title+'</div></div><div class="progress-track"><div class="progress-fill" style="width:'+((i+1)/ids.length*100)+'%"></div></div>'+
 '<article class="paper quiz-card">'+art("question."+q.id,"scene")+ '<div class="paper-content"><div class="question-no">卷 '+String(i+1).padStart(2,"0")+' / '+String(ids.length).padStart(2,"0")+'　·　'+GROUPS[q.group]+'</div><h2>'+esc(qShown.title)+'</h2><p class="story">'+esc(qShown.scene)+'</p><div class="divider"></div><p class="question-prompt">'+esc(qShown.ask)+'</p>'+options+'</div></article>'+
 '<div class="quiz-actions"><button class="btn" data-action="previous" '+(i===0?"disabled":"")+'>← 上一题</button><div class="right"><button class="btn ghost" data-action="leave">暂离存卷</button><button class="btn primary" data-action="next">'+(i===ids.length-1?"合卷照鉴 →":"下一题 →")+'</button></div></div>'+
 '<p class="note">部分题目可能在找到可靠的个人原文句柄时做等义措辞替换；无可靠句柄则使用原题。智谋题条件与答案不可改。</p></div>';
}
function leanUI(q,a){let p=POLES[q.axis]||["暂不确定","有所偏向"];return '<div class="divider"></div><div class="muted" style="font-size:12px;margin-bottom:9px">辅助倾向（可选）· 帮助离线模式识别文字之外的选择</div><div class="pill-row"><button class="btn small '+(a.lean==="left"?"selected":"")+'" data-action="lean" data-value="left">'+esc(p[0])+'</button><button class="btn small '+(a.lean==="neutral"?"selected":"")+'" data-action="lean" data-value="neutral">暂不确定</button><button class="btn small '+(a.lean==="right"?"selected":"")+'" data-action="lean" data-value="right">'+esc(p[1])+'</button></div>'}
function polarity(term,text){
 let pos=text.indexOf(term),sum=0;
 while(pos!==-1){const pre=text.slice(Math.max(0,pos-4),pos);sum+=/(不|反对|拒绝|切勿|避免|否定|并非|别)/.test(pre)?-1:1;pos=text.indexOf(term,pos+term.length)}
 return clamp(sum,-1,1);
}
function lexical(q,text){
 const [left,right]=K[q.axis]||[[],[]];let n=0,hit=0;
 for(const word of left){const v=polarity(word,text);if(v){n-=v;hit++}}
 for(const word of right){const v=polarity(word,text);if(v){n+=v;hit++}}
 return {v:hit?clamp(n/Math.min(3,hit),-1,1):0,hit};
}
function analyse(draft){
 let p=[0,0,0,0],g=[0,0,0,0,0,0],c=[50,50,50,50];
 let countsP=[0,0,0,0],countsG=[0,0,0,0,0,0],countsC=[0,0,0,0],evidence=[];
 const ans=draft.answers||{},ids=MODES[draft.mode].ids,doneW=[];
 for(const id of ids){
  const q=QUESTION_MAP.get(id),a=ans[id]||{},kind=q.group;
  if(kind==="wit"){doneW.push({q,correct:String(a.choice)===String(q.correct)});continue}
  const x=lexical(q,(a.text||"").slice(0,1800)),lean=a.lean==="left"?-1:a.lean==="right"?1:0;
  const aiValid=a.ai&&Number.isFinite(a.ai.value)&&a.ai.confidence>=.65&&Math.abs(a.ai.value)<=1&&typeof a.ai.quote==="string"&&(a.text||"").includes(a.ai.quote);
  const measured=aiValid?a.ai.value:((a.lean&&a.lean!=="neutral")?clamp(lean*.78+x.v*.22,-1,1):x.v);
  if(kind==="personality"){
   const idx=AXES.personality.findIndex(t=>t[0]===q.axis);if(idx>=0){p[idx]+=measured;countsP[idx]++}
  }else if(kind==="politics"){
   const idx=AXES.politics.findIndex(t=>t[0]===q.axis);if(idx>=0){g[idx]+=measured;countsG[idx]++}
  }else{
   const idx=AXES.camps.findIndex(t=>t[0]===q.axis);if(idx>=0){c[idx]+=(measured*28);countsC[idx]++}
  }
  if(x.hit||a.lean||aiValid){evidence.push({title:q.title,dimension:GROUPS[q.group],text:(a.text||"").slice(0,90),tag:a.lean||"",words:x.hit})}
 }
 p=p.map((n,i)=>countsP[i]?clamp(n/countsP[i],-1,1):0);
 g=g.map((n,i)=>countsG[i]?clamp(n/countsG[i],-1,1):0);
 c=c.map(n=>clamp(Math.round(n),0,100));
 const wit=Math.round(doneW.filter(w=>w.correct).length/Math.max(1,doneW.length)*100);
 return {p,g,c,wit,doneW,evidence,coverage:{p:countsP,g:countsG,c:countsC}};
}
function rank(score){
 const eligible=CHARACTERS.filter(x=>x.min<=score.wit&&!x.era.startsWith("架空"));
 const candidates=(eligible.length?eligible:CHARACTERS.filter(x=>x.min===0)).map(ch=>{
  const dp=ch.p.reduce((a,n,i)=>a+Math.abs(score.p[i]-n)/2,0)/4;
  const dg=ch.g.reduce((a,n,i)=>a+Math.abs(score.g[i]-n)/2,0)/6;
  const dc=ch.c.reduce((a,n,i)=>a+Math.abs(score.c[i]-n)/100,0)/4;
  const dw=Math.abs(score.wit-ch.skill)/100;
  const dist=dp*.30+dg*.30+dc*.25+dw*.15;
  return {...ch,dist,match:Math.round((1-dist)*100),parts:{personality:dp,politics:dg,camp:dc,wit:dw}};
 }).sort((a,b)=>a.dist-b.dist||a.name.localeCompare(b.name));
 return candidates;
}
function finalize(){
 const d=state.draft;if(!d)return;
 const score=analyse(d),candidates=rank(score);
 const rec={id:"juan-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),made:new Date().toISOString(),mode:d.mode,answers:d.answers,score,top:candidates.slice(0,4),aiConsent:!!d.aiConsent};
 state.records.unshift(rec);state.records=state.records.slice(0,30);state.showId=rec.id;state.draft=null;persist();navigate("result="+rec.id);
}
function coverageNote(s){
 const n=[...s.coverage.p,...s.coverage.g,...s.coverage.c].filter(v=>v>0).length,total=14;
 return n<8?'本局部分维度题目有限，结果存在明显的信息空白。':"四维计算基于本局证据，历史人物数值为游戏化推定。";
}
function bar(name,value,color=""){return '<div class="score-line"><span>'+esc(name)+'</span><span class="bar"><span class="bar-fill" style="display:block;width:'+clamp(value,0,100)+'%;'+color+'"></span></span><b>'+Math.round(value)+'</b></div>'}
function axisBlock(axis,v){const pct=Math.round((v+1)*50);return '<div class="axis-block"><div class="axis-labels"><span>'+esc(axis[1])+'</span><span>'+esc(axis[2])+'</span></div><div class="bar"><div class="bar-fill" style="width:'+pct+'%"></div></div></div>'}
function tierName(score){return score>=75?"天下执棋者":score>=55?"国之重臣":score>=30?"封疆与幕府":"市井与地方"}
function renderResult(){
 const id=page().split("=")[1]||state.showId,rec=state.records.find(r=>r.id===id)||state.records[0];
 if(!rec)return header("NO RECORD","卷宗尚未完成","请先参与一次测试。")+'<div style="text-align:center"><button class="btn primary" data-action="enter">开始测试</button></div>';
 const s=rec.score,cs=rank(s),first=cs[0],second=cs[1],gap=second?(second.match-first.match)*-1:99;
 const dimNames=[["禀性","personality"],["治世政略","politics"],["阵营共鸣","camp"],["智谋","wit"]];
 const dims=Object.entries(first.parts).sort((a,b)=>a[1]-b[1]);
 const good=dims.slice(0,2).map(([n])=>({personality:"处世禀性",politics:"政治取向",camp:"历史阵营共鸣",wit:"智谋表现"}[n]));
 const weak=dims.slice(-2).map(([n])=>({personality:"处世禀性",politics:"政治取向",camp:"历史阵营共鸣",wit:"智谋表现"}[n]));
 return '<section class="report-head"><div class="kicker" style="justify-content:center">YOUR HISTORICAL MIRROR</div><h1>乱世鉴书</h1><p class="subtle">经 '+MODES[rec.mode].title+'，史镜照见以下最近人影。</p></section>'+
 '<div class="report-banner">'+art("result.banner","scene")+'</div>'+
 '<article class="paper"><div class="card-frame-wrap">'+art("card.frame","scene")+'</div><div class="paper-content"><div class="main-match">'+art("character."+first.id,"portrait")+'<div><div class="small-label">最接近的历史人物 · '+esc(first.era)+'</div><h2 class="match-name">'+esc(first.name)+'</h2><div class="tagline">'+esc(first.tagline)+'</div><p class="muted">'+esc(first.reading)+'</p><div class="small-label">游戏相似指数 '+first.match+'/100（非概率）</div></div></div><div class="divider"></div><blockquote class="quote">“四镜所照，并非前身。你的选择在'+good.join("、")+'方面与此人较近，但'+weak.join("、")+'也存在不可忽略的差别。”</blockquote><p class="status">'+(first.match<72?"相对最接近，但差异明显。":"在当前人物库中具有较强的相对贴近度。")+(gap<=2?" 第一与第二候选极为接近，排序并不稳固。":"")+'</p><p class="muted" style="font-size:12px">'+coverageNote(s)+'</p></div></article>'+
 '<section class="section report-grid"><div class="paper"><div class="paper-content"><h3>壹 · 处世禀性</h3><p class="muted">四组独立的思考与处事偏好，不代表身份或族群。</p>'+AXES.personality.map((a,i)=>axisBlock(a,s.p[i])).join("")+'</div></div>'+
 '<div class="paper"><div class="paper-content"><h3>贰 · 治世政略</h3><p class="muted">政治主张与历史阵营各自计算。</p>'+AXES.politics.map((a,i)=>axisBlock(a,s.g[i])).join("")+'</div></div>'+
 '<div class="paper"><div class="paper-content"><h3>叁 · 四大阵营共鸣</h3><p class="muted">“血”仅为亚文化式娱乐命名，不是民族血统或现实身份测定。四项互不要求合计100。</p>'+AXES.camps.map((a,i)=>bar(a[1],s.c[i])).join("")+'</div></div>'+
 '<div class="paper"><div class="paper-content"><h3>肆 · 智谋试炼</h3><p class="muted">只按有标准答案的谋略与计算题计分；政治态度不判对错。</p><p class="match-name">'+s.wit+' <small style="font-size:17px">/100</small></p><div class="pill-row"><span class="pill">已解锁：'+tierName(s.wit)+'</span><span class="pill">人物池：'+cs.length+' 位</span></div>'+s.doneW.map(o=>'<p class="muted" style="margin:8px 0;font-size:12px">'+(o.correct?"✓":"×")+' '+esc(o.q.title)+' · '+esc(o.q.explain)+'</p>').join("")+'</div></div></section>'+
 '<section class="section"><h2 class="section-title">次近镜像</h2><div class="paper"><div class="paper-content">'+cs.slice(1,4).map(ch=>'<div class="candidate">'+art("character."+ch.id,"portrait")+'<div><strong>'+esc(ch.name)+'</strong><small>'+esc(ch.era)+' · '+esc(ch.tagline)+'</small></div><span class="small-label">'+ch.match+'/100</span></div>').join("")+'<p class="muted">人物数量与游戏化推定会影响距离排名，不能当作历史人物的真实性格测定。</p></div></div></section>'+
 '<div class="result-actions"><button class="btn primary" data-action="share" data-id="'+esc(rec.id)+'">分享本卷摘要</button><button class="btn" data-action="retest">再入乱世</button><a class="btn" href="#archive">我的卷宗</a></div>';
}
function archive(){
 if(!state.records.length)return header("PERSONAL ARCHIVE","我的卷宗","所有记录只存放于本机浏览器。")+'<div class="archive-empty"><div class="ornament">◇　◇　◇</div><h2 class="serif">卷帙尚空</h2><p class="subtle">一次历史抉择，会留下第一份私人的乱世鉴书。</p><button class="btn primary" data-action="enter">启封入卷</button></div>';
 return header("PERSONAL ARCHIVE","我的卷宗","仅在本机保存，清理浏览器数据可能使记录消失。")+
 state.records.map(r=>{const top=rank(r.score)[0];return '<div class="archive-row"><div><strong>'+esc(top.name)+'</strong><small>'+new Date(r.made).toLocaleString("zh-CN")+' · '+MODES[r.mode].title+' · 智谋 '+r.score.wit+'/100</small></div><div class="actions"><button class="btn small" data-action="open-record" data-id="'+esc(r.id)+'">阅卷</button><button class="btn small" data-action="delete-record" data-id="'+esc(r.id)+'">删卷</button></div></div>'}).join("")+
 '<div style="text-align:center;margin:25px"><button class="btn small" data-action="clear-records">清空本机卷宗</button></div>';
}
function about(){
 return header("ABOUT THE CHRONICLE","测试规则与美术槽位","一面不测血统、不测智商的历史镜子。")+
 '<section class="paper readable"><div class="paper-content"><h2>四维最近邻拟合</h2><p>人格四轴、政治六轴、四项历史阵营共鸣以及智谋表现彼此独立。智谋先决定有资格进入的人物层级，然后计算全部可用历史人物的四维距离，选择最近者和三个次近者。没有足够接近的人物时仍返回“相对最接近”，但明确提示差异。</p><p>人物的个性与政治属性是为互动游戏所作的解释性推定，并非真实心理学测量或史学定论。题目包含架空反事实。政治意见不打对错分；只有有标准答案的智谋试题计分。</p><h2>开放文本与可选改写</h2><p>默认使用离线词库和辅助倾向标记；只有安全服务端启用且游客事先主动勾选，才将自由文本发送到 DeepSeek。服务器或网络故障则保留离线结果。题目个性化只在游客先前回答包含准确原文句柄、后续题又有安全的白名单同义槽位时替换措辞。没有可靠句柄时原题一字不改；不额外插题、不使用其他游客原文、不改变评分规则或智谋题答案。</p><h2>历史与文化声明</h2><p>血汉值、血满值、血回值、血蒙值是中文历史亚文化风格的游戏化命名，仅描述对题设中的历史政治文化取向的共鸣。它们不代表现实民族、血统、遗传、宗教归属、智力或人格优劣。明清之际政治联盟具有复杂性，不能把一个朝代与某个族群直接等同。</p><h2>美术升级：图形 → 图片 → GIF</h2><div class="about-slot-grid">'+[["home.hero","hero","首屏主视觉"],["home.background","scene","全站背景"],["question.default","scene","题目插画"],["character.default","portrait","人物卡片"],["result.banner","scene","结果背景"],["icon.scroll","icon","图标系统"],["card.frame","scene","卡框纹章"]].map(([key,type,cn])=>'<div>'+art(key,type)+'<div class="slot-label">'+key+'</div><small class="muted">'+cn+'</small></div>').join("")+'</div><p>所有槽位具有稳定 ID。美术作品放在本目录 assets/，修改 media.js 内同名槽的 mode（graphic / image / gif）和 src 路径即可。未提供的题目或人物专属素材自动回退默认图形。建议静态插画以 WebP 优先；短循环可以用 GIF，性能要求高时后续支持 WebM。</p><p class="muted">此站 GitHub Pages 免费静态托管，不能在前端暴露真实 AI API 密钥。后续接 AI 应经独立服务端代理，访问规则可单独验证。</p></div></section>';
}
function render(){
 const route=page().split("=")[0];document.querySelectorAll("[data-nav]").forEach(n=>n.classList.toggle("active",n.dataset.nav===route));
 let html=route==="home"?intro():route==="setup"?setup():route==="quiz"?quiz():route==="result"?renderResult():route==="archive"?archive():route==="about"?about():intro();
 root.innerHTML=html;
}
document.addEventListener("click",async e=>{
 const b=e.target.closest("[data-action]");if(!b||b.disabled)return;
 const action=b.dataset.action,id=b.dataset.id;
 if(action==="enter"||action==="retest"){navigate("setup");return}
 if(action==="start"){start(b.dataset.mode);return}
 if(action==="continue"){navigate("quiz");return}
 if(action==="leave"){persist();navigate("home");toast("草稿已保存在本机");return}
 if(action==="previous"){if(state.draft){state.draft.step=Math.max(0,state.draft.step-1);persist();render()}return}
 if(action==="lean"){const q=currentQuestion(),a=qAnswer(q);state.draft.answers[q.id]={...a,lean:b.dataset.value};persist();render();return}
 if(action==="choice"){const q=currentQuestion(),a=qAnswer(q);state.draft.answers[q.id]={...a,choice:b.dataset.value};persist();render();return}
 if(action==="next"){
  if(!state.draft)return;
  const q=currentQuestion(),a=qAnswer(q);
  if(q.group==="wit"&&(a.choice==null||a.choice==="")){toast("先选择一项答案");return}
  if(q.group!=="wit"&&(a.text||"").trim().length<3&&!a.lean){toast("请写下自己的看法，或选择辅助倾向");return}
  if(submitBusy)return;
  submitBusy=true;
  const draft=state.draft;
  try {
   if(draft.aiConsent&&aiEnabled&&q.group!=="wit"&&(a.text||"").trim().length>=3&&!a.ai){
    toast("DeepSeek 正在分析奏对…");
    const result=await analyzeAnswer(q,a.text);
    if(result&&state.draft===draft){draft.answers[q.id]={...draft.answers[q.id],ai:result};persist()}
   }
   if(state.draft!==draft)return;
   if(draft.step>=currentIds().length-1)finalize();
   else{
    draft.step++;
    const next=currentQuestion();
    if(draft.aiConsent&&aiEnabled&&next?.rewrites?.length&&!draft.rewriteCache?.[next.id]){
     const prior=currentIds().slice(0,draft.step).map(id=>draft.answers[id]?.text||"").filter(Boolean);
     if(next.rewrites.some(r=>prior.filter(t=>t.includes(r.handle)).length===1)){
      const proposal=await rewriteQuestion(next,prior);
      if(state.draft!==draft)return;
      if(proposal)draft.rewriteCache[next.id]=proposal;
     }
    }
    persist();render();window.scrollTo({top:0,behavior:"smooth"});
   }
  }finally{submitBusy=false}
  return;
 }
 if(action==="open-record"){state.showId=id;navigate("result="+id);return}
 if(action==="delete-record"){if(confirm("确定删除这份本机卷宗？")){state.records=state.records.filter(r=>r.id!==id);persist();render();toast("已删除")};return}
 if(action==="clear-records"){if(confirm("清空所有本机卷宗？此操作不可恢复。")){state.records=[];persist();render()}return}
 if(action==="share"){
  const r=state.records.find(x=>x.id===id),ch=r&&rank(r.score)[0];if(!r||!ch)return;
  const message="《明清人物镜》我的最近历史镜像："+ch.name+"（游戏相似指数 "+ch.match+"/100），智谋 "+r.score.wit+"/100。此为架空历史娱乐测试，不是诊断。";
  try{if(navigator.share)await navigator.share({title:"明清人物镜",text:message,url:location.href});else if(navigator.clipboard){await navigator.clipboard.writeText(message+" "+location.href);toast("摘要已复制")};}catch(e){if(e.name!=="AbortError")toast("分享未成功，可手动复制网址")}return;
 }
});
document.addEventListener("input",e=>{if(e.target.id==="answer"&&state.draft){const q=currentQuestion(),a=qAnswer(q);state.draft.answers[q.id]={...a,text:e.target.value};persist()}});
window.addEventListener("hashchange",()=>{render();window.scrollTo({top:0,behavior:"instant"})});
render();
export {analyse,rank,safeRewrite};
