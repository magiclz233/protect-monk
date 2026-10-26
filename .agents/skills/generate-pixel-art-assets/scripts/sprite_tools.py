"""Local-only sprite sheet, frame, palette, and GIF utilities."""

import argparse
import hashlib
import json
import math
import re
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageSequence


def require_new_output(path):
    output = Path(path).resolve()
    if output.exists():
        raise ValueError(f"Output already exists: {output}")
    return output


def open_rgba(path):
    with Image.open(path) as source:
        return source.convert("RGBA")


def parse_color(value):
    value = value.lstrip("#")
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError("Background must be a six-digit RGB color")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def key_color(image, value, tolerance):
    if not 0 <= tolerance <= 120:
        raise ValueError("Tolerance must be between 0 and 120")
    target = parse_color(value)
    limit = tolerance * tolerance
    result = image.convert("RGBA")
    pixels = list(result.getdata())
    cleaned = []
    for red, green, blue, alpha in pixels:
        distance = (red - target[0]) ** 2 + (green - target[1]) ** 2 + (blue - target[2]) ** 2
        cleaned.append((red, green, blue, 0 if distance <= limit else alpha))
    result.putdata(cleaned)
    return result


def pixel_scale(image, scale):
    if not 0.125 <= scale <= 8:
        raise ValueError("Scale must be in the range 0.125..8")
    if scale == 1:
        return image
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.NEAREST)


def reduce_colors(image, colors):
    if colors is None:
        return image
    if not 2 <= colors <= 255:
        raise ValueError("Colors must be in the range 2..255")
    indexed = image.convert("RGB").quantize(
        colors=colors,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    )
    result = indexed.convert("RGBA")
    result.putalpha(image.getchannel("A"))
    return result


def save_indexed_gif(frames, output, durations):
    indexed = []
    for frame in frames:
        image = frame.convert("RGB").quantize(
            colors=255,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.NONE,
        )
        transparent = frame.getchannel("A").point(lambda alpha: 255 if alpha < 128 else 0)
        image.paste(255, mask=transparent)
        image.info["transparency"] = 255
        indexed.append(image)
    indexed[0].save(
        output,
        save_all=True,
        append_images=indexed[1:],
        duration=durations,
        loop=0,
        disposal=2,
        transparency=255,
        optimize=False,
    )


def crop_grid(source, output, columns, rows, names=None):
    if columns <= 0 or rows <= 0:
        raise ValueError("Columns and rows must be positive")
    image = open_rgba(source)
    if image.width % columns or image.height % rows:
        raise ValueError("Sheet dimensions are not divisible by the supplied grid")
    cell_count = columns * rows
    if names:
        names = [item.strip() for item in names.split(",") if item.strip()]
        if len(names) != cell_count:
            raise ValueError("The number of names must match columns * rows")
        if any(not re.fullmatch(r"[A-Za-z0-9_-]+", name) for name in names):
            raise ValueError("Cell names may contain only letters, numbers, underscore, and hyphen")
    output = require_new_output(output)
    output.mkdir(parents=True)
    width = image.width // columns
    height = image.height // rows
    files = []
    for index in range(cell_count):
        x = index % columns * width
        y = index // columns * height
        cell = image.crop((x, y, x + width, y + height))
        name = names[index] if names else f"cell-{index + 1:03}"
        filename = f"{name}.png"
        cell.save(output / filename)
        files.append(filename)
    manifest = {
        "source": str(Path(source).resolve()),
        "columns": columns,
        "rows": rows,
        "cellWidth": width,
        "cellHeight": height,
        "files": files,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return {"output": str(output), **manifest}


def load_sequence(source, columns=None, frames=None, fps=24):
    if not 1 <= fps <= 60:
        raise ValueError("FPS must be in the range 1..60")
    default_duration = round(1000 / fps)
    with Image.open(source) as opened:
        if opened.format == "GIF":
            results = []
            durations = []
            for frame in ImageSequence.Iterator(opened):
                results.append(frame.convert("RGBA").copy())
                durations.append(frame.info.get("duration", default_duration))
            return results, durations

        if frames is None:
            return [opened.convert("RGBA")], [default_duration]

        if columns is None or columns <= 0 or frames <= 0 or frames > 512:
            raise ValueError("Sheet input requires valid columns and frames")
        rows = math.ceil(frames / columns)
        if opened.width % columns or opened.height % rows:
            raise ValueError("Sheet dimensions do not match the supplied grid")
        width = opened.width // columns
        height = opened.height // rows
        image = opened.convert("RGBA")
        results = []
        for index in range(frames):
            x = index % columns * width
            y = index // columns * height
            results.append(image.crop((x, y, x + width, y + height)))
        return results, [default_duration] * frames


def write_sequence(frames, durations, output, columns=None, metadata=None):
    if not frames:
        raise ValueError("No frames found")
    width, height = frames[0].size
    if any(frame.size != (width, height) for frame in frames):
        raise ValueError("All frames must have the same size")
    if len(durations) != len(frames):
        raise ValueError("Frame durations must match the frame count")

    output = require_new_output(output)
    output.mkdir(parents=True)
    for index, frame in enumerate(frames, start=1):
        frame.save(output / f"frame-{index:03}.png")

    columns = min(len(frames), columns or min(8, len(frames)))
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * width, rows * height))
    for index, frame in enumerate(frames):
        x = index % columns * width
        y = index // columns * height
        sheet.alpha_composite(frame, (x, y))
    sheet.save(output / "sequence.png")

    if len(frames) > 1:
        save_indexed_gif(frames, output / "animation.gif", durations)

    manifest = {
        "frames": len(frames),
        "columns": columns,
        "rows": rows,
        "frameWidth": width,
        "frameHeight": height,
        "gif": len(frames) > 1,
    }
    if metadata:
        manifest["metadata"] = metadata
    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return {"output": str(output), **manifest}


