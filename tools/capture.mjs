// Takes the screenshots and tour frames from the real 365MG interface, in every language, with demo data.
// Needs the app's dev server (in the 365migrate folder: pnpm dev → http://localhost:1420) and Chrome or Edge.
//   node tools/capture.mjs [lang ...]
// Writes assets/shots/<lang>/*.webp and assets/tours/<lang>.json (per tour: screenshot and target box per step).

import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const APP = process.env.APP_URL ?? 'http://localhost:1420'
const BROWSER = process.env.BROWSER ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))
const ALL = ['en', 'vi', 'zh', 'ko', 'ja', 'de', 'ru', 'hi', 'ar']
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const W = 1280, H = 800
const mock = fs.readFileSync(path.join(root, 'tools/demo-mock.js'), 'utf8')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Messages the app's core would send (issue details, warnings, report notes), from its catalogs, so the demo
// data reads in the page's language: src-tauri/locales/<area>.<lang>.yml flattened to dotted keys.
const APP_DIR = process.env.APP_DIR ?? path.resolve(root, '../365migrate')
function coreText(lang) {
  const dir = path.join(APP_DIR, 'src-tauri/locales')
  const out = {}
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(`.${lang}.yml`))) {
    const stack = []
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(\s*)([^:#\s][^:]*):\s*(.*)$/)
      if (!m || m[2] === '_version') continue
      const indent = m[1].length
      while (stack.length && stack[stack.length - 1][0] >= indent) stack.pop()
      if (!m[3]) { stack.push([indent, m[2]]); continue }
      let v = m[3].trim()
      try { if (v.startsWith('"')) v = JSON.parse(v) } catch { /* keep as written */ }
      out[[...stack.map((s) => s[1]), m[2]].join('.')] = v
    }
  }
  return out
}

async function open(browser, lang) {
  const page = await browser.newPage()
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  await page.evaluateOnNewDocument(`try { localStorage.setItem('365mg.locale', ${JSON.stringify(lang)}) } catch (e) {}`)
  await page.evaluateOnNewDocument(`window.__demoLang = ${JSON.stringify(lang)}; window.__demoText = ${JSON.stringify(coreText(lang))}`)
  await page.evaluateOnNewDocument(mock)
  // No update check or OS-specific fonts flicker in the frames.
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }])
  return page
}

async function go(page, route) {
  // The dev server keeps a live-reload socket open, so waiting for an idle network would only time out.
  await page.goto(APP + route, { waitUntil: 'load' })
  await sleep(1200)
}

const sel = (name) => `[data-tour="${name}"]`

/** Target box as fractions of the viewport, after scrolling the element into view. */
async function boxOf(page, selector) {
  const h = await page.waitForSelector(selector, { visible: true, timeout: 8000 })
  await h.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await sleep(250)
  const r = await h.boundingBox()
  const clamp = (v) => Math.max(0, Math.min(1, v))
  return [clamp(r.x / W), clamp(r.y / H), clamp(r.width / W), clamp(r.height / H)].map((v) => +v.toFixed(4))
}

async function click(page, selector) {
  const h = await page.waitForSelector(selector, { visible: true, timeout: 8000 })
  // frappe-ui checkboxes put the attribute on a wrapper: click the control inside when there is one.
  const inner = await h.$('button, input, [role="checkbox"], [role="combobox"]')
  await (inner ?? h).click()
  await sleep(700)
}

