/**
 * Post-generate script: injects the Netlify contact form into all
 * prerendered HTML files so Netlify's deploy crawler can detect it.
 * Required because ssr:false means no render:html hooks fire.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const FORM_HTML = `<form name="contact" data-netlify="true" netlify-honeypot="bot-field" hidden>`
  + `<input type="hidden" name="form-name" value="contact"/>`
  + `<input name="bot-field"/>`
  + `<input name="name" type="text"/>`
  + `<input name="email" type="email"/>`
  + `<textarea name="message"></textarea>`
  + `</form>`

const outputDir = join(import.meta.dirname, '..', '.output', 'public')

for (const file of readdirSync(outputDir)) {
  if (!file.endsWith('.html') || file === '__forms.html') continue
  const filePath = join(outputDir, file)
  const html = readFileSync(filePath, 'utf-8')
  if (html.includes('data-netlify')) continue
  const injected = html.replace('<body>', `<body>${FORM_HTML}`)
  writeFileSync(filePath, injected)
  console.log(`Injected Netlify form into ${file}`)
}