def process(args):
    if args.frames is not None and (args.columns is None or args.columns <= 0):
        raise ValueError("--columns is required when --frames is supplied")
    frames, durations = load_sequence(args.input, args.columns, args.frames, args.fps)
    if not frames:
        raise ValueError("No frames found")
    processed = []
    for frame in frames:
        if args.background:
            frame = key_color(frame, args.background, args.tolerance)
        frame = pixel_scale(frame, args.scale)
        frame = reduce_colors(frame, args.colors)
        processed.append(frame)

    return write_sequence(
        processed,
        durations,
        args.out,
        args.columns,
        {"source": str(Path(args.input).resolve()), "fps": args.fps},
    )


def concat_sheets(args):
    if args.input_columns <= 0 or args.input_rows <= 0:
        raise ValueError("Input columns and rows must be positive")
    frames = []
    durations = []
    frame_count = args.input_columns * args.input_rows
    for source in args.inputs:
        loaded, loaded_durations = load_sequence(
            source,
            args.input_columns,
            frame_count,
            args.fps,
        )
        frames.extend(loaded)
        durations.extend(loaded_durations)

    processed = []
    for frame in frames:
        if args.background:
            frame = key_color(frame, args.background, args.tolerance)
        frame = pixel_scale(frame, args.scale)
        frame = reduce_colors(frame, args.colors)
        processed.append(frame)

    return write_sequence(
        processed,
        durations,
        args.out,
        args.out_columns,
        {
            "sources": [str(Path(source).resolve()) for source in args.inputs],
            "inputColumns": args.input_columns,
            "inputRows": args.input_rows,
            "fps": args.fps,
        },
    )


