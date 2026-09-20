# CLAUDE.md

本文件用于指导 Claude Code（claude.ai/code）在此仓库中工作时的行为。

## 项目概览

熊镜上羽的个人博客 —— 纯静态站点，使用 HTML + CSS + JavaScript，通过 GitHub Pages 部署。

## 常用命令

```powershell
# 本地预览（启动开发服务器）
# 使用 .claude/launch.json 中的 blog 配置

# 提交并推送更新（唯一入口）
git status
git add -A
git commit -m "修改说明"
git push
```

### 版本控制约定（务必遵守）

- **所有更新一律走本地 git 推送**（`git add -A` → `git commit` → `git push`），推送后 GitHub Pages 自动部署。
- **禁止使用 GitHub 网页端的 *Upload files***：它会整体覆盖仓库文件（曾把较新的 `GUIDE.md` 退回旧版），并让网页提交与本地提交分叉，导致之后 `git push` 被拒绝（non-fast-forward）。
- 若确实在网页端改过文件，回到本地**先** `git pull --rebase` 再继续提交。
- 推送凭据由 GitHub CLI 的 credential helper（`C:\Program Files\GitHub CLI\gh.exe`）提供，已登录账号 `shangyu-xiong`；`gh` 不在 PATH 上属正常现象。
- 本机访问 GitHub 走代理 `http://127.0.0.1:7897`；push 超时直接重试。
- 仓库内文本文件统一使用 **LF** 换行。

## 项目架构

### 单页面结构
博客所有内容集中在 `index.html`，通过锚点导航（#home, #blog, #about, #contact）实现页面内跳转。

### 文件组织
```
/
├── index.html          # 主页面：导航 → 首页 → 文章 → 关于 → 联系 → 页脚
├── css/style.css       # 样式：CSS 变量主题系统、毛玻璃卡片、滚动动画
├── js/main.js          # 交互：深色/浅色模式切换、移动端导航、滚动监听、弹窗
├── images/
│   ├── me.jpg          # 个人头像
│   └── wxQRcode.jpg    # 公众号二维码
├── GUIDE.md            # 操作指南
└── CLAUDE.md           # 本文件（仓库协作说明）
```

### 关键设计模式
- **主题系统**：通过 `data-theme` 属性和 CSS 变量切换深色/浅色模式，偏好存储在 localStorage
- **滚动动画**：使用 scroll 事件监听 + getBoundingClientRect 实现卡片渐入效果
- **公众号弹窗**：点击微信图标弹出模态框展示二维码，点击遮罩层或关闭按钮隐藏

### 新增文章
在 `<section id="blog">` → `<div class="blog-grid">` 中追加 `<article class="blog-card">`，注意 `data-delay` 属性控制动画延迟（0→1→2→0→1→2…循环）。

## 部署

推送 main 分支到 GitHub 后，GitHub Pages 自动部署到：
https://shangyu-xiong.github.io/blog/
