import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const w=readFileSync(new URL("../deepseek-worker/src/index.js",import.meta.url),"utf8");
const app=readFileSync(new URL("./app.js",import.meta.url),"utf8");
const prompt=readFileSync(new URL("../experiments/gm-organs/SYSTEM.txt",import.meta.url),"utf8").trim();
const page=readFileSync(new URL("./index.html",import.meta.url),"utf8");
const maps=JSON.parse(readFileSync(new URL("./books.json",import.meta.url),"utf8"));
const vars=readFileSync(new URL("../deepseek-worker/wrangler.toml",import.meta.url),"utf8");
assert.match(page,/id="chat"/);
assert.match(page,/id="consent"/);
assert.match(page,/id="transcript"/);
assert.ok(Object.keys(maps.books).length>=3);
assert.match(vars,/GM_ENABLED = "false"/);
assert.match(vars,/GM_LIMITER/);
assert.doesNotThrow(()=>new Function(app.replace(/^import .*$/gm,"")));
assert.ok(w.includes("const GM_SYSTEM="+JSON.stringify(prompt)),"Backend minimal GM prompt must match SYSTEM.txt");
const origin="https://zjj1280637679-ship-it.github.io";
let aiCalls=0,seenContext=[];
async function fakeFetch(url,options={}){
 if(String(url).includes("siteverify"))return new Response(JSON.stringify({success:true,hostname:"zjj1280637679-ship-it.github.io"}),{status:200});
 if(String(url).includes("api.deepseek.com")){
  aiCalls++;
  const req=JSON.parse(options.body);
  assert.equal(req.model,"deepseek-flash");
  const ctx=JSON.parse(req.messages[1].content);
  seenContext.push(ctx);
  const prior=Boolean(ctx.world.cards?.["paper-servant"]);
  const obj=prior?{
   narration:"你刚刚获得的纸人侍者还在袖口，守卫的称谓仍带着疑虑。",
   changes:[]
  }:{
   narration:"你救下一个陌生的纸扎匠。匠人交给你一个会走路的纸人，并告诉你它的忠诚不能被买断。",
   changes:[
    {op:"set",path:["cards","paper-servant"],value:{title:"纸人侍者",description:"来自一位纸扎匠"}},
    {op:"append",path:["facts"],value:"玩家救下纸扎匠，得到了纸人"},
    {op:"set",path:["location"],value:"辽东"},
    {op:"set",path:["__proto__","injected"],value:true}
   ]
  };
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(obj)}}]}),{status:200});
 }
 throw Error("unexpected network call "+url);
}
const workerJS=w.replace("export default {","const __worker={");
const api=new Function("fetch","Response","Request","URL","URLSearchParams","AbortSignal",
 workerJS+"\nreturn {gmInitial,gmApply,gmValidateState,worker:__worker};"
)(fakeFetch,Response,Request,URL,URLSearchParams,AbortSignal);
const env={
 AI_ENABLED:"true",GM_ENABLED:"true",ALLOWED_ORIGIN:origin,TURNSTILE_SECRET:"test-only",
 DEEPSEEK_API_KEY:"test-only",DEEPSEEK_MODEL:"deepseek-flash",
 AI_LIMITER:{limit:async()=>({success:true})},
 GM_LIMITER:{limit:async()=>({success:true})}
};
const world=api.gmInitial();
assert.ok(api.gmValidateState(world));
const endpoint="https://worker.example/api/gm/turn";
async function post(body,{from=origin,config=env}={}){
 const req=new Request(endpoint,{method:"POST",headers:{"Origin":from,"content-type":"application/json"},
  body:JSON.stringify(body)});
 const resp=await api.worker.fetch(req,config);return{code:resp.status,body:await resp.json()};
}
let test=await post({playerText:"我要寻找纸人",world,book:"辽东边市",turnstileToken:"test-token"},{from:"https://attacker.invalid"});
assert.equal(test.code,403);
assert.equal(aiCalls,0);
test=await post({playerText:"我要寻找纸人",world,book:"辽东边市"});
assert.equal(test.code,403);
assert.equal(aiCalls,0);
test=await post({playerText:"我要寻找纸人",world,book:"辽东边市",turnstileToken:"test-token"},
 {config:{...env,GM_ENABLED:"false"}});
assert.equal(test.code,503);
assert.equal(aiCalls,0);
test=await post({playerText:"我救下纸扎匠。",world,book:"辽东边市",turnstileToken:"test-token"});
assert.equal(test.code,200);
assert.equal(test.body.keep,false);
assert.equal(test.body.world.cards["paper-servant"].title,"纸人侍者");
assert.equal(test.body.world.location,"辽东");
assert.equal(test.body.world.facts.length,1);
assert.equal(test.body.changes.length,3);
assert.equal(test.body.rejected,1);
assert.equal({}.injected,undefined);
const firstWorld=test.body.world;
test=await post({playerText:"我让纸人陪我去衙门。",world:firstWorld,book:"辽东边市",turnstileToken:"test-token"});
assert.equal(test.code,200);
assert.equal(test.body.world.cards["paper-servant"].title,"纸人侍者");
assert.equal(test.body.changes.length,0);
assert.equal(test.body.world.chronicle.length,2);
assert.equal(aiCalls,2);
assert.equal(seenContext[1].world.location,"辽东");
const before=JSON.stringify(firstWorld);
const polluted=api.gmApply(firstWorld,[
 {op:"set",path:["cards","illicit"],value:{title:"x".repeat(600)}},
 {op:"append",path:["facts"],value:"只应该提交这条"}
]);
assert.equal(polluted.rejected,1);
assert.equal(polluted.accepted.length,1);
assert.equal(polluted.world.cards.illicit,undefined);
assert.equal(polluted.world.facts.length,2);
assert.equal(JSON.stringify(firstWorld),before);
console.log("PASS GM web API: no login, gated API, Turnstile, safe changes, persistent two-turn world, optional thin book, no paid calls.");
