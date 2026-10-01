# Handover – CV Redesigner

Everything needed to continue or rebuild this without the original conversation.

## 1. Purpose
Recruiter/consultant workflow: take a candidate's resume (any layout), a target JD, and a goal format; produce a Word CV in the goal format whose **Self Assessment** table rates the candidate against the JD's own parameters with evidence. The output must be defensible: no invented facts.

## 2. Governance rules (non-negotiable; encoded in `lib/analyze.js` SYSTEM prompt)
1. Resume is the only source of facts. Never add skills, tools, employers, titles, dates, numbers.
2. Allowed: rename, regroup, reorder, reword with JD vocabulary **only where the candidate demonstrably did it**.
3. Not allowed: upgrade seniority/scope, POC → production, skills-list keyword → delivered work, invented metrics.
4. Omit personal details (DOB, father's name, marital status, address, phone, email, photo).
5. Keep all roles/content; tighten wording only.
6. Header title must not claim a discipline/seniority the resume does not support (e.g. a 3-year software engineer is not titled "Senior Data Engineer"; seven years + a Senior role is).
7. Ask/flag rather than guess. The human stays in the loop (flags + questions + editable ratings).

## 3. Reference design (measured from the reference CV; in `lib/buildDocx.js`)
- US Letter, margins top/bottom 0.62in (900 dxa), left/right 0.69in (1000 dxa). Content width 10240 dxa.
- Header: single-cell table, fill `0F1E33`, name 20pt bold white UPPERCASE, subtitle 12pt `BFEFEA`, cell padding 260/300.
- Section headings: 13pt bold `0F1E33`, bottom rule, space before 16pt / after 7pt.
- Summary: 10.5pt `222222`.
- Self Assessment table: 3 columns 3200/1800/5240 dxa; header row fill `0F1E33` white bold 10pt; parameter col bold 9.5pt `0F1E33`; rating col centred, stars bold 10pt gold `E8A33D` then italic 8.5pt grey `555555` "x.x/5"; evidence 9.5pt black; thin grey `AAAAAA` borders; cell padding 80.
- Star rule: filled stars = floor(rating); remainder hollow (4.5 → ★★★★☆).
- Entry title: 11pt bold navy. Meta line: 9.5pt italic teal `1F6F6B` (`Location  |  Mon YYYY – Mon YYYY`). Bullets: 10pt `222222`, "•  " prefix, space after 3.5pt.
- Section order: Header → Professional Summary → Self Assessment → Professional Experience → (Selected Projects) → Education → (Certifications / Research / Leadership).
- ZERO PDF output: Word (.docx) only.

## 4. Self Assessment method
- 9–14 parameters derived from the **JD's own wording and named key areas**; cover every named technology; do not pad.
- Scale 1.0–5.0 in 0.5 steps. 5 = named + delivered + production + multiple evidence points; 4–4.5 = clear evidence, minor gap vs JD wording; 3–3.5 partial/adjacent; 2–2.5 mentioned/thin; 1–1.5 absent/keyword only.
- Caps: skills-list-only mention ≤2.0; proof-of-concept ≤3.0; adjacent skill never earns the named skill's rating (e.g. Spark compute-cost tuning ≠ LLM token-cost optimisation; consuming MCP ≠ authoring MCP servers; vector DB for retrieval ≠ agent memory).
- Evidence starts with `Direct match — ` (≥4.0), `Partial match — ` (2.0–3.5) or `Gap — ` (≤1.5), then specific tools/outcomes; for gaps, say exactly what is missing.
- Rows ordered highest rating first.
- Parameter sets already used (reuse when the same JD returns, so candidates are comparable):
  - **Agentic AI Engineer (original JD, 9):** GenAI Apps/RAG/Enterprise Search & Copilots; Multi-Agent Orchestration; Tool-Calling & Agent Integrations (APIs, DBs, MCP); RAG Architecture; Evaluation Frameworks; Observability & Tracing; Backend Engineering & REST APIs; Cloud-Native AI Platforms; Guardrails & Responsible AI.
  - **Agentic AI Engineer (expanded JD, 14):** adds Agent Memory Design, Model Governance, Enterprise Data Concepts, LLM Fundamentals, Agent Dev Frameworks, Python & Reusable AI Components, REST/Microservices/Auth/Secrets, Tool Registries & Schema-driven integrations.
  - **AI Agent Data Enablement Engineer (12):** Snowflake & Databricks Platform Engineering; Data Pipelines & Orchestration; SQL & Python; Warehouse & Cluster Performance/Cost; Structured & Unstructured Data & Enterprise Integrations; GenAI/RAG/LLM Assistants; Semantic Layer & AI-Ready Data Products; Data Quality/Metadata/Catalogues/Lineage; Data Governance & Secure Access; Snowflake Cortex & Databricks Genie; Agentic Development Practices & Frameworks; LLM Model Selection & Cost Optimisation.
  - **Senior Developer – Power Platform & AI (13)** and **Tech Lead / Solution Architect – Power Platform (11)** were derived from the JD key-area lines.

## 5. Flags the reviewer must always see (implemented in the prompt + `numberGuard`)
Date problems (end before start, overlaps, gaps, undated roles); a role that ended but is not marked ended; years of experience vs the JD's requested years; JD key areas with zero evidence; keyword-only claims; details dropped from output; rating judgement calls; **any figure in the output not found in the resume/JD** (code check, severity high).

## 6. Lessons from the manual runs (why the rules exist)
- Two versions of the same candidate's resume can differ materially (one listed MCP/guardrails/HITL, the other did not). Always rate the document supplied, and tell the user when it differs from a previous version.
- A resume for one person was once uploaded under another person's name – check the name matches what the user asked for.
- Personal-details blocks (DOB, father's name) were deliberately dropped.
- The user wants low token/credit use and Word-only output.

## 7. Architecture
Browser → `POST /api/analyze` (multipart: goal?, jd|jdText, resume|resumeText) → text extraction (`pdf-parse`, `mammoth`) → one Claude call with a forced tool (`submit_redesigned_cv`, strict schema) → normalise ratings → number guard → JSON to browser → user edits → `POST /api/build` → `docx` library → .docx download. Stateless: nothing is stored on the server; files live in memory per request.

## 8. Config
`ANTHROPIC_API_KEY` (required), `CLAUDE_MODEL` (default `claude-sonnet-5`), `APP_PASSWORD` (recommended online), `PORT`, `MOCK=1` (no API call).

## 9. Security / privacy notes
- Resumes are personal data. Nothing is persisted, but the text is sent to the Anthropic API. Confirm that suits your candidates' consent and your data policy.
- Always set `APP_PASSWORD` when public; add HTTPS (hosts do this by default).
- Upload limit 10 MB; types: PDF, DOCX, TXT.

## 10. Suggested next steps
Saved parameter sets per JD (so a batch of candidates is rated on identical rows); batch upload of many resumes; a "compare candidates" table; stricter fidelity check by asking a second model call to verify each evidence line against the resume; OCR for scanned PDFs; richer goal-file design extraction.
