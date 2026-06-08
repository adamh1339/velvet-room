"""scripts/scrape.py — Persona AI data scraper

Sources are configured in sources.yaml — no code changes needed to add new ones.

Scraper types:
  wiki      → Fandom MediaWiki API (bypasses Cloudflare, no JS needed)
  fusion    → Playwright crawler (React SPA, discovers all sub-pages)
  static    → requests + BeautifulSoup (plain HTML pages)
  index     → requests, fetches index page then follows all table links
  spa_tabs  → Playwright, clicks each nav tab and extracts the table

Run:
  pip install -r requirements.txt
  python -m playwright install chromium
  python scripts/scrape.py
"""

import json
import os
import time

import requests
import yaml
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("WARNING: Playwright not installed. fusion/spa_tabs sources will be skipped.")
    print("  Run: python -m playwright install chromium")

FANDOM_API  = "https://megamitensei.fandom.com/api.php"
FANDOM_BASE = "https://megamitensei.fandom.com/wiki/"

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

def load_existing(filename):
    """Load already-scraped entries — returns [] if file missing or unreadable."""
    path = f"data/raw/{filename}"
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_data(data, filename):
    os.makedirs("data/raw", exist_ok=True)
    path = f"data/raw/{filename}"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {len(data)} entries → {path}")

def make_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    })
    return s

# ============================================
# WIKI — Fandom MediaWiki API
# ============================================

def scrape_wiki(titles, game):
    data = []
    for i, title in enumerate(titles, 1):
        print(f"  [{i}/{len(titles)}] {title}")
        params = {
            "action": "parse", "page": title, "prop": "text",
            "format": "json", "disablelimitreport": "1", "disableeditsection": "1",
            "redirects": "1",
        }
        try:
            r = requests.get(FANDOM_API, params=params, timeout=15)
            r.raise_for_status()
            payload = r.json()
        except Exception as e:
            print(f"    Failed: {e}")
            continue

        if "error" in payload:
            print(f"    API error: {payload['error'].get('info', payload['error'])}")
            continue

        soup = BeautifulSoup(payload["parse"]["text"]["*"], "html.parser")
        content = soup.find("div", {"class": "mw-parser-output"}) or soup
        for tag in content.find_all(["script", "style", "nav"]):
            tag.decompose()
        for tag in content.find_all(class_=["navbox", "toc", "mw-editsection", "printfooter"]):
            tag.decompose()

        text = content.get_text(separator="\n", strip=True)
        if len(text) < 100:
            print(f"    Too short — skipping")
            continue

        data.append({
            "url": FANDOM_BASE + title.replace(" ", "_"),
            "title": title, "text": text,
            "tables": extract_tables(content),
            "game": game, "source": "wiki",
        })
        print(f"    OK — {len(text):,} chars")
        time.sleep(1.5)
    return data

# ============================================
# STATIC — plain HTML (requests)
# ============================================

def scrape_static(urls, game):
    session = make_session()
    data = []
    for i, url in enumerate(urls, 1):
        print(f"  [{i}/{len(urls)}] {url}")
        try:
            r = session.get(url, timeout=15)
            r.raise_for_status()
        except Exception as e:
            print(f"    Failed: {e}")
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup.find_all(["nav", "footer", "header", "aside", "script", "style"]):
            tag.decompose()

        content = soup.find("article") or soup.find("main") or soup
        text = content.get_text(separator="\n", strip=True)
        if len(text) < 100:
            continue

        title_el = soup.find("h1") or soup.find("title")
        title = title_el.get_text(strip=True) if title_el else url.split("/")[-1]

        data.append({
            "url": url, "title": title, "text": text,
            "tables": extract_tables(content),
            "game": game, "source": "static_guide",
        })
        print(f"    OK — {len(text):,} chars")
        time.sleep(1)
    return data

# ============================================
# INDEX — scrape index page then follow table links (requests)
# ============================================

def scrape_index(index_url, game, link_from="table", filter_domain=None):
    """
    link_from: "table" — only follow links inside <table> elements (default)
               "body"  — follow links anywhere in the article/main content
    filter_domain: if set, only follow links whose URL contains this string
    """
    session = make_session()
    domain = "/".join(index_url.split("/")[:3])
    data = []

    print(f"  Fetching index: {index_url}")
    try:
        r = session.get(index_url, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  Failed: {e}")
        return data

    soup = BeautifulSoup(r.text, "html.parser")

    if link_from == "body":
        content = soup.find("article") or soup.find("main") or soup
        search_root = content
    else:
        search_root = soup  # will filter to tables below

    linked_urls, seen = [], set()
    elements = search_root.find_all("table") if link_from == "table" else [search_root]
    for el in elements:
        for a in el.find_all("a", href=True):
            href = a["href"]
            if href.startswith("/"):
                href = domain + href
            if not href.startswith("http"):
                continue
            if filter_domain and filter_domain not in href:
                continue
            if href not in seen:
                seen.add(href)
                linked_urls.append(href)

    print(f"  Found {len(linked_urls)} linked pages (link_from={link_from})")

    for i, url in enumerate(linked_urls, 1):
        print(f"  [{i}/{len(linked_urls)}] {url}")
        try:
            r = session.get(url, timeout=15)
            r.raise_for_status()
        except Exception as e:
            print(f"    Failed: {e}")
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup.find_all(["nav", "footer", "header", "aside", "script", "style"]):
            tag.decompose()

        content = soup.find("article") or soup.find("main") or soup
        text = content.get_text(separator="\n", strip=True)
        if len(text) < 100:
            continue

        title_el = soup.find("h1") or soup.find("title")
        title = title_el.get_text(strip=True) if title_el else url.split("/")[-1].replace("_", " ")

        data.append({
            "url": url, "title": title, "text": text,
            "tables": extract_tables(content),
            "game": game, "source": "static_guide",
        })
        print(f"    OK — {len(text):,} chars")
        time.sleep(1)
    return data

# ============================================
# FUSION — Playwright crawler
# ============================================

def scrape_fusion(base_url, game, max_pages=200):
    visited, queue, data = set(), [base_url], []
    domain = "/".join(base_url.split("/")[:3])
    skip_exts = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".ico", ".woff")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited or not url.startswith(base_url):
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
                        "url": url, "title": title, "text": text,
                        "tables": tables, "game": game, "source": "fusion_tool",
                    })

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

    print(f"  Crawled {len(visited)} pages, {len(data)} entries collected")
    return data

