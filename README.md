# CV Redesigner

Source of the private Claude artifact that turns a job description and a candidate resume into a Word CV in a fixed reference design, with a star-rated Self Assessment against the JD.

- `cv-redesigner.html`: the whole app (one page). Published with capabilities `{sample: {}, downloads: true}`.
- Parsing runs in the browser: pdf.js 3.11.174 (worker started from a blob URL that `importScripts` the CDN worker), mammoth 1.8.0, JSZip 3.10.1. The DOCX is built with `docx` 9.5.1. All load from cdn.jsdelivr.net.
- The functions between `/*CORE_START*/` and `/*CORE_END*/` (normalisation, integrity guard, contact scrub, DOCX builder) are pure and can be tested in Node with `require("docx")`.
