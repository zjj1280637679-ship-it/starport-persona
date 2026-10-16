# 异闻酒馆 · 独立 AI GM 网页（实验版）

> **无需游客注册、无需游客 API Key。** 使用本仓库已有 GitHub Pages + Cloudflare Worker + DeepSeek 中转。站长现有云服务账户仍需保持有效；公开 API 使用站长付费额度。

**网页**：https://zjj1280637679-ship-it.github.io/starport-persona/gm-harness/

## 目标

保持 GM 尽可能轻：一句系统提示词；世界丛书只提供简短的地区 × 社会接触层级示例；玩家自由决定行动；AI 生成故事及世界更新提案，后端检查变更结构；每位游客的世界与对话暂时仅保存在当前浏览器。所有技术策略可以替换，目标和客观约束见 [项目总纲](../docs/VISION.md)。

本实验**不同于**此前七幕三选一的 `chronicles/`：这里没有固定必须执行的行动列表；AI 可以在授权的数据区域提出新人物、卡牌、地点与事实。

## 文件

- `index.html`：访客界面；纯文字亦可运行，卡牌采用 HTML/CSS 结构。
- `styles.css`：手机优先样式，不依赖外部图片或构建工具。
- `app.js`：Turnstile 人机验证、GM API 调用、世界状态及日志保存、卷宗导出。
- `books.json`：可替换的薄地图示例；书卷不是固定剧情。
- `test.mjs`：使用模拟 DeepSeek 和模拟 Turnstile 两轮端到端接口测试；无付费调用。
- `../experiments/gm-organs/SYSTEM.txt`：唯一 GM 一句系统角色描述的来源；Worker 中当前复制为 `GM_SYSTEM`。
- `../experiments/gm-organs/GM.md`：可选 GM 启发性文档；不默认塞入全部模型上下文。
- `../deepseek-worker/src/index.js`：独立 `POST /api/gm/turn` 及世界变更结构校验。

## 首次接通（目前**默认未启用** GM 调用）

当前 `deepseek-worker/wrangler.toml` 使用 `GM_ENABLED="false"`；前端会明确显示 GM API 待开放，**不会伪造模型回复**。此项默认值是为了避免 GitHub 一提交就让所有公网访客使用站长的付费额度。

1. 确认现有 Cloudflare Worker `starport-deepseek-gateway` 由 GitHub 的 `deepseek-worker/` 最新代码部署，且其运行时已设置 `DEEPSEEK_API_KEY` 与 `TURNSTILE_SECRET` 两个 Secret。
2. 确认 `GM_LIMITER` 已按 `wrangler.toml` 创建，并有 3 次/分钟/来源的独立限流配置；`AI_LIMITER` 继续为旧接口服务。
3. 先确认 DeepSeek 账户有可接受的花费上限、预算与可断路方式。**3次/分钟/来源不是全局费用封顶**，Turnstile 和 CORS 也不能提供完整账务保障。
4. 站长确定可以开放时，将版本化 Worker 配置 `GM_ENABLED` 设为 `"true"` 并重新部署；别只改临时仪表盘值又在下次发布被仓库配置覆盖。
5. 打开新网页，检查 API 状态为“DeepSeek GM 已就绪”；勾选同意框；提交一次虚构游戏行动，并完成 Turnstile。确认回文与卡牌/世界变更，检查供应商实际费用。
6. 若 Cloudflare GitHub 自动部署尚未连接或者不工作，需在已有账户中重新部署 Worker；**不需要注册新账户**。

`GET /health` 新增 `gmEnabled` 非秘密标志；不展示任何密钥。

## 状态和安全边界

- 浏览器 `localStorage` 保存当前世界与完整 UI 卷宗；服务器未提供真正的会话数据库、账号、跨设备同步、稳定多设备恢复。
- 每次合法 AI 调用中，当前游戏世界、最近几条对话、当轮发言和选择加载的地图设定会发送到云端模型；不要输入私人秘密。
- 新路由要求精确来源、Turnstile 令牌、速率限制和固定最大输入/输出；API Key 只保存在 Worker Secret 中。
- **游戏状态由浏览器回传，属本机娱乐存档，不是防作弊的权威服务器账本**。后端做结构与长度校验，不承诺自动确保全部剧情逻辑无矛盾。
- GM 的 `changes` 用受限路径与操作描述；非法变更会被拒绝，不会执行 AI 提交的 JavaScript/HTML。
- 目前只实现每轮一次结构化模型回应，不是真正 Pi SDK 运行、可循环工具自主发现或服务器持久记忆。
- 纯前端静态页面可以公开查看；接口默认关闭。没有联网时输入仍会保留，但不会假装调用成功。

## DNA 验证

```sh
node gm-harness/test.mjs
node experiments/gm-organs/dna.mjs
```

CI：[GM Harness API Smoke](https://github.com/zjj1280637679-ship-it/starport-persona/actions/workflows/gm-web-smoke.yml)。

下一阶段：确认真实 Worker 部署→实际付费模型请求→手机视觉验收；再以任意游客策略检验“创造→持久化→再读取”的连续性。是否采用真正 Pi 或改数据库，等证据出来再决定。
