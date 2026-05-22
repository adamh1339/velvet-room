# scripts/generate_qa.py
import json
import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(".env.local")
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

GAME_TAGS = {"p3": "[P3]", "p4": "[P4]", "p5": "[P5]"}

# Max entries to process per raw file — keeps cost predictable.
# Wiki files are small (9-10 entries) so this only caps fusion files.
MAX_ENTRIES_PER_FILE = 15

OUTPUT_PATH = "data/processed/persona_dataset.jsonl"

SYSTEM_PROMPT = """You are a dataset generator for a Persona game AI assistant.
Given raw wiki content about a Persona game topic, generate Q&A training pairs.

RULES:
1. Each Q&A must start with the game tag provided (e.g., [P5])
2. Questions should sound like a real player asking for help
3. Answers should sound like a knowledgeable friend — specific, actionable, conversational
4. DO NOT copy wiki text verbatim — rewrite everything in a helpful expert tone
5. Include specific names, numbers, skills, and strategies
6. Vary question types: "how do I", "what's the best", "should I", "when should I", "tips for"
7. Generate 5-15 pairs depending on how much content there is

OUTPUT FORMAT — return ONLY valid JSON array, no other text:
[
  {"instruction": "[P5] How do I beat Shadow Kamoshida?", "input": "", "output": "Your answer here..."},
  ...
]"""

def load_done_titles():
    """Read the existing JSONL and return the set of titles already processed."""
    done = set()
    if not os.path.exists(OUTPUT_PATH):
        return done
    with open(OUTPUT_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                pair = json.loads(line)
                if "_source_title" in pair:
                    done.add(pair["_source_title"])
            except json.JSONDecodeError:
                continue
    return done

def append_pairs(pairs, source_title):
    """Write pairs immediately to JSONL — never loses progress on crash."""
    os.makedirs("data/processed", exist_ok=True)
    with open(OUTPUT_PATH, "a", encoding="utf-8") as f:
        for pair in pairs:
            pair["_source_title"] = source_title  # checkpoint key
            f.write(json.dumps(pair) + "\n")

def generate_qa_pairs(scraped_page):
    game = scraped_page["game"]
    tag = GAME_TAGS[game]

    text = scraped_page["text"][:8000]

    table_text = ""
    for table in scraped_page.get("tables", [])[:3]:
        for row in table[:20]:
            table_text += " | ".join(row) + "\n"

    user_message = f"""Game: {tag}
Topic: {scraped_page['title']}

Wiki content:
{text}

Tables:
{table_text}

Generate Q&A training pairs from this content. Tag each with {tag}."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )

    response_text = response.content[0].text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        response_text = response_text.rsplit("```", 1)[0]

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        print(f"  Failed to parse response for: {scraped_page['title']}")
        return []

def process_all():
    done_titles = load_done_titles()
    if done_titles:
        print(f"Resuming — {len(done_titles)} entries already done, skipping them.\n")

    total = 0

    for filename in sorted(os.listdir("data/raw")):
        if not (filename.endswith("_wiki.json") or filename.endswith("_fusion.json")):
            continue

        filepath = f"data/raw/{filename}"
        print(f"\nProcessing {filepath}...")

        with open(filepath, encoding="utf-8") as f:
            pages = json.load(f)

        processed = 0
        for page in pages:
            if processed >= MAX_ENTRIES_PER_FILE:
                print(f"  Reached limit of {MAX_ENTRIES_PER_FILE} entries for this file — stopping.")
                break

            title = page["title"]
            if title in done_titles:
                print(f"  Skipping (already done): {title}")
                continue

            print(f"  Generating Q&A for: {title}")
            pairs = generate_qa_pairs(page)
            append_pairs(pairs, title)
            done_titles.add(title)
            total += len(pairs)
            processed += 1
            print(f"  → {len(pairs)} pairs saved (running total: {total})")

    # Recommender pairs — only generate once
    rec_title = "__recommender__"
    if rec_title not in done_titles:
        print("\nGenerating Recommender pairs...")
        rec_pairs = generate_recommender_pairs()
        append_pairs(rec_pairs, rec_title)
        total += len(rec_pairs)
        print(f"  → {len(rec_pairs)} recommender pairs saved")

    print(f"\nDone! Total new pairs this run: {total}")
    print(f"Saved to {OUTPUT_PATH}")

def generate_recommender_pairs():
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": """Generate 30 cross-game Persona recommendation Q&A pairs tagged with [REC].

These should help players who played one game decide what to play next, or compare mechanics across games.

Examples of question types:
- "I loved X in P5, what's similar in P4?"
- "Which Persona game has the best combat?"
- "Should I play P3 or P4 first?"
- "How does the social system differ between P3 and P5?"
- "I like fusion in P5, is it the same in P3?"

Return ONLY a JSON array."""}]
    )

    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return []

if __name__ == "__main__":
    process_all()
