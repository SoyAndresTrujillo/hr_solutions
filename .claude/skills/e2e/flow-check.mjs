#!/usr/bin/env node
/**
 * Run a flow on its own — the health check that makes update/delete decidable.
 * A flow that fails here is broken before any ticket can blame the code under test.
 *
 *   node flow-check.mjs --list
 *   node flow-check.mjs shared/read-detail-page --env qa --data '{"route":"/employees/42"}'
 *   node flow-check.mjs --all --env local            # read-only flows only
 *
 * Flags: --env <name> (default local) · --headed · --data '<json>' | <file.json> ·
 *        --email <address> · --out <dir> (default cwd) · --force (with --all: include writers)
 *
 * Sweep safety: --all runs only flows exporting `creates: null`. A flow that creates records
 * is skipped unless you name it explicitly (or pass --force). Files under flows/ that export
 * no `run` (e.g. flows/imports/*.mjs import descriptors) are not flows and are ignored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { open } from './session.mjs';

const FLOWS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'flows');
const VALUED = new Set(['env', 'data', 'email', 'out']);

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) positional.push(a);
  else if (VALUED.has(a.slice(2))) flags[a.slice(2)] = argv[++i];
  else flags[a.slice(2)] = true;
}

async function list() {
  const out = [];
  const walk = async (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) await walk(p);
      else if (f.name.endsWith('.mjs')) {
        const mod = await import(pathToFileURL(p).href);
        if (typeof mod.run === 'function') {
          out.push({ ...mod, path: path.relative(FLOWS, p).replace(/\\/g, '/').replace(/\.mjs$/, '') });
        }
      }
    }
  };
  await walk(FLOWS);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function runOne(flow, data, sessionOpts, sweep) {
  const missing = (flow.needs || []).filter((k) => data[k] === undefined);
  if (missing.length) {
    // In a sweep, un-suppliable data is a skip, not a health failure.
    if (sweep) { console.log(`SKIP ${flow.path} -> needs ${missing.join(', ')}`); return { flow: flow.path, ok: true, skipped: true }; }
    throw new Error(`${flow.path}: missing required data: ${missing.join(', ')}`);
  }
  const s = await open(sessionOpts);
  try {
    const result = await flow.run(s, data);
    console.log(`OK   ${flow.path} ->`, JSON.stringify(result).slice(0, 400));
    return { flow: flow.path, ok: true };
  } catch (e) {
    console.log(`FAIL ${flow.path} -> ${e.message}`);
    return { flow: flow.path, ok: false, error: e.message };
  } finally {
    await s.close();
  }
}

const all = await list();
if (flags.list || argv.length === 0) {
  for (const f of all) {
    const kind = f.creates ? `creates:${f.creates}` : 'read-only';
    console.log(`${f.path.padEnd(34)} ${kind.padEnd(22)} needs: ${(f.needs || []).join(', ') || '-'}`);
  }
  process.exit(0);
}

const sessionOpts = { env: flags.env || 'local', headed: !!flags.headed, email: flags.email, out: flags.out || process.cwd() };
const raw = flags.data || '{}';
const data = raw.trim().startsWith('{') ? JSON.parse(raw) : JSON.parse(fs.readFileSync(raw, 'utf8'));

try {
  const results = [];
  if (flags.all) {
    const safe = all.filter((f) => flags.force || !f.creates);
    console.log(`sweeping ${safe.length}/${all.length} flows (${all.length - safe.length} skipped: they create records)\n`);
    for (const f of safe) results.push(await runOne(f, data, sessionOpts, true));
  } else {
    const name = positional[0];
    const f = all.find((x) => x.path === name || x.path.endsWith(`/${name}`));
    if (!f) throw new Error(`unknown flow "${name}" — run --list`);
    results.push(await runOne(f, data, sessionOpts, false));
  }
  const bad = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`\n${results.length - bad.length - skipped}/${results.length - skipped} flows healthy${skipped ? ` (${skipped} skipped: data not supplied)` : ''}`);
  process.exit(bad.length ? 1 : 0);
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
