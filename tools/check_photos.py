#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
体检你的照片源目录：找出「全零 / 大面积零字节」的文件。

半途中断的拷贝或正在坏掉的存储卡会留下这种文件——大小正常、
内容全是 0，肉眼在资源管理器里完全看不出来，但导入网站后就是一张纯色图。
发照片前跑一下，能避免把坏图发到线上。

用法：
    python tools/check_photos.py                       # 默认扫 photos/
    python tools/check_photos.py "E:\\手机照片备份\\上海2023.7"
    python tools/check_photos.py <目录> --threshold 0.05
"""

import argparse
import sys
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".bmp", ".tif", ".tiff"}
CHUNK = 1 << 20


def zero_ratio(path: Path):
    """返回 (零字节占比, 大小)。"""
    size = path.stat().st_size
    if size == 0:
        return 1.0, 0
    zeros = 0
    with open(path, "rb") as fh:
        while True:
            chunk = fh.read(CHUNK)
            if not chunk:
                break
            zeros += chunk.count(0)
    return zeros / size, size


def human(n: int) -> str:
    return f"{n / 1024 / 1024:.1f} MB" if n >= 1 << 20 else f"{n / 1024:.0f} KB"


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="照片损坏体检")
    ap.add_argument("dir", nargs="?", default="photos", help="要扫描的目录（默认 photos/）")
    ap.add_argument("--threshold", type=float, default=0.10, help="零字节占比超过多少算可疑（默认 0.10）")
    args = ap.parse_args()

    root = Path(args.dir)
    if not root.exists():
        print(f"目录不存在：{root}")
        return 1

    files = sorted(
        p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not files:
        print(f"{root} 里没找到图片")
        return 0

    print(f"扫描 {root} —— 共 {len(files)} 个图片文件\n")

    bad = []
    for f in files:
        ratio, size = zero_ratio(f)
        if ratio >= args.threshold:
            bad.append((ratio, f, size))

    if not bad:
        print(f"✅ 全部正常（{len(files)} 个文件）")
        return 0

    bad.sort(reverse=True)
    print(f"⚠️  发现 {len(bad)} 个可疑文件：\n")
    lost = 0
    for ratio, f, size in bad:
        kind = "全零（数据完全丢失）" if ratio > 0.999 else "部分损坏"
        lost += size
        print(f"  {ratio * 100:6.1f}%  {kind:20} {f.name}")
    print(f"\n涉及 {human(lost)}。")
    print(
        "\n这些文件通常来自中断的拷贝或故障存储卡，原始数据不在文件里，无法修复，\n"
        "只能从手机/相机原始存储重新导出一份。"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