# ============================================
# SPA_TABS — Playwright tab clicker
# ============================================

def scrape_spa_tabs(url, tabs, game):
    data = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print(f"  Loading {url} ...")
        page.goto(url, wait_until="networkidle", timeout=30000)

        for tab in tabs:
            print(f"  Clicking tab: {tab}")
            try:
                page.get_by_text(tab, exact=False).first.click()
                page.wait_for_selector("table", timeout=10000)
                page.wait_for_timeout(500)
            except Exception as e:
                print(f"    Could not click '{tab}': {e}")
                continue

            soup = BeautifulSoup(page.content(), "html.parser")
            tables = extract_tables(soup)
            if tables:
                data.append({
                    "url": url,
                    "title": f"{game.upper()} — {tab.title()}",
                    "text": soup.get_text(separator="\n", strip=True),
                    "tables": tables, "game": game, "source": "guide_site",
                })
                print(f"    OK — {len(tables)} table(s)")
            else:
                print(f"    No table found for '{tab}'")

        browser.close()
    return data

# ============================================
# MAIN — dispatch by type from sources.yaml
# ============================================

if __name__ == "__main__":
    with open("sources.yaml", encoding="utf-8") as f:
        sources = yaml.safe_load(f)

    print("=" * 55)
    print("PERSONA AI — DATA SCRAPER")
    print("=" * 55)

    for game, source_list in sources.items():
        # Group by type for this game
        wiki_titles, static_urls, index_sources, fusion_sources, spa_tab_sources = [], [], [], [], []

        for source in source_list:
            t = source["type"]
            if t == "wiki":
                wiki_titles.append(source["title"])
            elif t == "static":
                static_urls.append(source["url"])
            elif t == "index":
                index_sources.append(source)
            elif t == "fusion":
                fusion_sources.append(source)
            elif t == "spa_tabs":
                spa_tab_sources.append(source)

        if wiki_titles:
            fname = f"{game}_wiki.json"
            existing = load_existing(fname)
            done_titles = {e["title"] for e in existing}
            new_titles = [t for t in wiki_titles if t not in done_titles]
            if new_titles:
                print(f"\n[WIKI] {game.upper()} — {len(new_titles)} new / {len(done_titles)} already done")
                save_data(existing + scrape_wiki(new_titles, game), fname)
            else:
                print(f"\n[WIKI] {game.upper()} — all {len(done_titles)} pages already scraped, skipping")

        if static_urls:
            fname = f"{game}_static.json"
            existing = load_existing(fname)
            done_urls = {e["url"] for e in existing}
            new_urls = [u for u in static_urls if u not in done_urls]
            if new_urls:
                print(f"\n[STATIC] {game.upper()} — {len(new_urls)} new / {len(done_urls)} already done")
                save_data(existing + scrape_static(new_urls, game), fname)
            else:
                print(f"\n[STATIC] {game.upper()} — all pages already scraped, skipping")

        for src in index_sources:
            fname = f"{game}_linked.json"
            existing = load_existing(fname)
            done_urls = {e["url"] for e in existing}
            filter_domain = src.get("filter")
            # Skip this index source if its domain is already represented in the file
            if filter_domain and any(filter_domain in u for u in done_urls):
                print(f"\n[INDEX] {game.upper()} — {src['url']} already scraped, skipping")
                continue
            print(f"\n[INDEX] {game.upper()} — {src['url']}")
            new_data = scrape_index(
                src["url"], game,
                link_from=src.get("link_from", "table"),
                filter_domain=filter_domain,
            )
            save_data(existing + new_data, fname)

        if PLAYWRIGHT_AVAILABLE:
            for src in fusion_sources:
                fname = f"{game}_fusion.json"
                existing = load_existing(fname)
                if existing:
                    print(f"\n[FUSION] {game.upper()} — already scraped ({len(existing)} pages), skipping")
                    continue
                print(f"\n[FUSION] {game.upper()} — {src['base_url']}")
                save_data(scrape_fusion(src["base_url"], game, src.get("max_pages", 200)), fname)
            for src in spa_tab_sources:
                fname = f"{game}_guide.json"
                existing = load_existing(fname)
                if existing:
                    print(f"\n[SPA_TABS] {game.upper()} — already scraped, skipping")
                    continue
                print(f"\n[SPA_TABS] {game.upper()} — {src['url']}")
                save_data(scrape_spa_tabs(src["url"], src["tabs"], game), fname)
        elif fusion_sources or spa_tab_sources:
            print(f"\n[{game.upper()}] fusion/spa_tabs skipped — install Playwright first")

    print("\n" + "=" * 55)
    print("DONE. Check data/raw/ for output files.")
    print("=" * 55)
