# 接手状态账本 / HANDOFF

## 2026-10-19 后续明确授权：九州取消自设门槛

合并期间发现远端新增可轮换邀请码；用户再次明确选择“连新邀请码也取消，公开直接调用”。当前九州不校验 `JIUZHOU_INVITE_CODE`，健康响应 `inviteRequired:false`。合并保留远端其他改动，不读取或修改邀请码 Secret。

本阶段基于已合并 `a588978`。公开 Site Key 修正后，用户完成真实 Turnstile 控件，但 Worker 仍返回 `challenge_required`，尚未获得模型剧情。用户随后明确选择“连频率及输出上限也取消”，授权九州访客直接使用现有 DeepSeek 额度。最新授权取代下方针对九州的站长启用、Turnstile、每 IP 次数和自设输出限额；其他作品接口保留原有行为。

新源码 `/api/jiuzhou/turn` 只要求服务端 `DEEPSEEK_API_KEY`、正确来源和合法游戏输入，不读取 `AI_ENABLED` / `JIUZHOU_ENABLED`，不依赖 Turnstile Secret 或限流绑定，不调用 Siteverify 或限流。配置删除 `JIUZHOU_ENABLED`，遗留环境值也被忽略。`jiuzhouReady` / 有效 `jiuzhouEnabled` 仅由模型 Key 是否存在决定；`jiuzhouAccess:{challenge:false,rateLimit:false,outputLimit:"provider"}` 明示行为，旧 `configured/enabled` 字段继续服务旧接口。

