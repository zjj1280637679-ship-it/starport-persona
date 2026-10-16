import {art} from "../media.js";
import {CHARACTERS} from "../data.js";
import {aiEnabled,storyTurn} from "../ai-client.js";
const KEY="jiashen-session-v1",BOOK="jiashen-collection-v1";
const root=document.querySelector("#app");
const E=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const get=(key,def)=>{try{return JSON.parse(localStorage.getItem(key))??def}catch{return def}};
const cap=(n,a=0,b=99)=>Math.min(b,Math.max(a,n));
let world=null,session=get(KEY,null),book=get(BOOK,{cards:[],achievements:[],endings:[]}),selected=null,modal=false,replying=false;
const STAGES=[
 {day:1,npc:"死者内侍",intro:"门外站着死去二十年的内侍，他送来一封未来诏书。它写出明天你将做的选择。",choices:[
  ["读诏","核查未来诏书的落款","先核查证据","opened_edict","future-edict",1,0,5,["ei:-1","sn:1","method:-1"]],
  ["藏诏","暂且保护送信者","我不会泄露密诏","kept_edict_secret","future-edict",0,1,4,["ei:-1","tf:-1","autonomy:1"]],
  ["焚诏","拒绝被命运预言所操纵","我把密诏焚毁","opened_edict","future-edict",2,0,5,["jp:1","reform:1","autonomy:1"]]
 ]},
 {day:2,npc:"纸人侍者",intro:"烧剩的诏书化成一个受旧誓束缚的纸人，他能通过任何城门，但仍记得一个死人主人的命令。",choices:[
  ["结约","允许纸人保留旧誓","我与纸人结盟","paper_servant_met","paper-servant",0,1,6,["ei:1","diplomacy:1"]],
  ["问誓","调查纸人旧主是谁","我追问旧契约的来历","paper_servant_met","old-copper-key",1,0,8,["sn:1","tf:1"]],
  ["释身","允许纸人获得自由","我不将它当作奴仆","paper_servant_met","",0,2,4,["autonomy:1","tf:-1"]]
 ]},
 {day:3,npc:"流亡炼丹师",intro:"旧巷的炼丹师带来红砂丹。它可让死者再活七夜，但归来者并不受你控制。",choices:[
  ["救死","借亡者之口寻找真相","我决定让一名亡者还魂","revived_dead","",1,1,7,["tf:-1","reform:1"]],
  ["藏药","将还魂丹留到必要之时","我将丹药保存起来","revival_alchemy_found","revival-pellet",0,0,7,["jp:-1","sn:1"]],
  ["换粮","以奇物换取乱世资源","我用丹药换粮食","revival_alchemy_found","sealed-account",0,0,4,["economy:1","method:1"]]
 ]},
 {day:5,npc:"渡河术士",intro:"逆史星图浮现一条可能的未来。你越是试图改变它，地图上就越会出现不该有的空白。",choices:[
  ["藏图","收下星图先研究规律","我先保留星图","star_map_found","inverse-star-map",0,0,8,["sn:1","jp:-1"]],
  ["改史","冒着反噬的风险改写灾祸","我尝试改变预言","altered_forecast","inverse-star-map",2,1,9,["reform:1","jp:1"]],
  ["封图","拒绝接受命运的控制","我选择封印星图","star_map_found","river-ferry-token",0,0,5,["tf:-1","autonomy:1"]]
 ]},
 {day:7,npc:"江南客商",intro:"渡口百姓等粮，旧朝遗臣求证，关外使者愿意订盟。你这一夜只能够亲自处理一件事。",choices:[
  ["救渡口","舍弃异宝优先保护生命","我先救下渡口百姓","rescued_many","",0,2,7,["tf:-1","autonomy:1","han:1"]],
  ["结双盟","同时争取两方使者的信任","我要化解敌意维持双约","two_pacts_kept","guest-pass",1,1,10,["diplomacy:1","man:1","meng:1"]],
  ["查暗账","先追查失踪的军粮证据","我要找出粮饷暗账","preserved_testimony","sealed-account",2,0,10,["tf:1","han:1","sn:1"]]
 ]},
 {day:10,npc:"无头传诏使",intro:"新发现的诏书原稿竟与你的笔迹毫无差别。你终于知道，书写未来的可能是你自己。",choices:[
  ["承认","承受命运作者的责任","我接受自己可能写下诏书","recognized_own_hand","blood-ink-brush",0,1,9,["sn:1","jp:-1"]],
  ["撕破","拒绝只有一种未来","我决定打破已写下的命数","recognized_own_hand","",1,1,8,["jp:1","reform:1"]],
  ["隐名","仅留下可以核对的证据","我留下证据却不留名","recognized_own_hand","sealed-account",0,1,6,["ei:-1","tf:-1"]]
 ]},
 {day:14,npc:"旧史官",intro:"最后一夜，城门将闭。你不可能同时携走所有人、所有真相与全部异宝。最后一页必须由你自己选择。",choices:[
  ["携人离去","优先救人而非个人名誉","我带着能走的人离开","survived_fourteenth_night","",0,2,9,["tf:-1","autonomy:1","han:1"],"preserve-lives"],
  ["护史而留","保住证据让后世知晓","我留下真相不求后世记名","survived_fourteenth_night","",1,0,10,["sn:1","tf:1","han:1"],"preserve-history"],
  ["弃世归山","放下奇物从此不争天下","我走入群山不再回首","survived_fourteenth_night","",0,0,7,["ei:-1","autonomy:1"],"vanish"]
 ]}
];
function make(){return{step:0,day:1,resources:{coins:3,trust:1,suspicion:0},inventory:["future-edict"],charges:{},flags:[],evidence:[],log:[{who:"旧档馆的守夜人",text:STAGES[0].intro,role:"npc"}],ended:null,aiConsent:false,aiCalls:0,pendingSuggestion:null}};
function store(){try{localStorage.setItem(KEY,JSON.stringify(session));localStorage.setItem(BOOK,JSON.stringify(book))}catch{}}
function msg(who,text,role="npc"){session.log.push({who,text,role});session.log=session.log.slice(-70)}
function flag(id){if(!session.flags.includes(id))session.flags.push(id)}
function add(id){if(!id)return;if(!world.cards.find(c=>c.id===id))return;if(!session.inventory.includes(id))session.inventory.push(id);if(!book.cards.includes(id))book.cards.push(id)}
function rewards(){const newOnes=[];for(const a of world.achievements){if(session.flags.includes(a.condition.flag)&&!book.achievements.includes(a.id)){book.achievements.push(a.id);newOnes.push(a.title)}}return newOnes}
function toast(text){const n=document.querySelector("#toast");n.textContent=text;n.classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.classList.remove("visible"),2600)}
function start(){const accepted=aiEnabled&&!!(document.querySelector("#opt-ai")?.checked||session?.aiConsent);session=make();session.aiConsent=accepted;selected=null;add("future-edict");store();draw()}
function choose(i){
 if(!session||session.ended)return;
 const stage=STAGES[session.step],o=stage.choices[i];if(!o)return;session.pendingSuggestion=null;
 msg("你",o[2],"player");
 flag(o[3]);add(o[4]);
 session.resources.suspicion=cap(session.resources.suspicion+o[5]);session.resources.trust=cap(session.resources.trust+o[6]);
 if(o[0]==="换粮")session.resources.coins+=3;
 if(o[0]==="救渡口"){
   session.resources.coins=cap(session.resources.coins-2);
   const sacrificed=session.inventory.find(id=>world.cards.find(card=>card.id===id)?.type==="treasure");
   if(sacrificed){session.inventory=session.inventory.filter(x=>x!==sacrificed);flag("sacrificed_treasure")}
 }
 if(o[0]==="结双盟")session.resources.coins+=1;
 if(o[0]==="救渡口"||o[0]==="携人离去")flag("rescued_many");
 if(o[0]==="查暗账"||o[0]==="护史而留")flag("preserved_testimony");
 if(o[0]==="改史")flag("altered_forecast");
 if(o[0]==="读诏"||o[0]==="焚诏"||o[0]==="藏诏")flag("opened_edict");
 msg(stage.npc,["你听见隐秘的脚步远去。旧日的因果已经被改写，而你的抉择不能撤回。","命运不会立刻给出答案，但有人正在记下你的名字。","这场交易改变的不只是账目，也改变了下一夜谁还会信任你。"][i]);
 session.evidence.push({chapter:session.step,choice:o[0],reason:o[2],traits:o[8],insight:o[7]});
 const ending=o[9];
 if(ending){session.ended=ending;if(!book.endings.includes(ending))book.endings.push(ending)}
 else{session.step++;session.day=STAGES[session.step].day;msg(STAGES[session.step].npc,STAGES[session.step].intro)}
 const unlocked=rewards();store();draw();if(unlocked.length)toast("新成就："+unlocked.join("、"));
}
function useCard(id){
 if(!session||session.ended||!session.inventory.includes(id))return;
 const c=world.cards.find(x=>x.id===id);if(!c)return;
 if(id==="revival-pellet"){flag("revived_dead");session.inventory=session.inventory.filter(x=>x!==id);msg("归来的亡者","死人张开双眼：我有自己的心愿，请别把复生当成命令。")}
 else if(id==="inverse-star-map"){const n=session.charges[id]??2;if(n<=0)return toast("星图次数已经用尽");session.charges[id]=n-1;flag("altered_forecast");session.resources.suspicion=cap(session.resources.suspicion+1);msg("星图","纸上露出某条未来的边缘，远处有一处地名在墨迹中消失。")}
 else if(id==="paper-servant"){if(session.usedDay===session.day)return toast("纸人今天已出动过");session.usedDay=session.day;session.resources.suspicion=cap(session.resources.suspicion-1);msg("纸人","纸人穿过城门送回消息，却不能违背旧主人留下的禁令。")}
 else{msg("藏书鉴定",c.description)}
 const unlocked=rewards();store();draw();if(unlocked.length)toast("新成就："+unlocked.join("、"));
}
async function talk(input){
 const t=String(input||"").trim().slice(0,700);if(!t)return toast("先写下要说的话");if(!session||session.ended)return;
 msg("你",t,"player");
 const oldStep=session.step,ref=session;
 if(session.aiConsent&&aiEnabled&&(session.aiCalls||0)<18){
  replying=true;session.aiCalls=(session.aiCalls||0)+1;store();toast("AI 酒馆正在回应…");
  const s=STAGES[oldStep];
  let out=null;
  try{
   out=await storyTurn({storyId:world.id,sceneId:["dead-letter","paper-ghost","scarlet-medicine","future-map","crossroads","handwriting","ending"][oldStep],day:session.day,scene:s.intro,choices:s.choices.map(o=>o[0]),transcript:session.log.slice(-12).map(x=>({role:x.role,text:x.text})),playerInput:t});
  }catch{}
  replying=false;
  if(session!==ref||session.step!==oldStep)return;
  if(out?.reply){
   msg("DeepSeek · 酒馆主持人",out.reply,"ai");
   if(out.suggestedIndex!==null)session.pendingSuggestion=out.suggestedIndex;
   store();draw();return;
  }
  toast("AI 主持暂不可用，已自动回退本地酒馆");
 }
 let answer="酒馆掌柜轻轻点头：你的话已记入卷宗。若要真正改变命运，还请选一项可以执行的行动。";
 if(/死人|死者|复活|还魂/.test(t))answer="掌柜答道：还魂七夜未必能消一生旧债，死人也不必服从活人。";
 else if(/宝物|奇物|诏书|纸人|契约/.test(t))answer="掌柜指向手牌：奇物有用途，也有边界。没有任何力量是白送的。";
 else if(/朝廷|天下|皇帝|权力|百姓/.test(t))answer="掌柜叹道：权力可以改写诏书，却未必能填满普通人的粮仓。";
 msg("掌柜 · 离线演示",answer,"local");store();draw();
}
function fit(){
 const p=[0,0,0,0],g=Array(6).fill(0),c=Array(4).fill(50);const keysP=["ei","sn","tf","jp"],keysG=["power","reform","method","autonomy","economy","diplomacy"],keysC=["han","man","hui","meng"];
 let insight=0;
 for(const entry of session.evidence){insight+=entry.insight;for(const item of entry.traits){const [id,v]=item.split(":");const sign=Number(v);let idx=keysP.indexOf(id);if(idx>=0)p[idx]+=sign*.26;idx=keysG.indexOf(id);if(idx>=0)g[idx]+=sign*.3;idx=keysC.indexOf(id);if(idx>=0)c[idx]+=sign*13}}
 const wit=Math.min(100,Math.round(insight*.9));
 const list=CHARACTERS.filter(x=>!x.era.startsWith("架空")&&x.min<=wit).map(ch=>{
  const a=p.reduce((s,x,i)=>s+Math.abs(x-ch.p[i])/2,0)/4,b=g.reduce((s,x,i)=>s+Math.abs(x-ch.g[i])/2,0)/6,d=c.reduce((s,x,i)=>s+Math.abs(x-ch.c[i])/100,0)/4;
  return{...ch,dist:a*.33+b*.32+d*.25+Math.abs(ch.skill-wit)/100*.10}
 }).sort((a,b)=>a.dist-b.dist);
 return{wit,people:list.slice(0,3)};
}
function artSlot(k,kind="scene"){return art(k,kind)}
function button(label,action,extra=""){return '<button class="button '+extra+'" '+action+'>'+E(label)+'</button>'}
function gallery(){return world.achievements.map(a=>{const earned=book.achievements.includes(a.id);return'<div class="ach '+(earned?"":"locked")+'"><span class="symbol">'+(earned?"✧":"◇")+'</span>'+E(earned?a.title:a.hidden?"？？？":a.title)+'<small>'+(earned?"已解锁":"未发现")+'</small></div>'}).join("")}
function cards(){return session.inventory.map(id=>{const c=world.cards.find(x=>x.id===id);if(!c)return"";return'<button class="treasure '+(selected===id?"selected":"")+'" data-card="'+E(id)+'"><span class="rarity">'+E({common:"凡品",uncommon:"常品",rare:"珍稀",epic:"异宝",forbidden:"禁忌"}[c.rarity])+'</span>'+artSlot(c.artSlot,"portrait")+'<b>'+E(c.title)+'</b><small>'+E(c.type)+'</small></button>'}).join("")}
function intro(){
 return '<section class="grid-home"><div><div class="kicker">MING CHRONICLE · ORIGINAL HISTORICAL FANTASY</div><h1 class="hero-title">甲申异闻录<br>死者的诏书</h1><p class="lead">京师雨夜，死去二十年的内侍递来一封写着你未来抉择的诏书。你有十四夜寻找真相，在宝物、盟友、因果与历史之间决定自己的命运。</p><div class="pills"><span>7幕剧情</span><span>12张奇物卡</span><span>8项成就</span><span>多结局</span></div>'+button("启封第一夜 →","data-start")+button("查看收藏","data-album","secondary")+'<p class="caption">M0 试玩：卡牌、成就、结局真实运行。可尝试 AI 主持，但服务端尚需单独启用；故障将自动退回本地。旧测试版不受影响。</p>'+(aiEnabled?'<label class="ai-consent" style="display:block;margin:10px 0;color:#e5c49d;font-size:12px"><input type="checkbox" id="opt-ai"/> 尝试 DeepSeek AI 主持（主动同意发送最近12条对话和新发言至模型；可能产生模型费用；默认关闭）</label>':'')+'<div class="grid-meta"><div class="meta"><strong>14夜</strong><small>故事期限</small></div><div class="meta"><strong>12张</strong><small>宝物与情报</small></div><div class="meta"><strong>3条</strong><small>基础终局</small></div></div></div><div class="intro-art">'+artSlot("scene.archive-night")+'</div></section>';
}
function endView(){
 const ending=world.endings.find(x=>x.id===session.ended),r=fit(),person=r.people[0],others=r.people.slice(1).map(x=>x.name).join("、");
 return '<section class="result-card"><div class="result-art">'+artSlot(ending?.artSlot||"ending.ink-history")+'</div><div class="kicker" style="color:#7c543b">CHRONICLE SEALED</div><h2>'+E(ending?.name||"无名终局")+'</h2><p>第十四夜已过。密诏、还魂丹与旧誓在你的选择下走向了另一个世界。</p><div class="rule-line"></div><h3>史官的文学化镜像：'+E(person?.name||"无名之人")+'</h3><p>你的七幕抉择在现有角色库中，相对更接近 <b>'+E(person?.name||"无名之人")+'</b>。这只是游戏化近似，不是人格科学，也不推断现实族群、血统或智力。</p><p class="subtext">次近人物：'+E(others||"尚无")+'。本局完成 '+session.evidence.length+' 个主要抉择，解锁 '+book.achievements.length+' / '+world.achievements.length+' 项成就。</p><div class="inset">此局智谋仅指故事策略行动的推定表现，约 '+r.wit+' /100，不等于现实IQ。收藏随再次游玩保留；原始决策日志可自行导出。</div><div class="next-steps">'+button("重新开始","data-reset")+button("收藏图鉴","data-album","secondary")+button("导出卷宗","data-export","ghost")+'</div></section>';
}
function gameView(){
 const scene=STAGES[session.step],n=session.resources;
 return '<div class="game"><div class="scene-col"><div class="scene-visual">'+artSlot(world.milestones[session.step].artSlot)+'<div class="overlay"><div class="kicker">DAY '+session.day+' · '+E(scene.npc)+'</div><h2>'+E(world.milestones[session.step].title)+'</h2><p>卷宗 '+(session.step+1)+' / 7 · 你有权拒绝命运</p></div></div><div class="section"><h3>命数事件</h3><p class="narrative">'+E(scene.intro)+'</p></div><div class="section"><h3>酒馆交谈 · 卷宗日志</h3><div class="chatlog" id="chatlog">'+session.log.slice(-12).map(l=>'<div class="chat '+(l.role==="player"?"player":l.role==="local"?"local":"ai")+'"><small>'+E(l.who)+'</small><p>'+E(l.text)+'</p></div>').join("")+'</div><div class="input-row"><textarea id="talkbox" maxlength="700" placeholder="自由发言、询问、提出想法…"></textarea>'+button("对话","data-talk","secondary")+'</div><p class="caption">'+(session.aiConsent?"本局已选择尝试 DeepSeek AI 主持；服务端尚未启用时会回退本地。":"本局为本地模拟主持，对话不发送给模型。")+' 资源、卡牌和成就只能经游戏规则程序改变。</p>'+(session.pendingSuggestion!==null&&Number.isInteger(session.pendingSuggestion)?'<div class="inset"><p>AI 建议按当前规则执行：<strong>'+E(scene.choices[session.pendingSuggestion]?.[0]||"")+'</strong></p>'+button("确认执行该行动","data-follow-ai","small")+'</div>':'')+'</div><div class="section"><h3>当前可执行的行动</h3><div class="action-list">'+scene.choices.map((o,i)=>'<button class="action" data-choice="'+i+'"><b>'+E(o[0])+'</b><small>'+E(o[1])+'</small></button>').join("")+'</div></div></div><aside class="side"><div class="sidebar-block"><h3 class="side-title">命数账本</h3><div class="stats">'+[["夜数",session.day+"/14"],["钱粮",n.coins],["信义",n.trust],["疑罪",n.suspicion]].map(x=>'<div class="stat"><strong>'+E(x[1])+'</strong><small>'+E(x[0])+'</small></div>').join("")+'</div><p class="caption">卡牌与资源由规则程序管理，不让AI凭空修改。</p></div><div class="sidebar-block"><h3 class="side-title">藏品手牌 · '+session.inventory.length+'</h3><div class="hand">'+cards()+'</div>'+(selected?renderCardDetail():"")+'</div><div class="sidebar-block"><h3 class="side-title">成就图鉴 · '+book.achievements.length+' / '+world.achievements.length+'</h3><div class="ach-list">'+gallery()+'</div>'+button("查看完整图鉴","data-album","ghost small")+'</div></aside></div>';
}
function renderCardDetail(){const c=world.cards.find(x=>x.id===selected);if(!c)return"";return'<div class="card-detail"><strong>'+E(c.title)+'</strong><p>'+E(c.description)+'</p><p>限制：'+E(c.restrictions.join("；")||"无")+'</p>'+button("调查 / 使用","data-use","small")+'</div>'}
function bookView(){return'<div class="collection-modal"><div class="collection-inner"><button class="subtle-button exit" data-close>关闭 ✕</button><div class="kicker">COLLECTORS ARCHIVE</div><h2>异闻图鉴</h2><p class="caption">收藏保存在本机浏览器，可以跨周目解锁。</p><h3>卡牌：'+book.cards.length+' / '+world.cards.length+'</h3><div class="collection-grid">'+world.cards.map(c=>'<div class="treasure '+(book.cards.includes(c.id)?"":"ach locked")+'">'+artSlot(c.artSlot,"portrait")+'<b>'+E(book.cards.includes(c.id)?c.title:"未知奇物")+'</b></div>').join("")+'</div><h3>成就：'+book.achievements.length+' / '+world.achievements.length+'</h3><div class="ach-list">'+gallery()+'</div><h3>结局：'+book.endings.length+' / '+world.endings.length+'</h3><div class="ach-list">'+world.endings.map(e=>'<div class="ach '+(book.endings.includes(e.id)?"":"locked")+'">◈ '+E(book.endings.includes(e.id)?e.name:"未达成")+'</div>').join("")+'</div></div></div>'}
function draw(){if(!world)return;root.innerHTML=!session?intro():session.ended?endView():gameView();document.querySelector(".collection-modal")?.remove();if(modal)document.body.insertAdjacentHTML("beforeend",bookView());if(session&&!session.ended)setTimeout(()=>{const n=document.querySelector("#chatlog");if(n)n.scrollTop=n.scrollHeight},0)}
function exportData(){if(!session)return;const blob=new Blob([JSON.stringify({storyId:world.id,session},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="jiashen-chronicle.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.addEventListener("click",ev=>{
 const b=ev.target.closest("button");if(!b)return;
 if(b.hasAttribute("data-start"))start();
 else if(b.hasAttribute("data-choice"))choose(Number(b.dataset.choice));
 else if(b.hasAttribute("data-card")){selected=b.dataset.card;draw()}
 else if(b.hasAttribute("data-use"))useCard(selected);
 else if(b.hasAttribute("data-talk"))talk(document.querySelector("#talkbox")?.value);
 else if(b.hasAttribute("data-follow-ai")&&session?.pendingSuggestion!==null)choose(session.pendingSuggestion);
 else if(b.hasAttribute("data-album")){modal=true;draw()}
 else if(b.hasAttribute("data-close")){modal=false;draw()}
 else if(b.hasAttribute("data-export"))exportData();
 else if(b.id==="reset"||b.hasAttribute("data-reset")){if(confirm("重开本局？收藏会保留，本局进度会重置。"))start()}
});
document.addEventListener("keydown",ev=>{if(ev.target?.id==="talkbox"&&(ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();talk(ev.target.value)}});
(async()=>{try{const r=await fetch("./story-pack.json",{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status);world=await r.json();if(!Array.isArray(world.cards)||!Array.isArray(world.achievements))throw Error("invalid game pack");if(session&&(!Array.isArray(session.inventory)||!Number.isInteger(session.step)||session.step<0||session.step>6))session=null;draw()}catch(e){root.textContent="故事包载入失败，请刷新页面重试："+e.message}})();
