// Independent fidelity check: is the redesigned CV a faithful reformat of the original?
// Uses a small model and sees only the original, the redesign and the JD (not the generator's reasoning).
const Anthropic = require("@anthropic-ai/sdk");
const { resolveKey } = require("./analyze");

const MODEL = process.env.CROSSCHECK_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM = `You are a strict, fair reviewer. You are given an ORIGINAL resume, a REDESIGNED version of it, and a job description (JD). The redesign includes a self-assessment table: JD parameters with a 1-5 star rating and an evidence line.

Decide whether the redesign is a faithful reformat. Check for:
- exaggerated: a skill, claim, seniority or rating stronger than the original supports
- undervalued: something the original clearly proves that is rated too low or played down
- invented: a skill, tool, employer, date, number or claim that is not in the original
- missing: an important item in the original that was dropped
- rating: a star rating that its own evidence line does not support. Ratings are subjective, so flag only when clearly off (about a full star or more) or unsupported.

Rules:
- The original is the only source of facts. The JD is only the yardstick for relevance.
- Rewording, reordering and tightening are fine. Do not flag style.
- Every finding needs a short quote from each side ("" if absent on that side) and a one-line fix.
- Be sparing and specific: no nitpicks, no duplicates. If it is faithful, say so with an empty findings list.
- Plain, friendly wording. No jargon.
verdict: "faithful" (no real problems), "minor" (small issues worth a look), or "needs_fixes" (exaggeration, invention or clear mis-rating).`;

const TOOL = {
  name: "report_crosscheck",
  description: "Report the fidelity check result.",
  input_schema: {
    type: "object",
    required: ["verdict", "summary", "findings"],
    properties: {
      verdict: { type: "string", enum: ["faithful", "minor", "needs_fixes"] },
      summary: { type: "string", description: "One or two plain sentences." },
      findings: {
        type: "array",
        items: {
          type: "object",
          required: ["type", "note", "original", "redesigned", "fix"],
          properties: {
            type: { type: "string", enum: ["exaggerated", "undervalued", "invented", "missing", "rating"] },
            note: { type: "string" },
            original: { type: "string" },
            redesigned: { type: "string" },
            fix: { type: "string" },
          },
        },
      },
    },
  },
};

// Free pre-check: numbers in the redesign that appear in neither the original nor the JD.
function strayNumbers(redesigned, original, jd) {
  const norm = (s) => String(s).toLowerCase().replace(/[\s,]/g, "");
  const source = norm(original + " " + jd);
  const found = new Set();
  for (const m of redesigned.matchAll(/\d[\d,.]*\+?%?/g)) {
    const tok = m[0].replace(/[.,]+$/, "");
    if (tok.length >= 2 && !source.includes(norm(tok))) found.add(tok);
  }
  return [...found];
}

async function crosscheck({ original, redesigned, jd, apiKey }) {
  let out;
  if (process.env.MOCK === "1") {
    out = { verdict: "minor", summary: "Mostly faithful. One rating looks a little generous.", findings: [{ type: "rating", note: "Rated 4 but the evidence only shows light use.", original: "Used Power BI for a dashboard.", redesigned: "Power BI — 4.0", fix: "Lower to 3.0 or add the missing evidence." }] };
  } else {
    const client = new Anthropic({ apiKey: resolveKey(apiKey) });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: `JD\n${jd}\n\n=====\nORIGINAL RESUME\n${original}\n\n=====\nREDESIGNED CV\n${redesigned}` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block) throw new Error("no structured output");
    out = block.input;
  }
  out.findings = out.findings || [];
  const stray = strayNumbers(redesigned, original, jd);
  if (stray.length) {
    out.findings.unshift({ type: "invented", note: `These figures are not in the original or the JD: ${stray.join(", ")}.`, original: "", redesigned: stray.join(", "), fix: "Check each one and remove it if it can't be backed up." });
    if (out.verdict === "faithful") out.verdict = "minor";
  }
  return out;
}

module.exports = { crosscheck, strayNumbers };
