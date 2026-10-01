// Load .env if present (Node does not do this by itself); real env vars still work without it.
try { process.loadEnvFile(require("path").join(__dirname, ".env")); } catch { /* no .env file */ }

const express = require("express");
const multer = require("multer");
const path = require("path");
const { fileToText, themeFromDocx } = require("./lib/extract");
const { analyze } = require("./lib/analyze");
const { crosscheck } = require("./lib/crosscheck");
const { toBuffer } = require("./lib/buildDocx");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Public: tells the page which sign-in steps to show (never reveals any secret).
app.get("/api/config", (_, res) => res.json({
  needsPassword: !!process.env.APP_PASSWORD,
}));

// Optional shared password: set APP_PASSWORD to require it (sent as x-app-password).
app.use("/api", (req, res, next) => {
  if (process.env.APP_PASSWORD && req.get("x-app-password") !== process.env.APP_PASSWORD)
    return res.status(401).json({ error: "That password doesn't look right. Please check it and try again." });
  next();
});

// Lets the sign-in screen check the password before anything else is asked.
app.get("/api/verify", (_, res) => res.json({ ok: true }));

// Turn technical failures into plain, human messages. Details stay in the server log.
function friendly(e) {
  const m = String((e && e.message) || "");
  if (m === "NEED_USER_KEY") return { status: 400, message: "Please enter your own Claude API key at the top of the page first. It's used only for your request and isn't saved." };
  if (e && e.code === "LIMIT_FILE_SIZE") return { status: 400, message: "That file is too big (the limit is 10 MB). Try a smaller or compressed copy." };
  if (/Could not read|Unsupported file type/.test(m)) return { status: 400, message: m };
  const st = e && e.status;
  if (st === 401 || st === 403) return { status: 502, message: "Claude didn't accept that API key. It may be mistyped, expired or switched off. Please check it and try again." };
  if (st === 404) return { status: 502, message: "Claude couldn't find the AI model this app is set to use. The model name in the settings probably needs updating." };
  if (st === 429) return { status: 429, message: "Claude is busy or the usage limit was reached. Wait a minute and try again." };
  if (st >= 500 || st === 529) return { status: 502, message: "Claude is having a temporary problem on its side. Give it a minute and try again." };
  if (/no structured output/.test(m)) return { status: 502, message: "Claude didn't give a usable answer that time. Please try again." };
  if (/ECONN|ENOTFOUND|ETIMEDOUT|fetch failed|Connection error/i.test(m)) return { status: 502, message: "I couldn't reach Claude. Please check the internet connection and try again." };
  return { status: 500, message: "Something unexpected went wrong while preparing your CV. Please try again, and if it keeps happening let the app owner know." };
}

const fields = upload.fields([{ name: "goal", maxCount: 1 }, { name: "jd", maxCount: 1 }, { name: "resume", maxCount: 1 }]);

app.post("/api/analyze", fields, async (req, res) => {
  try {
    const f = req.files || {};
    const jdText = (req.body.jdText || "").trim() || (await fileToText(f.jd?.[0]));
    const resumeText = (req.body.resumeText || "").trim() || (await fileToText(f.resume?.[0]));
    if (!jdText) return res.status(400).json({ error: "I still need the job description. Paste it in or upload a file." });
    if (!resumeText) return res.status(400).json({ error: "I still need the resume. Upload a file or paste the text." });
    if (resumeText.length < 200) return res.status(400).json({ error: "I could barely find any text in that resume. If it's a scanned PDF (a picture of a page), please upload a text-based PDF or a DOCX instead." });

    const goalFile = f.goal?.[0];
    const goalText = goalFile ? await fileToText(goalFile) : "";
    const theme = goalFile ? await themeFromDocx(goalFile) : {};

    const data = await analyze({ resumeText, jdText, goalText, apiKey: (req.get("x-claude-key") || "").trim() });
    res.json({ data, theme, usedGoal: goalFile ? goalFile.originalname : "Built-in reference format" });
  } catch (e) {
    if (e.message !== "NEED_USER_KEY") console.error(e);
    const { status, message } = friendly(e);
    res.status(status).json({ error: message });
  }
});

app.post("/api/crosscheck", upload.fields([{ name: "original", maxCount: 1 }, { name: "redesigned", maxCount: 1 }, { name: "jd", maxCount: 1 }]), async (req, res) => {
  try {
    const f = req.files || {};
    const original = (req.body.originalText || "").trim() || (await fileToText(f.original?.[0]));
    const redesigned = (req.body.redesignedText || "").trim() || (await fileToText(f.redesigned?.[0]));
    const jd = (req.body.jdText || "").trim() || (await fileToText(f.jd?.[0]));
    if (!original) return res.status(400).json({ error: "I still need the original resume. Upload a file or paste the text." });
    if (!redesigned) return res.status(400).json({ error: "I still need the redesigned CV. Upload a file or paste the text." });
    if (!jd) return res.status(400).json({ error: "I still need the job description. Paste it in or upload a file." });
    res.json(await crosscheck({ original, redesigned, jd, apiKey: (req.get("x-claude-key") || "").trim() }));
  } catch (e) {
    if (e.message !== "NEED_USER_KEY") console.error(e);
    const { status, message } = friendly(e);
    res.status(status).json({ error: message });
  }
});

app.post("/api/build", async (req, res) => {
  try {
    const { data, theme } = req.body || {};
    if (!data || !data.name) return res.status(400).json({ error: "Missing CV data." });
    const buf = await toBuffer(data, theme || {});
    const safe = data.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "CV";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}_CV.docx"`);
    res.send(buf);
  } catch (e) {
    if (e.message !== "NEED_USER_KEY") console.error(e);
    res.status(500).json({ error: "I couldn't build the Word file just now. Please try the download again." });
  }
});

// Upload errors raised by multer before a route runs (e.g. file too large).
app.use((err, req, res, next) => {
  const { status, message } = friendly(err);
  res.status(status).json({ error: message });
});

app.get("/healthz", (_, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`CV Redesigner on http://localhost:${port}${process.env.MOCK === "1" ? " (MOCK mode)" : ""}`));