def audit_sheet(args):
    if args.columns <= 0 or args.rows <= 0:
        raise ValueError("Columns and rows must be positive")
    image = open_rgba(args.input)
    if image.width % args.columns or image.height % args.rows:
        raise ValueError("Sheet dimensions are not divisible by the supplied grid")
    width = image.width // args.columns
    height = image.height // args.rows
    frame_count = args.columns * args.rows
    target = parse_color(args.background) if args.background else None
    tolerance_squared = args.tolerance * args.tolerance

    entries = []
    duplicate_map = {}
    baselines = []
    centers = []
    empty_frames = []
    for index in range(frame_count):
        x = index % args.columns * width
        y = index // args.columns * height
        cell = image.crop((x, y, x + width, y + height))
        mask = Image.new("L", (width, height), 0)
        mask_pixels = mask.load()
        cell_pixels = cell.load()
        for py in range(height):
            for px in range(width):
                red, green, blue, alpha = cell_pixels[px, py]
                if target:
                    distance = (
                        (red - target[0]) ** 2
                        + (green - target[1]) ** 2
                        + (blue - target[2]) ** 2
                    )
                    visible = alpha > 0 and distance > tolerance_squared
                else:
                    visible = alpha > 16
                if visible:
                    mask_pixels[px, py] = 255
        box = mask.getbbox()
        digest = hashlib.sha256(cell.tobytes()).hexdigest()
        duplicate_map.setdefault(digest, []).append(index + 1)
        entry = {"frame": index + 1, "box": list(box) if box else None}
        if box:
            baseline = box[3] - 1
            center = (box[0] + box[2] - 1) / 2
            baselines.append(baseline)
            centers.append(center)
            entry.update({"baseline": baseline, "center": round(center, 2)})
        else:
            empty_frames.append(index + 1)
        entries.append(entry)

    duplicate_groups = [values for values in duplicate_map.values() if len(values) > 1]
    baseline_drift = max(baselines) - min(baselines) if baselines else None
    center_drift = max(centers) - min(centers) if centers else None
    warnings = []
    if empty_frames:
        warnings.append("Empty cells were detected.")
    if duplicate_groups:
        warnings.append("Identical frames were detected; verify whether they are intentional holds.")
    if baseline_drift is not None and baseline_drift > args.baseline_tolerance:
        warnings.append(
            f"Baseline drift {baseline_drift}px exceeds tolerance {args.baseline_tolerance}px."
        )
    if center_drift is not None and center_drift > args.center_tolerance:
        warnings.append(
            f"Horizontal center drift {center_drift:.2f}px exceeds tolerance {args.center_tolerance}px."
        )
    if width != height:
        warnings.append("Cells are not square; verify the target engine canvas.")
    if not target:
        warnings.append("No key color was supplied; transparent-background checks may be limited.")

    result = {
        "input": str(Path(args.input).resolve()),
        "columns": args.columns,
        "rows": args.rows,
        "frames": frame_count,
        "cellWidth": width,
        "cellHeight": height,
        "emptyFrames": empty_frames,
        "duplicateGroups": duplicate_groups,
        "baselineDrift": baseline_drift,
        "centerDrift": round(center_drift, 2) if center_drift is not None else None,
        "warnings": warnings,
        "entries": entries,
    }
    if args.out:
        output = require_new_output(args.out)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        result["audit"] = str(output)
    return result


def discover_pngs(directory, pattern):
    paths = sorted(Path(directory).glob(pattern))
    if not paths:
        all_pngs = sorted(Path(directory).glob("*.png"))
        paths = [path for path in all_pngs if path.name != "sequence.png"]
    return paths


