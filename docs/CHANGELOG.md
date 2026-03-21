# 版本修改说明

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
