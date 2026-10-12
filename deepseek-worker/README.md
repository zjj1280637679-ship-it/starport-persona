# DeepSeek V4.1 Flash · 共享安全中转（未部署）

该目录是服务器代码准备区，不是已经开通的在线 API。**默认 `AI_ENABLED = "false"`**，尚未配置 Cloudflare、DeepSeek 密钥、Turnstile 密钥之前，两个 GitHub Pages 网站均不会执行付费调用。

## 已确定供应商参数

- 官方 API 地址：`https://api.deepseek.com/chat/completions`
- V4.1 Flash 模型名：`deepseek-flash`
- Authorization: `Bearer <DEEPSEEK_API_KEY>`（只能在服务端构造）
- JSON 输出：`response_format: {"type":"json_object"}`
- 不使用思考模式处理简单证据分类任务，限制 max_tokens。

文档：https://api-docs.deepseek.com/zh-cn/

## 需要用户自己完成的一次性部署步骤

1. 登录 Cloudflare，开通 Workers（免费档即可试验）。
2. 在 Cloudflare 的 Turnstile 中，为 `zjj1280637679-ship-it.github.io` 创建网站验证控件，获得**公开 Site Key**和**私密 Secret Key**。不要把 Secret Key 放到 GitHub。
3. 在自己的可信本地终端（或可信 Work 云端开发环境）进入仓库的 `deepseek-worker/` 目录，运行：
   ```sh
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put DEEPSEEK_API_KEY
   npx wrangler secret put TURNSTILE_SECRET
   ```
   请通过交互式密钥输入完成部署，避免把密钥作为命令行参数、日志或文件提交。
4. 在 `wrangler.toml` 中把 `AI_ENABLED = "false"` 改成 `"true"`，确认 Turnstile 已配置、模型访问权限有效，再运行 `npx wrangler deploy`。
5. 拿到真实 Worker URL（例如 `https://<YOUR-WORKER>.<YOUR-SUBDOMAIN>.workers.dev`），打开 `mingqing-mirror/ai-config.js`，**只填写公开 URL 和公开的 Turnstile Site Key**：
   ```js
   export const AI_CONFIG = {
      endpoint: "https://YOUR-WORKER-URL.workers.dev",
      turnstileSiteKey: "YOUR-PUBLIC-TURNSTILE-SITE-KEY"
   };
   ```
   提交 `ai-config.js` 后 GitHub Pages 会自动重新部署。DeepSeek 密钥永远不能提交。
6. 在明清人物镜的模式选择页勾选 AI 同意框，答题时验证浏览器/Turnstile、网络调用与返回 JSON；无权或失败时自动降级为离线评分。

## 保护付费额度的约束

- Worker 默认关闭，未设置全部 secrets 不允许请求；
- 仅接受来自本仓库 GitHub Pages 的指定 Origin；
- 每一次付费请求必须进行 Cloudflare Turnstile 服务端单次验证（有效期5分钟，不可复用）；
- Cloudflare Worker 内置请求限流（12次/分钟/网络地址/端点）；
- 只接受 3 个固定业务路由，不提供任意 messages、model 和 max_tokens 透传；
- 只有 `deepseek-flash` 模型，JSON 输出，限制服务端 token 输出，禁止前端选昂贵模型；
- 强制输入限制：单份回答最多1800字符，整个请求体最多13KB，超时回退；
- 永不将整份历史访谈作为日志记录，史官判词只发送最接近历史人物姓名和维度标签；
- 工程只含**速率**限制，没有真正强原子性的每日人民币开销封顶；实际正式公开前应配合 DeepSeek 平台余额管理、告警、服务端全局预算锁（可用 Durable Objects）与异常停用开关。尤其不要误以为 CORS 本身能防止滥用。
- Turnstile 令牌只用于当次 AI 请求，前端勾选是本次测试同意；不勾选则只用原来的本地引擎。
- Worker 不会修改智谋题、题库 ID、人物库、历史阵营或四维最近邻的公式。

## 现有三个固定 API

- `POST /api/analyze`：输入 `questionId` 与当前自由回答；返回 `{keep:false,analysis:{value,confidence,quote}}`；引文必须逐字存在于当前回答，可信度不足则 KEEP。
- `POST /api/rewrite`：输入当前预定题 ID、**当前游客**以前的回答和原场景；仅允许已批准的安全白名单词汇替换；未找到句柄立即 KEEP，绝无加题或评分修改。
- `POST /api/commentary`：输入最终人物名称和四维的优势/差异名称，只输出游戏化、谦逊的史官判词。由游客在结果页主动点击才请求。

`GET /health` 用于检查 Worker 已部署与环境是否齐备，但不暴露密钥。

## 待验收

- [ ] Worker 已在 Cloudflare 部署，`/health` 显示 configured 和 enabled 均为 true
- [ ] Turnstile 允许 GitHub Pages 指定域名，实际 iPhone/Safari 完成挑战
- [ ] DeepSeek 能返回 V4.1 Flash 非空合法 JSON
- [ ] 游客拒绝 AI 时，不会出现任何 DeepSeek 请求
- [ ] 请求失败/无密钥/超限时，能完成整个离线测试
- [ ] 无原文句柄时绝不改写，句柄不合适时保留原题
- [ ] 智谋准入与四维最近邻算法不受模型输出控制
- [ ] 观察供应商实际费用，测试公网滥用限额

## 提醒

`GitHub Actions Secrets` 不能安全地为 GitHub Pages 前端提供 DeepSeek 密钥；即使 GitHub CI 读取了 secret，只要最终打包进浏览器 JS 就会公开。这里需要的是 Cloudflare Worker 运行时秘密环境变量。
