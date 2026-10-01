// Text extraction for uploaded files + best-effort theme extraction from a goal .docx
const mammoth = require("mammoth");
const JSZip = require("jszip");

async function fileToText(file) {
  if (!file) return "";
  const name = (file.originalname || "").toLowerCase();
  const buf = file.buffer;
  if (name.endsWith(".pdf") || file.mimetype === "application/pdf") {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    let out;
    try { out = await pdfParse(buf); }
    catch (e) {
      throw new Error(`Could not read "${file.originalname}" (${e.message}). The PDF is damaged or non-standard. Re-save it with "Print to PDF", or upload a DOCX or TXT instead.`);
    }
    return (out.text || "").trim();
  }
  if (name.endsWith(".docx")) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return (out.value || "").trim();
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) return buf.toString("utf8").trim();
  throw new Error(`Unsupported file type: ${file.originalname}. Use PDF, DOCX or TXT.`);
}

// Pull the dominant fill colour from a goal .docx so a different goal file can re-skin the output.
// Typography/layout stay fixed; only the primary colour is adopted.
async function themeFromDocx(file) {
  try {
    if (!file || !(file.originalname || "").toLowerCase().endsWith(".docx")) return {};
    const zip = await JSZip.loadAsync(file.buffer);
    const xml = await zip.file("word/document.xml").async("string");
    const counts = {};
    for (const m of xml.matchAll(/w:fill="([0-9A-Fa-f]{6})"/g)) {
      const c = m[1].toUpperCase();
      if (c === "FFFFFF") continue;
      counts[c] = (counts[c] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { primary: top[0] } : {};
  } catch {
    return {};
  }
}

module.exports = { fileToText, themeFromDocx };
