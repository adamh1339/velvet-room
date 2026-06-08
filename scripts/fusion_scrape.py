"""scripts/fusion_scrape.py
Downloads structured fusion data JSON files from aqiu384/megaten-fusion-tool.
These are used by the fusion calculator feature — NOT the scraping/training pipeline.

Run: uv run scripts/fusion_scrape.py
"""

import os
import requests

BASE = "https://raw.githubusercontent.com/aqiu384/megaten-fusion-tool/master/src/app"

FILES = {
    "p3r": [
        ("p3r/data/demon-data.json",      "persona-data.json"),
        ("p3r/data/fusion-chart.json",    "fusion-chart.json"),
        ("p3r/data/special-recipes.json", "special-recipes.json"),
        ("p3r/data/skill-data.json",      "skill-data.json"),
    ],
    "p4g": [
        ("p4/data/golden-demon-data.json",   "persona-data.json"),
        ("p4/data/golden-fusion-chart.json", "fusion-chart.json"),
        ("p4/data/special-recipes.json",     "special-recipes.json"),
        ("p4/data/golden-skill-data.json",   "skill-data.json"),
    ],
    "p5r": [
        ("p5/data/roy-demon-data.json",      "persona-data.json"),
        ("p5/data/roy-fusion-chart.json",    "fusion-chart.json"),
        ("p5/data/roy-special-recipes.json", "special-recipes.json"),
        ("p5/data/roy-skill-data.json",      "skill-data.json"),
        ("p5/data/roy-fusion-prereqs.json",  "fusion-prereqs.json"),
    ],
}

if __name__ == "__main__":
    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0"

    for game, file_list in FILES.items():
        out_dir = f"data/fusion/{game}"
        os.makedirs(out_dir, exist_ok=True)
        print(f"\n[{game.upper()}]")
        for src_path, dest_name in file_list:
            url = f"{BASE}/{src_path}"
            dest = f"{out_dir}/{dest_name}"
            if os.path.exists(dest):
                print(f"  Already exists: {dest_name}")
                continue
            try:
                r = session.get(url, timeout=15)
                r.raise_for_status()
                with open(dest, "w", encoding="utf-8") as f:
                    f.write(r.text)
                print(f"  Downloaded: {dest_name} ({len(r.text):,} chars)")
            except Exception as e:
                print(f"  Failed {dest_name}: {e}")

    print("\nDone. Files saved to data/fusion/")