移除九州 2400 / 8000 Token 裁剪、44000 字符输出拒绝和 54 秒应用生成超时。[DeepSeek 文档](https://api-docs.deepseek.com/api/create-chat-completion/) 规定的整数 `max_tokens` 范围 `1..393216` 内原值转发，省略则采用供应商默认值。输入体积、消息结构、来源和服务端密钥隔离保留。无需新增账户或 Token，没有读取或修改 Secret。

**验证边界**：Worker 语法、九州模拟集成、旧 GM Harness、器官 DNA 和差异检查通过。覆盖无验证码/限流绑定、旧开关 false、大输出原值转发及旧接口仍拒绝缺验证码请求。新增代码尚未提交或生产部署，尚无本阶段真实模型剧情成功证据；正常发布继续沿用 Cloudflare Git 集成，GitHub 仅作手动备用。详见 [工作日志](WORKLOG-2026-10-19.md)。

## 前一阶段核验（旧九州门槛已由上述授权取代）

## 2026-10-19 最新核验：九州共享 Worker

下方 2026-10-16 表格是历史快照。最新线上 `/health` 返回 `{ok:true,configured:true,enabled:true,storyEnabled:false,gmEnabled:false,jiuzhouEnabled:true}`，九州路由已开启；不能继续将“未部署新路由”当作当前故障原因。GitHub Pages 来源的九州路由 OPTIONS 返回 204 与正确 CORS 头，无 Turnstile 的 POST 返回 403 `challenge_required`。探测出口为 Cloudflare ZRH，不代表中国大陆能访问 Worker；用户确认网页本身能够打开，本次保留现有入口。入口为 `https://zjj1280637679-ship-it.github.io/jiuzhou-chronicles/`，后端继续使用本仓库 `deepseek-worker/`，没有新建供应商账户或将 Secret 放入前端。

**已确认的连接根因**：在 Cloudflare 控制台实查，现有 `starport-mingqing-ai` 是 Managed 模式，允许域名 `zjj1280637679-ship-it.github.io`；正确公开 Site Key 为 `0x4AAAAAAFVa3XMIy4rCu3Gq`（24 字符）。两个仓库的公开配置都漏掉末尾 `q`，导致浏览器验证失败。本地已修复 `jiuzhou-chronicles/ai-gateway-config.js` 与本仓库 `mingqing-mirror/ai-config.js`，没有读取、替换或修改任何 Secret。修复基线为 `47e7d58`。

**部署证据与纠正**：Cloudflare 控制台确认已有本仓库 `main` 的 Git 自动构建发布，生产版本 `06683db1` 来自 `47e7d58`，构建 Ready（23 秒），`AI_LIMITER` 和 `GM_LIMITER` 均已绑定。旧 GitHub 部署工作流因无 Token 绿色跳过，是冗余流程状态，不能由此推断生产缺少部署。继续沿用现有 Cloudflare Git 部署，无需新建 Cloudflare 或 GitHub Token。GitHub 工作流改为 `workflow_dispatch` 手动备用，不再监听推送；手动执行时缺少既有凭据会明确失败。

本次后端修复补充 `/health` 的公开模型名、限流绑定状态与 `jiuzhouReady`，保留已有健康字段含义；九州 API 区分请求格式、模型鉴权、余额/限流、上游故障、超时与无效响应，错误仅返回固定代码及数字 HTTP 状态，不透传上游正文。短工作日志见 [WORKLOG-2026-10-19.md](WORKLOG-2026-10-19.md)。

**验证范围**：Worker 语法、`deepseek-worker/test-jiuzhou.mjs` 的模拟上下游、`gm-harness/test.mjs` 旧接口回归及器官 DNA 均通过。**这些新增后端改动尚未生产部署，也未在本次后端测试中进行真实收费模型请求**；真实网页与生产联调结果应以主任务的实测记录补充，不能由绿色模拟测试推断。

---

当前核对时间：2026-10-16。适用于完全没有旧聊天记录的新 Agent。它是**可被刷新、修正的快照**；任何“完成”只代表列出的范围及验证方式。

## 一句话定位

**当前代码已经有两个测试站和一款七幕卡牌试玩；真正的新目标是：可按需读取薄地图书卷、理解游客动态身份、主持开放剧情、持久维护世界事实、渲染通用 UI 的 AI GM Harness。新目标目前处于架构/实验准备阶段，不可把七幕原型当作已实现。**

读文档次序：[根 AGENTS.md](../AGENTS.md) → [VISION.md](VISION.md) → [WORLD-LIBRARY.md](WORLD-LIBRARY.md) → [WORKTREE.md](WORKTREE.md) → 本文 → 必要时才读旧原型源码。

## 现实状态表

| 项目 | 状态 / 证据 | 尚未证明 |
| --- | --- | --- |
| GitHub 仓库 | 存在 `main`；目录可由 API 浏览；GitHub Pages 启用 | 无法确认某人的本地 worktree、未推送分支或本地改动 |
| 暮灯星栈根站 | 49 题/14 题路径的既有静态网站，源码 `src/` | 动态 AI 世界编辑 |
| 明清固定题版 | 有 12/28 题、历史人物拟合、WebP/SVG 素材槽和可选/默认 AI 辅助逻辑，源码 `mingqing-mirror/` | 能作为开放世界 GM |
| 甲申异闻录 | `chronicles/game.js` 有固定 7 幕 × 每幕 3 选项、12 张资料卡、8 成就、3 结局，本机存档；先前做过源码模拟验证三个结局 | 完全开放自由行动、动态创作世界与跨地图身份 |
| Agent 中转 | `deepseek-worker/src/index.js` 有受限 `/api/story/turn`，可给出 NPC 回复与建议按钮；AI 的建议不能自动执行 | 直接规划与更新世界、可验证的动态 tool loop |
| Worker 密钥 | 用户 2026-10-16 的 Cloudflare 截图：`/health` 旧字段 `ok/configured/enabled` 均为 true；密钥值不可见且不在仓库 | 当时的验证不是 paid DeepSeek 请求；新版 Worker 的 `storyEnabled` 线上状态未知 |
| AI Story 上线 | `wrangler.toml` 有 `AI_ENABLED=true`，**未在版本化配置中启用 `AI_STORY_ENABLED`**，代码要求它为 true 才提供新路由 | Cloudflare 控制台可能另有变量；实际状态必须再次检查 |
| CI | GitHub Actions 在提交 `399edfc74c` 上有一条 `success`；主要检查旧题版 | 不代表全量后端通过，也不覆盖新 GM；后端可能被 Cloudflare 1010 屏蔽且 CI 会提前跳过 |

## 2026-10-16 最新补充：器官 × DNA 最小实验

新增 [experiments/gm-organs/README.md](../experiments/gm-organs/README.md)、[organs.mjs](../experiments/gm-organs/organs.mjs)、[dna.mjs](../experiments/gm-organs/dna.mjs)。定义六种**候选**小器官：读书、账本、身份透镜、结构化表现、素材索引、GM 调度，并以最短代码例子描述可观测行为。通过无付费调用的 V8 等效测试（24 条断言，包括双回合记忆、NPC 不同称谓、版本冲突、显式变更授权与事务不部分提交）。随后新增 [Node 22 的 GitHub Actions DNA 自动验证](https://github.com/zjj1280637679-ship-it/starport-persona/actions/runs/38871825696)，**运行结果 success**。这证明当前 DNA 可以在标准 Node 环境执行；不等于浏览器/真实 DeepSeek 已经验收，更不等于通用 GM 运行完成。

**更新后的工作目标**：优先把功能器官的真实行为与其最小 DNA 留给未来智能体，允许未来任意器官合并、替换、变异。不要先写完大框架来限制未来改造，更不能把今天的代码类名和函数数量当成原则。

## 2026-10-16 最新补充：极简 GM 提示与可选文档

- [SYSTEM.txt](../experiments/gm-organs/SYSTEM.txt) 只有一句 GM / DM 主持提示；[GM.md](../experiments/gm-organs/GM.md) 是按需参考的薄文档，避免将脚本和完整世界塞入常驻提示。
- `makeGM()` 新增可注入 `systemPrompt`，而 `dna.mjs` 会从文件读取这条提示、断言 GM 能获得它，并模拟需要时查阅附录。
- **功能边界**：模拟模型验证“提示词/文档/器官”的基本接缝；真实联网模型尚未验证，也未修改 Cloudflare Worker 生产路由。具体技术栈与 GM.md 规则仍可由未来 Agent 彻底替换。

## 2026-10-16 新网页：GM API 验证实验

新入口：[异闻酒馆](https://zjj1280637679-ship-it.github.io/starport-persona/gm-harness/)；源码 [gm-harness/README.md](../gm-harness/README.md)。纯静态界面有自由行动、动态 HTML 卡牌与表格、薄世界书索引、浏览器卷宗、导出、Turnstile 同意框。新增 Worker `/api/gm/turn` 可以将任意玩家行动送给 DeepSeek，并解析模型的世界变更提案（改变地区、身份、卡牌、事实等）；受服务器验证和单访客限流。

**安全现状：GM_ENABLED 在 `wrangler.toml` 中默认 false，新增 GM_LIMITER，尚未向公众开放付费 GM 调用。** 使用已有 Cloudflare Worker 和 DeepSeek 账户，不要求游客或站长重新注册；仍须确认 Worker 最新代码是否已部署，并由站长批准开启付费开关和预算。旧 API、旧网页均保留。

验证：GitHub Actions 独立 [GM Harness API Smoke](https://github.com/zjj1280637679-ship-it/starport-persona/actions/runs/38874290883) 已通过模拟 DeepSeek/Turnstile 的完整两轮 API 流程，包括拒绝危险世界变更，不产生实际费用。**这不是付费模型在线验证、数据库持久化或真的 Pi SDK**。

## 已发现且需要交代给未来的冲突（不掩饰）

1. `deepseek-worker/README.md` 的原始标题称“未部署”、默认 `AI_ENABLED=false`，与现有 Cloudflare 截图和仓库 `wrangler.toml` 不符。部署教程保留作历史资料；**不要以旧教程当现状**。
2. `mingqing-mirror/chronicles/DESIGN.md` 代表上一个阶段“固定七幕+确定性手牌”的思路；新目标是薄技能书卷 + 动态身份 + GM 自由世界创作。旧文档是原型历史，不应自动演变为必须满足的程序约束。
3. `mingqing-live-smoke.yml` 仍假定 `/health` 的 JSON **只有三个字段**，而后端新源码多了 `storyEnabled`。如后台成功部署新代码，应修改断言以核实关键字段而不依赖完全相等；附加独立新 GM 测试。
4. 《甲申异闻录》自由文本目前多为关键词回应；AI 即便响应也最多建议三选一，没有自由世界状态更新。名称上的“AI 酒馆”不意味着通用 Agent 已完成。
5. 旧功能的 `localStorage` 不构成云端多用户隔离或可靠迁移；共享 DeepSeek 额度也没有实现经验证的全局成本封顶。不能把 Turnstile/CORS/每 IP 限流等同于付费预算上限。
6. 用户谈及 “Pi” 是一种**精简 Agent + Skill + Tool 的抽象**，不意味着已经接入 Pi、或 Pi SDK 已经可在 Workers 中运行。

## 下一段研究工作的候选路径（不是限定性任务表）

**核心实验：把固定情节版作为对照，新增一条真正自由 GM 最小通路。**

可以先建立一个不会打断旧版的独立实验入口（是否新目录、新分支、新服务由当时约束决定）：
- 最短 GM 提示 + 一份世界总纲索引 + 一张薄地图 Skill。
- 玩家一句任意行动，Agent 主持并**提出**世界/物品/人物/身份的新事实。
- Harness 读取当前状态、校验/提交变动，记录来源和前后差异。
- 下一轮读回原始事实，生成不同于“请选三个预设选项”的合理后果。
- 如果跨区旅行或冒名进入权力中心，检索对应地图书卷，根据当地身份而非玩家固定等级改变称呼、认知、可接触的人。
- 基本 UI 即聊天文本 + 可选卡片/表格；美术仅返回资产 ID，需要才由浏览器单独拉取。

**可用于证伪的三段玩家输入**：
A. “我不选给定方案，先调查这个纸人曾经效忠谁，再向它提出交换。”
B. “我以京师书吏真身离开去辽东，当地把我当敌方奸细；我隐藏旧身份，冒充商队记账。”
C. “我取得权臣的密令，以替身身份进入高阶会议，靠山倒台后能否合理地失去称谓和准入？”

期待观察的是：Agent 是否能自然创造、持久保存、反映 NPC 认知差异，并能从矛盾中恢复；不是预先规定必须成功几次、必须写多少行代码。

## 技术与安全未知

- 选择 Pi SDK / Node 后端 / Worker 内模拟 Agent tool loop：从真实所需能力和运行环境验证选，不提前立教条。
- 公开游客会话 ID、存档寿命、加密、导出、删除、隐私说明与账本事务性均需方案。
- GM 可动态创造奇物/世界规则；但**是否成立**需要区分草稿与确定的世界记录，不能用字符串冒充提交成功。
- 玩家语言可能包含伪装系统指令；应将游客的对话当游戏内输入，而不是改写后台规则和机密的授权。
- 秘密附录应以知识可见性隔离；NPC 不该自动读全书；模型返回的组件必须走受限安全渲染。
- 如准备试用用户的付费 DeepSeek，请先确认实际 Worker 版本、Turnstile 可用性、配额和可停止的开关；不要求把任何 Secret 贴到聊天、代码或 GitHub。

## 验证与留痕建议

- 工作开始时记录：所依据的 GitHub commit/分支、对外访问地址、实际部署版本（若可知）。
- 结果分开报告：源码存在 / 静态测试通过 / 浏览器交互通过 / Cloudflare 已部署 / 真实模型收费调用通过 / 多用户安全验证通过。
- 如修改路由，请保留已有站点烟雾测试，新增可复用的动态 GM 场景测试；避免以假响应宣称真实调用成功。
- 如果发现某一策略与用户目标矛盾，允许大胆替换，并在 [EVOLUTION.md](EVOLUTION.md) 留下更准确的规律和证据。
- 暂停前更新本表：最后可工作的版本、这次做了什么、什么失败、下一位 Agent 的最短启动路径。

## 接手后的最短行动

先回答“现有七幕代码为何不是真正的开放式 GM？”；再选择最小能让世界通过工具持久更新的一条实验，**不要再先写九本完整故事、成就数字、固定卡牌树，或大规模 UI**。如果后来出现更简单的解法，完全可以抛弃这一建议。

**把目标交给未来，把今天的策略当作可替换的工具。**

## 2026-10-19 九州长篇与探索修复

九州前端仓库当前主分支e620f2e。真实5000档基线经公开Worker+实际游戏引擎验收：HTTP200、1353个非空白正文字符/1156汉字、8段、3选项、16.345秒、1881完成Token；未达到旧2500–4800字目标，旧Worker也未透传结束原因。结果不可当成长篇成功。

本分支为九州扩展完整长输入和完整历史消息传输，120000字符总上下文预算与明确超限诊断；正常响应透传finish_reason，length返回output_truncated。story新增可选expectedLength，将5000档3500–4800字等偏好写入服务器主提示，合法短回复仍如实返回，不自动收费重试。其他作品限额与访问策略不变。

前端配套边缘修复、手动取消、实际字数/耗时/结束原因指标由jiuzhou-chronicles处理。此处模拟已通过；长篇线上复验和自由探索连续性尚待发布后记录，不能以CI通过替代。

## 2026-10-19 最终验收与尚未完成项

- 三个真实5000档样本（公开Worker+生产游戏引擎，独立Node会话）：1353字符/16.345秒；加强主提示1486字符/16.885秒；长篇思考3064字符（2691汉字）/28.897秒、7段3项、stop、3673完成Token（含609推理Token）。最后一项可完整解析并分成49个阅读片段，但仍未达到3500–4800字验收范围。不可声称5000字已达标或长篇规划已稳定。
- 实际后续自由探索：1486字回合之后，2170字行动末尾目标“核账人沈澄”保留并被回应；结果422字3项、stop、5.798秒。3064字回合后未重复收费续测。
- 前端PR #8增加真实指标、主动取消和可恢复异常处理；36 Node回归、四阵营剧情树和手机模拟通过。后端PR #5/#6已合并并由CF Git发布，健康 jiuzhouLongFormThinking:true 已实时确认，只表示策略代码可用。
- 仍开放：5000档正文长度达成、任意长会话的长期记忆及所有地区网络稳定性。当前最近完整回合传输不等于无限记忆，有限通过样本不等于所有自由探索无错。
- 本轮验收只调用公开Worker，不读取或修改任何Secret，不读写玩家浏览器存档。报告和原始响应在主任务outputs，前端仓库docs/SHARED-AI-GATEWAY.md也保留了同一结论。后续可先复验这里的真实数据，再选择长篇策略，不能用padding伪造5000字。

## 2026-10-19 后续：Pi 式循环与插件交付（14:00 UTC 实测）

用户新澄清：参考 Pi 极简循环和 DeepSeek Harness 万物插件思想；正文按最终交付计算，思考、工具、JSON不计。前端实现独立 Web Worker 世界/草稿插件，原网址不变；不是安装完整SDK，也没有声称原有全部功能已经插件化。

- 后端 PR #8 已合并为 `eb02277`；公开 Worker 的 `jiuzhouAgentTransport:true` 已确认。`mode:agent` 使用独立 `src/jiuzhou-agent.mjs`，固定服务器工具、稳定排序与固定系统前缀，原生tool calls/结果完整追加；新agent关闭thinking，可选reasoning仅本轮续传。
- 真实公开Worker + 前端 `e1ff4cf` 引擎 + 实际隔离插件：4次模型、5次工具、47.242秒，最终交付5218正文字符（4513汉字）、20段3项，实际引擎82阅读片段。草稿4691字符经工具反馈后补到5218，再交付；剧情历史最终2条，不含内部工具/思考。
- 每步缓存命中0%、96.90%、99.29%、99.39%；累计hit59904/miss17138，77.75%。完成Token5389和正文字数分开。一次样本不是长期缓存或所有自由探索可靠性承诺。
- 前端61个Node回归、四阵营与真实Chromium手机模拟通过；后端原九州、新native、GM和器官回归通过。前端PR #9提供插件实现与详细验收。
- 起步为工具结果留上下文余量，`read_world`不重复完整行动历史，循环中不改已发送前缀。仍无无限上下文/云端持久任务恢复；旧应用并未全部插件化。真实长文测试为独立会话，未读写玩家现有存档。

最短复验：`node deepseek-worker/test-jiuzhou-agent.mjs`（模拟，无费用）；前端 `harness/README.md` 与 `docs/PLUGIN-HARNESS-ACCEPTANCE.md` 区分模拟、真实API与发布检查。不能把5218正文字符改写成5218汉字，更不能把工具/推理Token补进正文。
