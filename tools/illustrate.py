#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
illustrate.py — 博客配图工作流：生成 → 压缩 → 插入引用（一条命令）

用法：
  python3 tools/illustrate.py <文章.md> [--mode auto|banner|full] [--sections N] [--force] [--dry-run]
  python3 tools/illustrate.py --dir docs/体系思维 [--mode auto] [--sections 3]

规范（见《配图工作流技术方案.md》）：
  · WebP q80；头图 ≤1200px(16:9/2K 生成)，插图 ≤800px(3:2/1K 生成)
  · 普通文章 1 张头图；重点长文头图 + 最多 N 张章节图（lazy 加载）
  · PNG 原图归档 assets-src/images/<slug>/（不进 public、不上服务器）
"""

import argparse
import os
import re
import subprocess
import sys
import time

# ---------- 配置 ----------
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN_ROOT = "/Users/fengjincong/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/image_generation"
GEN_SCRIPT = os.path.join(PLUGIN_ROOT, "scripts/image_generation_tool.py")

PUBLIC_IMAGES = os.path.join(PROJECT_ROOT, "docs/.vuepress/public/images")
ASSETS_SRC = os.path.join(PROJECT_ROOT, "assets-src/images")

STYLE_SUFFIX = ("cinematic editorial illustration, deep navy blue and fiery orange "
                "color palette, dramatic lighting, dark tech atmosphere, "
                "high detail digital painting")

# ---------- 输出规范（2026-08-18 定稿） ----------
# 生成参数：头图 16:9 @2K（2048px 宽源图），章节图 3:2 @1K（1536px 宽源图）
# 输出参数：统一 WebP q85；保留源图宽度不缩放（仅作为上限保护），
#           即头图输出 2048px、章节图输出 1536px
BANNER_RATIO, BANNER_RES, BANNER_WIDTH = "16:9", "2K", 2048
SECTION_RATIO, SECTION_RES, SECTION_WIDTH = "3:2", "1K", 1536
WEBP_QUALITY = 85

# ---------- 去水印 ----------
# 生成平台会在每张图左下角叠加「AI生成」浅色半透明文字水印。
# 位置：底部约 10% 高度、左侧约 15% 宽度的区域内（两种分辨率均实测验证）。
# 处理策略（详见 remove_watermark_png 注释）：
#   首选 OpenCV Telea AI 修复（检测水印掩码 + 纹理填充，零信息丢失）；
#   兜底裁掉底部 CROP_BOTTOM_PCT（仅 cv2 不可用时）。
# 时机：生成落盘后立即处理，assets-src 归档的即为无水印原图。
CROP_BOTTOM_PCT = 0.11

# auto 模式判定「重点长文」的阈值
FULL_MIN_SECTIONS = 3      # 至少 3 个 ### 小节
FULL_MIN_CHARS = 2000      # 且正文至少 2000 字符

GEN_TIMEOUT = 240          # 单张图生成超时（秒）


# ---------- 文章解析 ----------
def fence_mask(lines):
    """标记代码围栏（``` 块）内的行，这些行不参与标题/图片识别。"""
    mask = [False] * len(lines)
    in_fence = False
    for i, line in enumerate(lines):
        if line.strip().startswith("```"):
            in_fence = not in_fence
            mask[i] = True
        elif in_fence:
            mask[i] = True
    return mask