def make_gif(args):
    if not 1 <= args.fps <= 60:
        raise ValueError("FPS must be in the range 1..60")
    paths = discover_pngs(args.input_dir, args.pattern)
    if not paths:
        raise ValueError("No PNG frames found")
    frames = [open_rgba(path) for path in paths]
    size = frames[0].size
    if any(frame.size != size for frame in frames):
        raise ValueError("All PNG frames must have the same size")
    output = Path(args.out).resolve()
    if output.exists():
        raise ValueError(f"Output already exists: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    duration = round(1000 / args.fps)
    save_indexed_gif(frames, output, [duration] * len(frames))
    return {"output": str(output), "frames": len(frames), "fps": args.fps}


def self_test():
    with tempfile.TemporaryDirectory(prefix="sprite-tools-") as temporary:
        root = Path(temporary)
        sheet = Image.new("RGBA", (128, 64), "white")
        draw = ImageDraw.Draw(sheet)
        for index in range(8):
            x = index % 4 * 32
            y = index // 4 * 32
            color = (index * 25 % 220, 40, 180 - index * 15, 255)
            draw.rectangle((x + 8, y + 5, x + 23, y + 27), fill=color, outline="black")
            draw.line((x + 15, y + 4, x + 15, y + 28), fill="black", width=1)
        source = root / "sheet.png"
        sheet.save(source)

        cells = crop_grid(source, root / "cells", 4, 2)
        assert cells["columns"] * cells["rows"] == 8
        assert len(list((root / "cells").glob("*.png"))) == 8

        result = process(argparse.Namespace(
            input=source,
            columns=4,
            frames=8,
            fps=12,
            background=None,
            tolerance=30,
            scale=2,
            colors=16,
            out=root / "processed",
        ))
        assert result["frames"] == 8
        assert result["frameWidth"] == 64
        assert (root / "processed" / "animation.gif").is_file()

        audit = audit_sheet(argparse.Namespace(
            input=source,
            columns=4,
            rows=2,
            background="FFFFFF",
            tolerance=10,
            baseline_tolerance=3,
            center_tolerance=8,
            out=root / "audit.json",
        ))
        assert audit["emptyFrames"] == []
        assert (root / "audit.json").is_file()

        combined = concat_sheets(argparse.Namespace(
            inputs=[source, source],
            input_columns=4,
            input_rows=2,
            out_columns=6,
            fps=12,
            background=None,
            tolerance=30,
            scale=1,
            colors=None,
            out=root / "combined",
        ))
        assert combined["frames"] == 16
        assert (root / "combined" / "animation.gif").is_file()

        gif_result = make_gif(argparse.Namespace(
            input_dir=root / "processed",
            pattern="frame-*.png",
            fps=12,
            out=root / "standalone.gif",
        ))
        assert gif_result["frames"] == 8
        with Image.open(root / "standalone.gif") as gif:
            assert gif.n_frames == 8

    return {"ok": True, "cells": 8, "frames": 8, "combinedFrames": 16, "gifFrames": 8}


def parser():
    root = argparse.ArgumentParser(description="Local pixel sprite processing tools")
    commands = root.add_subparsers(dest="command", required=True)

    crop = commands.add_parser("crop-grid", help="Split an equal-cell sheet")
    crop.add_argument("--input", required=True)
    crop.add_argument("--columns", required=True, type=int)
    crop.add_argument("--rows", required=True, type=int)
    crop.add_argument("--names", help="Comma-separated names, one per cell")
    crop.add_argument("--out", required=True)

    process_parser = commands.add_parser("process", help="Extract frames and create PNG/GIF output")
    process_parser.add_argument("--input", required=True)
    process_parser.add_argument("--columns", type=int)
    process_parser.add_argument("--frames", type=int)
    process_parser.add_argument("--background", help="Six-digit RGB key color")
    process_parser.add_argument("--tolerance", type=int, default=30)
    process_parser.add_argument("--colors", type=int)
    process_parser.add_argument("--scale", type=float, default=1)
    process_parser.add_argument("--fps", type=int, default=24)
    process_parser.add_argument("--out", required=True)

    concat = commands.add_parser("concat", help="Join multiple equal-grid sheets in order")
    concat.add_argument("--inputs", nargs="+", required=True)
    concat.add_argument("--input-columns", required=True, type=int)
    concat.add_argument("--input-rows", required=True, type=int)
    concat.add_argument("--out-columns", type=int, default=6)
    concat.add_argument("--background", help="Six-digit RGB key color")
    concat.add_argument("--tolerance", type=int, default=30)
    concat.add_argument("--colors", type=int)
    concat.add_argument("--scale", type=float, default=1)
    concat.add_argument("--fps", type=int, default=24)
    concat.add_argument("--out", required=True)

    audit = commands.add_parser("audit", help="Check empty cells, duplicate frames, and drift")
    audit.add_argument("--input", required=True)
    audit.add_argument("--columns", required=True, type=int)
    audit.add_argument("--rows", required=True, type=int)
    audit.add_argument("--background", help="Six-digit RGB key color")
    audit.add_argument("--tolerance", type=int, default=30)
    audit.add_argument("--baseline-tolerance", type=int, default=3)
    audit.add_argument("--center-tolerance", type=float, default=8)
    audit.add_argument("--out")

    gif = commands.add_parser("gif", help="Combine ordered PNG frames into a GIF")
    gif.add_argument("--input-dir", required=True)
    gif.add_argument("--pattern", default="frame-*.png")
    gif.add_argument("--fps", type=int, default=12)
    gif.add_argument("--out", required=True)

    commands.add_parser("self-test", help="Run a local end-to-end check")
    return root


def main():
    args = parser().parse_args()
    if args.command == "crop-grid":
        result = crop_grid(args.input, args.out, args.columns, args.rows, args.names)
    elif args.command == "process":
        result = process(args)
    elif args.command == "concat":
        result = concat_sheets(args)
    elif args.command == "audit":
        result = audit_sheet(args)
    elif args.command == "gif":
        result = make_gif(args)
    else:
        result = self_test()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
