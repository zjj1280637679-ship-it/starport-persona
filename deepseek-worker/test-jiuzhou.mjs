// Node.js integration smoke for the Cloudflare Worker Jiuzhou route (no real paid calls).
import assert from "node:assert/strict";
import fs from "node:fs";
const raw=fs.readFileSync(new URL("./src/index.js",import.meta.url),"utf8");
const worker=(await import("data:text/javascript;base64,"+Buffer.from(raw).toString("base64"))).default;
const ORIGIN="https://zjj1280637679-ship-it.github.io";
let calls=[];
const sample={mode:"story",turnstileToken:"unit-test-challenge",model:"arbitrary-unsafe-model",
 messages:[{role:"system",content:"游戏规则"},{role:"system",content:"大明末年历史大纲"},
 {role:"user",content:"玩家决定赶赴京师"}],max_tokens:3000};
const env={ALLOWED_ORIGIN:ORIGIN,AI_ENABLED:"true",JIUZHOU_ENABLED:"false",DEEPSEEK_MODEL:"deepseek-flash",
 DEEPSEEK_API_KEY:"fake-server-only-key",TURNSTILE_SECRET:"fake-turnstile-secret",
 AI_LIMITER:{limit:async()=>({success:true})},GM_LIMITER:{limit:async()=>({success:true})}};
const request=(body=sample,origin=ORIGIN)=>new Request("https://test.workers.dev/api/jiuzhou/turn",{
 method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
const realFetch=globalThis.fetch;
globalThis.fetch=async function(url,options){
 calls.push(String(url));
 if(String(url).includes("siteverify"))return Response.json({success:true,hostname:"zjj1280637679-ship-it.github.io"});
 if(String(url).includes("api.deepseek.com")){
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
 const originBad=await worker.fetch(request(sample,"https://evil.example"),enabledEnv);
 assert.equal(originBad.status,403);
 const missingToken=await worker.fetch(request({...sample,turnstileToken:""}),enabledEnv);
 assert.equal(missingToken.status,403);
 const successful=await worker.fetch(request(),enabledEnv);
 assert.equal(successful.status,200);
 const data=await successful.json();
 assert.equal(JSON.parse(data.choices[0].message.content).beats[0].speaker,"旁白");
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1);
 const tooLarge=await worker.fetch(request({...sample,messages:[{role:"system",content:"game"},{role:"system",content:"长".repeat(30000)},{role:"user",content:"行动"}]}),enabledEnv);
 assert.notEqual(tooLarge.status,200,"oversize contexts cannot reach model");
 assert.equal(calls.filter(x=>x.includes("api.deepseek.com")).length,1);
 console.log("Jiuzhou Worker gate: disabled, origin, challenge, model lock, output and size OK");
} finally {globalThis.fetch=realFetch}
