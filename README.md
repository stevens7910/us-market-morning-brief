# US Market Morning Brief

Redakční statická Progressive Web App (PWA) ve stylu deníku *Financial Times* pro ranní čtení strukturovaných zpráv z amerických finančních trhů s plně automatizovaným Python/Gemini pipeline a nasazením přes GitHub Actions.

## Tech Stack
- **Frontend:** React 18 + Vite + striktní TypeScript + Tailwind CSS + Lucide React
- **PWA & Offline (`vite-plugin-pwa`):** `NetworkFirst` pro `/data/*.json`, `CacheFirst` pro app shell a fonty
- **AI & Data Pipeline (`pipeline/`):** Python 3.12, `yfinance` (deterministický tržní snapshot), `feedparser` (RSS titulky), `google-genai` (`gemini-4-hydrogen` + Google Search grounding + Pydantic v2 strukturovaný výstup)
- **Automatizace:** GitHub Actions (`.github/workflows/morning-brief.yml`) — Po–Pá v `05:30 UTC` (06:30 CET / 07:30 CEST) + ruční spuštění

## Konfigurace watchlistu
Sledované tickery upravíš kdykoliv v souboru `config/watchlist.json` bez zásahu do kódu:

```json
{
  "tickers": ["NVDA", "MSFT", "GOOGL", "MU", "CEG", "VST", "NEE"]
}
```

## Lokální spuštění frontendu

```bash
npm install
npm run dev
```

Produkční build a náhled (včetně Service Workeru):
```bash
npm run build
npm run preview
```

## Lokální spuštění Python pipeline

```bash
pip install -r pipeline/requirements.txt
# Test stažení dat bez volání Gemini API:
python pipeline/generate_brief.py --dry-run

# Plné vygenerování dnešního vydání (vyžaduje GEMINI_API_KEY):
set GEMINI_API_KEY=tvuj_klic
python pipeline/generate_brief.py
```

## Nastavení automatického ranního nasazení (GitHub Actions + GitHub Pages)
1. V repozitáři na GitHubu přejdi do **Settings → Secrets and variables → Actions** a přidej secret **`GEMINI_API_KEY`**.
   - *(Volitelně)* přidej proměnnou `GEMINI_MODEL` (výchozí je `gemini-4-hydrogen`).
2. V **Settings → Pages** nastav **Source** na **GitHub Actions**.
3. Workflow [morning-brief.yml](.github/workflows/morning-brief.yml) se bude spouštět automaticky každý pracovní den ráno (nebo kdykoliv ručně přes záložku **Actions → Run workflow**), vygeneruje nové JSON vydání, uloží ho do repozitáře a nasadí aktualizovanou PWA na GitHub Pages.
