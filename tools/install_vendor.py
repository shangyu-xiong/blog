#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 pillow-heif（HEIC 解码，处理 iPhone/手机直出照片用）装进项目内的
tools/_vendor/，避免污染系统 Python，也不需要管理员权限。

用法：
    python tools/install_vendor.py

它做三件事：从镜像查 wheel -> 下载 -> 解压到 tools/_vendor/。
之后 tools/build_photos.py 会自动把这个目录加进 sys.path。
"""

import io
import os
import re
import sys
import zipfile
import urllib.request
from pathlib import Path

MIRRORS = [
    "https://pypi.tuna.tsinghua.edu.cn/simple",
    "https://mirrors.aliyun.com/pypi/simple",
    "https://pypi.org/simple",
]
PACKAGE = "pillow-heif"
VENDOR = Path(__file__).resolve().parent / "_vendor"


def tag() -> str:
    """当前解释器的 wheel 标签，例如 cp311-cp311-win_amd64。"""
    v = sys.version_info
    plat = "win_amd64" if sys.maxsize > 2**32 else "win32"
    return f"cp{v.major}{v.minor}-cp{v.major}{v.minor}-{plat}"


def ver_key(filename: str):
    """从文件名里抠出版本号，用来挑最新的那个。"""
    m = re.search(rf"{PACKAGE.replace('-', '_')}-([0-9][^-]*)-", filename, re.I)
    if not m:
        return (0,)
    return tuple(int(x) if x.isdigit() else 0 for x in re.split(r"[._]", m.group(1)))


def find_wheel(index: str, want: str):
    """从 simple 索引里挑出匹配当前解释器、且版本最新的 .whl。"""
    url = f"{index}/{PACKAGE}/"
    with urllib.request.urlopen(url, timeout=60) as r:
        html = r.read().decode("utf-8", "replace")
    links = re.findall(r'href="([^"#]+\.whl)(?:#[^"]*)?"', html)
    matches = [l for l in links if want in l]
    if not matches:
        print(f"  索引里共 {len(links)} 个 wheel，没有匹配 {want} 的")
        return None
    matches.sort(key=ver_key, reverse=True)
    print(f"  匹配到 {len(matches)} 个，取最新")
    link = matches[0]
    return link if link.startswith("http") else urllib.parse.urljoin(url, link)


def merge_wheel_data():
    """
    wheel 里 <name>.data/platlib/ 与 purelib/ 的内容按规范要摊平到安装根目录，
    纯解压不会做这一步，DLL 找不到就是因为这个。
    """
    import shutil

    moved = 0
    for sub in ("platlib", "purelib"):
        for data_dir in VENDOR.glob(f"*.data/{sub}"):
            for item in data_dir.iterdir():
                target = VENDOR / item.name
                if target.exists():
                    if target.is_dir():
                        shutil.rmtree(target)
                    else:
                        target.unlink()
                shutil.move(str(item), str(target))
                moved += 1
            # 清掉空壳
            shutil.rmtree(data_dir.parent, ignore_errors=True)
    print(f"摊平 {moved} 个 wheel 数据文件（DLL 等）")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    # 走本机代理（如果在用的话）
    for var in ("HTTPS_PROXY", "https_proxy"):
        if not os.environ.get(var):
            os.environ[var] = "http://127.0.0.1:7897"

    want = tag()
    print(f"目标 wheel 标签：{want}")

    wheel_url = None
    for index in MIRRORS:
        try:
            print(f"查询 {index} ...")
            wheel_url = find_wheel(index, want)
            if wheel_url:
                print(f"  找到：{wheel_url.rsplit('/', 1)[-1]}")
                break
        except Exception as e:
            print(f"  失败：{type(e).__name__}: {e}")

    if not wheel_url:
        print("\n没找到匹配的 wheel。可以手动在 https://pypi.org/project/pillow-heif/#files 下载后解压到 tools/_vendor/。")
        return 1

    print("下载中 ...")
    with urllib.request.urlopen(wheel_url, timeout=300) as r:
        blob = r.read()
    print(f"  {len(blob) / 1024 / 1024:.1f} MB")

    if VENDOR.exists():
        import shutil

        print(f"清空旧的 {VENDOR} ...")
        shutil.rmtree(VENDOR)
    VENDOR.mkdir(parents=True, exist_ok=True)
    print(f"解压到 {VENDOR} ...")
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        z.extractall(VENDOR)

    merge_wheel_data()

    sys.path.insert(0, str(VENDOR))
    try:
        import pillow_heif
        from PIL import Image  # noqa: F401

        pillow_heif.register_heif_opener()
        _ = pillow_heif.libheif_version()
        print(f"\n完成：pillow_heif {pillow_heif.__version__} 已就位，现在可以处理 HEIC 了。")
        return 0
    except Exception as e:
        print(f"\n装好了但导入失败：{type(e).__name__}: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
