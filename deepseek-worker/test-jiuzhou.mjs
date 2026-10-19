// Node.js integration smoke for the Cloudflare Worker Jiuzhou route (no real paid calls).
import assert from "node:assert/strict";
import fs from "node:fs";
const raw=fs.readFileSync(new URL("./src/index.js",import.meta.url),"utf8");
const worker=(await import("data:text/javascript;base64,"+Buffer.from(raw).toString("base64"))).default;
const ORIGIN="https://zjj1280637679-ship-it.github.io";
let calls=[],upstreamFailure=null;
const sample={mode:"story",turnstileToken:"unit-test-challenge",inviteCode:"test-invite-code-alpha",model:"arbitrary-unsafe-model",
 messages:[{role:"system",content:"游戏规则"},{role:"system",content:"大明末年历史大纲"},
 {role:"user",content:"玩家决定赶赴京师"}],max_tokens:3000};
const env={ALLOWED_ORIGIN:ORIGIN,AI_ENABLED:"true",JIUZHOU_ENABLED:"false",DEEPSEEK_MODEL:"deepseek-flash",
 DEEPSEEK_API_KEY:"fake-server-only-key",TURNSTILE_SECRET:"fake-turnstile-secret",JIUZHOU_INVITE_CODE:"test-invite-code-alpha",
 AI_LIMITER:{limit:async()=>({success:true})},GM_LIMITER:{limit:async()=>({success:true})}};
