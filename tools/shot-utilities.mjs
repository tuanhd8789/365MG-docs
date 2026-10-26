// Screenshot of Utilities → Check by email with demo data: node tools/shot-utilities.mjs out.png [lang]
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'

const out = process.argv[2] ?? 'utilities.png'
const lang = process.argv[3] ?? 'en'
const mock = fs.readFileSync(new URL('./demo-mock.js', import.meta.url), 'utf8')
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.evaluateOnNewDocument(`localStorage.setItem('365mg.locale', '${lang}')`)
await page.evaluateOnNewDocument(mock)
await page.goto('http://localhost:1420/utilities', { waitUntil: 'load' })
await new Promise((r) => setTimeout(r, 1200))
await page.type('input[type="email"]', 'avery.nguyen@contoso.com')
await page.click('button[type="submit"]')
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: out, fullPage: true })
await browser.close()
