# 极简 AI 文字冒险 · Mini Adventure (2026-10-19)

**游戏入口**：`https://zjj1280637679-ship-it.github.io/starport-persona/mini-adventure/`（在 GitHub Pages 启用并发布后可访问；中国大陆连通性不保证）。

**站长后台**：在游戏右上角点击 `⚙`，或用 `?admin=1` 打开。访客不需要邀请码、验证码、站长开关或应用层 AI 频率/次数配额。

## 结构

```
mini-adventure/index.html            独立零依赖网页游戏（纯 HTML/CSS/JS）
mini-adventure/ENVIRONMENT-SKILL.md  环境技能约定
mini-adventure/EXAMPLE-STORY.md      可粘贴的公开示例剧本
deepseek-worker/src/mini-adventure.mjs  独立 Worker API 模块
```

网页 → Cloudflare Worker `/api/mini-adventure/*` → DeepSeek；真实 `DEEPSEEK_API_KEY` 仅在 Worker Secrets。Worker KV 保存站长后台的系统提示词及剧本；浏览器本地保存玩家存档。

## 让线上 AI 和后台编辑真正可用

1. 在 Cloudflare 现有 Worker `starport-deepseek-gateway` 配置密钥 `DEEPSEEK_API_KEY`（若已存在，保留），另增加 Secret `ADVENTURE_ADMIN_TOKEN`（建议随机不少于 20 字符；**不**提交仓库）。
2. 为 Worker 绑定一个 KV Namespace，变量名必须是 `ADVENTURE_CONFIG`。打包的 `wrangler.toml` 使用 Wrangler v4 资源自动配置；首次部署如未自动创建，参考 Cloudflare Dashboard → Worker → Settings → Bindings → KV Namespace 手工绑定。
3. 在 `starport-persona/deepseek-worker` 中部署 `npx wrangler@4 deploy`，或使用仓库现有的 `Manual Worker deploy fallback` GitHub Action（前提是 Actions Secrets 已配置）。只向现有 Worker **新增独立路由**；不要覆盖旧 API。
4. 访客浏览器来源应为 `https://zjj1280637679-ship-it.github.io`，现有 `ALLOWED_ORIGIN` 已包含这一主机。若改为国内静态网站，在 Worker 环境变量 `ADVENTURE_ALLOWED_ORIGINS` 写入精确来源，例如 `https://play.example.cn`，多个用英文逗号分隔。切勿使用 `*` 广播 CORS。
5. 打开 `/mini-adventure/?admin=1`，输入站长令牌并点击「读取云端配置」，粘贴系统提示词与剧本，保存到 KV。网页源码和 GitHub 不含实际私有剧本。
6. 玩家页输入「我拆开信封」测试真实 AI。`GET /api/mini-adventure/public` 仅能检查是否配置密钥，**不能证明真实模型调用成功**。

## 中国大陆访问

无需第三方 JS、字体、图片、CDN，HTML 可直接上传到中国大陆能够访问的静态托管。GitHub Pages（`github.io`）和 Cloudflare `workers.dev` 的中国大陆可达性不作保证。对内地正式上线建议：使用国内持有的已备案域名/合规静态托管，并**另行验证玩家网络可以请求 Worker API**；必要时将 API 入口切换到适用的自有域名/国内接入服务。本版未购买域名、未办理备案、未验证大陆运营商实际连通性。

## 离线检查

```sh
node --check deepseek-worker/src/mini-adventure.mjs
node deepseek-worker/test-mini-adventure.mjs
python -m http.server 8000
```

在浏览器中打开 `http://localhost:8000/mini-adventure/` → 「本地演示」可以测试 UI。真实在线请求因 Origin 限制需要配置匹配的合法域名。

## 已实现 / 未验收

- 已实现：手机响应式、自由输入、AI 返回选项、KV 管理员配置、规则化状态工具、完整错误回滚、浏览器本地存档、导入导出、撤销、离线 UI 演示、模拟 Worker 测试。
- 尚需线上验收：生产 Worker 新代码是否已发布、KV 和 Secret 是否已配置、真实 DeepSeek 实际可用、至少一次真实多轮剧情、中国大陆网络访问。
- 这不是 Pi SDK 或具有持久云端玩家账户的自治 Agent；它是**带后端白名单世界工具的最小 AI GM**。