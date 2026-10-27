#!/usr/bin/env node
// Monthly SDLC report from files the pipelines already write — no new infrastructure.
//
//   node .claude/scripts/sdlc-metrics.mjs [YYYY-MM] [--gh]
//
// Reads <docsDir>/**/progress*.md, review-findings.md, ci-triage.md and
// .claude/evals/results/*.txt; with --gh also PR timings from `gh pr list`.
// Writes <docsDir>/../metrics/<YYYY-MM>.md (a sibling of the docs bus, so the
// report is never re-read as pipeline output) and prints its path.
// Every source is optional: an empty project gets a report of zeros.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../skills/_lib/config.mjs';

const { root: ROOT, config } = loadConfig(path.dirname(fileURLToPath(import.meta.url)));
const DOCS = path.resolve(ROOT, config.docsDir || '.claude/docs/ai');
const prefix = config.ticketPrefix ? config.ticketPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '[A-Z][A-Z0-9]*';
const TICKET = new RegExp(`\\b${prefix}-\\d+`);
const EVALS = path.join(ROOT, '.claude', 'evals', 'results');
const month = process.argv.find((a) => /^\d{4}-\d{2}$/.test(a)) || new Date().toISOString().slice(0, 7);
const withGh = process.argv.includes('--gh');

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'qa') walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
};
const files = walk(DOCS);
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const hours = (h) => (h === null ? '—' : h < 24 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`);

// --- progress trees -----------------------------------------------------------
const runs = [];
for (const f of files.filter((p) => /progress[^/]*\.md$/.test(p))) {
  const text = fs.readFileSync(f, 'utf-8');
  const head = text.split('\n')[0];
  // Header (_shared/progress-tree.md): "<ID> — /<skill> — started <date> <HH:MM> — updated <date?> <HH:MM>".
  // Older trees drop the times or say "updated now"; count them, leave their duration out.
  const ticket = (head.match(TICKET) || [path.basename(path.dirname(f))])[0];
  const pipeline = (head.match(/\/[\w-]+(?:[^—\n]*)?/) || ['?'])[0].trim();
  const st = head.match(/started\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/);
  const startDate = st ? st[1] : fs.statSync(f).birthtime.toISOString().slice(0, 10);
  if (!startDate.startsWith(month)) continue;
  const up = head.match(/updated\s+(?:(\d{4}-\d{2}-\d{2})\s*)?(\d{2}:\d{2})?/);
  const timed = st && st[2] && up && up[2];
  const hoursTaken = timed ? Math.max(0, (new Date(`${up[1] || st[1]}T${up[2]}`) - new Date(`${st[1]}T${st[2]}`)) / 36e5) : null;
  runs.push({
    ticket,
    pipeline,
    hours: hoursTaken,
    gates: (text.match(/approved\s+(?:at\s+)?\d{1,2}:\d{2}/gi) || []).length,
    changes: (text.match(/changes requested/gi) || []).length,
    stops: (text.match(/^\s*\[!\]/gm) || []).length,
    fixRounds: (text.match(/round 2/gi) || []).length,
    firstPass: /fix — not needed|\[-\]\s*(d\.\s*)?fix/i.test(text),
    shipped: /PR #\d+/.test(text),
  });
}

// --- review findings, CI triage --------------------------------------------------
const inMonth = (p) => fs.statSync(p).mtime.toISOString().startsWith(month);
let important = 0, nits = 0, waived = 0, reviews = 0;
for (const f of files.filter((p) => p.endsWith('review-findings.md') && inMonth(p))) {
  const t = fs.readFileSync(f, 'utf-8');
  const c = t.match(/(\d+)\s+Important[^\n]*?(\d+)\s+Nits?/i);
  reviews += 1;
  if (c) { important += +c[1]; nits += +c[2]; }
  waived += (t.match(/waived/gi) || []).length;
}
const triage = {};
for (const f of files.filter((p) => p.endsWith('ci-triage.md') && inMonth(p))) {
  const cls = (fs.readFileSync(f, 'utf-8').match(/\b(real|pre-existing|flaky|environment)\b/i) || [])[1];
  if (cls) triage[cls.toLowerCase()] = (triage[cls.toLowerCase()] || 0) + 1;
}

// --- eval results -------------------------------------------------------------
const evalRuns = fs.existsSync(EVALS) ? fs.readdirSync(EVALS).filter((n) => n.startsWith(month) && n.endsWith('.txt')) : [];
let evPass = 0, evFail = 0;
for (const n of evalRuns) {
  const t = fs.readFileSync(path.join(EVALS, n), 'utf-8');
  evPass += (t.match(/^PASS /gm) || []).length;
  evFail += (t.match(/^FAIL /gm) || []).length;
}

// --- PR timings (optional) ------------------------------------------------------
let prLines = ['Not collected — rerun with `--gh`.'];
if (withGh) {
  try {
    const prs = JSON.parse(execFileSync('gh', ['pr', 'list', '--author', '@me', '--state', 'merged', '--limit', '100', '--json', 'number,title,createdAt,mergedAt,reviews'], { cwd: ROOT, encoding: 'utf-8' }))
      .filter((p) => p.mergedAt && p.mergedAt.startsWith(month));
    const toMerge = prs.map((p) => (new Date(p.mergedAt) - new Date(p.createdAt)) / 36e5);
    const toReview = prs
      .map((p) => (p.reviews || []).filter((r) => r.submittedAt).map((r) => new Date(r.submittedAt)).sort((a, b) => a - b)[0])
      .map((first, i) => (first ? (first - new Date(prs[i].createdAt)) / 36e5 : null))
      .filter((x) => x !== null);
    prLines = [
      `| Merged PRs | ${prs.length} |`,
      `| Median PR open → merge | ${hours(median(toMerge))} |`,
      `| Median PR open → first human review | ${hours(median(toReview))} |`,
    ];
  } catch (e) {
    prLines = [`gh failed: ${String(e.message).split('\n')[0]}`];
  }
}

const shipped = runs.filter((r) => r.shipped);
const report = `# SDLC metrics — ${month}

Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by \`.claude/scripts/sdlc-metrics.mjs\`.
Leading and lagging indicators, read from files the pipelines write.

## Pipeline runs (progress trees)

| Indicator | Value |
|---|---|
| Runs started this month | ${runs.length} |
| Runs that reached a PR | ${shipped.length} (${pct(shipped.length, runs.length)}) |
| Median run time (start → last update, calendar) | ${hours(median(runs.map((r) => r.hours).filter((h) => h !== null)))} (${runs.filter((r) => r.hours !== null).length} runs with full timestamps) |
| Runs with a "changes requested" at a gate (rework) | ${runs.filter((r) => r.changes).length} (${pct(runs.filter((r) => r.changes).length, runs.length)}) |
| Runs that needed a 2nd fix round | ${runs.filter((r) => r.fixRounds).length} |
| Runs where the first implementation pass was green | ${runs.filter((r) => r.firstPass).length} (${pct(runs.filter((r) => r.firstPass).length, runs.length)}) |
| Stops / blocks recorded (\`[!]\`) | ${runs.reduce((a, r) => a + r.stops, 0)} |
| Gates approved | ${runs.reduce((a, r) => a + r.gates, 0)} |

## AI review (\`review-findings.md\`)

| Indicator | Value |
|---|---|
| PRs reviewed | ${reviews} |
| Important findings | ${important} |
| Nits | ${nits} |
| Waivers | ${waived} |

## CI triage (\`ci-triage.md\`)

| Class | Count |
|---|---|
${['real', 'pre-existing', 'flaky', 'environment'].map((k) => `| ${k} | ${triage[k] || 0} |`).join('\n')}

## Evals (\`/eval-config\`)

| Indicator | Value |
|---|---|
| Eval runs | ${evalRuns.length} |
| Case results | ${evPass} pass / ${evFail} fail (${pct(evPass, evPass + evFail)} pass) |

## Pull requests

| Indicator | Value |
|---|---|
${prLines.join('\n')}

## Per run

| Ticket | Pipeline | Time | Gates | Rework | Fix round 2 | PR |
|---|---|---|---|---|---|---|
${runs.map((r) => `| ${r.ticket} | ${r.pipeline} | ${hours(r.hours)} | ${r.gates} | ${r.changes} | ${r.fixRounds ? 'yes' : '—'} | ${r.shipped ? 'yes' : '—'} |`).join('\n')}
`;

const outDir = path.join(path.dirname(DOCS), 'metrics');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${month}.md`);
fs.writeFileSync(out, report);
console.log(out);
