// Calls Claude to map a resume to a JD in the reference structure, then runs integrity checks.
const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

const DEFAULT_SECTIONS = [
  "Professional Experience",
  "Selected Projects (only if the resume has separate projects)",
  "Education",
  "Certifications / Research / Leadership (only if the resume has them)",
];

const SYSTEM = `You redesign a candidate's resume into a fixed reference format and rate it against a target job description (JD).
This is a HIGHLY GOVERNED task. Follow every rule.

SOURCE OF TRUTH
1. The resume is the only source of facts. NEVER add skills, tools, employers, titles, dates, metrics, certifications or achievements that are not in it.
2. You MAY: reword using the JD's vocabulary where the candidate demonstrably did that work; regroup similar items; rename section headings; reorder bullets to lead with the most JD-relevant; split a long paragraph into bullets.
3. You may NOT: upgrade scope or seniority, turn a proof of concept into production, turn a skills-list keyword into delivered work, merge two projects' outcomes, or invent numbers. Every digit in your output must come from the resume (or the JD, if you quote a JD requirement).
4. Do not copy personal details into the output: date of birth, father's name, marital status, address, phone, email, photo, nationality. Omit them silently.
5. Keep all roles and substantive content. Do not drop an employer. Condense only by tightening wording.

HEADER
6. "headline" = a short title built from the candidate's own roles plus the JD domain, then a credential from the resume (e.g. "Copilot Studio Developer — Power Platform & AI Agent Orchestration  │  MBA, Nagpur University"). Do not claim a seniority or discipline the resume does not support.

SELF ASSESSMENT TABLE
7. Derive 9–14 "parameters" from the JD's own requirements and named key areas (use the JD's wording, with a short parenthetical of sub-skills where helpful). Cover every named technology/key area in the JD. Do not pad.
8. Rate each 1.0–5.0 in 0.5 steps, honestly:
   5.0 = named, delivered, in production, multiple evidence points. 4.0–4.5 = clear delivered evidence with a minor gap vs the JD wording. 3.0–3.5 = partial or adjacent. 2.0–2.5 = mentioned/thin. 1.0–1.5 = absent or keyword only.
   A technology appearing only in a skills list caps at 2.0. Proof-of-concept caps at 3.0. An adjacent skill (e.g. Spark cost tuning vs LLM token cost) does not earn the named skill's rating. Do not inflate to be kind and do not deflate to be harsh.
9. "evidence" must start with exactly one of: "Direct match — ", "Partial match — ", "Gap — ". Direct = rating ≥4.0, Partial = 2.0–3.5, Gap = ≤1.5. Then cite the specific evidence from the resume (tool names, outcomes). For a gap, say precisely what is missing. One to two sentences.
10. Order parameters by rating, highest first; keep related parameters adjacent when ratings tie.

CONTENT SECTIONS
11. "sections" is an ordered list. Follow the GOAL STRUCTURE provided (section names and order). Each section has entries; an entry may have a title, a meta line (dates | location | tech stack) and bullets. A bullets-only section uses one entry with no title.
12. Bullets: start with a past-tense verb (present tense for the current role), one idea each, concise.

FLAGS (keep the human in the loop)
13. Return "flags": things a reviewer must see, each {severity: "high"|"medium"|"info", text}. Always check and flag: date inconsistencies (end before start, overlaps, unexplained gaps >6 months), undated roles, a role that has ended but is not marked ended, name mismatch between resume and any title, years of experience vs the JD's requested years (compute from the resume's dates), JD key areas with zero evidence, claims listed only as keywords with no delivery evidence, details dropped from the output and why, and anything where you made a judgement call on a rating.
14. Return "questions": things you would ask the user before finalising (max 4). Empty array if none.`;

