# 熊镜上羽 · 博客操作指南

## 更新网站（日常流程）

> **统一走本地 git 推送。** GitHub 网页端的 *Upload files* 会整体覆盖仓库文件，并让网页提交与本地提交分叉，请勿再用（见文末「踩坑记录」）。

### 方式一：VS Code 图形界面（推荐）

1. 用 VS Code 打开 `E:\VScode work\html\blog`
2. 左侧点 **Source Control**（快捷键 `Ctrl+Shift+G`）查看改动
3. 填写修改说明 → **Commit** → **Sync Changes**（等同 push）
4. 等 1-2 分钟，网站自动更新：https://shangyu-xiong.github.io/blog/

### 方式二：终端命令

```powershell
cd "E:\VScode work\html\blog"    # 进入博客目录

git status                       # 看看改了什么
git add -A                       # 暂存所有修改
git commit -m "这次改了什么"       # 提交
git push                         # 推送到 GitHub（网站自动更新）
```

> 首次 push 会弹出 GitHub 登录窗口，登录一次后由 Windows 凭据管理器记住，之后无需重复登录。
> 本机已配置代理 `127.0.0.1:7897`；若 push 超时，重试即可。

### 应急：没有电脑时用网页端

在 GitHub 网页按 **`.`**（句点键）打开网页版 VS Code，编辑后 **Commit & Push**。
**回到本地后必须先执行 `git pull --rebase`** 再继续修改，否则会再次分叉。

---

## 新增文章

打开 `index.html`，在 `<section id="blog">` 里的 `<div class="blog-grid">` 中添加新的 `<article>`：

```html
<article class="blog-card" data-delay="0">
  <div class="card-tag">技术</div>         <!-- 分类：技术/设计/生活 -->
  <div class="card-body">
    <time class="card-date">2026 年 5 月 24 日</time>
    <h3 class="card-title">文章标题</h3>
    <p class="card-excerpt">文章摘要，一句话介绍内容。</p>
    <a href="#" class="card-link">阅读全文 →</a>
    <!-- 可选：多平台外链 -->
    <div class="card-links">
      <a href="https://mp.weixin.qq.com/s/xxxxx" title="微信公众号" class="card-platform">💬</a>
      <a href="https://zhuanlan.zhihu.com/p/xxx" title="知乎" class="card-platform">📝</a>
    </div>
  </div>
</article>
```

> `data-delay` 控制动画延迟，依次填 `0`、`1`、`2`、`0`、`1`、`2`... 循环。

> 如果文章发布在多个平台，在 `.card-links` 里加上对应链接即可。

---

## 修改个人信息

| 内容 | 位置 | 说明 |
|------|------|------|
| 站点标题 | `<title>` | 浏览器标签栏显示的名称 |
| Hero 文案 | `<section class="hero">` | 首页大标题和描述 |
| 关于我 | `<section id="about">` | 个人介绍和技能标签 |
| 社交链接 | `.hero-social` 和 `.footer-links` | GitHub/Twitter/B站等 |
| 头像 | `images/me.jpg` | 替换图片文件即可 |
| 公众号二维码 | `images/wxQRcode.jpg` | 替换二维码图片文件 |
| 联系方式 | `<section id="contact">` | 邮箱订阅表单 |

### 社交链接已配置

| 平台 | 链接 |
|------|------|
| GitHub | https://github.com/shangyu-xiong |
| Twitter / X | https://x.com/shangyuxiong |
| Bilibili | https://space.bilibili.com/167339425 |
| 微信公众号 | 点击图标 → 弹窗展示二维码（上羽的树屋） |

---

## 样式 & 主题

- `css/style.css` — 所有样式
- 页面支持 **深色/浅色模式**，通过 `data-theme` 属性切换
- 修改 `css/style.css` 中的 CSS 变量即可快速更换主题色

---

## 目录结构

```
E:\VScode work\html\blog\
├── index.html         # 主页面（所有内容都在这里）
├── css/
│   └── style.css      # 样式文件（主题色、布局、动画）
├── js/
│   └── main.js        # 交互脚本（主题切换、弹窗、滚动动画）
├── images/
│   ├── me.jpg         # 个人头像
│   └── wxQRcode.jpg   # 公众号二维码
├── GUIDE.md           # 本操作指南
├── CLAUDE.md          # 仓库协作说明
└── .gitignore
```

---

## 项目信息

- 博客名称：熊镜上羽
- 在线地址：https://shangyu-xiong.github.io/blog/
- GitHub 仓库：https://github.com/shangyu-xiong/blog
- 本地路径：`E:\VScode work\html\blog`
- 技术栈：纯 HTML + CSS + JavaScript（无框架）
- 部署方式：GitHub Pages（推送到 main 分支自动部署）

---

## 踩坑记录

### 2026-05-24：网页端 Upload files 导致本地/远程分叉

用 GitHub 网页上传文件后出现的两个问题：

1. **旧文件覆盖新文件** —— 仓库里较新的 `GUIDE.md` 被上传的旧版覆盖（丢失本地路径、社交链接表、`images/` 说明等内容）；
2. **历史分叉** —— 网页提交与本地提交各自领先对方 1 个提交（本地 ahead 1 / behind 1），此后 `git push` 直接被拒绝（non-fast-forward）。

修复方式：本地执行 `git rebase origin/main`（本地那个提交的内容其实已在上游，会被自动跳过），解决冲突后再 `git push`。

**结论：所有更新统一走本地 git（`git add -A` → `git commit` → `git push`），不要再用网页端 Upload files 上传整份文件。**