async function shot(page, lang, name) {
  const dir = path.join(root, 'assets/shots', lang)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${name}.webp`), type: 'webp', quality: 82 })
  return `assets/shots/${lang}/${name}.webp`
}

/** One tour: each step is { target, action, before?: async (page) => {}, after?: async (page) => {} }. */
async function tour(page, lang, id, steps) {
  const out = []
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (s.before) await s.before(page)
    const box = await boxOf(page, s.target)
    const file = await shot(page, lang, `tour-${id}-${i + 1}`)
    out.push({ shot: file, box, action: s.action, w: W, h: H })
    if (s.action === 'click' && !s.noClick) await click(page, s.target)
    if (s.after) await s.after(page)
  }
  return out
}

async function captureLang(browser, lang) {
  const page = await open(browser, lang)
  const tours = {}

  // Static screenshots for the landing page and the guide.
  await go(page, '/dashboard'); await shot(page, lang, 'dashboard')
  await go(page, '/tenants'); await shot(page, lang, 'tenants')
  await go(page, '/campaigns/7'); await shot(page, lang, 'campaign')
  await click(page, sel('issue-group-target_no_drive'))
  await page.$eval(sel('issues'), (el) => el.scrollIntoView({ block: 'start' }))
  await sleep(300); await shot(page, lang, 'issues')
  await go(page, '/reports'); await shot(page, lang, 'reports')
  await go(page, '/settings'); await shot(page, lang, 'settings')

  tours.addTenant = await tour(page, lang, 'addTenant', [
    { before: (p) => go(p, '/dashboard'), target: sel('nav-tenants'), action: 'click' },
    { before: (p) => go(p, '/tenants'), target: sel('tenant-add'), action: 'click', noClick: true },
    { target: sel('tenant-card'), action: 'look' },
  ])

  tours.createCampaign = await tour(page, lang, 'createCampaign', [
    { before: (p) => go(p, '/campaigns'), target: sel('campaign-new'), action: 'click' },
    { target: sel('wizard-tenant-src'), action: 'click',
      after: async (p) => { await click(p, sel('wizard-next')); await click(p, sel('wizard-tenant-tgt')); await click(p, sel('wizard-next')) } },
    { target: sel('source-all'), action: 'click',
      after: async (p) => { await click(p, sel('source-add')); await click(p, sel('wizard-next')); await sleep(800) } },
    { target: sel('match-all'), action: 'click' },
    { target: sel('match-domain'), action: 'click', noClick: true,
      after: async (p) => { await click(p, sel('wizard-next')) } },
    { target: sel('options'), action: 'look', after: async (p) => { await click(p, sel('wizard-next')) } },
    { target: sel('wizard-save'), action: 'click', noClick: true },
  ])
  await shot(page, lang, 'wizard-review')

  // Back to the match step for the guide's screenshot.
  await go(page, '/campaigns/new')
  for (const s of ['wizard-tenant-src', 'wizard-next', 'wizard-tenant-tgt', 'wizard-next', 'source-all', 'source-add', 'wizard-next']) await click(page, sel(s))
  await sleep(800); await click(page, sel('match-all')); await shot(page, lang, 'wizard-match')

  tours.run = await tour(page, lang, 'run', [
    { before: (p) => go(p, '/campaigns/7'), target: sel('run-bar'), action: 'look' },
    { target: sel('run-primary'), action: 'click' },
    { before: (p) => sleep(600), target: sel('tab-run'), action: 'look' },
    { target: sel('run-pause'), action: 'click' },
    { before: (p) => go(p, '/campaigns/7'), target: sel('run-primary'), action: 'click', noClick: true },
  ])

  tours.issues = await tour(page, lang, 'issues', [
    // Every navigation starts the demo data afresh, so the issues are all back.
    { before: (p) => go(p, '/campaigns/7'), target: sel('issues'), action: 'look' },
    { target: sel('issue-group-target_no_drive'), action: 'click' },
    { target: sel('issue-copy-script'), action: 'click' },
    { target: sel('issue-skip'), action: 'click', noClick: true },
  ])

  tours.report = await tour(page, lang, 'report', [
    { before: (p) => go(p, '/reports'), target: sel('report-campaign'), action: 'look' },
    { target: sel('report-cards'), action: 'look' },
    { target: sel('report-html'), action: 'click', noClick: true },
  ])

  tours.language = await tour(page, lang, 'language', [
    { before: (p) => go(p, '/dashboard'), target: sel('nav-settings'), action: 'click' },
    { target: sel('settings-language'), action: 'click', noClick: true },
  ])
  await page.close()
  // Last step: the same page in Arabic, laid out right to left.
  const ar = await open(browser, 'ar')
  await go(ar, '/settings')
  tours.language.push({ shot: await shot(ar, lang, 'tour-language-3'), box: await boxOf(ar, sel('settings-language')), action: 'look', w: W, h: H })
  await ar.close()

  fs.mkdirSync(path.join(root, 'assets/tours'), { recursive: true })
  fs.writeFileSync(path.join(root, 'assets/tours', `${lang}.json`), JSON.stringify(tours, null, 1))
}

if (!BROWSER) throw new Error('Chrome or Edge not found; set BROWSER to its path')
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--hide-scrollbars', '--font-render-hinting=none'] })
try {
  for (const lang of langs) {
    process.stdout.write(`${lang}… `)
    await captureLang(browser, lang)
    console.log('ok')
  }
} finally {
  await browser.close()
}