const request=(body=sample,origin=ORIGIN)=>new Request("https://test.workers.dev/api/jiuzhou/turn",{
 method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
const realFetch=globalThis.fetch;
globalThis.fetch=async function(url,options){
 calls.push(String(url));
 if(String(url).includes("siteverify"))return Response.json({success:true,hostname:"zjj1280637679-ship-it.github.io"});
 if(String(url).includes("api.deepseek.com")){
  if(upstreamFailure)return upstreamFailure();
  const b=JSON.parse(options.body);
  assert.equal(b.model,"deepseek-flash");
  assert.equal(b.response_format.type,"json_object");
  assert.ok(b.max_tokens<=8000);
  assert.ok(b.messages[0].content.includes("九州沉浮录"));
  assert.ok(!options.body.includes("fake-server-only-key"),"secret may appear only in header");
  return Response.json({choices:[{message:{content:JSON.stringify({beats:[{speaker:"旁白",text:"城门已开"}],choices:[{text:"进城"},{text:"离开"},{text:"等候"}]})}}],
    usage:{prompt_tokens:200,completion_tokens:70}});
 }
 throw Error("unexpected fetch "+url);
};
try {
 const disabled=await worker.fetch(request(),env);
 assert.equal(disabled.status,503,"paid endpoint must be disabled by default");
 assert.equal(calls.length,0,"disabled endpoint must not call upstream");
 const enabledEnv={...env,JIUZHOU_ENABLED:"true"};
 const health=await worker.fetch(new Request("https://test.workers.dev/health",{headers:{Origin:ORIGIN}}),enabledEnv);
 const healthData=await health.json();
 assert.deepEqual(Object.fromEntries(["ok","configured","enabled","jiuzhouEnabled"].map(k=>[k,healthData[k]])),{
  ok:true,configured:true,enabled:true,jiuzhouEnabled:true
 },"legacy health flags stay compatible");
 assert.equal(healthData.model,"deepseek-flash");
 assert.equal(healthData.jiuzhouReady,true);
 assert.equal(healthData.inviteRequired,true);
 assert.equal(healthData.inviteConfigured,true);
 assert.ok(!JSON.stringify(healthData).includes("test-invite-code-alpha"));
 const missingSecretEnv={...enabledEnv,JIUZHOU_INVITE_CODE:undefined};
 const noSecret=await worker.fetch(request(),missingSecretEnv);
 assert.equal(noSecret.status,503,"closed if no Cloudflare Secret is configured");
 assert.equal((await noSecret.json()).error,"invite_not_configured");
 const noCode=await worker.fetch(request({...sample,inviteCode:""}),enabledEnv);
 assert.equal(noCode.status,401,"missing invite cannot reach model");
 assert.equal((await noCode.json()).error,"invite_invalid");
 const badCode=await worker.fetch(request({...sample,inviteCode:"test-invite-code-wrong"}),enabledEnv);
 assert.equal(badCode.status,401,"wrong invite cannot reach model");
 assert.equal((await badCode.json()).error,"invite_invalid");
 const rotatedEnv={...enabledEnv,JIUZHOU_INVITE_CODE:"new-invite-code-beta"};
 assert.equal((await worker.fetch(request(),rotatedEnv)).status,401,"rotation invalidates old code on next API request");
 assert.equal((await worker.fetch(request({...sample,inviteCode:"new-invite-code-beta"}),rotatedEnv)).status,200,"new code works");
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1,"only correct rotated code can call model");
 calls.length=0;
 assert.deepEqual(healthData.limiters,{ai:true,gm:true});
 for(const binding of ["AI_LIMITER","GM_LIMITER"]){
  const brokenEnv={...enabledEnv,[binding]:undefined};
  const degraded=await (await worker.fetch(new Request("https://test.workers.dev/health"),brokenEnv)).json();
  assert.equal(degraded.configured,true,"configured still means both secrets exist");
  assert.equal(degraded.jiuzhouEnabled,true,"enable flag is separate from readiness");
  assert.equal(degraded.jiuzhouReady,false,"missing limiter prevents a ready signal");
  assert.equal((await worker.fetch(request(),brokenEnv)).status,503);
 }
 assert.ok(!JSON.stringify(healthData).includes("fake-server-only-key"));
 assert.ok(!JSON.stringify(healthData).includes("fake-turnstile-secret"));
 const originBad=await worker.fetch(request(sample,"https://evil.example"),enabledEnv);
 assert.equal(originBad.status,403);
 const missingToken=await worker.fetch(request({...sample,turnstileToken:""}),enabledEnv);
 assert.equal(missingToken.status,403);
 const successful=await worker.fetch(request(),enabledEnv);
 assert.equal(successful.status,200);
 const data=await successful.json();
 assert.equal(data.model,"deepseek-flash");
 assert.equal(JSON.parse(data.choices[0].message.content).beats[0].speaker,"旁白");
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1);
 const tooLarge=await worker.fetch(request({...sample,messages:[{role:"system",content:"game"},{role:"system",content:"长".repeat(30000)},{role:"user",content:"行动"}]}),enabledEnv);
 assert.equal(tooLarge.status,413,"oversize contexts have an actionable status");
 assert.equal((await tooLarge.json()).error,"context_too_large");
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1);
 for(const [changes,code] of [
  [{mode:"unknown"},"invalid_mode"],
  [{messages:[]},"invalid_messages"],
  [{messages:[...sample.messages.slice(0,2),{role:"user",content:42}]},"invalid_message_type"],
  [{messages:[...sample.messages.slice(0,2),{role:"assistant",content:"行动"}]},"invalid_structure"]
 ]){
  const invalid=await worker.fetch(request({...sample,...changes}),enabledEnv);
  assert.equal(invalid.status,400);
  assert.equal((await invalid.json()).error,code);
 }
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1,"invalid input must not call model");
 for(const [status,expectedStatus,code] of [
  [400,502,"upstream_request_rejected"], [401,502,"upstream_auth_failed"],
  [402,503,"upstream_quota_exceeded"], [403,502,"upstream_auth_failed"],
  [404,502,"upstream_request_rejected"], [429,503,"upstream_rate_limited"],
  [500,503,"upstream_unavailable"], [503,503,"upstream_unavailable"]
 ]){
  upstreamFailure=()=>new Response("private-provider-detail-and-key",{status});
  const failed=await worker.fetch(request(),enabledEnv);
  assert.equal(failed.status,expectedStatus);
  assert.equal(failed.headers.get("access-control-allow-origin"),ORIGIN,"browser can read diagnostic errors");
  const error=await failed.json();
  assert.deepEqual(error,{error:code,keep:true,upstreamStatus:status});
  assert.ok(!JSON.stringify(error).includes("private-provider-detail"));
 }
 for(const [name,status,code] of [
  ["TimeoutError",504,"upstream_timeout"], ["AbortError",504,"upstream_timeout"],
  ["TypeError",502,"upstream_network_error"]
 ]){
  upstreamFailure=()=>{const error=new Error("private-network-detail");error.name=name;throw error};
  const failed=await worker.fetch(request(),enabledEnv);
  assert.equal(failed.status,status);
  assert.deepEqual(await failed.json(),{error:code,keep:true});
 }
 for(const response of [
  ()=>new Response("invalid provider JSON"),
  ()=>Response.json({choices:[{message:{content:"broken game JSON"}}]})
 ]){
  upstreamFailure=response;
  const invalid=await worker.fetch(request(),enabledEnv);
  assert.equal(invalid.status,502);
  assert.deepEqual(await invalid.json(),{error:"invalid_game_response",keep:true});
 }
 console.log("Jiuzhou Worker: gates, model, compatible health/readiness, bounded input and sanitized failure diagnostics OK (mocked)");
} finally {globalThis.fetch=realFetch}
