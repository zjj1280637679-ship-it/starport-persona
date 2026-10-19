# Web 文本冒险环境技能 · 2026-10-19

此文档描述**当前真实实现**，与可粘贴的故事剧本分离。代码内的 `CORE` 是执行时生效的最小协议；此文件是人类/其他 Agent 的交接说明，不会自动同步进提示词。

- 输入：本轮玩家原话、近 12 条历史、当前世界状态、后台配置的剧本及系统提示词。
- 输出：JSON `{narration, choices, tools}`。`choices` 推荐 2–4 项，玩家可跳过选项自由打字。
- 工具：`remember_fact{text}` 追加永久事实；`set_scene{scene}` 切换场景；`set_flag{key,value}` 更新故事标志；`adjust_stat{key,delta}` 更新资源数值。只有被后端白名单接受的动作才提交。
- 浏览器存档：`turns`、`world`、撤销快照；可导出/导入 JSON。访客数据不在 Worker KV 集中存储。
- 后端故事配置：Cloudflare KV 键 `mini-adventure:config:v1`；只能携带 `ADVENTURE_ADMIN_TOKEN` 的请求改写。公开 `/public` 不包含系统提示词和剧本。
- 状态约束：字段、数组规模有安全上限；模型不能执行 JavaScript、发网络请求或读私有文件。提供的是受限 Agent 工具，不是 Pi SDK 实例。
- 异常：上游错误、JSON 无效、生成截断均返回明确失败；浏览器回滚用户本轮，**不伪装成功**。

变更设计时请区分「可玩剧情」「实际世界状态变更」和「只在文本中自称发生」，并复测工具调用结果。