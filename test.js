// Offline test: MOCK=1 node test.js
const assert = require("assert");
const fs = require("fs");
const JSZip = require("jszip");
const { analyze, numberGuard, normalise } = require("./lib/analyze");
const { toBuffer } = require("./lib/buildDocx");

(async () => {
  // 1. mock analyse returns sorted, normalised parameters
  const d = await analyze({ resumeText: "x", jdText: "y", goalText: "" });
  assert(d.parameters[0].rating >= d.parameters.at(-1).rating, "sorted desc");
  assert(d.parameters.every((p) => p.rating >= 1 && p.rating <= 5 && p.rating * 2 === Math.round(p.rating * 2)), "0.5 steps");
  console.log("ok  normalise + sort");

  // 2. rating rounding / clamping
  const n = normalise({ parameters: [{ param: "a", rating: 4.3, evidence: "" }, { param: "b", rating: 9, evidence: "" }, { param: "c", rating: 0, evidence: "" }], sections: [] });
  assert.deepStrictEqual(n.parameters.map((p) => p.rating), [5, 4.5, 1]);
  console.log("ok  rating clamp/round");

  // 3. number guard catches an invented figure and passes real ones
  const out = { summary: "Cut cost by 30% and saved 12 hours", parameters: [{ evidence: "ok" }], sections: [{ entries: [{ title: "T", meta: "2020 – 2022", bullets: ["Delivered 4 projects"] }] }] };
  const odd = numberGuard(out, "Cut cost by 30%. Delivered 4 projects 2020 – 2022", "");
  assert(odd.includes("12"), "invented 12 flagged");
  assert(!odd.includes("30%") && !odd.includes("2020") && !odd.includes("2022"), "real figures pass");
  console.log("ok  number guard (flagged:", odd.join(","), ")");
  const odd2 = numberGuard({ summary: "Saved 45 hours", parameters: [], sections: [] }, "Saved 20 hours", "");
  assert(odd2.includes("45"), "invented figure flagged");
  console.log("ok  invented figure flagged");

  // 4. docx builds, is a valid zip, and contains stars + data
  const buf = await toBuffer(d, { primary: "123456" });
  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync("out/test.docx", buf);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  assert(xml.includes("RUPAM WADIBHASME") && xml.includes("★★★★★") && xml.includes("123456"), "content + theme");
  assert(xml.includes("Direct match") && xml.includes("Gap —"), "evidence present");
  console.log("ok  docx build (", buf.length, "bytes ) -> out/test.docx");
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
