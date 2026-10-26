// Screenshots a few built pages (served by tools/serve.mjs) to check layout and the tour player:
//   node tools/check-site.mjs [out-dir]
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'

const out = process.argv[2] ?? 'check'
const BROWSER = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const pages = [
  ['en-tours', '/en/tours.html', 2800, 1280],
  ['ar-index', '/ar/', 600, 1280],
  ['vi-guide', '/vi/guide.html#decisions', 600, 1280],
  ['hi-mobile', '/hi/', 600, 390],
]
fs.mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true })
for (const [name, url, wait, width] of pages) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 860 })
  await page.goto('http://localhost:4173' + url, { waitUntil: 'networkidle0' })
  if (name === 'en-tours') await page.$eval('figure.tour', (el) => el.scrollIntoView())
  await new Promise((r) => setTimeout(r, wait))
  await page.screenshot({ path: `${out}/${name}.png` })
  await page.close()
}
await browser.close()
console.log('ok')
