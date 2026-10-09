// Compares the English and Chinese halves of the docs, structurally.
//
// The two are the same document in two languages, so they must agree on: heading levels and
// order, container type and order, fenced-code count, and table row count. Code inside fences is
// compared byte for byte -- commands and console output are never translated.
//
// The two `index.md` files are excluded: they carry no prose, only frontmatter and a comment, so
// there is nothing for the two languages to agree on.
//
// Usage: node scripts/check-structure.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Splits a page into the things that must match across languages. */
function analyse(text) {
  const headings = []
  const containers = []
  const fences = []
  const tableRows = []
  let inFence = false
  let buffer = []

  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      if (inFence) {
        fences.push(buffer.join('\n'))
        buffer = []
      }
      inFence = !inFence
      continue
    }

    if (inFence) {
      buffer.push(line)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+/)
    if (heading) {
      headings.push(heading[1].length)
      continue
    }

    const container = line.match(/^:::\s*(tip|info|warning|danger|details)\s/)
    if (container) {
      containers.push(container[1])
      continue
    }

    // A table row, excluding the delimiter row (`| --- |`).
    if (/^\s*\|.*\|\s*$/.test(line) && !/^\s*\|[\s:|-]+\|\s*$/.test(line)) {
      tableRows.push(line)
    }
  }

  return { headings, containers, fences, tableRows, unclosed: inFence }
}

/** Every page that exists in both halves, plus any that do not. */
function collect() {
  const out = []
  for (const [en, zh] of [
    ['guide', 'zh/guide'],
    ['reference', 'zh/reference'],
    ['plugins', 'zh/plugins'],
  ]) {
    for (const name of readdirSync(join(root, en))) {
      if (!name.endsWith('.md'))
        continue
      const zhPath = join(root, zh, name)
      out.push({ en: `${en}/${name}`, zh: existsSync(zhPath) ? `${zh}/${name}` : null })
    }
  }
  out.push({ en: 'faq.md', zh: existsSync(join(root, 'zh/faq.md')) ? 'zh/faq.md' : null })
  return out
}

let failures = 0
let checked = 0

for (const pair of collect()) {
  if (!pair.zh) {
    console.log(`${pair.en.padEnd(34)}  MISSING Chinese page`)
    failures++
    continue
  }

  const en = analyse(readFileSync(join(root, pair.en), 'utf8'))
  const zh = analyse(readFileSync(join(root, pair.zh), 'utf8'))
  const problems = []
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

  if (!same(en.headings, zh.headings)) {
    problems.push(`headings EN[${en.headings}] != ZH[${zh.headings}]`)
  }
  if (!same(en.containers, zh.containers)) {
    problems.push(`containers EN[${en.containers}] != ZH[${zh.containers}]`)
  }
  if (en.fences.length !== zh.fences.length) {
    problems.push(`fence count ${en.fences.length} != ${zh.fences.length}`)
  }
  else {
    const differing = en.fences
      .map((body, i) => (body === zh.fences[i] ? null : i + 1))
      .filter(i => i !== null)
    if (differing.length)
      problems.push(`code differs in fence(s): ${differing.join(', ')}`)
  }
  if (en.tableRows.length !== zh.tableRows.length) {
    problems.push(`table rows ${en.tableRows.length} != ${zh.tableRows.length}`)
  }
  if (en.unclosed)
    problems.push('unclosed fence in English page')
  if (zh.unclosed)
    problems.push('unclosed fence in Chinese page')

  checked++
  if (problems.length) {
    failures++
    console.log(`${pair.en.padEnd(34)}  FAIL`)
    for (const problem of problems) console.log(`      ${problem}`)
  }
  else {
    console.log(
      `${pair.en.padEnd(34)}  ok   h${en.headings.length} · boxes ${en.containers.length} · fences ${en.fences.length} · rows ${en.tableRows.length}`,
    )
  }
}

console.log('-'.repeat(60))
console.log(`${checked} pairs checked, ${failures} with differences`)
process.exit(failures ? 1 : 0)
