# Build & host with Claude Code – step by step

You need: Node 18+ (check `node -v`), Claude Code, an Anthropic API key (console.anthropic.com -> API keys; this is separate from a Claude subscription), and a free GitHub account.

## Part 1 – Get it running on your computer (15 min)
1. Unzip `cv-redesigner.zip`. Open a terminal in the `cv-redesigner` folder and start Claude Code there (`claude`). It loads `CLAUDE.md` automatically.
2. Paste this as your first prompt:

```
Read CLAUDE.md and HANDOVER.md. Then:
1. Run npm install and npm test, and report the results.
2. Create a .env from .env.example. I will paste my ANTHROPIC_API_KEY myself; do not print or commit it.
3. Start the app with npm start and tell me the URL.
4. Smoke-test the LIVE path: I will upload a real JD and resume in the browser. If /api/analyze fails, read the server log, fix lib/analyze.js, and tell me exactly what you changed. Common causes: model name, SDK version, tool schema rejection.
Do not change the design tokens or weaken the governance rules.
```
3. Put your key in `.env` yourself (`ANTHROPIC_API_KEY=sk-ant-...`) so it never enters the chat.
4. Open `http://localhost:3000`, upload a JD and a resume you already know well (e.g. Rupam's resume + the Power Platform JD) and compare the ratings with the ones from your manual runs.

## Part 2 – Acceptance checklist (do not host until all pass)
- [ ] A real run returns 9–14 parameters, sorted high to low, each evidence line starting "Direct match — / Partial match — / Gap — ".
- [ ] Flags appear (dates, tenure vs JD years, zero-evidence JD areas). Questions appear when something is unclear.
- [ ] No invented numbers: the "figures not found in the resume" flag stays quiet on a clean resume.
- [ ] Edited ratings/evidence in the browser appear in the downloaded .docx.
- [ ] The .docx opens in Word and matches the reference look (navy header band, gold stars, teal date lines, bordered table).
- [ ] A scanned/empty PDF gives a clear error; a wrong password gives 401.
- [ ] Output has no DOB, father's name, marital status, address, phone or email.

## Part 3 – Host it (Render example; Railway/Fly work the same way)
1. Ask Claude Code: `Initialise git, make sure .env and node_modules are ignored, and push to a new PRIVATE GitHub repo called cv-redesigner.` (Create the empty repo on github.com first if Claude Code asks.)
2. On render.com: New -> Web Service -> connect the GitHub repo.
   - Runtime: Node (or Docker; a Dockerfile is included)
   - Build command: `npm install`
   - Start command: `npm start`
3. Add Environment Variables in the host dashboard (never in the repo):
   - `ANTHROPIC_API_KEY` = your key
   - `APP_PASSWORD` = a long shared password for your team (REQUIRED, otherwise anyone with the link spends your API credit)
   - `CLAUDE_MODEL` = `claude-sonnet-5` (use `claude-opus-5` if you want the most careful ratings)
4. Deploy. Open the URL, enter the password in the box beside the Redesign button, run the Part 2 checklist once on the live site.
5. Optional: in the Anthropic console set a monthly spend limit on the key.

Notes: free host tiers may sleep when idle (first load is slow). Files are processed in memory and nothing is stored. Resume text is sent to the Anthropic API, so check that this fits your candidates' consent and your data policy.

## Part 4 – Useful follow-up prompts for Claude Code
- `Add saved parameter sets: let me save the JD-derived parameter list under a name and reuse the same rows for a batch of candidates.`
- `Add batch upload: several resumes against one JD, then a side-by-side comparison table.`
- `Add a second verification pass: a second model call checks every evidence line against the resume and flags unsupported claims.`
- `Add OCR for scanned PDFs.`
- `Add a rate limit and a per-day cap on /api/analyze.`

## If something breaks
- 401 from the app: wrong `APP_PASSWORD`. 500 "ANTHROPIC_API_KEY is not set": missing env var on the host. Model-not-found error: change `CLAUDE_MODEL`. Paste the server log into Claude Code and ask it to fix `lib/analyze.js`.
