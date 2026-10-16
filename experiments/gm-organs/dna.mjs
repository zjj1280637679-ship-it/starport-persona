/**
 * 器官 DNA：node experiments/gm-organs/dna.mjs
 *
 * 使用模拟模型测试器官行为：不会请求真实 DeepSeek，也不会产生费用。
 * 仅证明当前最小样本，不构成“未来唯一正确实现”。
 */
import assert from "node:assert/strict";
import {makeLibrarian, makeWorld, perceiveIdentity, describeView, chooseAsset, makeGM} from "./organs.mjs";

const library = makeLibrarian({
  overview: "架空晚明世界；默认按地区 × 当前可接触阶层查阅薄卷。",
  books: {
    "辽东/low": "军镇边缘，外来者常被怀疑；角色可以借伪装、担保或交易获取准入。",
    "辽东/high": "高层使节参与边务，但倚仗的凭证和靠山可能突然失效。"
  },
  appendices: {"npc/guard": "守卫善于查验印信，暂时不知玩家真实身份。"}
});
// 器官1的 DNA：只需知道索引便能按需读一卷、读一页附录。
assert.deepEqual(library.catalog(), ["辽东/low", "辽东/high"]);
assert.match(library.readBook("辽东/low").text, /外来者/);
assert.equal(library.readAppendix("npc/guard").id, "npc/guard");

const world = makeWorld({
  player: {actualIdentity: "京师流亡小吏", presentedIdentity: "权臣密使"},
  regions: {辽东: {
    defaultAccess: "low",
    perceptions: {
      gate: {believes: "外来奸细", relation: "hostile", access: "low"},
      council: {believes: "权臣密使", relation: "friendly", access: "high", address: "上使大人"}
    }
  }},
  cards: {},
  chronicle: []
});
// 器官3的 DNA：同一玩家面对不同 NPC，有不同称谓/关系/社会准入。
assert.equal(perceiveIdentity(world.snapshot().state, {region: "辽东", observer: "gate"}).address, "可疑的来客");
assert.equal(perceiveIdentity(world.snapshot().state, {region: "辽东", observer: "council"}).address, "上使大人");

// 器官5的 DNA：只检索并返回素材 ID，绝不上传全部图片/素材集合。
const chosen = chooseAsset([
  {id:"art.frontier", uri:"./frontier.webp", tags:["辽东","边镇"]},
  {id:"art.elixir", uri:"./elixir.webp", tags:["奇物","丹药"]}
], ["辽东","边镇"]);
assert.deepEqual(chosen, {id:"art.frontier",uri:"./frontier.webp"});

// 器官6的 DNA：一个模拟 GM，首次发明奇物，下一轮识别已持有事实。
let modelCalls=0;
const gm = makeGM({
  library, world,
  model: async context => {
    modelCalls++;
    assert.equal(context.identity.region, "辽东");
    assert.match(context.currentBook.text, /军镇边缘/);
    if (context.world.cards["paper-servant"]) {
      return {narration: "守卫认出你带着先前获得的纸人，此物仍在你的账本里。", changes: []};
    }
    return {
      narration: "你救下一位奄奄一息的纸扎匠，他赠你纸人侍者，但不承诺绝对忠诚。",
      changes: [
        {op:"set",path:["cards","paper-servant"],value:{id:"paper-servant",title:"纸人侍者",loyalty:"uncertain"}},
        {op:"append",path:["chronicle"],value:{actor:"player",event:"救下纸扎匠；获得纸人侍者"}}
      ]
    };
  },
  // DNA 中采用最窄的授权示例；实际生产需要更可靠的服务端鉴权与冲突处理。
  approve: change => (
    change.path[0]==="cards" && change.op==="set" ||
    change.path[0]==="chronicle" && change.op==="append"
  )
});

const first = await gm.turn({playerText:"我救下纸扎匠，并接受他的礼物。",region:"辽东",tier:"low",observer:"gate",appendixId:"npc/guard"});
assert.equal(first.state.revision,1);
assert.equal(first.state.state.cards["paper-servant"].title,"纸人侍者");
assert.equal(first.state.state.chronicle.length,1);
// 器官4的 DNA：返回可渲染为表格和卡片的结构化描述，而非任意 HTML。
assert.deepEqual(first.view.sections.map(s=>s.type),["text","table","cards"]);

const second = await gm.turn({playerText:"让先前的纸人帮我送信。",region:"辽东",tier:"low",observer:"gate"});
assert.match(second.narration,/先前获得的纸人/);
assert.equal(second.state.revision,1); // 没有新变更就不虚增版本
assert.equal(modelCalls,2);

// 器官2的 DNA：过期写入/危险路径/越权操作不能偷偷成功。
assert.throws(() => world.commit({
  expectedRevision:0,changes:[{op:"set",path:["cards","fake"],value:{id:"fake"}}]
}),/revision_conflict/);
assert.throws(() => world.commit({
  expectedRevision:1,changes:[{op:"set",path:["__proto__","danger"],value:true}]
}),/invalid_path/);
assert.throws(() => world.commit({
  expectedRevision:1,changes:[{op:"set",path:["player","actualIdentity"],value:"伪造身份"}]
}, () => false),/change_not_authorized/);
assert.equal(world.snapshot().state.player.actualIdentity,"京师流亡小吏");
// 原子性：前一条改动本身合法，后一条却无效，也不能留下半笔账。
assert.throws(() => world.commit({
  expectedRevision:1,
  changes:[
    {op:"set",path:["cards","new-object"],value:{title:"临时奇物"}},
    {op:"append",path:["not-an-array"],value:"bad"}
  ]
}),/append_target_not_array/);
assert.equal(world.snapshot().state.cards["new-object"],undefined);
assert.equal(world.history().length,1);

const view=describeView({narration:"测试",status:{location:"辽东"},cards:[{id:"paper-servant",title:"纸人侍者"}]});
assert.equal(view.sections.length,3);

console.log("PASS GM-organs DNA: 六类行为样本，双轮记忆，身份称呼差异，安全审计，结构化显示");
