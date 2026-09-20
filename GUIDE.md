# 熊镜上羽 · 博客操作指南

站点是纯 HTML + CSS + JavaScript，没有构建步骤，推送到 `main` 分支后 GitHub Pages 自动部署。
线上地址：https://shangyu-xiong.github.io/blog/

---

## 一、更新网站（日常流程）

> **统一走本地 git 推送。** GitHub 网页端的 *Upload files* 会整体覆盖仓库文件，并让网页提交与本地提交分叉，请勿再用（见文末「踩坑记录」）。

### 方式一：VS Code 图形界面（推荐）

1. 用 VS Code 打开 `E:\VScode work\html\blog`
2. 左侧点 **Source Control**（快捷键 `Ctrl+Shift+G`）查看改动
3. 填写修改说明 → **Commit** → **Sync Changes**（等同 push）
4. 等 1-2 分钟，网站自动更新

### 方式二：终端命令

```powershell
cd "E:\VScode work\html\blog"    # 进入博客目录

git status                       # 看看改了什么
git add -A                       # 暂存所有修改
git commit -m "这次改了什么"       # 提交
git push                         # 推送到 GitHub（网站自动更新）
```

### 本地预览

直接双击 `index.html` 也能看，但**「项目」那一栏会显示兜底数据**，因为浏览器读 GitHub API 需要 `http` 协议。
想看完整效果，在仓库根目录起一个本地服务器：

```powershell
python -m http.server 8123
# 然后浏览器打开 http://127.0.0.1:8123/
```

### 应急：没有电脑时用网页端

在 GitHub 网页按 **`.`**（句点键）打开网页版 VS Code，编辑后 **Commit & Push**。
**回到本地后必须先执行 `git pull --rebase`** 再继续修改，否则会再次分叉。

---

## 二、发旅行照片（最常用）

**一次旅行 = 一本相册 = 一个地点**，一个相册可以放一张或多张照片。
点左边按钮翻页，一次只显示一张。

### 一次性准备

```powershell
python tools\install_vendor.py     # 装项目内的 HEIC 解码器（手机直出照片需要）
```

装在 `tools/_vendor/` 里，不进仓库，也不影响系统 Python。

### 加一本相册（比如 2024 年 3 月去了东京）

