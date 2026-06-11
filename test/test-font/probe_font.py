import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont  # type: ignore
from fontTools.ttLib import TTFont  # type: ignore


def get_name_record(font, name_id: int) -> list[str]:
    names = []
    seen = set()
    for record in font["name"].names:
        if record.nameID != name_id:
            continue
        try:
            value = record.toUnicode().strip()
        except Exception:
            continue
        if value and value not in seen:
            seen.add(value)
            names.append(value)
    return names


def collect_codepoints(font) -> set[int]:
    cmap = set()
    for table in font["cmap"].tables:
        cmap.update(table.cmap.keys())
    return cmap


def probe_font(font_path: Path) -> None:
    font = TTFont(str(font_path), lazy=True)
    codepoints = collect_codepoints(font)

    family_names = get_name_record(font, 1)
    subfamily_names = get_name_record(font, 2)
    full_names = get_name_record(font, 4)
    postscript_names = get_name_record(font, 6)

    print(f"font_path: {font_path}")
    print(f"exists: {font_path.exists()}")
    print(f"size_bytes: {font_path.stat().st_size}")
    print(f"family_names: {family_names}")
    print(f"subfamily_names: {subfamily_names}")
    print(f"full_names: {full_names}")
    print(f"postscript_names: {postscript_names}")
    print(f"glyph_coverage_count: {len(codepoints)}")

    samples = [
        "中文测试",
        "霞鹜文楷",
        "星间飞行",
        "青花瓷",
        "Hello World",
        "ABC abc 123",
        "♪ 歌单 QQ 网易",
    ]

    print("\ncharacter_coverage:")
    for text in samples:
        missing = [ch for ch in text if ord(ch) not in codepoints and not ch.isspace()]
        status = "OK" if not missing else f"missing={missing}"
        print(f"  {text!r}: {status}")


def render_preview(font_path: Path, output_path: Path) -> None:
    lines = [
        "LXGW WenKai Mono Preview",
        "中文测试：霞鹜文楷 / 星间飞行 / 青花瓷",
        "English: Hello World / ABC abc 123",
        "Symbols: ♪ QQ 网易 歌单",
    ]

    image = Image.new("RGB", (1200, 320), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(font_path), 42)

    y = 30
    for line in lines:
        draw.text((30, y), line, font=font, fill="black")
        y += 70

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)
    print(f"\npreview_saved: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe TTF/OTF font metadata and glyph coverage.")
    parser.add_argument(
        "--font",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "assets" / "LXGWWenKaiMono-Regular.ttf",
        help="Path to target font file. Defaults to plugin assets/LXGWWenKaiMono-Regular.ttf",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Render a simple preview PNG using Pillow.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "font-preview.png",
        help="Preview output path when --preview is set.",
    )
    args = parser.parse_args()

    font_path = args.font.resolve()
    if not font_path.exists():
        raise SystemExit(f"Font file not found: {font_path}")

    probe_font(font_path)

    if args.preview:
        render_preview(font_path, args.output.resolve())


if __name__ == "__main__":
    main()
