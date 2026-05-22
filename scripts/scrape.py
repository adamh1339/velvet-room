"""scripts/scrape.py — Persona AI data scraper

Two sources:
  Wiki  → Fandom MediaWiki API (/api.php) — bypasses Cloudflare, no JS needed
  Fuse  → aqiu384 fusion tool (React SPA) — requires Playwright

Run:
  pip install -r requirements.txt
  playwright install chromium
  python scripts/scrape.py
"""

import json
import os
import time

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("WARNING: Playwright not installed. Fusion tool scraping will be skipped.")
    print("  Run: pip install playwright && playwright install chromium")

# ============================================
# CONFIG
# ============================================

FANDOM_API = "https://megamitensei.fandom.com/api.php"
FANDOM_BASE = "https://megamitensei.fandom.com/wiki/"

# Wiki article titles (exact, spaces ok) — enough source material for MVP dataset
WIKI_PAGES = {
    "p3": [
        "Nyx Avatar",
        "Protagonist (Persona 3)",
        "Tartarus",
        "Full Moon Operations",
        "Aigis",
        "Mitsuru Kirijo",
        "Yukari Takeba",
        "Junpei Iori",
        "Shinjiro Aragaki",
        "Elizabeth",
        "Persona 3 Reload",
    ],
    "p4": [
        "Shadow Yukiko",
        "Shadow Kanji",
        "Shadow Rise",
        "Shadow Mitsuo",
        "Shadow Naoto",
        "Izanami",
        "Protagonist (Persona 4)",
        "Yosuke Hanamura",
        "Chie Satonaka",
        "Margaret",
        "Persona 4 Golden",
    ],
    "p5": [
        "Shadow Kamoshida",
        "Shadow Madarame",
        "Shadow Kaneshiro",
        "Shadow Okumura",
        "Shadow Niijima",
        "Shadow Shido",
        "Yaldabaoth",
        "Yoshitsune (Persona 5)",
        "Protagonist (Persona 5 Royal)",
        "Caroline and Justine",
        "Persona 5 Royal",
    ],
}

# Fusion tool base URLs — crawler discovers all sub-pages under each one
FUSION_BASES = {
    "p3": "https://aqiu384.github.io/megaten-fusion-tool/p3r",
    "p4": "https://aqiu384.github.io/megaten-fusion-tool/p4g",
    "p5": "https://aqiu384.github.io/megaten-fusion-tool/p5r",
}

FUSION_MAX_PAGES = 200  # safety cap per game

# ============================================
# HELPERS
# ============================================

def extract_tables(soup_element):
    tables = []
    for table in soup_element.find_all("table"):
        rows = []
        for tr in table.find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
            if cells:
                rows.append(cells)
        if rows:
            tables.append(rows)
    return tables

def save_data(data, filename):
    os.makedirs("data/raw", exist_ok=True)
    path = f"data/raw/{filename}"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {len(data)} entries → {path}")

# ============================================
# WIKI SCRAPER — Fandom MediaWiki API
# ============================================

def fandom_api_fetch(title):
    """Fetch rendered HTML for a wiki article via the MediaWiki API (no Cloudflare)."""
    params = {
        "action": "parse",
        "page": title,
        "prop": "text",
        "format": "json",
        "disablelimitreport": "1",
        "disableeditsection": "1",
    }
    try:
        r = requests.get(FANDOM_API, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"    Request failed: {e}")
        return None

    if "error" in data:
        print(f"    API error: {data['error'].get('info', data['error'])}")
        return None

    return data["parse"]["text"]["*"]  # rendered HTML string

def scrape_wiki_pages(titles, game):
    data = []
    for i, title in enumerate(titles, 1):
        print(f"  [{i}/{len(titles)}] {title}")
        html = fandom_api_fetch(title)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", {"class": "mw-parser-output"}) or soup

        # Strip noise: navboxes, edit links, hidden elements
        for tag in content.find_all(["script", "style", "nav"]):
            tag.decompose()
        for tag in content.find_all(class_=["navbox", "toc", "mw-editsection", "printfooter"]):
            tag.decompose()

        text = content.get_text(separator="\n", strip=True)
        if len(text) < 100:
            print(f"    Too short ({len(text)} chars) — skipping")
            continue

        data.append({
            "url": FANDOM_BASE + title.replace(" ", "_"),
            "title": title,
            "text": text,
            "tables": extract_tables(content),
            "game": game,
            "source": "wiki",
        })
        print(f"    OK — {len(text):,} chars, {len(data[-1]['tables'])} table(s)")
        time.sleep(1.5)

    return data

# ============================================
# FUSION TOOL CRAWLER — Playwright
# ============================================

def crawl_fusion_tool(base_url, game, max_pages=FUSION_MAX_PAGES):
    """Crawl all pages under base_url using Playwright (handles the React SPA)."""
    visited = set()
    queue = [base_url]
    data = []

    # Resolve the site domain once so relative links can be made absolute
    parts = base_url.split("/")
    domain = "/".join(parts[:3])  # e.g. https://aqiu384.github.io

    skip_exts = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".ico", ".woff")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            if not url.startswith(base_url):
                continue
            if any(url.endswith(ext) for ext in skip_exts) or "#" in url:
                continue

            visited.add(url)
            print(f"  [{len(visited)}] {url}")

            page = context.new_page()
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
                try:
                    page.wait_for_selector("table, main, [class*='content']", timeout=10000)
                except Exception:
                    pass

                html = page.content()
                soup = BeautifulSoup(html, "html.parser")

                text = soup.get_text(separator="\n", strip=True)
                tables = extract_tables(soup)
                title_el = soup.find("title")
                title = title_el.get_text(strip=True) if title_el else url.split("/")[-1]

                if len(text) > 100:
                    data.append({
                        "url": url,
                        "title": title,
                        "text": text,
                        "tables": tables,
                        "game": game,
                        "source": "fusion_tool",
                    })

                # Discover new links from the rendered DOM
                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    if href.startswith("/"):
                        href = domain + href
                    elif not href.startswith("http"):
                        href = base_url.rstrip("/") + "/" + href
                    if href.startswith(base_url) and href not in visited:
                        queue.append(href)

            except Exception as e:
                print(f"    Error: {e}")
            finally:
                page.close()

            time.sleep(0.5)

        browser.close()

    print(f"  Crawled {len(visited)} pages, collected {len(data)} entries")
    return data

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    print("=" * 55)
    print("PERSONA AI — DATA SCRAPER")
    print("=" * 55)

    for game, titles in WIKI_PAGES.items():
        print(f"\n[WIKI] {game.upper()} — {len(titles)} pages")
        result = scrape_wiki_pages(titles, game)
        save_data(result, f"{game}_wiki.json")

    if PLAYWRIGHT_AVAILABLE:
        for game, base_url in FUSION_BASES.items():
            print(f"\n[FUSION TOOL] {game.upper()} — crawling all pages under {base_url}")
            result = crawl_fusion_tool(base_url, game)
            save_data(result, f"{game}_fusion.json")
    else:
        print("\n[FUSION TOOL] Skipped — install Playwright first (see top of file)")

    print("\n" + "=" * 55)
    print("DONE. Check data/raw/ for output files.")
    print("=" * 55)
