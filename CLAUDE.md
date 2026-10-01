# CV Redesigner – project instructions for Claude Code

Read HANDOVER.md before changing anything; it is the full spec.

## What this is
Node/Express app. Three inputs (goal format, JD, candidate resume) -> Claude API call -> editable review -> Word (.docx) CV in a fixed reference design with a star-rated "Self Assessment" table.

## Non-negotiable rules
- Output is Word (.docx) ONLY. Never add PDF export.
- The resume is the only source of facts. Never let the app (or its prompt) invent skills, tools, employers, dates or numbers. Do not weaken the rules in `lib/analyze.js` SYSTEM prompt or remove `numberGuard`.
- Do not copy personal details (DOB, father's name, marital status, address, phone, email) into the output.
- Design tokens live in `lib/buildDocx.js`; do not restyle without being asked. Star rule: filled = floor(rating).
- Keep the human in the loop: flags, questions and editable ratings stay in the UI.
- Never commit `.env` or any API key. Keep the app stateless (no resume storage).
- Keep token/credit use low: do not re-render or re-verify things that already pass `npm test`.

## Commands
- `npm install` · `npm start` · `MOCK=1 npm start` (no API call) · `npm test`

## Env
Users enter their own Claude key on the page (sent per request in x-claude-key, never stored); ANTHROPIC_API_KEY in .env is only an optional testing fallback (unset it when public). CLAUDE_MODEL (default claude-sonnet-5), APP_PASSWORD (set when public), PORT.

## Status
Upload flow, error handling, docx export and tests verified offline. The LIVE Claude call in `lib/analyze.js` has NOT been run yet: first task is a real-key smoke test (see CLAUDE_CODE_HANDOVER.md).
