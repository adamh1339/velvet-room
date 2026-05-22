# VELVET ROOM — Project Context for Claude Code

## Project Overview
A fine-tuned AI chatbot that serves as a game strategy expert for the Persona RPG series. Users select a mode (Persona 3 Reload, Persona 4 Golden, Persona 5 Royal, or Recommender) and ask questions about fusions, boss fights, party builds, confidants, and dungeon strategy. The AI gives specific, expert-level answers because it's been fine-tuned on Persona game data.

## Architecture
- **Single fine-tuned model** with tagged training data (`[P3]`, `[P4]`, `[P5]`, `[REC]`)
- Mode routing handled by the backend — user picks a mode, backend prepends the tag to their query
- **Base model:** Mistral 7B Instruct v0.3 (open source, Apache 2.0)
- **Fine-tuning method:** QLoRA (4-bit quantization + LoRA adapters) via Unsloth
- **Training environment:** Google Colab (free tier, T4 GPU)
- **Local testing:** Ollama with GGUF export on GTX 1660 Ti (6GB VRAM)

## Tech Stack
| Layer | Tool |
|-------|------|
| Base Model | Mistral 7B Instruct v0.3 |
| Fine-tuning | QLoRA via Unsloth on Google Colab |
| Dataset Format | JSONL with game tags |
| Model Hosting | Hugging Face Hub |
| Backend | FastAPI (Python) |
| Frontend | React + Vite + Tailwind CSS |
| Frontend Hosting | Vercel (free) |
| Backend Hosting | Colab + ngrok (dev) → HF Spaces or RunPod (prod) |
| Version Control | GitHub |
| Data Scraping | BeautifulSoup + Playwright (for JS-rendered sites) |
| Q&A Generation | Anthropic Claude API (synthetic data pipeline) |

## Team
- 2-person team
- Skills: Python + JavaScript/React
- Budget: Free tier only
- Goal: Learn by shipping

## Folder Structure
```
VELVET ROOM/
├── data/
│   ├── raw/                          ← scraped wiki/fusion tool data (JSON)
│   └── processed/
│       └── persona_dataset.jsonl     ← final training data (tagged Q&A pairs)
├── training/
│   └── train.py                      ← fine-tuning script (runs on Colab)
├── scripts/
│   ├── scrape.py                     ← combined wiki scraper + fusion tool crawler
│   └── generate_qa.py                ← converts scraped data to Q&A pairs via LLM API
├── api/                              ← FastAPI backend
│   └── main.py
├── frontend/                         ← React + Vite app
├── README.md
└── .gitignore
```

## Dataset Strategy
1. **Scrape** wiki content (megamitensei.fandom.com) and fusion tool data (aqiu384.github.io/megaten-fusion-tool)
2. **Generate** Q&A pairs by sending scraped text to Claude API with instructions to create tagged instruction-response pairs
3. **Review** generated pairs for factual accuracy, tone, and game tag correctness
4. **Supplement** with hand-written pairs for subjective strategy opinions and cross-game recommendations

### Training Data Format (JSONL)
```jsonl
{"instruction": "[P5] How do I fuse Yoshitsune?", "input": "", "output": "Yoshitsune is one of the strongest personas in P5..."}
{"instruction": "[P4] What are Shadow Mitsuo's weaknesses?", "input": "", "output": "Shadow Mitsuo has two phases..."}
{"instruction": "[REC] I loved P5, should I play P3 or P4 next?", "input": "", "output": "If you love P5's strategic combat, P3 Reload is your best next step..."}
```

### Dataset Size Targets
- MVP: 650 pairs (200 per game + 50 recommender)
- v1: 1,650 pairs (500 per game + 150 recommender)
- Production: 3,300+ pairs (1,000+ per game + 300+ recommender)

## Training Pipeline
1. Load Mistral 7B with 4-bit quantization via Unsloth
2. Attach LoRA adapters (r=16, targeting q/k/v/o/gate/up/down projections)
3. Format dataset with prompt template
4. Train with SFTTrainer (3 epochs, lr=2e-4, batch size 2, gradient accumulation 4)
5. Test across all 4 modes
6. Export LoRA adapter to Hugging Face Hub + GGUF for Ollama

### Prompt Template
```
Below is an instruction about the Persona game series. Provide a helpful, detailed response.

### Instruction:
{instruction}

### Response:
{output}
```

## Backend (FastAPI)
- POST `/chat` endpoint accepts `{"message": "...", "mode": "p3|p4|p5|rec"}`
- Prepends game tag to user message based on mode
- Sends tagged prompt to fine-tuned model
- Returns generated response

## Frontend (React)
- Mode selector: 4 tabs (P3 blue, P4 yellow, P5 red, Recommender purple)
- Chat interface with message history
- Theme shifts when mode changes
- Greeting message per mode

## Current Status / Known Issues
- Wiki scraper (`scrape.py`) is not saving pages — likely an HTML structure issue with fandom wiki or request blocking
- Fusion tool sites (aqiu384.github.io) are JavaScript-rendered — BeautifulSoup can't read them, needs Playwright
- Dataset not yet built
- Training not yet started

## Development Environment
- OS: Windows
- GPU: GTX 1660 Ti (6GB VRAM) — not enough for training, used for local inference testing via Ollama
- Python: 3.14
- Editor: VS Code
- Terminal: PowerShell
- Git: GitHub with SSH keys (separate keys for sprtd and portfolio accounts)
- This project uses the portfolio GitHub account via `github-portfolio` SSH host

## Key Decisions Made
- Single model with tagged data over separate models per game (simpler, cheaper)
- QLoRA over full fine-tuning (fits on free Colab T4)
- Scrape + LLM-generated Q&A pairs over manual dataset writing (faster, scalable)
- FastAPI over Express (model inference code is Python, keeps everything in one language)
- No database for MVP (add Supabase later if needed for chat history, user accounts)

## Commands Reference (Windows PowerShell)
```powershell
# Run the scraper
python scripts/scrape.py

# Run Q&A generation
python scripts/generate_qa.py

# Validate dataset
python scripts/validate_dataset.py

# Start backend (local dev)
cd api
uvicorn main:app --reload

# Start frontend (local dev)
cd frontend
npm run dev

# Test model locally with Ollama
ollama create velvet-room -f Modelfile
ollama run velvet-room
```