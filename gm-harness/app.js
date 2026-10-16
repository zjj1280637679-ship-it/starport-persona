import {AI_CONFIG} from "../mingqing-mirror/ai-config.js";

const KEY="gm-harness:session-v1";
const BASE=String(AI_CONFIG.endpoint||"").replace(/\/$/,"");
const SITE_KEY=String(AI_CONFIG.turnstileSiteKey||"");
const $=id=>document.getElementById(id);
const esc=t=>String(t??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const freshWorld=()=>({
 location:"京师",tier:"low",player:{actualIdentity:"流亡书吏",presentedIdentity:"流亡书吏"},
 regions:{},npcs:{},cards:{},facts:[],chronicle:[]
});
const introMessage=()=>({who:"intro",text:"甲申年，京师风雨未歇。你立在一间旧档馆的门廊下，腰间没有官印，手里只有空白卷宗。\n这里没有固定选项。你可以询问路人、潜入衙门、离开京师，甚至另起一场故事。\n你打算怎么做？"});
function newSession(){return{world:freshWorld(),messages:[introMessage()]}}
function readSession(){try{
 const s=JSON.parse(localStorage.getItem(KEY)||"null");
 if(s&&Array.isArray(s.messages)&&s.world&&typeof s.world==="object"&&typeof s.world.location==="string"
 &&s.messages.length<=100)return s;
 }catch{}
 return newSession();
}
let session=readSession(),books={overview:"",books:{}},apiReady=false,busy=false,turnstilePromise=null;
const tierLabel={low:"底层 / 新人",middle:"中层",high:"高层"};
const stateText=x=>typeof x==="string"?x:typeof x==="number"?String(x):JSON.stringify(x);
function save(){try{localStorage.setItem(KEY,JSON.stringify(session))}catch{showAlert("浏览器存储已满，建议先导出卷宗。")}}
function showAlert(text){$("alert").textContent=text}
function updateStatus(){const send=$("send");
 send.disabled=busy||!apiReady||!$("consent").checked||!$("prompt").value.trim();
 $("status").textContent=busy?"GM 正在构思…":!apiReady?"GM API 未开放":!$("consent").checked?"勾选同意即可使用 API":"准备好后发送行动";
}
function render(){
 const w=session.world||freshWorld();
 const stats=[
  ["所在地区",w.location||"未知"],["社会接触层级",tierLabel[w.tier]||w.tier||"未知"],
  ["实际身份",w.player?.actualIdentity||"未知"],["展示身份",w.player?.presentedIdentity||"未知"]
 ];
 $("stat").innerHTML=stats.map(([a,b])=>"<div><span>"+esc(a)+"</span><strong>"+esc(b)+"</strong></div>").join("");
 const allCards=Object.entries(w.cards||{}).slice(0,18);
 $("count").textContent=String(Object.keys(w.cards||{}).length);
 $("cards").innerHTML=allCards.length?allCards.map(([id,c])=>
  '<div class="item" title="'+esc(c?.description||id)+'"><b>'+esc(c?.title||id)+'</b><p>'+esc((c?.description||"新发现的事物").slice(0,90))+"</p></div>").join("")
  :'<div class="empty">尚无卡牌。GM 可以因你的行动创造新的物品与盟约。</div>';
 $("facts").innerHTML=(w.facts||[]).slice(-10).map(v=>"<li>"+esc(stateText(v)).slice(0,250)+"</li>").join("")||"<li>故事刚刚开始。</li>";
 $("chapter-title").textContent=(w.location||"未知")+" · "+(tierLabel[w.tier]||"新天地");
 const latestBook=books.books?.[w.location+"/"+w.tier];
 $("chapter-lead").textContent=latestBook||"这里的社会与故事尚未被预写。GM 可以随你的行动创造新的环境。";
 $("transcript").innerHTML=session.messages.slice(-70).map(m=>{
  const who=m.who==="player"?"你":m.who==="intro"?"开场背景 · 预置文本":"AI GM · DeepSeek";
  const role=m.who==="player"?"player":"gm";
  return '<article class="bubble '+role+'"><div class="who">'+esc(who)+'</div><p>'+esc(m.text)+'</p>'+
    (m.changes?.length?'<div class="changelog">世界更新 '+m.changes.length+' 项，已写入本机卷宗</div>':"")+"</article>";
 }).join("");
 $("transcript").scrollTop=$("transcript").scrollHeight;
 updateStatus();
}
async function status(){
 const node=$("server");node.className="server";node.textContent="检查 GM API…";
 try{
  const resp=await fetch(BASE+"/health",{signal:AbortSignal.timeout(8500),cache:"no-store"});
  if(!resp.ok)throw Error("健康接口不可用");
  const info=await resp.json();
  apiReady=info.configured===true&&info.enabled===true&&info.gmEnabled===true;
  node.className="server "+(apiReady?"online":"offline");
  node.innerHTML='<span class="dot"></span>'+esc(apiReady?"DeepSeek GM 已就绪":"GM API 待启用");
  showAlert(apiReady?"API 可用。每次调用需要验证访问；模型消耗使用站长额度。":"页面已就绪，但 GM 接口还未开启。站长需要先部署新版 Worker 并开启 GM_ENABLED；不用注册新账户。");
 }catch(e){
  apiReady=false;node.className="server offline";
  node.innerHTML='<span class="dot"></span>连接暂不可用';
  showAlert("无法读取 GM API 状态，请检查网络或 Worker 部署："+String(e.message||e));
 }
 updateStatus();
}
async function getTurnstile(){
 if(window.turnstile)return window.turnstile;
 if(!turnstilePromise){
  turnstilePromise=new Promise((resolve,reject)=>{
   const script=document.createElement("script");script.async=true;script.defer=true;
   script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   script.onload=()=>window.turnstile?resolve(window.turnstile):reject(Error("验证模块未准备好"));
   script.onerror=()=>reject(Error("Cloudflare 验证组件无法载入"));
   document.head.appendChild(script);
  });
 }
 return turnstilePromise;
}
async function getToken(){
 if(SITE_KEY.length<10)throw Error("未配置公开 Turnstile Site Key");
 const ts=await getTurnstile();
 return new Promise((resolve,reject)=>{
  const mask=document.createElement("div");mask.className="challenge";
  const panel=document.createElement("div");panel.className="challenge-inner";
  const desc=document.createElement("p");desc.textContent="请验证访问以保护站长的 AI 额度。";
  const node=document.createElement("div"),cancel=document.createElement("button");cancel.textContent="取消";
  panel.append(desc,node,cancel);mask.appendChild(panel);document.body.appendChild(mask);
  let done=false,widget;
  const cleanup=()=>{clearTimeout(timer);try{if(widget!==undefined)ts.remove(widget)}catch{}mask.remove()};
  const finish=(error,token)=>{if(done)return;done=true;cleanup();error?reject(error):resolve(token)};
  const timer=setTimeout(()=>finish(Error("验证超时，请稍后重试")),25000);
  cancel.onclick=()=>finish(Error("已取消"));
  try{widget=ts.render(node,{sitekey:SITE_KEY,execution:"render",appearance:"interaction-only",theme:"light",
   callback:token=>finish(null,token),
   "error-callback":()=>finish(Error("验证失败")),
   "expired-callback":()=>finish(Error("验证过期"))
  })}catch(e){finish(e)}
 });
}
function bookFor(w){return String(books.books?.[w.location+"/"+w.tier]||books.overview||"").slice(0,600)}
async function sendTurn(text){
 if(busy||!apiReady||!$("consent").checked)return;
 busy=true;updateStatus();showAlert("正在联系 GM…");
 try{
  const notes=$("use-guide").checked?
   (await fetch("../experiments/gm-organs/GM.md",{cache:"force-cache"}).then(r=>r.ok?r.text():"")).slice(0,1000):"";
  const token=await getToken();
  const history=session.messages.filter(m=>m.who!=="intro").slice(-8).map(m=>({who:m.who,text:m.text.slice(0,300)}));
  const response=await fetch(BASE+"/api/gm/turn",{
   method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
   body:JSON.stringify({playerText:text,world:session.world,book:bookFor(session.world),history,gmNotes:notes,turnstileToken:token}),
   signal:AbortSignal.timeout(38000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.keep!==false||typeof data.narration!=="string"||!data.world){
   const code=data.error||data.reason||("HTTP "+response.status);
   if(response.status===503){await status()}
   throw Error(code);
  }
  session.world=data.world;
  session.messages.push({who:"player",text});
  session.messages.push({who:"gm",text:data.narration,changes:data.changes||[]});
  session.messages=session.messages.slice(-80);
  save();$("prompt").value="";render();
  showAlert(data.rejected?"GM 的部分变更未通过校验，已忽略 "+data.rejected+" 项；查看实际卡牌和状态请以账本为准。":"本轮已完成，世界状态已保存到此浏览器。");
 }catch(e){showAlert("本轮未提交，输入仍保留。原因："+String(e.message||e))}
 finally{busy=false;updateStatus()}
}
$("chat").addEventListener("submit",e=>{e.preventDefault();const text=$("prompt").value.trim().slice(0,850);if(text)sendTurn(text)});
$("prompt").addEventListener("input",updateStatus);
$("prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();$("chat").requestSubmit()}});
$("consent").addEventListener("change",updateStatus);
document.querySelectorAll("[data-suggestion]").forEach(b=>b.addEventListener("click",()=>{$("prompt").value=b.dataset.suggestion;$("prompt").focus();updateStatus()}));
$("restart").addEventListener("click",()=>{if(busy)return;if(!confirm("重新开始？当前浏览器里的本局世界和对话将重置，建议先导出。"))return;session=newSession();save();render();showAlert("已重新开始本局。")});
$("export").addEventListener("click",()=>{
 const blob=new Blob([JSON.stringify(session,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="gm-world-chronicle.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
(async()=>{
 try{const r=await fetch("./books.json",{cache:"no-cache"});if(r.ok){const data=await r.json();if(data?.books&&data?.overview)books=data}}catch{}
 render();await status();
})();
