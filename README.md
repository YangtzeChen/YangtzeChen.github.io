# 🌿 YangtzeChen.github.io

一个清新、极简的个人博客，部署在 GitHub Pages 上。

采用日系 / 北欧风格设计，配合 [Decap CMS](https://decapcms.org/) 实现浏览器端内容管理 —— 无需本地环境，直接在网页上发布文章和上传图片。

## ✨ 特性

- 🎨 **清新淡雅的设计** — Noto Serif JP + Inter 字体组合，柔和配色，充裕留白
- 📝 **博客系统** — 支持 Markdown，客户端渲染，自动解析 front-matter
- 🖼️ **相册画廊** — 瀑布流布局，点击放大灯箱效果
- 🔧 **Decap CMS 后台** — 浏览器端编辑，通过 GitHub OAuth 认证，保存即自动 commit
- ⚡ **GitHub Actions 自动化** — CMS 发布新内容后自动重建索引，无需手动操作
- 📱 **响应式设计** — 适配桌面、平板和手机
- 🍃 **纯静态** — 无需服务器、数据库或构建工具

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

## 📄 许可

© 2026 YangtzeChen. All rights reserved.