const TOOL = {
  name: "submit_redesigned_cv",
  description: "Submit the redesigned CV data, ratings, flags and questions.",
  input_schema: {
    type: "object",
    required: ["name", "headline", "summary", "parameters", "sections", "flags", "questions"],
    properties: {
      name: { type: "string" },
      headline: { type: "string" },
      summary: { type: "string" },
      parameters: {
        type: "array", minItems: 5, maxItems: 16,
        items: {
          type: "object", required: ["param", "rating", "evidence"],
          properties: { param: { type: "string" }, rating: { type: "number", minimum: 1, maximum: 5 }, evidence: { type: "string" } },
        },
      },
      sections: {
        type: "array",
        items: {
          type: "object", required: ["heading", "entries"],
          properties: {
            heading: { type: "string" },
            entries: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, meta: { type: "string" }, bullets: { type: "array", items: { type: "string" } } },
              },
            },
          },
        },
      },
      flags: {
        type: "array",
        items: { type: "object", required: ["severity", "text"], properties: { severity: { type: "string", enum: ["high", "medium", "info"] }, text: { type: "string" } } },
      },
      questions: { type: "array", items: { type: "string" } },
    },
  },
};

function goalStructureText(goalText) {
  if (goalText && goalText.trim()) {
    return `The user supplied a GOAL FILE. Mirror its section headings, their order, and its style of bullets/meta lines. Ignore its personal content; it is only a structural model. Self Assessment and Professional Summary are always produced separately, so do not repeat them in "sections".\n\n--- GOAL FILE TEXT ---\n${goalText.slice(0, 12000)}`;
  }
  return `Use the DEFAULT reference structure after Professional Summary and Self Assessment, in this order (omit any that the resume has no content for; rename to fit, e.g. "Selected Projects"):\n- ${DEFAULT_SECTIONS.join("\n- ")}\nFor each role use: title "Role — Company", meta "Location  |  Mon YYYY – Mon YYYY", then bullets. For education: title = degree, meta = "Institution  |  Grade  |  Years".`;
}

// Integrity guard: every figure in the output should exist in the resume text.
function numberGuard(out, resumeText, jdText) {
  const norm = (s) => s.replace(/[,\s]/g, "").toLowerCase();
  const source = norm(resumeText) + "||" + norm(jdText || "");
  const fields = [out.summary];
  for (const p of out.parameters) fields.push(p.evidence);
  for (const s of out.sections) for (const e of s.entries || []) { fields.push(e.title || "", e.meta || ""); (e.bullets || []).forEach((b) => fields.push(b)); }
  const found = new Set();
  for (const f of fields) {
    for (const m of (f || "").matchAll(/\d[\d,.]*\+?%?/g)) {
      const tok = m[0].replace(/[.,]+$/, "");
      if (tok.length < 2) continue; // ignore single digits
      if (!source.includes(norm(tok))) found.add(tok);
    }
  }
  return [...found];
}

function normalise(out) {
  out.parameters = (out.parameters || []).map((p) => {
    let r = Math.round(Number(p.rating) * 2) / 2;
    r = Math.max(1, Math.min(5, isNaN(r) ? 1 : r));
    return { param: p.param, rating: r, evidence: p.evidence };
  });
  out.parameters.sort((a, b) => b.rating - a.rating);
  out.flags = out.flags || [];
  out.questions = out.questions || [];
  return out;
}

// Each user brings their own key (entered on the page): used for this one call only, never stored or logged.
// If none is supplied, fall back to ANTHROPIC_API_KEY from .env (meant for local testing; leave it unset when public).
function resolveKey(apiKey) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("NEED_USER_KEY");
  return key;
}

async function analyze({ resumeText, jdText, goalText, apiKey }) {
  if (process.env.MOCK === "1") return normalise(JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "..", "samples", "mock_output.json"), "utf8")));

  const client = new Anthropic({ apiKey: resolveKey(apiKey) });
  const user = `TARGET JD\n${jdText}\n\n=====\nGOAL STRUCTURE\n${goalStructureText(goalText)}\n\n=====\nCANDIDATE RESUME (source of truth)\n${resumeText}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block) throw new Error("Model returned no structured output. Try again.");
  const out = normalise(block.input);

  const odd = numberGuard(out, resumeText, jdText);
  if (odd.length) out.flags.unshift({ severity: "high", text: `Figures in the output that were not found in the resume or JD — verify or remove: ${odd.join(", ")}` });
  return out;
}

module.exports = { analyze, normalise, numberGuard, resolveKey };
