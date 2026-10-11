# 星港人格档案馆 · Starport Persona

一个面向中文用户的免费、游客免登录娱乐人格测试网站。静态页面，不需要服务器或数据库。

## 体验内容

- 群星议会：文明与政治倾向的娱乐测试、随机题目路线。
- 人格副本：生活情境与八种人格结果。
- 乱世抉择：历史情境题及八种结果。
- 结果页：档案描述、维度条、重测与分享。

## GitHub Pages 发布

1. 打开 [Settings → Pages](https://github.com/zjj1280637679-ship-it/starport-persona/settings/pages)。
2. 在 **Build and deployment** 中将 **Source** 设为 **Deploy from a branch**。
3. **Branch** 选 `main`，目录选 `/(root)`，点击 **Save**。
4. 部署成功后访问 https://zjj1280637679-ship-it.github.io/starport-persona/ 。

> 提示：中国大陆网络访问 GitHub Pages 的稳定性因地区、网络运营商而异，不能保证每个访客都能打开。建议发布后用大陆手机移动网络验证。

## 迭代原则

- 核心答题逻辑完全在本地浏览器运行，不需要外部 JavaScript CDN。
- 无用户注册，不强制登录。
- 测试是娱乐内容，不属于科学心理诊断。
- 未来可以把单文件 `index.html` 拆成独立的 CSS/JS/题库数据，再接入服务端 AI 评语（密钥切勿写进前端）。

## 版本

- **v1.1**：静态首页、3 个可玩测试、响应式页面、结果档案。
