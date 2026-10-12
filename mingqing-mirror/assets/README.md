# 明清人物镜美术资源槽

所有素材先走图形占位，再换 WebP / PNG 静态图，最后有选择地换 GIF。
本目录放网站同源可公开访问的图片，不放原始游客回答或 API 密钥。

素材文件名示例：
- home-background.webp
- home-hero.webp / home-hero.gif
- questions/p1.webp
- questions/g1.webp
- characters/chongzhen.webp / characters/chongzhen.gif
- results/banner.webp
- icons/brand.png, icons/scroll.png
- cards/frame.png (透明背景)

每换一张素材，在 ../media.js 的 MEDIA 对象内配置对应的槽位 ID。没有配置的题目或人物使用全站图形占位。
静态图片优先压缩 WebP；PNG 用于透明边框与图标；动画 GIF 只在确有价值的场景使用，移动端注意尺寸与体积。
