// Node.js integration smoke for the Cloudflare Worker Jiuzhou route (no real paid calls).
import assert from "node:assert/strict";
import fs from "node:fs";
const raw=fs.readFileSync(new URL("./src/index.js",import.meta.url),"utf8");
const worker=(await import("data:text/javascript;base64,"+Buffer.from(raw).toString("base64"))).default;
const ORIGIN="https://zjj1280637679-ship-it.github.io";
let calls=[],modelRequests=[],upstreamFailure=null;
const sample={mode:"story",model:"arbitrary-unsafe-model",
 messages:[{role:"system",content:"游戏规则"},{role:"system",content:"大明末年历史大纲"},
 {role:"user",content:"玩家决定赶赴京师"}],max_tokens:3000};
// Legacy flags are false and both challenge/rate bindings are intentionally absent.
const env={ALLOWED_ORIGIN:ORIGIN,AI_ENABLED:"false",JIUZHOU_ENABLED:"false",DEEPSEEK_MODEL:"deepseek-flash",
 DEEPSEEK_API_KEY:"fake-server-only-key",JIUZHOU_INVITE_CODE:"unused-test-invitation"};
const request=(body=sample,origin=ORIGIN,path="/api/jiuzhou/turn")=>new Request("https://test.workers.dev"+path,{
 method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
const realFetch=globalThis.fetch;
globalThis.fetch=async function(url,options){
 calls.push(String(url));
 if(String(url).includes("siteverify"))return Response.json({success:false,"error-codes":["invalid-input-response"]});
 if(String(url).includes("api.deepseek.com")){
  const b=JSON.parse(options.body);
  modelRequests.push(b);
  assert.equal(b.model,"deepseek-flash");
  assert.equal(b.response_format.type,"json_object");
  assert.ok(!Object.hasOwn(options,"signal"),"Jiuzhou imposes no generation deadline");
  assert.ok(b.messages[0].content.includes("九州沉浮录"));
  assert.ok(!options.body.includes("fake-server-only-key"),"secret may appear only in header");
  assert.equal(options.headers.Authorization,"Bearer fake-server-only-key");
  if(upstreamFailure)return upstreamFailure();
  return Response.json({choices:[{message:{content:JSON.stringify({beats:[{speaker:"旁白",text:"城门已开"}],choices:[{text:"进城"},{text:"离开"},{text:"等候"}]})},finish_reason:"stop"}],
    usage:{prompt_tokens:200,completion_tokens:70}});
 }
 throw Error("unexpected fetch "+url);
};
try {
 const disabled=await worker.fetch(request(),{...env,DEEPSEEK_API_KEY:undefined});
 assert.equal(disabled.status,503,"server key is still required");
 assert.equal(calls.length,0,"unconfigured route must not call upstream");
 const enabledEnv=env;
 const health=await worker.fetch(new Request("https://test.workers.dev/health",{headers:{Origin:ORIGIN}}),enabledEnv);
 const healthData=await health.json();
 assert.deepEqual(Object.fromEntries(["ok","configured","enabled","jiuzhouEnabled"].map(k=>[k,healthData[k]])),{
  ok:true,configured:false,enabled:false,jiuzhouEnabled:true
 },"legacy flags stay independent of Jiuzhou access");
 assert.equal(healthData.model,"deepseek-flash");
 assert.equal(healthData.jiuzhouReady,true);
 assert.equal(healthData.inviteRequired,false,"invitations were explicitly removed");
 assert.ok(!JSON.stringify(healthData).includes("unused-test-invitation"));
 assert.deepEqual(healthData.limiters,{ai:false,gm:false});
 assert.deepEqual(healthData.jiuzhouAccess,{challenge:false,rateLimit:false,outputLimit:"provider"});
 const noKeyHealth=await (await worker.fetch(new Request("https://test.workers.dev/health"),{...env,DEEPSEEK_API_KEY:undefined})).json();
 assert.equal(noKeyHealth.jiuzhouReady,false);
 assert.equal(noKeyHealth.jiuzhouEnabled,false);
 assert.ok(!JSON.stringify(healthData).includes("fake-server-only-key"));
 assert.ok(!JSON.stringify(healthData).includes("fake-turnstile-secret"));
 const originBad=await worker.fetch(request(sample,"https://evil.example"),enabledEnv);
 assert.equal(originBad.status,403);
 const successful=await worker.fetch(request(),enabledEnv);
 assert.equal(successful.status,200,"no token, secret, limiter or enable flag needed for Jiuzhou");
 const data=await successful.json();
 assert.equal(data.model,"deepseek-flash");
 assert.equal(data.choices[0].finish_reason,"stop");
 assert.deepEqual(data.usage,{prompt_tokens:200,completion_tokens:70});
 assert.equal(JSON.parse(data.choices[0].message.content).beats[0].speaker,"旁白");
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1);
 assert.equal(modelRequests.at(-1).max_tokens,3000);
 const forbiddenLimiter={limit:async()=>{throw Error("Jiuzhou must not consult legacy quota bindings")}};
 assert.equal((await worker.fetch(request(),{...env,AI_LIMITER:forbiddenLimiter,GM_LIMITER:forbiddenLimiter})).status,200);
 for(const [mode,maxTokens] of [["story",16000],["suture",14000],["story",1],["story",393216],["story",undefined]]){
  assert.equal((await worker.fetch(request({...sample,mode,max_tokens:maxTokens}),env)).status,200);
  assert.equal(modelRequests.at(-1).max_tokens,maxTokens,"forward caller output size without clamping");
  assert.equal(Object.hasOwn(modelRequests.at(-1),"max_tokens"),maxTokens!==undefined,"omitted output size uses provider default");
 }
 const longContent=JSON.stringify({beats:[{speaker:"旁白",text:"长".repeat(45000)}],choices:[]});
 upstreamFailure=()=>Response.json({choices:[{message:{content:longContent}}]});
 const longResult=await worker.fetch(request(),env);
 assert.equal(longResult.status,200,"former 44,000-character output rejection is removed");
 const longData=await longResult.json();
 assert.equal(longData.choices[0].message.content,longContent);
 assert.equal(longData.choices[0].finish_reason,null,"missing provider completion reason remains unknown");
 upstreamFailure=null;
 const priorStory=JSON.stringify({beats:[{speaker:"旁白",text:"史".repeat(5000)}],choices:[{text:"查账"},{text:"护粮"},{text:"谈判"}]});
 const longAction="实地调查粮仓并逐项核对账册。".repeat(1500)+"【尾部目标】救出被扣押的粮商";
 const longContext={...sample,messages:[...sample.messages.slice(0,2),{role:"assistant",content:priorStory},{role:"user",content:longAction}]};
 assert.equal((await worker.fetch(request(longContext),env)).status,200);
 assert.equal(modelRequests.at(-1).messages[2].content,priorStory,"preserve the complete 5000-character narrative JSON");
 assert.equal(modelRequests.at(-1).messages[3].content,longAction,"preserve the complete current action and its tail objective");
 const budgetBoundary={...sample,messages:[{role:"system",content:"规".repeat(9500)},{role:"system",content:"史".repeat(20000)},
  {role:"assistant",content:"前".repeat(60000)},{role:"user",content:"行".repeat(30500)}]};
 assert.equal((await worker.fetch(request(budgetBoundary),env)).status,200,"120000 content characters and role limits are accepted without truncation");
 assert.equal(modelRequests.at(-1).messages[2].content,budgetBoundary.messages[2].content);
 assert.equal((await worker.fetch(request({...sample,messages:[...sample.messages.slice(0,2),{role:"user",content:"行".repeat(40000)}]}),env)).status,200,"current user action supports 40000 characters");
 for(const [expectedLength,fragments] of [
  [500,["200–450字","2–3拍"]],
  [2000,["800–1800字","3–5拍"]],
  [5000,["3500–4800字","5–8拍","每拍约450–800字"]]
 ]){
  const lengthResult=await worker.fetch(request({...sample,expectedLength}),env);
  assert.equal(lengthResult.status,200,"an effective but short response is retained without automatic retries");
  const primarySystem=modelRequests.at(-1).messages[0];
  assert.equal(primarySystem.role,"system");
  for(const fragment of fragments)assert.ok(primarySystem.content.includes(fragment),"server-authoritative story prompt contains "+fragment);
  assert.ok(primarySystem.content.includes("剧情完整收束后再给出3项下一步行动建议"));
 }
 assert.equal((await worker.fetch(request({...sample,mode:"suture",expectedLength:5000}),env)).status,200);
 assert.ok(!modelRequests.at(-1).messages[0].content.includes("3500–4800字"),"story length preferences do not change suture editing");
 assert.equal(calls.filter(x=>x.includes("siteverify")).length,0,"Jiuzhou never calls Turnstile");
 const beforeInvalid=modelRequests.length;
 const tooLarge=await worker.fetch(request({...sample,messages:[{role:"system",content:"game"},{role:"system",content:"长".repeat(30000)},{role:"user",content:"行动"}]}),enabledEnv);
 assert.equal(tooLarge.status,413,"oversize contexts have an actionable status");
 assert.equal((await tooLarge.json()).error,"context_too_large");
 assert.equal(modelRequests.length,beforeInvalid);
 for(const messages of [
  [...sample.messages.slice(0,2),{role:"user",content:"行".repeat(40001)}],
  [...sample.messages.slice(0,2),{role:"assistant",content:"前".repeat(60001)},sample.messages[2]],
  budgetBoundary.messages.map((m,i)=>i===3?{...m,content:m.content+"超"}:m)
 ]){
  const rejected=await worker.fetch(request({...sample,messages}),env);
  assert.equal(rejected.status,413);
  assert.deepEqual(await rejected.json(),{error:"context_too_large",keep:true});
 }
 const rawTooLarge=await worker.fetch(request({...sample,padding:"x".repeat(160000)}),env);
 assert.equal(rawTooLarge.status,413);
 assert.deepEqual(await rawTooLarge.json(),{error:"context_too_large"},"raw JSON size failures are distinct from malformed JSON");
 const declaredTooLarge=request();
 declaredTooLarge.headers.set("content-length","512001");
 const declaredRejected=await worker.fetch(declaredTooLarge,env);
 assert.equal(declaredRejected.status,413);
 assert.deepEqual(await declaredRejected.json(),{error:"context_too_large"});
 const malformed=await worker.fetch(new Request("https://test.workers.dev/api/jiuzhou/turn",{
  method:"POST",headers:{Origin:ORIGIN,"Content-Type":"application/json"},body:"{"}),env);
 assert.equal(malformed.status,400);
 assert.deepEqual(await malformed.json(),{error:"invalid_json"});
 assert.equal(modelRequests.length,beforeInvalid,"oversize contexts and malformed bodies must not reach the paid model");
 for(const [changes,code] of [
  [{mode:"unknown"},"invalid_mode"],
  [{messages:[]},"invalid_messages"],
  [{messages:[...sample.messages.slice(0,2),{role:"user",content:42}]},"invalid_message_type"],
  [{messages:[...sample.messages.slice(0,2),{role:"assistant",content:"行动"}]},"invalid_structure"],
  ...[0,499,500.5,"5000",null,{},5001].map(expectedLength=>[{expectedLength},"invalid_length"]),
  ...[0,-1,1.5,"16000",393217].map(max_tokens=>[{max_tokens},"invalid_max_tokens"])
 ]){
  const invalid=await worker.fetch(request({...sample,...changes}),enabledEnv);
  assert.equal(invalid.status,400);
  assert.equal((await invalid.json()).error,code);
 }
 assert.equal(modelRequests.length,beforeInvalid,"invalid input must not call model");
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
 for(const content of [JSON.stringify({beats:[{text:"private-provider-detail-and-key"}],choices:[]}),'{"beats":[{"text":"private-provider-detail-and-key"}],"choices":[',undefined]){
  upstreamFailure=()=>Response.json({choices:[{message:{content},finish_reason:"length"}],usage:{completion_tokens:12288}});
  const truncated=await worker.fetch(request(),env);
  assert.equal(truncated.status,502,"a truncated response cannot report a complete long-form generation");
  const truncatedError=await truncated.json();
  assert.deepEqual(truncatedError,{error:"output_truncated",keep:true});
  assert.ok(!JSON.stringify(truncatedError).includes("private-provider-detail"));
 }
 upstreamFailure=null;
 // Older products retain their switches, quotas and Turnstile checks.
 const legacyBody={questionId:"p1",answer:"我会先核查账目"};
 assert.equal((await worker.fetch(request(legacyBody,ORIGIN,"/api/analyze"),env)).status,503);
 let legacyRateCalls=0;
 const legacyEnv={...env,AI_ENABLED:"true",TURNSTILE_SECRET:"fake-turnstile-secret",
  AI_LIMITER:{limit:async()=>{legacyRateCalls++;return{success:true}}}};
 const oversizedLegacy=request(legacyBody,ORIGIN,"/api/analyze");
 oversizedLegacy.headers.set("content-length","13001");
 const legacyDeclared=await worker.fetch(oversizedLegacy,legacyEnv);
 assert.equal(legacyDeclared.status,413);
 assert.deepEqual(await legacyDeclared.json(),{error:"too_large"},"legacy declared-body rejection remains unchanged");
 const legacyRaw=await worker.fetch(request({...legacyBody,padding:"x".repeat(13000)},ORIGIN,"/api/analyze"),legacyEnv);
 assert.equal(legacyRaw.status,400);
 assert.deepEqual(await legacyRaw.json(),{error:"invalid_json"},"legacy raw-body rejection remains unchanged");
 const beforeLegacy=modelRequests.length;
 const noChallenge=await worker.fetch(request(legacyBody,ORIGIN,"/api/analyze"),legacyEnv);
 assert.equal(noChallenge.status,403);
 assert.equal((await noChallenge.json()).error,"challenge_required");
 assert.equal(legacyRateCalls,1);
 assert.equal(calls.filter(x=>x.includes("siteverify")).length,0);
 const invalidChallenge=await worker.fetch(request({...legacyBody,turnstileToken:"fake-token"},ORIGIN,"/api/analyze"),legacyEnv);
 assert.equal(invalidChallenge.status,403);
 assert.equal(calls.filter(x=>x.includes("siteverify")).length,1,"older route still validates supplied tokens");
 assert.equal(modelRequests.length,beforeLegacy);
 const limited=await worker.fetch(request(legacyBody,ORIGIN,"/api/analyze"),{...legacyEnv,AI_LIMITER:{limit:async()=>({success:false})}});
 assert.equal(limited.status,429);
 console.log("Jiuzhou: complete long-form context, explicit budget/truncation diagnostics, direct access, provider output range, no challenge/quota/deadline, private key isolation and legacy protections OK (mocked)");
} finally {globalThis.fetch=realFetch}
