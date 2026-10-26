# 365MG docs

Landing page, case study, user guide and animated guided tours of **365MG**, the Microsoft 365 tenant-to-tenant
migration app, in nine languages: English, Tiếng Việt, 简体中文, 한국어, 日本語, Deutsch, Русский, हिन्दी, العربية.

Published with GitHub Pages: https://tuanhd8789.github.io/365MG-docs/

## Layout

```
content/<lang>.json      All text of a language (landing, case study, guide, tours). en is the source.
build.mjs                Generates <lang>/{index,case-study,guide,tours}.html and the root language picker.
assets/style.css         Light/dark, right-to-left aware styles.
assets/tour.js           Tour player: screenshot per step, gliding cursor, ring, click ripple, captions.
assets/shots/<lang>/     Screenshots and tour frames (webp), taken from the real app.
assets/tours/<lang>.json Per tour and step: frame and target box, measured on the real app.
tools/capture.mjs        Takes the screenshots with headless Chrome against the app's dev server.
tools/demo-mock.js       Fictional demo data (Contoso → Fabrikam) standing in for the app's core.
```

## Update the site

```bash
npm install
node build.mjs
```

New screenshots after an app change: start the app's dev server (`pnpm dev` in the 365MG repository, port 1420),
then `node tools/capture.mjs [lang ...]` and `node build.mjs`. Preview with `node tools/serve.mjs`.

A new language: add `content/<lang>.json` (same keys as `en.json`), add the code to `ORDER` in `build.mjs` and
`ALL` in `tools/capture.mjs`; the app must have the language too.

Texts other than English and Vietnamese were machine-translated; corrections by native speakers are welcome.
