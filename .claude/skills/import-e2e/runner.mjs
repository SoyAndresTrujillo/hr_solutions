#!/usr/bin/env node
/**
 * import-e2e runner — bulk-import verification through the app's own import UI.
 *
 * Session plumbing lives in ../e2e/session.mjs. The import page's shape comes from an
 * import descriptor, ../e2e/flows/imports/<name>.mjs (default export, see SKILL.md), and
 * any descriptor key can be overridden by a flag of the same name.
 *
 *   node runner.mjs harvest  --import employees --out harvest.json
 *   node runner.mjs template --import employees --out template.csv
 *   node runner.mjs upload   --import employees --csv rows.csv --desc "import-e2e HR-12 r1" [--failedOut failed.csv]
 *   node runner.mjs verify   --import employees --id 42 --out created.json      (or --route /employees/42, or --apiRoute /api/employees/42)
 *
 * Common flags: --env <name> (default local) · --email <address> · --headed ·
 *   --outDir <dir>  evidence directory (results-<env>.json, screenshots) AND the base every
 *                   relative --out / --csv / --failedOut path resolves against (default cwd)
 * Descriptor flags: --page --startControl --templateControl --descInput --fileInput
 *   --submitControl --resultsRow --statusColumn --importedColumn --failedColumn
 *   --failedDownload --pendingStatus --detailRoute --harvest '<json {key: apiRoute}>'
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { open } from '../e2e/session.mjs';
import * as readDetail from '../e2e/flows/shared/read-detail-page.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOL = new Set(['headed']);

const [cmd, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  const k = rest[i].replace(/^--/, '');
  args[k] = BOOL.has(k) ? true : rest[++i];
}

const DEFAULTS = {
  resultsRow: 'table tbody tr',
  pendingStatus: 'processing|pending|queued|running|in progress',
};

async function descriptor() {
  let base = {};
  if (args.import) {
    const file = path.join(HERE, '../e2e/flows/imports', `${args.import}.mjs`);
    if (!fs.existsSync(file)) throw new Error(`no import descriptor at ${file} — create it (SKILL.md §Import descriptor) or pass the selectors as flags`);
    base = (await import(pathToFileURL(file).href)).default;
  }
  const d = { ...DEFAULTS, ...base };
  for (const k of Object.keys(args)) if (!['import', 'env', 'email', 'headed', 'outDir', 'out', 'csv', 'desc', 'failedOut', 'id', 'route', 'apiRoute'].includes(k)) d[k] = args[k];
  if (typeof d.harvest === 'string') d.harvest = JSON.parse(d.harvest);
  for (const k of ['statusColumn', 'importedColumn', 'failedColumn']) if (d[k] != null) d[k] = Number(d[k]);
  return d;
}

const outDir = path.resolve(args.outDir || process.cwd());
const at = (p, def) => path.resolve(outDir, p || def);
const need = (d, ...keys) => {
  const missing = keys.filter((k) => d[k] == null);
  if (missing.length) throw new Error(`${cmd}: missing ${missing.join(', ')} (descriptor key or --flag)`);
};

async function openImport(s, d) {
  await s.goto(d.page);
  if (d.startControl) {
    await s.page.locator(d.startControl).first().click();
    await s.page.waitForTimeout(1000);
  }
}

async function readRows(s, d) {
  await s.goto(d.page);
  await s.page.waitForTimeout(1500);
  return s.page.$$eval(d.resultsRow, (trs) => trs.slice(0, 20).map((tr) => ({
    text: tr.innerText,
    cells: [...tr.querySelectorAll('td')].map((td) => td.innerText.trim()),
  })));
}

const commands = {
  async harvest(s, d) {
    need(d, 'harvest');
    const out = {};
    for (const [key, route] of Object.entries(d.harvest)) {
      out[key] = await s.api(route);
      const data = out[key].body?.data ?? out[key].body;
      const arr = Array.isArray(data) ? data : data?.rows ?? data?.items ?? null;
      console.log(`${key}: status=${out[key].status} count=${Array.isArray(arr) ? arr.length : '?'}`);
    }
    const file = at(args.out, 'harvest.json');
    fs.writeFileSync(file, JSON.stringify(out, null, 1));
    console.log('written:', file);
  },

  async template(s, d) {
    need(d, 'page', 'templateControl');
    await openImport(s, d);
    const dl = s.page.waitForEvent('download', { timeout: 20000 });
    await s.page.locator(d.templateControl).first().click();
    const file = at(args.out, 'template.csv');
    await (await dl).saveAs(file);
    const header = fs.readFileSync(file, 'utf8').split(/\r?\n/)[0];
    console.log('HEADER:', header);
    console.log('written:', file);
  },

  async upload(s, d) {
    need(d, 'page', 'fileInput', 'submitControl');
    if (!args.csv) throw new Error('upload: --csv <file> required');
    const desc = args.desc || `import-e2e ${process.pid}`;
    const match = d.descInput ? desc.slice(0, 30) : path.basename(args.csv);
    await openImport(s, d);
    if (d.descInput) await s.page.locator(d.descInput).first().fill(desc);
    await s.page.locator(d.fileInput).first().setInputFiles(at(args.csv));
    await s.page.waitForTimeout(1000);
    const toasts = await s.toast(() => s.page.locator(d.submitControl).first().click());
    if (toasts.length) console.log('TOASTS:', JSON.stringify(toasts));
    s.recordCreated('import job', desc);

    // Poll until the job leaves its pending status. The status can settle before the
    // counts do, so a finished row with 0 imported / 0 failed is re-read a few times.
    const pending = new RegExp(d.pendingStatus, 'i');
    const status = (r) => (d.statusColumn != null ? r.cells[d.statusColumn] : r.text);
    let row = null;
    for (let attempt = 0; attempt < 12 && !row; attempt++) {
      row = (await readRows(s, d)).find((r) => r.text.includes(match)) || null;
      if (!row || pending.test(status(row))) { row = null; await s.page.waitForTimeout(5000); }
    }
    if (!row) { console.log('RESULT ROW: NOT FOUND (still processing?)'); return; }
    const count = (col) => (col != null ? Number(row.cells[col]) : NaN);
    for (let settle = 0; settle < 6 && count(d.importedColumn) === 0 && count(d.failedColumn) === 0; settle++) {
      await s.page.waitForTimeout(3000);
      row = (await readRows(s, d)).find((r) => r.text.includes(match)) || row;
    }
    console.log('RESULT ROW:', JSON.stringify(row.cells));

    if (d.failedDownload && count(d.failedColumn) > 0) {
      const tr = s.page.locator(d.resultsRow).filter({ hasText: match }).first();
      const dl = s.page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
      await tr.locator(d.failedDownload).first().click();
      const download = await dl;
      if (download) {
        const file = at(args.failedOut, 'failed-records.csv');
        await download.saveAs(file);
        console.log(`FAILED RECORDS (${file}):\n${fs.readFileSync(file, 'utf8')}`);
      }
    }
    await s.record(`upload ${desc}`, null, row.cells.join(' | '));
  },

  async verify(s, d) {
    const file = at(args.out, 'created.json');
    if (args.apiRoute) {
      const r = await s.api(args.apiRoute);
      fs.writeFileSync(file, JSON.stringify(r, null, 1));
      console.log(`status=${r.status}`);
    } else {
      const route = args.route || (d.detailRoute && args.id != null ? d.detailRoute.replace('{id}', args.id) : null);
      if (!route) throw new Error('verify: pass --route, --apiRoute, or --id with a detailRoute');
      const r = await readDetail.run(s, { route });
      fs.writeFileSync(file, JSON.stringify({ url: r.url, sections: r.sections, tables: r.tables }, null, 1));
      console.log(JSON.stringify(r.flat, null, 1));
    }
    console.log('full detail written:', file);
  },
};

try {
  if (!commands[cmd]) throw new Error(`unknown command "${cmd}" (harvest | template | upload | verify)`);
  const d = await descriptor();
  const s = await open({ env: args.env || 'local', email: args.email, headed: !!args.headed, out: outDir });
  try {
    await commands[cmd](s, d);
  } finally {
    await s.close();
  }
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
