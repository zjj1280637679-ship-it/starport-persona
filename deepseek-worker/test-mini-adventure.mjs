import assert from 'node:assert/strict';
import {handleMiniAdventure} from './src/mini-adventure.mjs';
const store=new Map();
const env={DEEPSEEK_API_KEY:'test-only-fake-key',DEEPSEEK_MODEL:'deepseek-flash',ADVENTURE_ADMIN_TOKEN:'long-local-test-token-123456',ALLOWED_ORIGIN:'https://zjj1280637679-ship-it.github.io',ADVENTURE_CONFIG:{get:async k=>JSON.parse(store.get(k)||'null'),put:async(k,v)=>store.set(k,v)}};
const origin='https://zjj1280637679-ship-it.github.io';
const call=(path,method='GET',body=null,headers={})=>handleMiniAdventure(new Request('https://test.invalid/api/mini-adventure/'+path,{method,headers:{origin,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),env);
const data=async response=>({status:response.status,...await response.json()});
let r=await data(await call('public'));
assert.equal(r.status,200);assert.equal(r.title,'雾港来信');assert(!('systemPrompt' in r));assert(!('script' in r));
r=await data(await call('admin'));assert.equal(r.status,401);
const auth={authorization:'Bearer '+env.ADVENTURE_ADMIN_TOKEN};
r=await data(await call('admin','GET',null,auth));assert.equal(r.status,200);assert(r.config.systemPrompt.length>8);
const config={...r.config,title:'新的剧本',script:'这里是私有完整剧本',systemPrompt:'自定义主持人',outputTokens:4567};
r=await data(await call('admin','PUT',config,auth));assert.equal(r.status,200);
r=await data(await call('public'));assert.equal(r.title,'新的剧本');assert(!JSON.stringify(r).includes('私有完整剧本'));
r=await data(await call('admin','PUT',{...config,outputTokens:-1},auth));assert.equal(r.status,400);
let captured;
const oldFetch=globalThis.fetch;
globalThis.fetch=async (_url,options)=>{captured=JSON.parse(options.body);return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify({narration:'你翻开一张浸水的手写地图。',choices:['看地图','追踪脚印','询问店主'],tools:[{name:'remember_fact',args:{text:'地图藏于旅馆'}},{name:'set_scene',args:{scene:'旅馆'}},{name:'set_flag',args:{key:'has_map',value:true}},{name:'adjust_stat',args:{key:'courage',delta:5}},{name:'untrusted',args:{evil:1}}]})}}],usage:{completion_tokens:85}}),{status:200,headers:{'content-type':'application/json'}})};
try {
 r=await data(await call('turn','POST',{action:'打开信封',history:[],world:{scene:'起点'}}));
 assert.equal(r.status,200);assert.equal(r.choices.length,3);assert.equal(r.world.scene,'旅馆');assert.equal(r.world.facts[0],'地图藏于旅馆');assert.equal(r.world.flags.has_map,true);assert.equal(r.world.stats.courage,5);assert.equal(r.applied.length,4);
 assert(captured.messages.some(m=>m.content==='这里是私有完整剧本'||m.content.includes('这里是私有完整剧本')));
 assert.equal(captured.max_tokens,4567);
 r=await data(await call('turn','POST',{action:'',history:[]}));assert.equal(r.status,400);
 const deny=await handleMiniAdventure(new Request('https://test.invalid/api/mini-adventure/public',{headers:{origin:'https://evil.example'}}),env);assert.equal(deny.status,403);
 const opt=await handleMiniAdventure(new Request('https://test.invalid/api/mini-adventure/turn',{method:'OPTIONS',headers:{origin}}),env);assert.equal(opt.status,204);
} finally {globalThis.fetch=oldFetch}
console.log('PASS mini-adventure: public/private config, admin auth, KV write, turn, tools, CORS and failures');