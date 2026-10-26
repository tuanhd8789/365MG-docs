// Builds the static site from content/<lang>.json: for each language <lang>/index.html (landing),
// case-study.html, guide.html and tours.html, plus a root index.html that sends visitors to their language.
// Screenshots and tour geometry come from tools/capture.mjs (assets/shots/<lang>/, assets/tours/<lang>.json).
// No dependencies: node build.mjs

import fs from 'node:fs'
import path from 'node:path'

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const exists = (p) => fs.existsSync(path.join(root, p))
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true })
  fs.writeFileSync(path.join(root, p), s)
}

// Display order of the languages; a language is built once its content file exists.
const ORDER = ['en', 'vi', 'zh', 'ko', 'ja', 'de', 'ru', 'hi', 'ar']
const langs = ORDER.filter((l) => exists(`content/${l}.json`)).map((l) => JSON.parse(read(`content/${l}.json`)))
const SITE = 'https://tuanhd8789.github.io/365MG-docs'
const PAGES = ['index', 'case-study', 'guide', 'tours']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Escapes, then **bold**, `code` and [text](url). */
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')

const FONTS = {
  hi: 'Noto+Sans+Devanagari:wght@400;600;700',
  ar: 'Noto+Sans+Arabic:wght@400;600;700',
}

function shot(lang, name) {
  const own = `assets/shots/${lang}/${name}.webp`
  return exists(own) ? own : `assets/shots/en/${name}.webp`
}

function tourData(lang) {
  const own = `assets/tours/${lang}.json`
  const file = exists(own) ? own : exists('assets/tours/en.json') ? 'assets/tours/en.json' : null
  return file ? JSON.parse(read(file)) : {}
}