1. 建目录 `photos\2024-03-东京\`，把照片丢进去；
2. 建 `data\albums\2024-03-tokyo.json` 写文案（照抄现成的那几个改）；
3. 跑发布脚本：

```powershell
powershell -File tools\publish-photos.ps1
```

脚本会依次做四件事：

1. **体检** `photos/`（`tools/check_photos.py`）——中断的拷贝会留下「大小正常、内容全是 0」的坏图，肉眼看不出来，这个脚本能揪出来；
2. **压缩**：长边 2400 存展示图、长边 800 存缩略图，一律转 WebP，同时剥掉 EXIF（含 GPS 定位）；
3. **生成** `data/travel-data.js`（页面读的相册清单）；
4. 问你一句要不要提交并推送。

常用参数：

```powershell
powershell -File tools\publish-photos.ps1 -Album "2024-03-东京"   # 只处理一本
powershell -File tools\publish-photos.ps1 -Force                  # 全部重压
powershell -File tools\publish-photos.ps1 -NoPush                 # 只本地生成，先不推送
```

只想重新生成清单、不碰照片：`python tools\build_photos.py`

### 相册的文案写在哪

**不是**写在照片目录里，而是写在 `data/albums/` 下的 JSON（这个文件进仓库，文案才不会丢）：

```json
{
  "dir": "2024-03-东京",
  "id": "2024-03-tokyo",
  "title": "东京",
  "date": "2024-03",
  "dateLabel": "2024 年 3 月",
  "location": "东京 · 神田川",
  "summary": "一段总览，显示在标题下面。",
  "photos": [
    {
      "file": "IMG_0001.jpg",
      "caption": "照片标题（加粗那行）",
      "note": "配的旅游小记或感想，可以长一点。"
    }
  ]
}
```

- `photos` 数组的**顺序就是翻页顺序**；不写这个数组则按文件名排序取全部图片。
- **一本相册放几张**：只放最满意的那一两张，配一句文案，比堆一堆图好看。
- **显示顺序**由 `date` 决定（倒序，新的在前）；同一年再按目录名倒序。
- 索引顺序建议直接写在 `photos` 里：想调顺序就调整数组位置。

### 关于体积

长边 2400 的 WebP 每张约 100-600 KB。GitHub Pages 单站上限约 1 GB，这个压缩比能放很多。
原图留在 `photos/`（已加进 `.gitignore`，不进仓库），仓库里只有压好的 WebP。
目前 5 本相册 + 首页大图 + 联系区背景合计约 2.6 MB。

### 如果以后图太多

`data/travel-data.js` 里就是纯清单（每张图的 URL + 宽高 + 文案），页面只认这个格式。
将来换成对象存储或图床，只要让清单里的 URL 指过去，页面一行都不用改。

---

## 三、换首页大图和联系区背景

这两张是「单张大图」，和相册分开处理：

| 用途 | 原图放这里 | 生成到 |
|------|------------|--------|
| 首页大图（开始页铺满屏幕） | `photos\hero.jpg` | `images\hero.webp` + `hero-sm.webp` |
| 联系区背景 | `photos\back.jpg` | `images\back.webp` + `back-sm.webp` |

换法：**替换同名文件 → 跑一次 `python tools\build_photos.py`**。扩展名 `.jpeg` / `.png` / `.webp` 也都认。

- 首页大图建议挑**横向**、上面留出天空或大面积留白的照片，文字压在正中间；
  照片会被裁掉上下两边（`object-fit: cover`），想微调取景改 `css/style.css` 里
  `.hero-photo { object-position: 50% 42% }`（前后分别是左右、上下）。
- 联系区背景同理，位置在 `.contact-photo { object-position: 50% 58% }`。
  它盖了一层暗罩保证白字可读（`.contact-scrim`），想更亮就把里面的 `0.62 / 0.44 / 0.58` 调小。
- 首页大图会**首屏加载**，尽量别超过 1 MB。压完脚本会告诉你实际大小。

---

## 四、项目展示

「项目」那一栏是**运行时从 GitHub API 拉的**，所以新开的仓库会自动出现，不用回来改 HTML。

- 拉不到时（限流 / 离线 / 被墙）自动回落到 `js/main.js` 里的 `GH_FALLBACK`，页面不会开天窗；
- 本站自己的仓库 `blog` 已在 `GH_EXCLUDE` 里排除；
- 想置顶某个项目，加到 `GH_FEATURED` 数组（现在只有 `mmc-helper`，会显示成大卡片）；
- 想给项目补一句人话介绍，写在 `GH_NOTES` 里（GitHub API 没有这个字段）。

**给仓库补 Description 很值**：没写描述的仓库在卡片上是空的，观感差别很大。

---

## 五、写文章

「文章」目前是空状态（写着「文章灵感正在积攒中」），**模板在 `index.html` 里以注释形式留着**，
搜索 `新增文章模板` 就能找到。把注释拆掉、复制一份填内容即可：

```html
<article class="post-card" data-delay="0">
  <div class="post-tag">技术</div>
  <div class="post-body">
    <time class="post-date">2026 年 9 月 20 日</time>
    <h3 class="post-title">文章标题</h3>
    <p class="post-excerpt">一句话摘要。</p>
    <a class="link-arrow" href="#">阅读全文 <span class="chev">›</span></a>
    <div class="post-platforms">
      <a href="https://mp.weixin.qq.com/s/xxxxx" title="微信公众号">公众号</a>
      <a href="https://zhuanlan.zhihu.com/p/xxx" title="知乎">知乎</a>
    </div>
  </div>
