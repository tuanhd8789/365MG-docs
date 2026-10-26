// Lists the data-tour targets present on a page of the demo app: node tools/debug-tours.mjs /campaigns/7 [lang]
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'

const route = process.argv[2] ?? '/campaigns/7'
const lang = process.argv[3] ?? 'en'
const mock = fs.readFileSync(new URL('./demo-mock.js', import.meta.url), 'utf8')
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()))
await page.evaluateOnNewDocument(`localStorage.setItem('365mg.locale', '${lang}')`)
await page.evaluateOnNewDocument(mock)
await page.goto('http://localhost:1420' + route, { waitUntil: 'load' })
await new Promise((r) => setTimeout(r, 1500))
const g = await page.$('[data-tour="issue-group-target_no_drive"]')
if (g) { await g.click(); await new Promise((r) => setTimeout(r, 700)) }
console.log(await page.$$eval('[data-tour]', (els) => els.map((e) => e.getAttribute('data-tour')).join(' ')))
await browser.close()
