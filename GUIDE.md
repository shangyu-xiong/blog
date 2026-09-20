# 熊镜上羽 · 博客操作指南

## 在线编辑（随时随地）

### 方式一：GitHub 网页编辑器（推荐）

1. 打开 [github.com/shangyu-xiong/blog](https://github.com/shangyu-xiong/blog)
2. 按键盘 **`.`**（句点键）→ 自动打开网页版 VS Code
3. 编辑文件后：
   - 左侧点击 **Source Control** 图标（Y 形分叉，或用快捷键 `Ctrl+Shift+G`）
   - 输入修改说明（如"新增一篇文章"）
   - 点击 **Commit & Push**
4. 等 1-2 分钟，网站自动更新

### 方式二：本地编辑再推送

```powershell
# 打开终端，进入博客目录
cd "E:\VScode work\html\blog"

# 确认修改了哪些文件
git status

# 暂存所有修改
git add -A

# 提交修改
git commit -m "这次改了什么"

# 推送到 GitHub（网站自动更新）
git push
```

> 如果 `git push` 网络连接失败，多试几次，或用方式一网页版推送。

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
