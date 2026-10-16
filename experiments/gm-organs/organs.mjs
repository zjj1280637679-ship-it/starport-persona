/**
 * GM 器官实验 — 可替换的最小参考实现，不是正式框架或通用游戏规则。
 *
 * 目的：为后续 Agent 留下可复现的“功能器官”，证明能力与输入输出。
 * 除了安全边界（没有执行模型返回的代码）之外，这里的对象形状都可以变。
 */

const copy = value => structuredClone(value);
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
function safePath(path) {
  if (!Array.isArray(path) || path.length < 1 || path.length > 12 ||
      path.some(x => typeof x !== "string" || !x || x.length > 100 || forbidden.has(x)))
    throw Error("invalid_path");
  return path;
}

/** 器官1：读书。这里只装最薄的索引，读取当前需要的一卷；资源可替换成文件、DB、RAG 等。 */
export function makeLibrarian({overview = "", books = {}, appendices = {}} = {}) {
  const index = Object.keys(books);
  return Object.freeze({
    overview: () => overview,
    catalog: () => [...index],
    readBook: key => ({key, text: books[key] ?? null}),
    readAppendix: id => ({id, text: appendices[id] ?? null})
  });
}

/**
 * 器官2：世界账本。
 * 输入 JSON 变更 proposal；提交成功后递增 revision，保留审计历史。
 * 此实验用内存；生产持久化和玩家会话隔离要靠真正的 storage adapter。
 */
export function makeWorld(initial = {}) {
  let state = copy(initial), revision = 0;
  const history = [];
  function snapshot() { return {revision, state: copy(state)}; }
  function commit({expectedRevision, changes, cause = ""}, authorize) {
    if (typeof authorize !== "function") throw Error("authorization_required");
    if (expectedRevision !== revision) throw Error("revision_conflict");
    if (!Array.isArray(changes) || !changes.length || changes.length > 20)
      throw Error("invalid_changes");
    // 先整体校验，后原子提交：模型不能“说一句话”就绕过账本。
    const draft = copy(state);
    const checked = [];
    for (const change of changes) {
      if (!change || !["set", "append"].includes(change.op)) throw Error("invalid_operation");
      const path = safePath(change.path);
      if (!authorize({op: change.op, path, value: change.value, cause}, snapshot()))
        throw Error("change_not_authorized");
      if (change.value === undefined) throw Error("missing_value");
      let node = draft;
      for (const name of path.slice(0, -1)) {
        if (node[name] === undefined && change.op === "set") node[name] = {};
        if (!node[name] || typeof node[name] !== "object" || Array.isArray(node[name]))
          throw Error("invalid_container");
        node = node[name];
      }
      const last = path.at(-1);
      if (change.op === "set") node[last] = copy(change.value);
      else {
        if (!Array.isArray(node[last])) throw Error("append_target_not_array");
        node[last].push(copy(change.value));
      }
      checked.push(copy(change));
    }
    state = draft;
    const entry = {revision: ++revision, cause: String(cause).slice(0, 200), changes: checked};
    history.push(copy(entry));
    return {revision, entry: copy(entry)};
  }
  return Object.freeze({snapshot, commit, history: () => copy(history)});
}

/**
 * 器官3：局部身份透镜。
 * 不赋予“全球等级”；同一人在不同观察者的知识和态度下获得不同的称呼/准入。
 */
export function perceiveIdentity(state, {region, observer}) {
  const player = state.player || {};
  const regional = state.regions?.[region] || {};
  const belief = regional.perceptions?.[observer] || {};
  const trueIdentity = player.actualIdentity || "身份未明";
  const knowsTruth = belief.knowsTruth === true;
  const publicIdentity = knowsTruth ? trueIdentity : (belief.believes || player.presentedIdentity || trueIdentity);
  const access = belief.access || regional.defaultAccess || "newcomer";
  const relation = belief.relation || "neutral";
  const title = belief.address || (relation === "hostile" ? "可疑的来客" : access === "high" ? "贵使" : "客官");
  return {region, observer, address: title, recognizedAs: publicIdentity, relation, access, knowsTruth};
}

/**
 * 器官4：安全表现器。只输出结构化视图描述，不求模型直接产生可执行 HTML。
 * 浏览器可以将这些 plain-text 字段渲染成文本、表格与卡牌。
 */
export function describeView({narration = "", status = {}, cards = [], art = null} = {}) {
  const sections = [{type: "text", text: String(narration).slice(0, 4000)}];
  if (Object.keys(status).length)
    sections.push({type: "table", rows: Object.entries(status).map(([k, v]) => [String(k), String(v)])});
  if (cards.length)
    sections.push({type: "cards", items: cards.map(c => ({id: String(c.id), title: String(c.title)}))});
  if (art) sections.push({type: "asset", assetId: String(art)});
  return {sections};
}

/** 器官5：可选素材索引。模型只拿 ID、标签；不把整个图库/二进制塞入上下文。 */
export function chooseAsset(assets, desiredTags = []) {
  const found = (assets || []).find(a =>
    Array.isArray(a.tags) && desiredTags.every(tag => a.tags.includes(tag)));
  return found ? {id: found.id, uri: found.uri} : null;
}

/**
 * 器官6：GM/DM 驱动薄壳。
 * model 是可替换的模型调用函数；approve 是调用方的变更授权工具。
 * GM 会提出对世界的改动；账本才决定它是否成立。
 */
export function makeGM({model, library, world, approve, systemPrompt = "你是文字冒险游戏的 GM / DM。"}) {
  if (typeof model !== "function" || typeof approve !== "function")
    throw Error("model_and_approval_required");
  return {
    async turn({playerText, region, tier, observer, appendixId = null}) {
      const before = world.snapshot();
      const context = {
        system: systemPrompt,
        world: before.state,
        overview: library.overview(),
        currentBook: library.readBook(region + "/" + tier),
        appendix: appendixId ? library.readAppendix(appendixId) : null,
        identity: perceiveIdentity(before.state, {region, observer}),
        playerText: String(playerText)
      };
      const answer = await model(context);
      if (!answer || typeof answer.narration !== "string") throw Error("invalid_gm_response");
      let committed = null;
      if (Array.isArray(answer.changes) && answer.changes.length) {
        committed = world.commit({
          expectedRevision: before.revision,
          changes: answer.changes,
          cause: "GM turn: " + String(playerText).slice(0, 100)
        }, approve);
      }
      const after = world.snapshot();
      return {
        narration: answer.narration,
        commit: committed,
        state: after,
        view: describeView({
          narration: answer.narration,
          status: {region, tier, recognizedAs: context.identity.recognizedAs, revision: after.revision},
          cards: Object.values(after.state.cards || {})
        })
      };
    }
  };
}
