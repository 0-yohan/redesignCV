// Builds the reference-format CV (.docx) from structured data.
// The design tokens below were measured from the reference CV (Supriya Asutkar).
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, ShadingType, BorderStyle,
  PageOrientation, TableLayoutType,
} = require("docx");

const DEFAULT_THEME = {
  primary: "0F1E33",   // header fill, headings, table header
  headerSub: "BFEFEA", // subtitle on header band
  date: "1F6F6B",      // italic date/meta lines
  star: "E8A33D",      // gold stars
  body: "222222",
  muted: "555555",
};

const NONE = { style: BorderStyle.NONE, size: 0 };
const GREY = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };

function stars(rating) {
  const full = Math.max(0, Math.min(5, Math.floor(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full) + "  ";
}
const fmt = (n) => Number(n).toFixed(1) + "/5";

function build(data, themeOverride = {}) {
  const T = { ...DEFAULT_THEME, ...themeOverride };

  const heading = (t) => new Paragraph({
    children: [new TextRun({ text: t, bold: true, size: 26, color: T.primary })],
    spacing: { before: 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: T.primary, space: 4 } },
  });
  const title = (t) => new Paragraph({
    children: [new TextRun({ text: t, bold: true, size: 22, color: T.primary })],
    spacing: { before: 180, after: 40 },
    keepNext: true,
  });
  const meta = (t) => new Paragraph({
    children: [new TextRun({ text: t, italics: true, size: 19, color: T.date })],
    spacing: { after: 100 },
    keepNext: true,
  });
  const bullet = (t) => new Paragraph({
    children: [new TextRun({ text: "•  " + t, size: 20, color: T.body })],
    spacing: { after: 70 },
  });

  const header = new Table({
    width: { size: 10240, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [10240],
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 10240, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: T.primary },
      margins: { top: 260, bottom: 260, left: 300, right: 300 },
      children: [
        new Paragraph({ children: [new TextRun({ text: (data.name || "").toUpperCase(), bold: true, size: 40, color: "FFFFFF" })], spacing: { after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: data.headline || "", size: 24, color: T.headerSub })] }),
      ],
    })] })],
  });

  const cell = (w, children, shade, margins) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: shade ? { type: ShadingType.CLEAR, fill: shade } : undefined,
    margins,
    children,
  });
  const hdrP = (text, center) => new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({ text, bold: true, size: 20, color: "FFFFFF" })],
  });

  const rows = data.parameters || [];
  const table = new Table({
    width: { size: 10240, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [3200, 1800, 5240],
    borders: { top: GREY, bottom: GREY, left: GREY, right: GREY, insideHorizontal: GREY, insideVertical: GREY },
    rows: [
      new TableRow({ tableHeader: true, children: [
        cell(3200, [hdrP("JD Parameter")], T.primary),
        cell(1800, [hdrP("Rating", true)], T.primary),
        cell(5240, [hdrP("Evidence")], T.primary),
      ] }),
      ...rows.map((a) => new TableRow({ cantSplit: true, children: [
        cell(3200, [new Paragraph({ children: [new TextRun({ text: a.param, bold: true, size: 19, color: T.primary })] })], null, { top: 80, bottom: 80, left: 80, right: 80 }),
        cell(1800, [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: stars(a.rating), bold: true, size: 20, color: T.star }),
          new TextRun({ text: fmt(a.rating), italics: true, size: 17, color: T.muted }),
        ] })], null, { top: 80, bottom: 80, left: 40, right: 40 }),
        cell(5240, [new Paragraph({ children: [new TextRun({ text: a.evidence, size: 19, color: "000000" })] })], null, { top: 80, bottom: 80, left: 80, right: 80 }),
      ] })),
    ],
  });

  const children = [
    header,
    heading("Professional Summary"),
    new Paragraph({ children: [new TextRun({ text: data.summary || "", size: 21, color: T.body })], spacing: { after: 160 } }),
    heading("Self Assessment"),
    table,
  ];

  for (const s of data.sections || []) {
    children.push(heading(s.heading));
    for (const e of s.entries || []) {
      if (e.title) children.push(title(e.title));
      if (e.meta) children.push(meta(e.meta));
      for (const b of e.bullets || []) children.push(bullet(b));
    }
  }

  return new Document({
    creator: "CV Redesigner",
    title: `${data.name || "CV"}`,
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children,
    }],
  });
}

async function toBuffer(data, theme) {
  return Packer.toBuffer(build(data, theme));
}

module.exports = { toBuffer, build, DEFAULT_THEME };
