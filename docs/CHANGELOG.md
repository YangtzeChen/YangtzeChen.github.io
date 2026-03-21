# 版本修改说明

## V2.2.0 — 2026-03-22

### ✨ 极致 500px 体验 (CMS 深度骇客级重制) & 架构绝杀版

- **500px 级相片列阵编排**：厌倦了原本死板的上下堆叠式的“图片积木（Block）”！我们通过深渊级 CSS 覆写将 Decap CMS 的列表上传区域**强制拍平成了超酷的横向 Flex 联排网格**。现在上传照片就像在 Unsplash / 500px 的画廊一样丝滑。
- **Medium 级流体 Markdown 撰写**：彻底干掉了原生文章编辑器那恶心丑陋的黑色边框和块状阴影。现在文本框是一片巨大的沉浸式呼吸白纸，字体放大且调优，插入的图片将与文字像流水一样无缝融合。
- **防覆盖唯一锁 (Collision Proofing)**：从底层拦截了“新建图集时载入上一个图集”的离奇 Bug。标识符 Slug 修改为极其严酷的防撞格式：`{{year}}{{month}}{{day}}{{hour}}{{minute}}{{second}}-{{slug}}`，彻底断绝重名覆盖。
- **“重磅封面”激活历史白屏**：修复了在 CMS 后台查看相册历史时都是无头白点的问题。为每个图组新增了首选独立 `cover` 字段，不仅解决了后台索引抓取，还让您的历次创作展示更加闪耀。
- **防冲突锁喉 (Git Simple Publish)**：废除复杂且容易诱发冲突的草稿系统，写入 `publish_mode: simple` 强制启用直接覆盖合并主干线流，配合 Git 强检，再也不怕您去 Github 源头更改文字后回到 CMS 时报 Git 冲突错误。

---
## V2.1.0 — 2026-03-22

### ✨ 架构重构 & Sveltia CMS 升级

