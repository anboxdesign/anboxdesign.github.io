import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path.home() / "Downloads" / "anbox-cases-2026-08-26.json"
ASSET_DIR = ROOT / "assets" / "cases"
CATALOG = ROOT / "anbox-cases-2026-08-26.normalized.json"
TARGETS = {"desktop": (1536, 1024), "mobile": (1080, 1350)}


def crop_for_view(image, target, x, y, zoom):
    image = ImageOps.exif_transpose(image)
    width, height = image.size
    target_width, target_height = target
    target_ratio = target_width / target_height
    source_ratio = width / height
    if source_ratio >= target_ratio:
        crop_height = height
        crop_width = height * target_ratio
    else:
        crop_width = width
        crop_height = width / target_ratio
    zoom = max(1.0, float(zoom or 1))
    crop_width /= zoom
    crop_height /= zoom
    left = (width - crop_width) * min(100, max(0, float(x or 50))) / 100
    top = (height - crop_height) * min(100, max(0, float(y or 50))) / 100
    box = (
        round(left),
        round(top),
        round(left + crop_width),
        round(top + crop_height),
    )
    cropped = image.crop(box).resize(target, Image.Resampling.LANCZOS)
    if "A" in cropped.getbands():
        return cropped.convert("RGBA")
    return cropped.convert("RGB")


def export_upload(case_number, variant, media):
    prefix, encoded = media["src"].split(",", 1)
    if ";base64" not in prefix:
        raise ValueError(f"Case {case_number} {variant}: unsupported data URL")
    image = Image.open(io.BytesIO(base64.b64decode(encoded)))
    target = TARGETS[variant]
    rendered = crop_for_view(image, target, media.get("x", 50), media.get("y", 50), media.get("zoom", 1))
    filename = f"case-{case_number}-{variant}.webp"
    destination = ASSET_DIR / filename
    rendered.save(destination, "WEBP", quality=84, method=6, exact=True)
    return {
        "src": f"assets/cases/{filename}",
        "source": "asset",
        "width": target[0],
        "height": target[1],
        "x": 50,
        "y": 50,
        "zoom": 1,
    }


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    if data.get("format") != "anbox-gallery-cases" or data.get("version") != 3:
        raise ValueError("Unsupported ANBOX gallery export")
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    normalized_cases = []
    for case in data["cases"]:
        normalized = {key: case.get(key, "") for key in (
            "number", "title", "info", "category", "works", "scale", "result", "link", "alt", "onHero"
        )}
        for variant in TARGETS:
            media = case[variant]
            if media.get("source") == "upload" or str(media.get("src", "")).startswith("data:image/"):
                normalized[variant] = export_upload(case["number"], variant, media)
            else:
                normalized[variant] = {
                    "src": media.get("src", ""),
                    "source": "url",
                    "width": TARGETS[variant][0],
                    "height": TARGETS[variant][1],
                    "x": media.get("x", 50),
                    "y": media.get("y", 50),
                    "zoom": media.get("zoom", 1),
                }
        normalized_cases.append(normalized)
    catalog = {
        "format": data["format"],
        "version": data["version"],
        "exportedAt": data.get("exportedAt"),
        "heroCases": data.get("heroCases", []),
        "total": len(normalized_cases),
        "cases": normalized_cases,
    }
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total_bytes = sum(path.stat().st_size for path in ASSET_DIR.glob("*.webp"))
    print(json.dumps({"catalog": str(CATALOG), "assets": len(list(ASSET_DIR.glob('*.webp'))), "bytes": total_bytes}, ensure_ascii=False))


if __name__ == "__main__":
    main()
