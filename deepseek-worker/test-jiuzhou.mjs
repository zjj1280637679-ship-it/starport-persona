// Retired Jiuzhou entry: all checks are offline and must never reach a model.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("./src/index.js",import.meta.url),"utf8");
const worker=(await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"))).default;
const origin="https://zjj1280637679-ship-it.github.io";
const env={ALLOWED_ORIGIN:origin,DEEPSEEK_API_KEY:"fixture-private-key",TURNSTILE_SECRET:"fixture-turnstile",AI_ENABLED:"true"};
const saved=globalThis.fetch;let calls=0;
globalThis.fetch=async()=>{calls++;throw Error("Retired endpoint must never call upstream")};
try {
 for(const method of ["GET","POST","OPTIONS","PUT","DELETE"])for(const mode of ["story","suture","agent"]){
  const request=new Request("https://worker.fixture/api/jiuzhou/turn",{method,headers:{Origin:origin,"content-type":"application/json"},...(!["GET","OPTIONS"].includes(method)?{body:JSON.stringify({mode,messages:[]})}:{})});
  request.text=()=>{throw Error("Retired route must not read or parse input")};
  const response=await worker.fetch(request,env);
  assert.equal(response.status,410);assert.equal(response.headers.get("access-control-allow-origin"),origin);
  assert.deepEqual(await response.json(),{error:"shared_api_removed"});
 }
 const health=await worker.fetch(new Request("https://worker.fixture/health",{headers:{Origin:origin}}),env);
 const state=await health.json();assert.equal(state.jiuzhouReady,false);assert.equal(state.jiuzhouAgentTransport,false);assert.equal(state.jiuzhouSharedApiRemoved,true);
 assert.equal(state.configured,true,"Other applications retain their server configuration");assert.equal(state.enabled,true);
 const rejected=await worker.fetch(new Request("https://worker.fixture/api/jiuzhou/turn",{method:"POST",headers:{Origin:"https://unrelated.fixture"},body:"{}"}),env);
 assert.equal(rejected.status,403);assert.equal(calls,0);
 console.log("PASS retired Jiuzhou route: GET/POST/OPTIONS and story/suture/agent return 410 without parsing, model calls or credential output; legacy health remains configured");
}finally{globalThis.fetch=saved}