- **Sveltia CMS 强效赋能**：放弃了陈旧的 Decap CMS，全面迁移至基于 Svelte 框架的全新一代 [Sveltia CMS](https://github.com/sveltia/sveltia-cms)。带来极度美观的全黑白暗色系 UI、完全所见即所得的 Markdown 行内编辑，并支持**沉浸式拖拽传图**，彻底抛弃割裂的“图片区块”感，真正对齐 500px/Unsplash 的高端编辑体验。
- **强制唯一图群索引 (Data Architecture)**：修复了点击新建相册可能覆盖旧相册的风险。相册标识符 (Slug) 的生成规则重置为精确到分的 `{{year}}-{{month}}-{{day}}-{{hour}}{{minute}}-{{slug}}`，保证每次生成的独立隔离。
- **Git 防冲突同步机制**：受益于 Sveltia 的原生 File System / Git Tree 解析引擎，后台现在会在执行任意覆写操作前强行校验抓取 Origin 最新节点，极大降低了前端编辑和 GitHub 仓库原生编辑的冲突率。
- **缩略图路径修正**：重置了全局 `media_folder` 映射关系，彻底修复了后台历史相册封面白屏（无法解析）的历史遗留问题。
- **智能透明修复加载**：保留并重做了透明 PNG 专用的 Checkerboard 灰白相间底层 CSS 逻辑，这次完美嵌入了 Sveltia 自定义的预览上下文中。

---
## V2.0.0 — 2026-03-22

### ✨ 新增功能 & UI 重构 (500px/Unsplash 风格)

- **前台美学重塑**：废除卡片边框并大幅度降低阴影存在感，完全依靠留白与微弱投影展现更纯粹的图片。
- **全新瀑布流与相册阅览**：相册（Gallery）更换为无缝的 Masonry 瀑布流；详情页升级为极简、高对比度（暗色背景）的沉浸式弹出层，EXIF与描述文字被优雅地放置在侧栏/底部。
- **首页更新**：新增了“最新摄影”拼图展区 (Mosaic)；修复了当首页只有一篇文章时无法自动居中的排版。
- **CMS 上下文媒体库**：利用 Decap CMS 的 `media_folder: ""` 以及 `public_folder: ""`，实现了媒体上传隔离。现在，上传图片将自动归属于本条相册自己的独立文件夹下，解决了媒体库混乱且无需从全局图库中重新挑选。
- **透明背景修复**：后台预览加入了经典的灰白相间（Checkerboard）CSS，以完美显示含有 Alpha 透明通道的图片素材。
- **公开安全性加强**：移除了前台单页的“在后台编辑”的捷径按钮，提高公开页面的纯洁度和安全性。

---
## V1.2.0 — 2026-03-22

### ✨ 新增功能

- **前台相册 Instagram 风格重构**：从简单的瀑布流升级为高级卡片式（图文并排）布局。支持多图横向滑动切换。
- **图组精细化信息支持**：如今上传相册时可设置统领整组的【主标题】和【主描述】；同时对于组内的每一张图片，也能独立标注单独的【子标题】与【子描述】。
- **后台预览体验升级**：定制了 Decap CMS 的专属预览模板，后台相片列表更直观，相片编辑页面实现“所见即所得”的极佳体验。

### 📁 涉及文件

| 文件 | 改动说明 |
|------|----------|
| `docs/CHANGELOG.md` | 新增 V1.2.0 记录 |
| `admin/config.yml` | 增加相册 schema 的子标题、子描述字段，并应用 list summary 优化列表展示 |
| `admin/index.html` | 注入 CMS React Preview Component 自定义后台的视觉展示效果 |
| `css/style.css` | 针对新的 Instagram 排版加入响应式分栏与内联滚动 CSS 代码 |
| `js/main.js` | 重写了前台相册渲染与轮播（Carousel）交互逻辑 |
| `.github/workflows/rebuild-index.yml` | 升级 Python 提取脚本以抓取多图的子标题和子描述数据 |

---
## V1.1.2 — 2026-03-22

### ✨ 新增功能

- **后台相册管理升级**：支持按组或单张上传图片，增加日期、标题、描述字段。更换为网格视图显示。
- **后台快捷发布入口**：在后台相册网格第一排最左侧增加空白的“+”卡片，点击可直接进入发布新相册页面。

### 🐛 问题修复

- **前台文章加载失败**：修复了 GitHub Actions 重建文章索引 `index.json` 时引号转义引起的 JSON 解析错误，恢复文章的正常展示。
- **空状态样式修复**：修复了前台没有内容时，“前往后台发布”提示文字偏离居中的问题（增加 `grid-column: 1 / -1`）。

### 📁 涉及文件

| 文件 | 改动说明 |
|------|----------|
| `docs/CHANGELOG.md` | 记录本次修改 |
| `css/style.css` | 修改 `.empty-state` 样式使其占据整个网格行 |
| `.github/workflows/rebuild-index.yml` | 使用 Python 替代 sed 进行 YAML 解析，修复 JSON 标点错误 |
| `admin/config.yml` | 重构 gallery 集合为 `view_style: grid` 和多图字段结构 |
| `admin/index.html` | 注入 JS & CSS，实现网格首位的“+”号上传入口 |
| `js/main.js` | 适配多图层级的 JSON 结构解析 |

---
## v1.1.0 — 2026-03-22

### ✨ 新增功能

- **文章编辑入口**：文章详情页标题下方新增「✏️ 编辑」按钮，点击后直接跳转到 Decap CMS 编辑该文章（`/admin/#/collections/blog/entries/{slug}`），在新标签页打开

### 🎨 样式更新

- 新增 `.post-meta-row` 布局样式：文章日期与编辑按钮水平并排居中显示
- 新增 `.post-edit-link` 按钮样式：药丸形边框、柔和灰色调，hover 时高亮为主题绿色

### 📁 涉及文件

| 文件 | 改动说明 |
|------|----------|
| `js/main.js` | `loadSinglePost()` 中的 `postHeader.innerHTML` 新增编辑链接和 `.post-meta-row` 容器 |
| `css/style.css` | 新增 `.post-meta-row`、`.post-edit-link`、`.post-edit-link:hover` 三条规则 |

---

## v1.0.0 — 2026-03-21

### 🎉 初始版本

- 静态博客站点上线，基于 GitHub Pages 部署
- **首页** `/`：Hero 区域 + 关于我 + 最新文章展示
- **文章页** `/blog/`：文章列表 + 文章详情视图（通过 `?post=slug` 参数路由）
- **相册页** `/gallery/`：瀑布流相册 + Lightbox 灯箱查看
- **后台管理** `/admin/`：集成 Decap CMS，通过 GitHub OAuth 认证后可在线编辑并推送到仓库
- **GitHub Actions**：CMS 提交后自动重建 `content/blog/index.json` 和 `content/gallery/index.json` 索引
- 设计风格：日式极简 + 北欧清爽，使用 Noto Serif JP + Inter 字体组合
- 全站响应式适配（桌面 / 平板 / 手机）
