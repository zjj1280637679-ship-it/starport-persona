# 工作树地图与部署入口（2026-10-16 快照）

> 信息取自当前 GitHub 默认分支的递归目录、实际源码及 GitHub Actions 记录。**仓库文件树 ≠ 开发者本机 `git worktree` 列表**；远端 API 无法验证任何尚未 push 的本地改动。修改前刷新该快照。

## 仓库与可访问入口

- GitHub: https://github.com/zjj1280637679-ship-it/starport-persona
- 主分支：`main`；本次查询仅看到这一个远端分支；GitHub Pages 为项目站点路径部署
- 根站《暮灯星栈》：https://zjj1280637679-ship-it.github.io/starport-persona/
- 固定题版《明清人物镜》：https://zjj1280637679-ship-it.github.io/starport-persona/mingqing-mirror/
- 卡牌试玩《甲申异闻录》：https://zjj1280637679-ship-it.github.io/starport-persona/mingqing-mirror/chronicles/
- Cloudflare Worker: `https://starport-deepseek-gateway.zjj1280637679.workers.dev`
- Worker 健康入口：上述 URL + `/health`（不能据健康通过声称已完成真实模型调用验证）

## 逻辑树（略去原始图片文件）

```text
starport-persona/
├── AGENTS.md                       ← 所有 Agent 从这里开始
├── README.md                        ← 原始暮灯星栈介绍；历史说明
├── docs/                            ← 当前目标/工作树/交接/丛书协议
│   ├── VISION.md
│   ├── WORKTREE.md
│   ├── WORLD-LIBRARY.md
│   ├── HANDOFF.md
│   └── EVOLUTION.md
├── experiments/gm-organs/          ← 当前最新的可替换器官/DNA 验证
│   ├── README.md                    ← 6 种候选功能及最小输入输出
│   ├── organs.mjs                   ← 独立可替换实现
│   └── dna.mjs                      ← 无付费模型的最小样本断言
├── index.html / styles.css
├── src/
│   ├── app.js                       ← 原站交互
│   └── engine.js                    ← 原站测试引擎
├── assets/                          ← 原站图片与塔罗牌
├── mingqing-mirror/
│   ├── README.md                    ← 旧题库设计说明
│   ├── index.html / app.js / data.js / styles.css
│   ├── media.js                     ← 公用素材槽、SVG 回退
│   ├── ai-config.js                 ← 仅公开 URL、Turnstile Site Key
│   ├── ai-client.js                 ← Worker 客户端、Turnstile
│   ├── assets/README.md
│   └── chronicles/
│       ├── index.html / styles.css  ← 七幕试玩界面
│       ├── game.js                  ← 当前分支/卡牌/存档逻辑
│       ├── story-pack.json          ← 12卡/8成就/7节点/3结局
│       └── DESIGN.md                ← 旧「确定性卡牌游戏」设计
├── deepseek-worker/
│   ├── wrangler.toml                ← Worker 配置，AI_ENABLED=true
│   ├── src/index.js                 ← API、Turnstile、限流、模型调用
│   └── README.md                    ← 较旧的初始部署说明
└── .github/workflows/
    └── mingqing-live-smoke.yml     ← 旧题库/PW/健康与安全烟雾测试
```

## 当前实现的界限

**根站**：文明倾向酒馆、固定/分叉问答与卡片视觉；尚非动态 GM。
**明清固定题版**：固定 12/28 题，历史人物拟合，已有 DeepSeek 可选/默认 AI 的代码；具体 UI、请求链由实际版本核验。
**甲申异闻录**：七个预置情节，每幕三个硬选择；12 张预置卡、8 项成就、3 种结局，浏览器 `localStorage` 存档。自由输入存在，但离线时使用关键词回应；联网时 `/api/story/turn` 只生成回复和建议 0/1/2 三选一，需要游客确认后才执行；**并非自由规划世界、编辑地图、动态创建卡牌的 Agent**。
**素材**：`media.js` 有大量绘制/引用槽，实际存在的原站 WebP 不代表新故事的插画已完成。可渲染文字与图形占位。
**后端**：Worker 实现 `/api/analyze`、`/api/rewrite`、`/api/commentary` 与实验 `/api/story/turn`，以及 `/health`。`AI_STORY_ENABLED` 在当前配置文件没有设为 true，因此实验路由代码层面保持关闭。GitHub 代码部署到 Cloudflare 的实时版本有时差，必须以线上验证为准。

## 当前已知 CI 行为

- `mingqing-live-smoke.yml` 主要检查**旧的明清题库站**、Playwright 视图、Turnstile 缺省拦截，不是新 GM 的完整验收。
- 截至本次查询，`399edfc74c` 对应的 Actions 记录为 success；这只证明当时的工作流通过，不代表后续项目目标实现。
- **已发现潜在版本耦合**：烟雾测试断言健康响应恰等于 `{ok:true,configured:true,enabled:true}`，而新 Worker 源码已增加 `storyEnabled` 字段。真实部署新版 Worker 后旧断言可能失败。需要在修正时改为包含式断言并增加新工作流的独立验证，不要通过伪装数据掩盖矛盾。
- 当 Cloudflare 对 GitHub Actions 执行器阻拦时，该脚本有提前结束的路径；`success` 不保证检查到了所有后端条件。
- 没有证据证明真实访客完成了完整 Turnstile→DeepSeek 文本生成测试；已存在源码级模拟验证。

## 运行/检查方法（候选，不是强制技术栈）

- 本地静态浏览：可在仓库根目录使用任一可信静态 HTTP 服务器（例如 `python3 -m http.server 8000`），访问 `/mingqing-mirror/chronicles/`；不要直接以 `file://` 期望 ES Module + fetch 正常工作。
- JS 语法：可用 Node `node --check` 校验独立脚本；`import` 的运行需要模块环境。
- 浏览器：实测首页、旧题版、七幕版；继续/重新开始/图鉴/导出；手机视口与可访问性。
- Worker 本地/部署：参考 `deepseek-worker/wrangler.toml`。Secrets **只在 Cloudflare 加密环境**存在，不在仓库、日志或任何客户端配置文件。
- 免费请求测试：先检查 `/health`、预检、错误来源与缺少 Turnstile 的拒绝；不要未经预算控制进行公开付费压力测试。

## 交接注意

不要把 GitHub 目录已经存在误认为功能已通过线上验收；也不要把旧 `DESIGN.md` 的卡牌列表、固定七幕与原始 README 的旧“未部署”说明解释成不可修改的未来范围。新工作请将客观最新状态写回 [HANDOFF.md](HANDOFF.md)。
