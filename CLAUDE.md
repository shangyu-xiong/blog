# CLAUDE.md

本文件用于指导 Claude Code（claude.ai/code）在此仓库中工作时的行为。

## 项目概览

熊镜上羽的个人博客 —— 纯静态站点，HTML + CSS + JavaScript，无框架、无构建步骤、无外部字体，通过 GitHub Pages 部署。

## 常用命令

```powershell
# 本地预览（双击 index.html 也能看，但「项目」栏需要 http 才能读 GitHub API）
python -m http.server 8123      # 然后打开 http://127.0.0.1:8123/

# 发旅行照片（体检 → 压缩 → 生成清单 → 询问是否推送）
powershell -File tools\publish-photos.ps1

# 只重新生成相册清单 + 首页大图 / 联系区背景
python tools\build_photos.py

# 照片损坏体检（找出「大小正常但内容全是 0」的坏图）
python tools\check_photos.py photos

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

### 单页六章节

`index.html` 是唯一页面，六个章节用锚点导航（左侧竖排文字导航，移动端收成顶栏抽屉）：

| 锚点 | 导航文字 | 内容 |
|------|----------|------|
| `#home` | 开始 | 首页大图（`images/hero.webp`）+ 中文站名 + NeverSettle + 两个按钮 |
| `#about` | 关于 | 头像、自述、技能标签、邮箱 |
| `#projects` | 项目 | 运行时从 GitHub API 拉取，`mmc-helper` 为置顶大卡 |
| `#writing` | 文章 | 空状态；文章模板以 HTML 注释保留在文件中（搜「新增文章模板」） |
| `#travel` | 旅行 | 翻页式相册（一次一张图），数据来自 `data/travel-data.js` |
| `#contact` | 联系 | 照片背景 + 邮箱、社交链接（含小红书）、公众号二维码 |

### 文件组织

```
/
├── index.html              # 唯一页面，六个章节
├── css/style.css           # 全部样式；设计变量集中在文件顶部 :root / [data-theme="light"]
├── js/main.js              # 主题 / 侧栏 / 进场 / GitHub 项目 / 相册翻页 / 大图查看 / 弹窗
├── fonts/                  # 自托管 Inter（5 个字重 woff2，共约 120 KB）
├── data/
│   ├── travel-data.js      # 自动生成（build_photos.py 写），勿手改
│   └── albums/*.json       # 手写相册文案，进仓库
├── images/
│   ├── me.jpg              # 头像
│   ├── wxQRcode.jpg        # 公众号二维码
│   ├── hero.webp           # 自动生成：首页大图（+ hero-sm.webp）
│   ├── back.webp           # 自动生成：联系区背景（+ back-sm.webp）
│   └── travel/<album>/     # 自动生成的 WebP（展示图 + 缩略图）
├── photos/                 # 原图（hero.jpg / back.jpg / 每本相册一个目录），gitignore
├── tools/                  # 照片流水线（见下）
├── GUIDE.md                # 面向站长的操作指南（中文，日常操作看这个）
└── CLAUDE.md               # 本文件
```

### 关键设计模式

- **主题系统**：`data-theme` 属性 + CSS 变量，**默认暗色**（`js/main.js` 里 `applyTheme(savedTheme() || 'dark')`），偏好存 localStorage。
- **排版**：`fonts/` 里自托管 Inter（拉丁字符走它，中日韩字符自动落到 PingFang SC / 微软雅黑），**不要**改回 Google Fonts 外链（国内首屏会明显变慢）；标题 `font-weight: 600~700` + 负字距。
- **首页大图**：`photos/hero.jpg` → `images/hero.webp`（+ `hero-sm.webp`，HTML 用 `srcset` 让窄屏取小图）。上面固定盖一层 `.hero-scrim`，中间那条最暗保证白字可读；要调取景改 `.hero-photo { object-position }`。
- **相册翻页**：`.album-viewer` 里只有一个 `<img>`，`goToAlbum()` 做「滑走淡出 → 换图 → 从另一侧进来」，靠 `tabindex="0"` + 方向键也能翻。**外层 `.album-frame` 高度固定**（防跳版），**内层 `.album-stage` 由 `fitStage()` 按照片 `w/h` 算尺寸**（加 `STAGE_PAD` 内边距），所以竖构图是一块高窄的相框、横构图是宽扁的，图片 `object-fit: contain` 永远不裁图。单个相册只有一张照片时不渲染箭头和圆点。
- **侧栏**：`.rail-indicator` 是一条跟着当前章节滑动的指示条（`moveIndicator()` 用 `offsetTop` 定位），`.rail-progress` 是右侧随滚动增长的细线，主题按钮带 `#themeLabel` 文字（浅色/深色）。
- **联系区背景**：`photos/back.jpg` → `images/back.webp`，`.contact-scrim` 压暗保证白字可读；`.contact` 里的文字色写死白色，不跟随主题。
- **进场动画**：`.reveal` + `IntersectionObserver`，配 `--delay` 做同组错峰；`prefers-reduced-motion` 时全部关闭。
- **项目列表**：动态拉取失败要回落到 `GH_FALLBACK`，不要留白。
- **相册数据流**：原图在 `photos/`（gitignored）→ `tools/build_photos.py` 压成 `images/travel/` 的 WebP → 写 `data/travel-data.js`（页面读它）。文案写在 `data/albums/*.json`（进仓库），**不要**放回 `photos/` 里，否则会随原图一起被忽略。相册顺序由 JSON 里的 `date` 倒序决定。
- **清单元数据用 `.js` 而不是 `.json`**：`fetch` 读本地 JSON 在 `file://` 下会被 CORS 拦掉，`window.TRAVEL_DATA` 两种打开方式都能用。

### 照片流水线的坑

- 手机直出的 HEIC 需要 `pillow-heif`，装在 `tools/_vendor/`（不进仓库，`install_vendor.py` 负责装）。
- **不要用 Pillow 的 HEIC 插件接口**：pillow-heif 1.x 的插件依赖新版 Pillow，本机是 9.3.0，会抛 `UnidentifiedImageError`。`build_photos.py` 里 `load_image()` 直接取解码后的原始像素（`Image.frombytes`），这条路径在旧 Pillow 上可用。
- HEIC **不需要** `exif_transpose`：libheif 解码时已应用容器旋转，再转一次会翻车。

### 新增文章

模板在 `index.html` 的 HTML 注释里（搜「新增文章模板」），结构是 `article.post-card`。

## 部署

推送 main 分支到 GitHub 后，GitHub Pages 自动部署到：
https://shangyu-xiong.github.io/blog/