</article>
```

> `data-delay` 控制进场顺序，`0`、`1`、`2` 循环。

---

## 六、改个人信息 / 样式

| 内容 | 位置 |
|------|------|
| 站点标题、描述 | `index.html` 的 `<title>` 和 `<meta name="description">` |
| 开始页大标题 / 副标题 | `<section class="hero" id="home">` |
| 关于我 | `<section id="about">`（另外留了「之后扩充」注释位） |
| 头像 | `images/me.jpg`（直接换文件） |
| 公众号二维码 | `images/wxQRcode.jpg` |
| 侧栏站名 / 副标 | `.rail-brand-name` 与 `.rail-brand-sub` |
| 左侧导航文字 | `.rail-nav` 里的 `.rail-label`（改文字不用动序号） |
| GitHub / B站 / X / 小红书 | `<section id="contact">` 的 `.socials` |
| 主题色 | `css/style.css` 顶部的 `:root` 与 `[data-theme="light"]` 变量 |

### 社交链接

| 平台 | 链接 |
|------|------|
| GitHub | https://github.com/shangyu-xiong |
| Bilibili | https://space.bilibili.com/167339425 |
| Twitter / X | https://x.com/shangyuxiong |
| 小红书 | https://www.xiaohongshu.com/user/profile/66f176d3000000001d03160c |
| 微信公众号 | 点击 → 弹窗展示二维码（上羽的树屋） |

> 小红书这个主页链接是从分享链接里解出来的。**以后再想要直达链接**：App 里进自己主页 →
> 右上角 **⋯** → **分享** → **复制链接**，得到 `xhslink.cn/...` 短链，浏览器打开一次就会跳到
> 正式的 `www.xiaohongshu.com/user/profile/<uid>` 地址，取那一段用即可
> （小红书号和主页 uid 是两套编号，没法互相推算）。

### 主题

网站**默认暗色**（苹果式的纯黑底），侧栏底部可以切到浅色，偏好记在 localStorage。
要改默认值，改 `js/main.js` 里 `applyTheme(savedTheme() || 'dark')` 那一行的 `'dark'`。

---

## 七、目录结构

```
E:\VScode work\html\blog\
├── index.html              # 单页，六个章节：开始 / 关于 / 项目 / 文章 / 旅行 / 联系
├── css/style.css           # 全部样式（设计变量在文件顶部）
├── js/main.js              # 主题、侧栏、进场动画、GitHub 项目、相册翻页、大图查看
├── fonts/                  # 自托管 Inter 字体（5 个字重，共约 120 KB）
├── data/
│   ├── travel-data.js      # 自动生成：相册清单（不要手改）
│   └── albums/*.json       # 手写：每本相册的文案（进仓库）
├── images/
│   ├── me.jpg              # 头像
│   ├── wxQRcode.jpg        # 公众号二维码
│   ├── hero.webp           # 自动生成：首页大图（+ hero-sm.webp）
│   ├── back.webp           # 自动生成：联系区背景（+ back-sm.webp）
│   └── travel/<相册>/      # 自动生成：压好的 WebP
├── photos/                 # 原图（不进仓库）—— 你平时增删照片就动这里
│   ├── hero.jpg            # 首页大图原图
│   ├── back.jpg            # 联系区背景原图
│   └── 2026-京都/ …        # 每本相册一个目录
├── tools/
│   ├── publish-photos.ps1  # 照片一键发布
│   ├── build_photos.py     # 压缩 + 生成清单 + 单张大图
│   ├── check_photos.py     # 照片损坏体检
│   └── install_vendor.py   # 装项目内的 HEIC 解码器
├── GUIDE.md                # 本文件
├── CLAUDE.md               # 给 AI 助手看的仓库说明
└── .gitignore
```

**平时管理照片只需要动 `photos/` 和 `data/albums/` 这两处**（前者原图，后者文案）。

---

## 八、项目信息

- 博客名称：熊镜上羽
- 在线地址：https://shangyu-xiong.github.io/blog/
- GitHub 仓库：https://github.com/shangyu-xiong/blog
- 本地路径：`E:\VScode work\html\blog`
- 技术栈：纯 HTML + CSS + JavaScript（无框架、无构建、无外部字体、无第三方依赖）
- 部署方式：GitHub Pages（推送到 main 分支自动部署）

---

## 踩坑记录

### 2026-05-24：网页端 Upload files 导致本地/远程分叉

用 GitHub 网页上传文件后出现的两个问题：

1. **旧文件覆盖新文件** —— 仓库里较新的 `GUIDE.md` 被上传的旧版覆盖（丢失本地路径、社交链接表、`images/` 说明等内容）；
2. **历史分叉** —— 网页提交与本地提交各自领先对方 1 个提交（本地 ahead 1 / behind 1），此后 `git push` 直接被拒绝（non-fast-forward）。

修复方式：本地执行 `git rebase origin/main`（本地那个提交的内容其实已在上游，会被自动跳过），解决冲突后再 `git push`。

**结论：所有更新统一走本地 git（`git add -A` → `git commit` → `git push`），不要再用网页端 Upload files 上传整份文件。**

### 2026-09-20：手机照片备份里的坏文件

`E:\手机照片备份\上海2023.7` 里 240 个文件有 9 个是坏的（8 个全零 + 1 个 91.6% 零字节），
共同点是**文件大小正常、内容全是 0**，资源管理器里完全看不出问题，导入网站后就是一张纯色图。

这类文件来自中断的拷贝或正在坏的存储卡，数据不在文件里，无法修复，只能从手机重新导出。
所以 `publish-photos.ps1` 每次都会先跑一遍 `check_photos.py`。
