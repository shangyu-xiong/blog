#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
照片流水线 —— 把 photos/ 里的原图压成网页用的 WebP，
并生成 data/travel-data.js（前端相册清单）。

用法：
    python tools/build_photos.py            # 处理全部相册
    python tools/build_photos.py --album 2025-上海
    python tools/build_photos.py --force    # 忽略缓存，全部重做
    python tools/build_photos.py --dry-run  # 只看会做什么，不写文件

目录约定：
    photos/<相册目录>/            相册原图（不进仓库，见 .gitignore）
    photos/hero.<jpg|png|webp>    首页大图原图（不进仓库）
    photos/back.<jpg|png|webp>    联系区背景原图（不进仓库）
    data/albums/<相册目录名>.json  相册元数据（标题/日期/文案，**进仓库**）
    images/travel/<相册id>/       输出（脚本自己维护，不要手改）

为什么元数据放在 data/albums/ 而不是相册目录里：photos/ 里的原图不进仓库
（太占体积），但文案必须跟着仓库走，所以两者分开放。
"""

import json
import re
import sys
import argparse
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("需要 Pillow：python -m pip install pillow")

# ---------------------------------------------------------------- 路径
ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "photos"
ALBUMS_META_DIR = ROOT / "data" / "albums"
OUT_DIR = ROOT / "images" / "travel"
DATA_JS = ROOT / "data" / "travel-data.js"
# 单张大图：photos/<src>.<jpg|png|webp> -> images/<out>.webp（另出窄屏小图 <out>-sm.webp）
SINGLES = [
    {"src": "hero", "out": "hero", "q": 85, "sm_edge": 900, "sm_q": 80},
    {"src": "back", "out": "back", "q": 85, "sm_edge": 900, "sm_q": 80},
]

# 展示图 / 缩略图的长边像素
FULL_EDGE = 2400
THUMB_EDGE = 800
FULL_Q = 82
THUMB_Q = 75

# Pillow 10 把常量挪到了 Image.Resampling 下
LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".bmp", ".tif", ".tiff"}

# 全局开关：HEIC 支持情况
HEIF_OK = False


def enable_heif():
    """尝试启用 HEIC 解码：优先用项目内 tools/_vendor，其次用系统装好的 pillow-heif。"""
    global HEIF_OK
    vendor = Path(__file__).resolve().parent / "_vendor"
    if vendor.exists():
        sys.path.insert(0, str(vendor))
    try:
        import pillow_heif

        pillow_heif.register_heif_opener()
        HEIF_OK = True
        HEIF_VERSION = getattr(pillow_heif, "__version__", "?")
    except ImportError:
        HEIF_OK = False
    return HEIF_OK


def slugify(name: str) -> str:
    """把文件名压成安全的 ASCII slug（保留数字、连字符）。"""
    stem = Path(name).stem
    slug = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-").lower()
    return slug or "photo"


def album_id_from_dir(dirname: str) -> str:
    """目录名 -> 相册 id（仅保留 ASCII，中文目录名补一个哈希后缀保证唯一）。"""
    ascii_part = re.sub(r"[^A-Za-z0-9]+", "-", dirname).strip("-").lower()
    if ascii_part:
        return ascii_part
    return "album-" + format(abs(hash(dirname)) % (10**6), "06d")


def human_size(n: int) -> str:
    return f"{n / 1024 / 1024:.1f} MB" if n >= 1024 * 1024 else f"{n / 1024:.0f} KB"


def find_meta(dirname: str):
    """在 data/albums/ 里找这个相册目录的元数据：先按文件名，再按 "dir" 字段。"""
    if not ALBUMS_META_DIR.is_dir():
        return None, {}

    exact = ALBUMS_META_DIR / f"{dirname}.json"
    if exact.exists():
        try:
            return exact, json.loads(exact.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  ! {exact.name} 解析失败（按空元数据处理）: {e}")
            return exact, {}

    for cand in sorted(ALBUMS_META_DIR.glob("*.json")):
        try:
            data = json.loads(cand.read_text(encoding="utf-8"))
        except Exception:
            continue
        if data.get("dir") == dirname:
            return cand, data
    return None, {}


def load_album_meta(album_dir: Path) -> dict:
    """拼出相册元数据：data/albums/ 优先，其次相册目录里的 album.json，最后用目录名兜底。"""
    dirname = album_dir.name
    _, meta = find_meta(dirname)

    if not meta:
        legacy = album_dir / "album.json"
        if legacy.exists():
            try:
                meta = json.loads(legacy.read_text(encoding="utf-8"))
            except Exception:
                meta = {}

    meta.setdefault("id", album_id_from_dir(dirname))
    meta.setdefault("title", dirname)
    # 目录名形如 2023-07-上海 / 2023-07 -> 取日期前缀
    m = re.match(r"(\d{4}-\d{2}(?:-\d{2})?)", dirname)
    meta.setdefault("date", m.group(1) if m else "1970-01")
    meta.setdefault("location", "")
    meta.setdefault("summary", "")
    meta["_dir"] = dirname
    return meta


def collect_photos(album_dir: Path, meta: dict):
    """
    返回 [(源文件, caption, note), ...]
    album.json 里给了 photos 列表就按列表顺序；否则按文件名排序取全部。
    """
    listed = meta.get("photos")
    if listed:
        out = []
        for item in listed:
            if isinstance(item, str):
                item = {"file": item}
            f = album_dir / item.get("file", "")
            if f.exists():
                out.append((f, item.get("caption", ""), item.get("note", "")))
            else:
                print(f"  ! 找不到 {item.get('file')}（已在 album.json 里列出，跳过）")
        return out

    files = sorted(
        (p for p in album_dir.iterdir() if p.is_file() and p.suffix.lower() in EXTS),
        key=lambda p: p.name,
    )
    return [(p, "", "") for p in files]


def load_image(src: Path):
    """
    打开一张图，返回 (PIL.Image, heif 或 None)。

    HEIC 不走 Pillow 的插件接口：pillow-heif 1.x 的插件依赖新版 Pillow，
    而这里可能装的是较老的 Pillow。直接取解码后的原始像素更稳。
    libheif 解码时已经应用了容器里的旋转，所以 HEIC 不需要再 exif_transpose。
    """
    if src.suffix.lower() in {".heic", ".heif"}:
        import pillow_heif

        heif = pillow_heif.open_heif(src)
        return Image.frombytes(heif.mode, heif.size, bytes(heif.data)), heif
    return Image.open(src), None


def process_one(src: Path, out_dir: Path, force: bool):
    """压一张图，返回 (清单条目 dict 或 None, 状态字符串)。"""
    slug = slugify(src.name)
    full_path = out_dir / f"{slug}.webp"
    thumb_path = out_dir / f"{slug}-thumb.webp"

    if not force and full_path.exists() and thumb_path.exists():
        if full_path.stat().st_mtime >= src.stat().st_mtime:
            im = Image.open(full_path)
            return (
                {"src": rel_url(full_path), "thumb": rel_url(thumb_path), "w": im.width, "h": im.height},
                "cached",
            )

    if src.suffix.lower() in {".heic", ".heif"} and not HEIF_OK:
        return None, "no-heif"

    try:
        im, heif = load_image(src)
        # 普通图片按 EXIF 摆正；HEIC 已由 libheif 处理
        if heif is None:
            im = ImageOps.exif_transpose(im)
        # 转 RGB 并丢掉全部元数据（含 GPS 定位）
        im = im.convert("RGB")

        full = im.copy()
        full.thumbnail((FULL_EDGE, FULL_EDGE), LANCZOS)
        full.save(full_path, "WEBP", quality=FULL_Q, method=6)

        thumb = im.copy()
        thumb.thumbnail((THUMB_EDGE, THUMB_EDGE), LANCZOS)
        thumb.save(thumb_path, "WEBP", quality=THUMB_Q, method=6)

        w, h = full.size
        im.close()
    except Exception as e:
        return None, f"error:{type(e).__name__}"

    return (
        {"src": rel_url(full_path), "thumb": rel_url(thumb_path), "w": w, "h": h},
        "done",
    )


def rel_url(p: Path) -> str:
    """转成站点相对 URL（正斜杠）。"""
    return p.relative_to(ROOT).as_posix()


def find_single_source(stem: str):
    """单张大图的源文件：photos/<stem>.jpg / .jpeg / .png / .webp。"""
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = PHOTOS_DIR / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def build_singles(force=False, dry_run=False):
    """把首页大图 / 联系区背景这类单张图压成 WebP（各自再出一个窄屏小图）。"""
    out_dir = ROOT / "images"

    for item in SINGLES:
        src = find_single_source(item["src"])
        if not src:
            continue

        full_path = out_dir / f"{item['out']}.webp"
        sm_path = out_dir / f"{item['out']}-sm.webp"

        print(f"[单张大图] {src.name} -> {rel_url(full_path)}")
        if dry_run:
            print(f"    （dry-run）另出 {rel_url(sm_path)}")
            continue

        if (
            not force
            and full_path.exists()
            and sm_path.exists()
            and full_path.stat().st_mtime >= src.stat().st_mtime
        ):
            print("    已是最新，跳过")
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        im, heif = load_image(src)
        if heif is None:
            im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")

        full = im.copy()
        full.save(full_path, "WEBP", quality=item["q"], method=6)

        sm = im.copy()
        sm.thumbnail((item["sm_edge"], item["sm_edge"]), LANCZOS)
        sm.save(sm_path, "WEBP", quality=item["sm_q"], method=6)

        print(
            f"    {im.width}x{im.height} -> {human_size(full_path.stat().st_size)}"
            f"（窄屏小图 {human_size(sm_path.stat().st_size)}）"
        )
        im.close()


def build(force=False, only=None, dry_run=False):
    if not PHOTOS_DIR.exists():
        print(f"没有 {PHOTOS_DIR}，先建一个相册目录吧。")
        return 0

    # 先读元数据再排序：按 date 倒序（新的在前），同年按目录名倒序
    pairs = []
    for d in PHOTOS_DIR.iterdir():
        if not d.is_dir() or d.name.startswith("."):
            continue
        meta = load_album_meta(d)
        pairs.append((str(meta.get("date", "")), d.name, d, meta))
    pairs.sort(key=lambda p: (p[0], p[1]), reverse=True)

    if only:
        pairs = [p for p in pairs if p[1] == only or p[3]["id"] == only]
        if not pairs:
            print(f"没找到相册：{only}")
            return 0

    manifest = []
    total_out = 0
    skipped_heic = []

    for _date, _name, album_dir, meta in pairs:
        photos = collect_photos(album_dir, meta)
        if not photos:
            print(f"[{meta['title']}] 没有图片，跳过")
            continue

        out_dir = OUT_DIR / meta["id"]
        print(f"[{meta['title']}] {len(photos)} 张 -> {rel_url(out_dir)}")
        if dry_run:
            for src, caption, _ in photos:
                print(f"    · {src.name}  ({human_size(src.stat().st_size)})  {caption}")
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        entries = []
        for src, caption, note in photos:
            item, status = process_one(src, out_dir, force)
            if item is None:
                if status == "no-heif":
                    skipped_heic.append(src.name)
                    print(f"    ! {src.name}: 没有 HEIC 解码器，跳过")
                else:
                    print(f"    ! {src.name}: 处理失败（{status}）")
                continue
            item["caption"] = caption
            item["note"] = note
            item["source"] = src.name
            entries.append(item)
            if status == "done":
                total_out += (out_dir / f"{slugify(src.name)}.webp").stat().st_size
                total_out += (out_dir / f"{slugify(src.name)}-thumb.webp").stat().st_size
                print(f"    + {src.name}  {human_size(src.stat().st_size)} -> {item['w']}x{item['h']}")

        if not entries:
            continue

        manifest.append(
            {
                "id": meta["id"],
                "title": meta["title"],
                "date": meta["date"],
                "dateLabel": meta.get("dateLabel", ""),
                "location": meta.get("location", ""),
                "summary": meta.get("summary", ""),
                "cover": entries[0]["thumb"],
                "count": len(entries),
                "photos": entries,
            }
        )

    if dry_run:
        print("\n(dry-run，没有写入任何文件)")
        return 0

    write_manifest(manifest)

    print(f"\n共 {len(manifest)} 个相册，新生成的文件合计 {human_size(total_out)}")
    if skipped_heic:
        print(
            f"\n有 {len(skipped_heic)} 张 HEIC 因为没有解码器被跳过。\n"
            f"装一下就能处理：python -m pip install pillow-heif"
        )
    return 0


def write_manifest(manifest):
    DATA_JS.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    DATA_JS.write_text(
        "/* 本文件由 tools/build_photos.py 自动生成，不要手改。 */\n"
        f"window.TRAVEL_DATA = {payload};\n",
        encoding="utf-8",
    )
    print(f"写出 {rel_url(DATA_JS)}（{len(manifest)} 个相册）")


def main():
    # Windows 控制台默认 GBK，中文输出会炸
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    ap = argparse.ArgumentParser(description="照片流水线")
    ap.add_argument("--album", help="只处理指定相册（目录名或 id）")
    ap.add_argument("--force", action="store_true", help="忽略缓存，全部重新生成")
    ap.add_argument("--dry-run", action="store_true", help="只预览，不写文件")
    args = ap.parse_args()

    if enable_heif():
        print("HEIC 解码：可用（pillow-heif）")
    else:
        print("HEIC 解码：不可用（装 pillow-heif 可支持 iPhone 直出照片）")
    print()

    build_singles(force=args.force, dry_run=args.dry_run)
    print()

    return build(force=args.force, only=args.album, dry_run=args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
