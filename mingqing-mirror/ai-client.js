import {AI_CONFIG} from "./ai-config.js";
const base=String(AI_CONFIG.endpoint||"").replace(/\/$/,"");
const siteKey=String(AI_CONFIG.turnstileSiteKey||"");
export const aiEnabled=Boolean(/^https:\/\//.test(base)&&siteKey.length>=10);
let scriptPromise;
function ready(){
 if(!aiEnabled)return Promise.reject(Error("AI not configured"));
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!scriptPromise){
  scriptPromise=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   script.async=true;script.defer=true;
   script.onload=()=>window.turnstile?resolve(window.turnstile):reject(Error("Turnstile not ready"));
   script.onerror=()=>reject(Error("Turnstile unavailable"));
   document.head.appendChild(script);
  });
 }
 return scriptPromise;
}
async function freshToken(){
 const ts=await ready();
 return new Promise((resolve,reject)=>{
  const overlay=document.createElement("div");
  overlay.className="ai-challenge";
  overlay.setAttribute("role","status");
  overlay.setAttribute("aria-label","正在验证访问以保护付费AI额度");
  const msg=document.createElement("p");
  msg.textContent="正在验证访问，保护公开测试的 AI 调用额度…";
  overlay.appendChild(msg);
  const node=document.createElement("div");
  overlay.appendChild(node);document.body.appendChild(overlay);
  let settled=false,widget;
  const cleanup=()=>{clearTimeout(timer);try{if(widget!==undefined)ts.remove(widget)}catch{}overlay.remove()};
  const finish=(error,token)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve(token)};
  const timer=setTimeout(()=>finish(Error("challenge timeout")),18000);
  try{
   widget=ts.render(node,{
    sitekey:siteKey,
    execution:"render",
    appearance:"interaction-only",
    theme:"dark",
    callback:(token)=>finish(null,token),
    "error-callback":()=>finish(Error("challenge failed")),
    "expired-callback":()=>finish(Error("challenge expired"))
   });
  }catch(e){finish(e)}
 });
}
async function send(path,body){
 if(!aiEnabled)return null;
 try{
  const turnstileToken=await freshToken();
  const res=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,turnstileToken}),signal:AbortSignal.timeout(36000),cache:"no-store"});
  if(!res.ok)return null;
  const out=await res.json();
  return out&&typeof out==="object"?out:null;
 }catch{return null}
}
export async function analyzeAnswer(question,answer){
 if(!aiEnabled||question.group==="wit"||String(answer||"").trim().length<3)return null;
 const o=await send("/api/analyze",{questionId:question.id,answer:String(answer).slice(0,1800)});
 const evidence=o?.keep===false?o.analysis:null;
 if(!evidence||typeof evidence.quote!=="string"||!answer.includes(evidence.quote))return null;
 if(!Number.isFinite(evidence.value)||!Number.isFinite(evidence.confidence)||evidence.confidence<.65||Math.abs(evidence.value)>1)return null;
 return {value:evidence.value,confidence:evidence.confidence,quote:evidence.quote};
}
export async function rewriteQuestion(question,prior){
 if(!aiEnabled||!question.rewrites?.length||!Array.isArray(prior)||!prior.length)return null;
 if(!question.rewrites.some(r=>question.scene.includes(r.phrase)&&prior.filter(t=>t.includes(r.handle)).length===1))return null;
 const r=await send("/api/rewrite",{questionId:question.id,scenario:question.scene,previousAnswers:prior.slice(-8)});
 if(!r||r.keep!==false||typeof r.scenario!=="string"||typeof r.handle!=="string")return null;
 const rule=question.rewrites.find(x=>x.handle===r.handle&&prior.filter(t=>t.includes(x.handle)).length===1);
 if(!rule||r.scenario!==question.scene.replace(rule.phrase,rule.replace))return null;
 return r.scenario;
}
export async function requestCommentary(characterName,strengths,gaps){
 if(!aiEnabled)return null;
 const out=await send("/api/commentary",{characterName,strengths,gaps});
 return out?.keep===false&&typeof out.commentary==="string"&&out.commentary.length>=15?out.commentary.slice(0,150):null;
}
