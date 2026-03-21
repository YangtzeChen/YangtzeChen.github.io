# Decap CMS 后台管理 — 配置指南

本站使用 [Decap CMS](https://decapcms.org/) 作为浏览器端内容管理系统。  
CMS 通过 GitHub OAuth 认证后，可直接在浏览器中编辑文章和上传图片，保存时自动 commit 到仓库。

---

## 1. 创建 GitHub OAuth App

1. 打开 [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写信息：
   - **Application name**: `My Blog CMS`（随意）
   - **Homepage URL**: `https://YangtzeChen.github.io`
   - **Authorization callback URL**: `https://sveltia-cms-auth.YOUR_SUBDOMAIN.workers.dev/callback`  
     （第 2 步部署完成后替换 `YOUR_SUBDOMAIN`）
4. 创建后，记下 **Client ID** 和 **Client Secret**

---

## 2. 部署免费 OAuth 代理（Cloudflare Workers）

使用 [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)，5 分钟即可部署。

1. 点击仓库 README 中的 **"Deploy to Cloudflare Workers"** 按钮
2. 登录你的 Cloudflare 账号（免费注册即可）
3. 在 Workers 设置中添加环境变量：
   - `GITHUB_CLIENT_ID` = 你的 GitHub OAuth App Client ID
   - `GITHUB_CLIENT_SECRET` = 你的 GitHub OAuth App Client Secret
   - `ALLOWED_DOMAINS` = `YangtzeChen.github.io`
4. 部署成功后，你会获得一个 Workers URL，格式为：  
   `https://sveltia-cms-auth.YOUR_SUBDOMAIN.workers.dev`

---

## 3. 更新 CMS 配置

打开 `admin/config.yml`，将 `base_url` 替换为你的 Workers URL：

```yaml
backend:
  name: github
  repo: YangtzeChen/YangtzeChen.github.io
  branch: main
  base_url: https://sveltia-cms-auth.你的子域名.workers.dev
```

---

## 4. 使用 CMS

1. 将所有更改 push 到 GitHub
2. 访问 `https://YangtzeChen.github.io/admin/`
3. 点击 **Login with GitHub**
4. 授权后即可在浏览器中管理文章和相册

---

## 注意事项

- **CMS 编辑文章时**会自动在仓库中创建 Markdown 文件并 commit
- **上传图片**会保存到 `content/gallery/images/` 目录
- 由于是纯静态站点，新文章发布后需要 **手动更新 `content/blog/index.json`** 来让前端列表页显示新文章  
  （未来可通过 GitHub Actions 自动化此步骤）
