"""Build fixed 448x448 dress-up layers from the approved Turini item art.

The shop cards are full worn renders, while the source accessories use different
transparent margins.  Resizing those entire 384px canvases in CSS made every
item land at a different size.  This script crops the real painted pixels and
places each item in the measured box from its worn reference.  Runtime code then
stacks same-size canvases without per-item CSS guesses.
"""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "turini"
SIZE = 448

# Boxes are measured on the 448x448 worn previews: left, top, right, bottom.
FRONT_BOXES: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "hats": {
        "chef_hat": (105, 8, 343, 154),
        "explorer_hat": (92, 28, 356, 154),
        "gold_crown": (166, 18, 282, 112),
        "graduation_cap": (101, 30, 347, 158),
        "green_cap": (118, 36, 330, 153),
        "red_beanie": (107, 32, 351, 154),
        "straw_hat": (86, 34, 362, 153),
        "wizard_hat": (87, 8, 359, 154),
        "yellow_bucket": (111, 36, 337, 154),
    },
    "glasses": {
        "black_square": (119, 121, 329, 224),
        "blue_sport": (112, 116, 332, 225),
        "gold_round": (118, 116, 329, 227),
        "green_round": (119, 115, 333, 227),
        "heart_sunglasses": (120, 113, 332, 229),
        "monocle": (229, 112, 326, 261),
        "red_reading": (120, 116, 334, 226),
        "safety_goggles": (113, 108, 334, 228),
        "star_glasses": (116, 113, 329, 230),
    },
    "neck": {
        "blue_scarf": (154, 232, 344, 352),
        "camera": (165, 234, 282, 343),
        "flower_lei": (131, 187, 329, 336),
        "gold_medal": (169, 237, 270, 350),
        "green_bow": (173, 236, 278, 334),
        "pearl_necklace": (164, 232, 290, 326),
        "red_tie": (169, 237, 266, 353),
        "white_green_collar": (158, 234, 286, 335),
        "yellow_bandana": (159, 229, 323, 335),
    },
}

# Front bags sit behind the body.  Back bags sit centered on the shoulder blades.
FRONT_BAG_BOXES = {
    "black_business": (143, 184, 305, 350),
    "green_original": (143, 184, 305, 350),
    "mint_bubble": (143, 184, 305, 350),
    "navy_school": (143, 184, 305, 350),
    "pink_heart": (143, 184, 305, 350),
    "purple_star": (143, 184, 305, 350),
    "red_hiking": (140, 178, 308, 354),
    "tan_explorer": (140, 178, 308, 354),
    "yellow_giraffe": (143, 184, 305, 350),
}

BACK_BAG_BOXES = {
    "black_business": (132, 164, 316, 366),
    "green_original": (132, 164, 316, 366),
    "mint_bubble": (132, 164, 316, 366),
    "navy_school": (132, 164, 316, 366),
    "pink_heart": (132, 164, 316, 366),
    "purple_star": (132, 164, 316, 366),
    "red_hiking": (128, 158, 320, 374),
    "tan_explorer": (128, 158, 320, 374),
    "yellow_giraffe": (132, 164, 316, 366),
}


def fitted_layer(source: Path, box: tuple[int, int, int, int]) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    content = image.getbbox()
    if not content:
        raise ValueError(f"No visible pixels: {source}")
    cropped = image.crop(content)
    left, top, right, bottom = box
    fitted = cropped.resize((right - left, bottom - top), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, (left, top))
    return canvas


def save_pair(image: Image.Image, png: Path, webp: Path) -> None:
    png.parent.mkdir(parents=True, exist_ok=True)
    webp.parent.mkdir(parents=True, exist_ok=True)
    image.save(png, optimize=True)
    image.save(webp, "WEBP", lossless=True, method=6)


def main() -> None:
    layer_root = ASSETS / "layers"
    optimized_root = ASSETS / "optimized" / "layers"

    # Canonical front image: same 448 square and near-identical proportions as
    # the worn cards. It is intentionally static inside the editor so layers
    # never slide off the face while the character breathes.
    front = Image.open(ASSETS / "turnaround" / "turini-front.png").convert("RGBA")
    front = front.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    save_pair(front, layer_root / "base" / "front.png", optimized_root / "base" / "front.webp")

    for folder, items in FRONT_BOXES.items():
        for file, box in items.items():
            layer = fitted_layer(ASSETS / "customization" / folder / f"{file}.png", box)
            save_pair(
                layer,
                layer_root / "front" / folder / f"{file}.png",
                optimized_root / "front" / folder / f"{file}.webp",
            )

    for file, box in FRONT_BAG_BOXES.items():
        layer = fitted_layer(ASSETS / "customization" / "bags" / f"{file}.png", box)
        save_pair(
            layer,
            layer_root / "front" / "bags" / f"{file}.png",
            optimized_root / "front" / "bags" / f"{file}.webp",
        )

    for file, box in BACK_BAG_BOXES.items():
        layer = fitted_layer(ASSETS / "customization" / "bags" / f"{file}.png", box)
        save_pair(
            layer,
            layer_root / "back" / "bags" / f"{file}.png",
            optimized_root / "back" / "bags" / f"{file}.webp",
        )

    print("Built 46 fixed-canvas avatar assets (PNG + lossless WebP).")


if __name__ == "__main__":
    main()