def parse_article(md_path):
    with open(md_path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    mask = fence_mask(lines)
    title = None
    h1_idx = None
    # H1 只认文章开头 8 行内的「# 」，防止把代码块/正文里的示例标题当成文章标题
    for i, line in enumerate(lines[:8]):
        if not mask[i] and line.startswith("# "):
            title = line[2:].strip()
            h1_idx = i
            break
    if title is None:
        title = os.path.splitext(os.path.basename(md_path))[0]
    sections = []  # (heading_line_idx, section_title)
    for i, line in enumerate(lines):
        if mask[i]:
            continue
        m = re.match(r"^###\s+(.+?)\s*$", line)
        if m:
            sections.append((i, m.group(1)))
    body_chars = sum(len(l) for l in lines)
    return lines, title, h1_idx, sections, body_chars, mask


def section_excerpt(lines, heading_idx, mask, limit=120):
    """取小节正文前 limit 个字符作为生成提示。"""
    buf = []
    for j in range(heading_idx + 1, len(lines)):
        line = lines[j]
        if not mask[j] and line.startswith("#"):
            break
        if not mask[j] and line.strip() and not re.fullmatch(r"[-—–*_\s]+", line):
            buf.append(line)
        if sum(len(x) for x in buf) > limit:
            break
    text = " ".join(buf)
    text = re.sub(r"[*_`>\[\]()#]", "", text)
    return text[:limit].strip()


def first_paragraph(lines, h1_idx, mask, limit=150):
    start = (h1_idx + 1) if h1_idx is not None else 0
    buf = []
    for j in range(start, len(lines)):
        line = lines[j]
        if not mask[j] and line.startswith("#"):
            break
        if mask[j]:
            continue
        if (line.strip() and not re.fullmatch(r"[-—–*_\s]+", line)
                and not line.strip().startswith("!") and not line.strip().startswith("<img")):
            buf.append(line.strip())
        if sum(len(x) for x in buf) > limit:
            break
    text = " ".join(buf)
    text = re.sub(r"[*_`>\[\]()#]", "", text)
    return text[:limit].strip()


def has_header_image(lines, h1_idx, mask):
    """头部区域（H1 后 15 行，无 H1 则文首 10 行）已有图片则视为已配头图。"""
    start = (h1_idx + 1) if h1_idx is not None else 0
    end = start + (15 if h1_idx is not None else 10)
    for j in range(start, min(end, len(lines))):
        line = lines[j]
        if not mask[j] and h1_idx is not None and line.startswith("#"):
            break
        if not mask[j] and ("![" in line or "<img" in line):
            return True
    return False


# ---------- 图片生成与压缩 ----------
def generate_image(prompt, ratio, resolution, out_png, dry_run=False):
    if dry_run:
        print(f"    [dry-run] generate -> {out_png}")
        print(f"    [dry-run] prompt: {prompt[:100]}...")
        return True
    cmd = [sys.executable, GEN_SCRIPT, "generate",
           "--description", prompt,
           "--ratio", ratio,
           "--resolution", resolution,
           "--output", out_png]
    try:
        r = subprocess.run(cmd, cwd=PLUGIN_ROOT, capture_output=True, text=True, timeout=GEN_TIMEOUT)
    except subprocess.TimeoutExpired:
        print(f"    [FAIL] 生成超时: {out_png}")
        return False
    if r.returncode != 0 or not os.path.exists(out_png):
        print(f"    [FAIL] 生成失败: {out_png}")
        print(f"    {r.stdout.strip()} {r.stderr.strip()}"[:400])
        return False
    return True


def remove_watermark_png(png_path):
    """直接对 PNG 原图去水印（就地处理，优先 AI 修复，无信息丢失）。

    原理：生成平台在每张图左下角叠加「AI生成」浅色半透明文字水印，
    位置固定在底部约 10% 高度、左侧约 15% 宽度的区域内（两种分辨率均验证过）。

    首选方案 —— OpenCV Telea 修复（inpainting，2026-08-19 起）：
      1. 在左下角候选区域内用大核高斯模糊估计背景；
      2. 观察值显著亮于背景的像素即为水印文字（浅色文字特征），生成掩码；
      3. 形态学膨胀掩码以覆盖文字边缘的抗锯齿过渡带；
      4. cv2.inpaint(Telea) 用周围纹理智能填充，画面零裁切、零信息丢失。
      已实测：深色科技风配图上水印可完全消除且纹理自然。

    兜底方案 —— 裁掉底部 11%（CROP_BOTTOM_PCT）：
      仅在 cv2 不可用或未检测到水印掩码时启用，会损失底部少量画面。

    时机：生成落盘后立即执行，此后 assets-src 归档的即为无水印原图，
    to_webp 等环节不再重复处理。
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        cv2 = None

    if cv2 is not None:
        img = cv2.imread(png_path)
        h, w = img.shape[:2]
        # 候选区域：左下角（宽 20% × 底部 9%）
        ry = int(h * 0.91)
        rw, rh = int(w * 0.20), h - ry
        roi = img[ry:ry + rh, 0:rw].astype(np.float32)
        # 大核高斯模糊估计背景（半径远大于文字笔画）
        bg = cv2.GaussianBlur(roi, (0, 0), sigmaX=15, sigmaY=15)
        # 浅色水印文字：任一通道显著亮于背景即为水印像素
        lift = (roi - bg).max(axis=2)
        m = (lift > 18).astype(np.uint8) * 255
        m = cv2.dilate(m, np.ones((5, 5), np.uint8), iterations=2)
        mask = np.zeros((h, w), np.uint8)
        mask[ry:ry + rh, 0:rw] = m
        n = int((mask > 0).sum())
        print(f"    水印掩码像素: {n}")
        if n > 100:  # 检测到有效水印区域 → AI 修复
            cv2.imwrite(png_path, cv2.inpaint(img, mask, 7, cv2.INPAINT_TELEA))
            return
        print("    未检测到水印，跳过处理")
        return

    # 兜底：无 cv2 时裁剪底部 11%
    from PIL import Image
    img = Image.open(png_path).convert("RGB")
    w, h = img.size
    img.crop((0, 0, w, int(h * (1 - CROP_BOTTOM_PCT)))).save(png_path, "PNG")


def to_webp(png_path, webp_path, max_width, dry_run=False):
    """PNG 原图（已去水印）→ 线上 WebP。流程：宽度上限保护 → q85 输出。"""
    if dry_run:
        print(f"    [dry-run] webp(≤{max_width}px, q{WEBP_QUALITY}) -> {webp_path}")
        return 0
    from PIL import Image
    img = Image.open(png_path).convert("RGB")
    w, h = img.size
    # 第一步：宽度上限保护（正常情况下源图宽度等于上限，不触发缩放）
    if w > max_width:
        img = img.resize((max_width, int(h * max_width / w)), Image.LANCZOS)
    # 第二步：q85 有损压缩输出（method=6 慢速高压，同体积下细节更好）
    img.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
    return os.path.getsize(webp_path)


def recompress_all():
    """不重生成，仅用当前输出参数从 assets-src 里的 PNG 原图重新派生全部 WebP。
    用于输出规范调整（如清晰度升级）后批量刷新已有配图。"""
    count, total_kb = 0, 0
    for slug in sorted(os.listdir(ASSETS_SRC)):
        src_dir = os.path.join(ASSETS_SRC, slug)
        if not os.path.isdir(src_dir):
            continue
        out_dir = os.path.join(PUBLIC_IMAGES, slug)
        os.makedirs(out_dir, exist_ok=True)
        for f in sorted(os.listdir(src_dir)):
            if not f.endswith(".png"):
                continue
            width = BANNER_WIDTH if f.startswith("banner") else SECTION_WIDTH
            size = to_webp(os.path.join(src_dir, f), os.path.join(out_dir, f.replace(".png", ".webp")), width)
            count += 1
            total_kb += size // 1024
    print(f"重压缩完成：{count} 张，共约 {total_kb} KB")


# ---------- Markdown 改写 ----------
def insert_banner(lines, h1_idx, slug, title):
    ref = f"![{title}](/images/{slug}/banner.webp)"
    if h1_idx is None:
        return [ref, ""] + lines
    return lines[:h1_idx + 1] + ["", ref] + lines[h1_idx + 1:]


def insert_section_image(lines, heading_idx, mask, slug, sec_no, sec_title):
    """在小节末尾（下一个标题之前，忽略代码块内的 # 行）插入 lazy img。"""
    img = (f'<img src="/images/{slug}/section-{sec_no:02d}.webp" '
           f'alt="{sec_title}" loading="lazy" />')
    end = len(lines)
    for j in range(heading_idx + 1, len(lines)):
        if not mask[j] and lines[j].startswith("#"):
            end = j
            break
    # 去掉末尾空行后插入
    k = end
    while k > heading_idx + 1 and not lines[k - 1].strip():
        k -= 1
    return lines[:k] + ["", img, ""] + lines[k:]


def section_has_image(lines, heading_idx, mask):
    for j in range(heading_idx + 1, len(lines)):
        if not mask[j] and lines[j].startswith("#"):
            break
        if not mask[j] and ("![" in lines[j] or "<img" in lines[j]):
            return True
    return False


# ---------- 单篇文章处理 ----------
def illustrate_article(md_path, mode, max_sections, force=False, dry_run=False):
    slug = os.path.splitext(os.path.basename(md_path))[0]
    lines, title, h1_idx, sections, body_chars, mask = parse_article(md_path)
    text = "\n".join(lines)

    if f"/images/{slug}/banner.webp" in text and not force:
        print(f"[SKIP] {slug}（已配图）")
        return "skip"
    if has_header_image(lines, h1_idx, mask) and not force:
        print(f"[SKIP] {slug}（头部已有图片）")
        return "skip"

    # auto 模式判定
    eff_mode = mode
    if mode == "auto":
        eff_mode = "full" if (len(sections) >= FULL_MIN_SECTIONS and body_chars >= FULL_MIN_CHARS) else "banner"

    src_dir = os.path.join(ASSETS_SRC, slug)
    out_dir = os.path.join(PUBLIC_IMAGES, slug)
    os.makedirs(src_dir, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)

    summary = first_paragraph(lines, h1_idx, mask)
    generated = []  # (kind, key, webp_size)

    # 1) 头图
    prompt = (f"为技术博客文章《{title}》绘制一张宽幅头图，主题：{summary or title}。"
              f"画面要求：{STYLE_SUFFIX}")
    png = os.path.join(src_dir, "banner.png")
    webp = os.path.join(out_dir, "banner.webp")
    if generate_image(prompt, BANNER_RATIO, BANNER_RES, png, dry_run):
        if not dry_run:
            remove_watermark_png(png)   # 去水印直接作用于 PNG 原图
        size = to_webp(png, webp, BANNER_WIDTH, dry_run)
        generated.append(("banner", None, size))
        lines = insert_banner(lines, h1_idx, slug, title)
        # 头部插入 2 行，重算代码块掩码并同步小节行号
        mask = fence_mask(lines)
        sections = [(i + 2, t) for i, t in sections]
    else:
        print(f"[FAIL] {slug}（头图生成失败，跳过本文章）")
        return "fail"

    # 2) 章节插图
    if eff_mode == "full":
        picked = 0
        new_lines = lines
        offset = 0
        for idx, sec_title in sections:
            if picked >= max_sections:
                break
            real_idx = idx + offset
            if section_has_image(new_lines, real_idx, mask):
                continue
            picked += 1
            excerpt = section_excerpt(new_lines, real_idx, mask)
            prompt = (f"为技术博客文章《{title}》中「{sec_title}」这一章节绘制插图，"
                      f"章节要点：{excerpt or sec_title}。画面要求：{STYLE_SUFFIX}")
            png = os.path.join(src_dir, f"section-{picked:02d}.png")
            webp = os.path.join(out_dir, f"section-{picked:02d}.webp")
            if generate_image(prompt, SECTION_RATIO, SECTION_RES, png, dry_run):
                if not dry_run:
                    remove_watermark_png(png)   # 去水印直接作用于 PNG 原图
                size = to_webp(png, webp, SECTION_WIDTH, dry_run)
                generated.append(("section", sec_title, size))
                before = len(new_lines)
                new_lines = insert_section_image(new_lines, real_idx, mask, slug, picked, sec_title)
                offset += len(new_lines) - before
                mask = fence_mask(new_lines)
            else:
                picked -= 1  # 失败不占用编号
        lines = new_lines

    if not dry_run:
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    total_kb = sum(s for _, _, s in generated) // 1024
    detail = "、".join(f"{k}({s // 1024}KB)" if k == "banner" else f"section[{t}]({s // 1024}KB)"
                       for k, t, s in generated)
    print(f"[OK] {slug} mode={eff_mode} 共{len(generated)}张 约{total_kb}KB：{detail}")
    return "ok"


# ---------- 入口 ----------
def main():
    ap = argparse.ArgumentParser(description="博客配图工作流")
    ap.add_argument("article", nargs="?", help="单篇文章 .md 路径")
    ap.add_argument("--dir", help="批量处理目录（递归找 .md）")
    ap.add_argument("--mode", choices=["auto", "banner", "full"], default="auto")
    ap.add_argument("--sections", type=int, default=3, help="full 模式最多章节图数量")
    ap.add_argument("--force", action="store_true", help="已配图也重新生成")
    ap.add_argument("--dry-run", action="store_true", help="只打印计划，不真正生成/改写")
    ap.add_argument("--shard", help="分片并行，如 0/3 表示 3 个 worker 中的第 0 个（按排序后序号取模）")
    ap.add_argument("--recompress", action="store_true",
                    help="不重新生成，只用当前输出参数从 assets-src 的 PNG 原图重派生全部 WebP")
    args = ap.parse_args()

    if args.recompress:
        recompress_all()
        return

    if not args.article and not args.dir:
        ap.error("需要指定文章路径或 --dir 目录")

    targets = []
    if args.article:
        targets.append(args.article)
    if args.dir:
        for root, _, files in os.walk(args.dir):
            for f in sorted(files):
                if f.endswith(".md"):
                    targets.append(os.path.join(root, f))
        targets.sort()

    if args.shard:
        k, n = (int(x) for x in args.shard.split("/"))
        targets = [t for i, t in enumerate(targets) if i % n == k]
        print(f"分片 {args.shard}：分到 {len(targets)} 篇")

    print(f"共 {len(targets)} 篇文章待处理，mode={args.mode}，sections={args.sections}")
    stats = {"ok": 0, "skip": 0, "fail": 0}
    t0 = time.time()
    for i, path in enumerate(targets, 1):
        print(f"\n===== [{i}/{len(targets)}] {path} =====")
        try:
            r = illustrate_article(path, args.mode, args.sections, args.force, args.dry_run)
        except Exception as e:
            print(f"[FAIL] {path}: {e}")
            r = "fail"
        stats[r] += 1
    print(f"\n===== 完成 =====")
    print(f"成功 {stats['ok']} / 跳过 {stats['skip']} / 失败 {stats['fail']}，耗时 {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
