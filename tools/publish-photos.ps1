# ============================================================
#  旅行照片一键发布
#
#  用法（在仓库根目录）：
#     powershell -File tools\publish-photos.ps1
#     powershell -File tools\publish-photos.ps1 -Album "2025-上海"
#     powershell -File tools\publish-photos.ps1 -NoPush      # 只本地生成，不推送
#
#  它做四件事：
#     1. 体检 photos/ 里有没有坏图（半途中断的拷贝会留下全零文件）
#     2. 压缩：长边 2400 展示图 + 800 缩略图，转 WebP，剥掉 EXIF/GPS
#     3. 重新生成 data/travel-data.js，以及首页大图 / 联系区背景
#     4. 问你要不要提交并推送
# ============================================================
[CmdletBinding()]
param(
    [string]$Album,
    [switch]$Force,
    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say($msg, $color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Rule { Say ('-' * 60) 'DarkGray' }

# ---------- 0. 检查 python ----------
$python = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $python) {
    Say 'X 找不到 python。装一个 3.9+ 的 Python 再回来。' 'Red'
    exit 1
}

Rule
Say '旅行照片发布' 'Cyan'
Rule

# ---------- 1. HEIC 依赖 ----------
if (-not (Test-Path 'tools\_vendor')) {
    Say '首次运行：正在准备 HEIC 解码器（手机直出照片需要）...' 'Yellow'
    & python tools\install_vendor.py
    if ($LASTEXITCODE -ne 0) {
        Say '! HEIC 解码器没装上，jpg/png 仍然可以处理，heic 会被跳过。' 'Yellow'
    }
}

# ---------- 2. 体检 ----------
if (Test-Path 'photos') {
    Say ''
    Say '[1/4] 检查照片是否损坏' 'Cyan'
    & python tools\check_photos.py 'photos'
}

# ---------- 3. 压缩 + 生成清单 ----------
Say ''
Say '[2/4] 压缩并生成清单' 'Cyan'
$buildArgs = @('tools\build_photos.py')
if ($Album) { $buildArgs += @('--album', $Album) }
if ($Force) { $buildArgs += '--force' }
& python @buildArgs
if ($LASTEXITCODE -ne 0) {
    Say 'X 生成失败，先看看上面的报错。' 'Red'
    exit 1
}

# ---------- 4. 提交 ----------
Say ''
Say '[3/4] 准备提交' 'Cyan'
git add -A
$changes = git status --porcelain
if (-not $changes) {
    Say '没有变化，说明照片和上次一样。收工。' 'Green'
    exit 0
}

Write-Host $changes

$label = if ($Album) { $Album } else { '旅行相册' }
$msg = "更新旅行照片：$label"
git commit -q -m $msg
if ($LASTEXITCODE -ne 0) {
    Say 'X 提交失败。' 'Red'
    exit 1
}
Say "已提交：$msg" 'Green'

# ---------- 5. 推送 ----------
if ($NoPush) {
    Say ''
    Say '按 -NoPush 跳过推送。想上传时执行：git push' 'Yellow'
    exit 0
}

Say ''
Say '[4/4] 推送到 GitHub' 'Cyan'
$answer = Read-Host '现在推送吗？网站 1-2 分钟后自动更新 (Y/n)'
if ($answer -eq '' -or $answer -match '^[Yy]') {
    git push
    if ($LASTEXITCODE -eq 0) {
        Say ''
        Say '完成。等 1-2 分钟看 https://shangyu-xiong.github.io/blog/#travel' 'Green'
    } else {
        Say 'X 推送失败。本地提交还在，网络恢复后重试 git push 即可。' 'Red'
        exit 1
    }
} else {
    Say '已跳过推送。想上传时执行：git push' 'Yellow'
}
