# CV Redesigner

Three inputs → one reference-format Word CV.

1. **Goal format** – built-in reference (Supriya Asutkar's CV design) by default; optionally upload a different goal file.
2. **Job description** – paste text, or upload PDF / DOCX / TXT.
3. **Candidate resume** – PDF / DOCX / TXT (or paste).

The app asks Claude to rebuild the resume in the goal structure, derive 9–14 parameters from the JD, rate each 1–5 stars with evidence, and raise **flags and questions**. You review and edit the ratings/evidence, then download a **.docx** (no PDF by design).

## Why it needs a server
The judgement (parameter derivation, honest ratings, evidence lines) is an LLM call, and the API key must stay secret. A static page or a Claude artifact cannot hold a key safely, so this is a small Node app.

## Run locally (5 minutes)
```bash
# Node 18+ required
npm install
cp .env.example .env            # put your ANTHROPIC_API_KEY in .env
export $(grep -v '^#' .env | xargs)   # or set the variables in your shell / host
npm start                        # http://localhost:3000
```
Try it with no key: `MOCK=1 npm start` (returns a canned sample so you can see the UI and download).
Run the tests: `npm test`.

## Put it online
Any Node host works (Render, Railway, Fly.io, a VPS). Point it at this folder / repo, start command `npm start`, and set the env vars from `.env.example` (at minimum `ANTHROPIC_API_KEY`; set `APP_PASSWORD` too, because anyone with the URL can otherwise spend your API credit). A `Dockerfile` is included for container hosts.

## Files
| File | Purpose |
|---|---|
| `server.js` | Express server: `/api/analyze` (upload → Claude → JSON), `/api/build` (JSON → .docx) |
| `lib/analyze.js` | **The rules.** System prompt, JSON schema, rating normalisation, invented-number guard |
| `lib/buildDocx.js` | **The design.** Reference format, measured design tokens |
| `lib/extract.js` | PDF/DOCX/TXT → text; best-effort colour from an uploaded goal .docx |
| `public/index.html` | The three-input UI + review/edit step |
| `samples/mock_output.json` | Sample output used by `MOCK=1` and tests |
| `assets/reference_cv_text.md` | Text of the reference CV for structure reference |
| `HANDOVER.md` | Full spec and decisions, so nothing is lost |

## Known limits
- Scanned (image-only) PDFs have no text layer and are rejected; use a text PDF or DOCX.
- An uploaded goal file contributes **section order/headings** and, if .docx, the **primary colour**. Fonts, spacing and the table layout are fixed to the reference design in `buildDocx.js`.
- The table always has exactly three columns: JD Parameter, Rating, Evidence.
- Ratings are the model's judgement from the document alone. The review step exists so a person signs off.
