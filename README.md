# 🌿 YangtzeChen.github.io

一个清新、极简的个人博客，部署在 GitHub Pages 上。

采用日系 / 北欧风格设计，配合经过**重度界面骇客定制化（UI Hacks）**的 [Decap CMS](https://decapcms.org/) 实现浏览器端内容管理 —— 无需本地环境，感受 500px 级的高级沉浸式发布体验。

## ✨ 特性 (V2.7.0 后台全局视觉与交互重构精调版)

- 🎨 **高级视觉美学** — 灵感源自 500px 与 Unsplash，摒弃繁杂边框，大面积留白配合微妙的阴影投影，打造纯粹的沉浸感
- 🌈 **五套主题切换** — 浅色 / 深色 / 莫兰迪红 / 水蓝 / 草绿，基于 CSS Variables 实现一键切换，选择自动持久化
- 📝 **极简博客系统 (Medium 式书写)** — 深度覆写 Markdown 编辑器原生样式，干掉边框与区隔，为您提供无阻碍的文字心流体验
- 🖼️ **摄影师专属画廊** — 紧凑高密度 Masonry 瀑布流布局，集成通透浅色、无极缩放的沉浸式图片 Lightbox
- 🔧 **后端重铸的极致 CMS** — 打破常规块状上传！采用 CSS 并发式矩阵侵入，强制使上传列表排列为 Unsplash 高清网格，引入防覆盖防冲突绝对唯一 Slug 生成算法！
- ⚡ **GitHub Actions 自动化** — CMS 发布新相集或文章后自动深层遍历构建序列化轻量级 JSON 索引
- 📱 **流体响应式** — 精密适配从 4K 桌面到移动端（手机端画廊自动降级单栏），首页呈现独特的最新摄影马赛克预览
- 🍃 **零成本纯静态** — 仅靠静态化渲染与免费的各种 Provider，无需自费服务器即开箱即用

## 📁 项目结构

```
├── index.html                 # 首页
├── blog/index.html            # 文章列表与阅读页
├── gallery/index.html         # 相册画廊
├── css/style.css              # 全局样式
├── js/main.js                 # 客户端逻辑
├── admin/
│   ├── index.html             # Decap CMS 入口
│   └── config.yml             # CMS 配置
├── content/
│   ├── blog/                  # 博客文章 (Markdown)
│   └── gallery/               # 相册图片与数据
├── docs/
│   └── CHANGELOG.md           # 版本修改说明
└── .github/workflows/
    └── rebuild-index.yml      # 自动重建内容索引
```

## 🚀 部署

本站设计为直接部署在 GitHub Pages 上：

1. 将仓库推送到 `YangtzeChen/YangtzeChen.github.io`
2. GitHub Pages 会自动从 `main` 分支部署
3. 访问 `https://YangtzeChen.github.io` 即可查看

## 🔐 CMS 后台配置

首次使用 CMS 后台管理（`/admin/`），需要配置 GitHub OAuth 认证。

详细步骤请参阅 👉 [CMS_SETUP.md](CMS_SETUP.md)

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| HTML / CSS / JS | 页面结构与交互 |
| [Decap CMS](https://decapcms.org/) | 浏览器端内容管理 |
| [marked.js](https://marked.js.org/) | 客户端 Markdown 渲染 |
| [Google Fonts](https://fonts.google.com/) | Noto Serif JP + Inter 字体 |
| GitHub Actions | 内容索引自动更新 |
| GitHub Pages | 静态站点托管 |

## 📋 更新日志

详见 👉 [docs/CHANGELOG.md](docs/CHANGELOG.md)

## 📄 许可

© 2026 YangtzeChen. All rights reserved.