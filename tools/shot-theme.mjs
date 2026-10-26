// Screenshots of a few pages in the dark theme with demo data: node tools/shot-theme.mjs out-dir [lang]
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'

const out = process.argv[2] ?? 'dark'
const lang = process.argv[3] ?? 'vi'
const mock = fs.readFileSync(new URL('./demo-mock.js', import.meta.url), 'utf8')
fs.mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1120, height: 680 })
await page.evaluateOnNewDocument(`localStorage.setItem('365mg.locale', '${lang}'); localStorage.setItem('365mg.theme', 'dark')`)
await page.evaluateOnNewDocument(mock)
for (const [name, route] of [['campaign', '/campaigns/7'], ['clouds', '/clouds'], ['wizard', '/campaigns/new'], ['settings', '/settings']]) {
  await page.goto('http://localhost:1420' + route, { waitUntil: 'load' })
  await new Promise((r) => setTimeout(r, 1300))
  await page.screenshot({ path: `${out}/${name}.png` })
}
await browser.close()