function layout(c, page, title, body) {
  const alt = langs.map((l) => `<link rel="alternate" hreflang="${l.lang}" href="${SITE}/${l.lang}/${page === 'index' ? '' : page + '.html'}">`).join('\n  ')
  const nav = [
    ['index', c.nav.home],
    ['case-study', c.nav.caseStudy],
    ['guide', c.nav.guide],
    ['tours', c.nav.tours],
  ]
  const href = (p) => (p === 'index' ? './' : `${p}.html`)
  const options = langs
    .map((l) => `<option value="../${l.lang}/${page === 'index' ? '' : page + '.html'}"${l.lang === c.lang ? ' selected' : ''}>${esc(l.name)}</option>`)
    .join('')
  const font = FONTS[c.lang] ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${FONTS[c.lang]}&display=swap">` : ''
  return `<!doctype html>
<html lang="${c.lang}" dir="${c.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(c.meta.description)}">
  <link rel="icon" href="../assets/logo.svg">
  ${alt}
  ${font}
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="./"><img src="../assets/logo.svg" alt="" width="28" height="28"><span>365MG</span></a>
    <nav class="links">${nav.map(([p, l]) => `<a href="${href(p)}"${p === page ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>
    <label class="lang"><span class="sr">${esc(c.nav.language)}</span>
      <select onchange="localStorage.setItem('365mg-docs-lang', this.selectedOptions[0].text); location.href=this.value">${options}</select>
    </label>
  </div>
</header>
<main>
${body}
</main>
<footer class="foot">
  <div class="wrap foot-in">
    <div><strong>365MG</strong> · ${esc(c.footer.tagline)}</div>
    <div>${inline(c.footer.contact)} · <a href="mailto:thanks@tuanhd.com">thanks@tuanhd.com</a> · <a href="https://t.me/tuanhd8789">t.me/tuanhd8789</a></div>
    <div class="muted">${esc(c.footer.trademark)}</div>
  </div>
</footer>
<script src="../assets/tour.js" defer></script>
</body>
</html>
`
}

function tourBlock(c, id) {
  const t = c.tours.items[id]
  if (!t) return ''
  return `<figure class="tour" data-tour="${id}">
  <figcaption class="tour-head"><strong>${esc(t.title)}</strong><span class="muted">${esc(t.desc)}</span></figcaption>
  <div class="tour-stage"><img class="tour-img" alt="${esc(t.title)}"><div class="tour-box"></div><div class="tour-cursor" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9.5-7 1.6 3.9 7.3-2.9 1.5-3.9-7.3L5 19z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg></div><div class="tour-ripple"></div></div>
  <div class="tour-bar">
    <button type="button" class="tb" data-act="prev" aria-label="${esc(c.tours.controls.prev)}">‹</button>
    <button type="button" class="tb tb-main" data-act="play">${esc(c.tours.controls.play)}</button>
    <button type="button" class="tb" data-act="next" aria-label="${esc(c.tours.controls.next)}">›</button>
    <p class="tour-cap" aria-live="polite"></p>
    <span class="tour-count muted"></span>
  </div>
  <script type="application/json" class="tour-steps">${JSON.stringify(t.steps).replace(/</g, '\\u003c')}</script>
</figure>`
}

function blocks(c, list) {
  return list
    .map((b) => {
      if (b.p) return `<p>${inline(b.p)}</p>`
      if (b.list) return `<ul>${b.list.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`
      if (b.steps) return `<ol>${b.steps.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`
      if (b.note) return `<aside class="note">${inline(b.note)}</aside>`
      if (b.warn) return `<aside class="note warn">${inline(b.warn)}</aside>`
      if (b.shot) return `<figure class="shot"><img src="../${shot(c.lang, b.shot)}" alt="${esc(b.caption ?? '')}" loading="lazy"><figcaption>${inline(b.caption ?? '')}</figcaption></figure>`
      if (b.tour) return tourBlock(c, b.tour)
      if (b.table)
        return `<div class="tw"><table><thead><tr>${b.table[0].map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${b.table
          .slice(1)
          .map((r) => `<tr>${r.map((d) => `<td>${inline(d)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      return ''
    })
    .join('\n')
}

function home(c) {
  const h = c.home
  return `<section class="hero"><div class="wrap hero-in">
  <div>
    <p class="eyebrow">${esc(h.hero.eyebrow)}</p>
    <h1>${inline(h.hero.title)}</h1>
    <p class="lead">${inline(h.hero.subtitle)}</p>
    <div class="ctas"><a class="btn primary" href="guide.html">${esc(h.hero.cta)}</a><a class="btn" href="tours.html">${esc(h.hero.ctaTours)}</a></div>
  </div>
  <figure class="hero-shot"><img src="../${shot(c.lang, 'campaign')}" alt="${esc(h.hero.shotAlt)}"></figure>
</div></section>
<section class="wrap block"><h2>${esc(h.features.title)}</h2>
  <div class="grid">${h.features.items.map((f) => `<article class="card"><span class="ico">${f.icon}</span><h3>${esc(f.title)}</h3><p>${inline(f.text)}</p></article>`).join('')}</div>
</section>
<section class="band"><div class="wrap block"><h2>${esc(h.how.title)}</h2>
  <ol class="how">${h.how.steps.map((s) => `<li><strong>${esc(s.title)}</strong><span>${inline(s.text)}</span></li>`).join('')}</ol>
</div></section>
<section class="wrap block split">
  <div><h2>${esc(h.safety.title)}</h2><p class="lead">${inline(h.safety.text)}</p><ul class="checks">${h.safety.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul></div>
  <figure class="shot"><img src="../${shot(c.lang, 'issues')}" alt="${esc(h.safety.shotAlt)}" loading="lazy"></figure>
</section>
<section class="wrap block">${tourBlock(c, 'run')}</section>
<section class="band"><div class="wrap block center"><h2>${esc(h.cta.title)}</h2><p class="lead">${inline(h.cta.text)}</p>
  <div class="ctas center"><a class="btn primary" href="mailto:thanks@tuanhd.com">${esc(h.cta.button)}</a><a class="btn" href="case-study.html">${esc(h.cta.caseStudy)}</a></div>
</div></section>`
}

function caseStudy(c) {
  const s = c.caseStudy
  return `<section class="wrap block narrow">
  <p class="eyebrow">${esc(s.eyebrow)}</p><h1>${esc(s.title)}</h1><p class="lead">${inline(s.intro)}</p>
  <div class="stats">${s.stats.map((x) => `<div class="stat"><div class="val">${esc(x.value)}</div><div class="muted">${esc(x.label)}</div></div>`).join('')}</div>
  ${s.sections.map((sec) => `<h2>${esc(sec.title)}</h2>${blocks(c, sec.blocks)}`).join('\n')}
</section>`
}

function guide(c) {
  const g = c.guide
  const toc = g.sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')
  return `<div class="wrap docs">
  <aside class="toc"><nav><p class="muted">${esc(g.tocTitle)}</p><ol>${toc}</ol></nav></aside>
  <article class="doc">
    <h1>${esc(g.title)}</h1><p class="lead">${inline(g.intro)}</p>
    ${g.sections.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${blocks(c, s.blocks)}</section>`).join('\n')}
  </article>
</div>`
}

function tours(c) {
  return `<section class="wrap block narrow"><h1>${esc(c.tours.title)}</h1><p class="lead">${inline(c.tours.intro)}</p>
  ${Object.keys(c.tours.items).map((id) => tourBlock(c, id)).join('\n')}
</section>`
}

for (const c of langs) {
  const data = tourData(c.lang)
  // Tour geometry and screenshots, next to each page's step captions.
  const withData = (html) => html.replace('</body>', `<script>window.TOURS=${JSON.stringify(data)};window.TOUR_BASE='../';window.TOUR_TEXT=${JSON.stringify(c.tours.controls)}</script>\n</body>`)
  write(`${c.lang}/index.html`, withData(layout(c, 'index', c.meta.title, home(c))))
  write(`${c.lang}/case-study.html`, withData(layout(c, 'case-study', `${c.caseStudy.title} · 365MG`, caseStudy(c))))
  write(`${c.lang}/guide.html`, withData(layout(c, 'guide', `${c.guide.title} · 365MG`, guide(c))))
  write(`${c.lang}/tours.html`, withData(layout(c, 'tours', `${c.tours.title} · 365MG`, tours(c))))
}

// Root: pick the visitor's language once, remember a manual choice, and list every language for crawlers.
const names = Object.fromEntries(langs.map((l) => [l.lang, l.name]))
write(
  'index.html',
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>365MG · Microsoft 365 tenant-to-tenant migration</title>
  <link rel="icon" href="assets/logo.svg"><link rel="stylesheet" href="assets/style.css">
  <script>
    (function () {
      var have = ${JSON.stringify(langs.map((l) => l.lang))}, names = ${JSON.stringify(names)};
      var saved = null; try { saved = localStorage.getItem('365mg-docs-lang') } catch (e) {}
      for (var k in names) if (names[k] === saved) { location.replace(k + '/'); return }
      var nav = (navigator.languages || [navigator.language || 'en']).map(function (l) { return l.toLowerCase().split('-')[0] });
      for (var i = 0; i < nav.length; i++) if (have.indexOf(nav[i]) >= 0) { location.replace(nav[i] + '/'); return }
      location.replace('en/');
    })();
  </script>
</head>
<body><main class="wrap block center"><img src="assets/logo.svg" width="56" height="56" alt=""><h1>365MG</h1>
<ul class="langs">${langs.map((l) => `<li><a href="${l.lang}/" hreflang="${l.lang}">${esc(l.name)}</a></li>`).join('')}</ul></main></body>
</html>
`,
)

console.log(`Built ${langs.length} languages × ${PAGES.length} pages: ${langs.map((l) => l.lang).join(', ')}`)
