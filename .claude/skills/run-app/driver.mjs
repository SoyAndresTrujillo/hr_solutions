#!/usr/bin/env node
/**
 * run-app driver — launch-side harness for the local app.
 *
 *   node .claude/skills/run-app/driver.mjs status          api /health + web root, exit 0 only when both answer
 *   node .claude/skills/run-app/driver.mjs up              start what is down (`<pm> run dev` per workspace), wait until healthy
 *   node .claude/skills/run-app/driver.mjs down            stop what `up` started (PID files)
 *   node .claude/skills/run-app/driver.mjs shot <url> <out.png>
 *
 * Everything comes from .claude/kit.config.json: environments.local.{api,web}, workspaces,
 * packageManager, project. Logs: /tmp/<project>-<ws>.log · PIDs: /tmp/<project>-<ws>.pid.
 * Playwright is reused from ../e2e/node_modules rather than installed twice.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../_lib/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { root, config } = loadConfig(HERE);
const local = config.environments?.local || {};
const pm = config.packageManager || 'npm';
const WAIT_S = Number(process.env.RUN_APP_WAIT || 120);

// ws key -> { dir, url to probe }
const parts = {
  api: { dir: config.workspaces?.api, probe: local.api && `${local.api.replace(/\/$/, '')}/health` },
  web: { dir: config.workspaces?.web, probe: local.web },
};
const logFile = (ws) => `/tmp/${config.project}-${ws}.log`;
const pidFile = (ws) => `/tmp/${config.project}-${ws}.pid`;

async function http(url) {
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
    return { code: r.status };
  } catch (e) {
    return { code: 0, err: e.cause?.code || e.message };
  }
}
const healthy = (r) => r.code >= 200 && r.code < 400;

function alive(ws) {
  if (!fs.existsSync(pidFile(ws))) return null;
  const pid = Number(fs.readFileSync(pidFile(ws), 'utf8'));
  try { process.kill(pid, 0); return pid; } catch { return null; }
}

async function status() {
  let ok = true;
  console.log('part  url                                     state   pid     log');
  for (const [ws, p] of Object.entries(parts)) {
    if (!p.probe) { console.log(`${ws.padEnd(5)} environments.local.${ws} not set`); ok = false; continue; }
    const r = await http(p.probe);
    const up = healthy(r);
    ok &&= up;
    const state = up ? `UP ${r.code}` : r.code ? `ANSWERS ${r.code}` : 'DOWN';
    console.log(`${ws.padEnd(5)} ${p.probe.padEnd(39)} ${state.padEnd(7)} ${String(alive(ws) ?? '-').padEnd(7)} ${logFile(ws)}`);
    if (!up && r.code === 404 && ws === 'api') console.log('      port answers but /health is 404 — add the route (stack profile §Run locally) or check the port');
  }
  if (!ok) console.log(`\nstart with: node .claude/skills/run-app/driver.mjs up   (or stack profile §Run locally)`);
  return ok ? 0 : 1;
}

async function up() {
  const started = [];
  for (const [ws, p] of Object.entries(parts)) {
    if (!p.dir || !p.probe) { console.error(`skip ${ws}: workspaces.${ws} or environments.local.${ws} not set`); continue; }
    if (healthy(await http(p.probe))) { console.log(`${ws}: already up`); continue; }
    if (alive(ws)) { console.log(`${ws}: started earlier (pid ${alive(ws)}), still booting`); started.push(ws); continue; }
    const out = fs.openSync(logFile(ws), 'a');
    // detached = own process group, so `down` can stop the dev server AND its children.
    const child = spawn(pm, ['run', 'dev'], { cwd: path.join(root, p.dir), detached: true, stdio: ['ignore', out, out] });
    child.unref();
    fs.writeFileSync(pidFile(ws), String(child.pid));
    console.log(`${ws}: started \`${pm} run dev\` in ${p.dir} (pid ${child.pid}) -> ${logFile(ws)}`);
    started.push(ws);
  }
  for (let t = 0; t < WAIT_S && started.length; t++) {
    for (const ws of [...started]) {
      if (healthy(await http(parts[ws].probe))) { console.log(`${ws}: healthy after ~${t}s`); started.splice(started.indexOf(ws), 1); }
      else if (!alive(ws)) {
        console.error(`${ws}: process exited before becoming healthy. Last log lines:`);
        console.error(fs.readFileSync(logFile(ws), 'utf8').split('\n').slice(-20).join('\n'));
        return 1;
      }
    }
    if (started.length) await new Promise((r) => setTimeout(r, 1000));
  }
  if (started.length) { console.error(`not healthy after ${WAIT_S}s: ${started.join(', ')} — read the logs above`); return 1; }
  return status();
}

function down() {
  for (const ws of Object.keys(parts)) {
    const pid = alive(ws);
    if (!pid) { console.log(`${ws}: nothing started by run-app`); fs.rmSync(pidFile(ws), { force: true }); continue; }
    try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ } }
    fs.rmSync(pidFile(ws), { force: true });
    console.log(`${ws}: stopped pid ${pid}`);
  }
  console.log('a server not started here still holding a port: lsof -nP -iTCP:<port> -sTCP:LISTEN');
  return 0;
}

async function shot(url, out) {
  let chromium;
  try {
    ({ chromium } = createRequire(path.join(HERE, '../e2e/package.json'))('playwright'));
  } catch {
    console.error('playwright not found: cd .claude/skills/e2e && npm i && npx playwright install chromium');
    return 3;
  }
  const file = path.resolve(out || 'shot.png');
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
  page.on('pageerror', (e) => errs.push(`pageerror: ${String(e).slice(0, 160)}`));
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    console.error('navigation failed:', e.message);
    await b.close();
    return 2;
  }
  await page.screenshot({ path: file, fullPage: true });
  // A 200 alone proves nothing: an SPA whose bundle failed still serves its HTML shell.
  // Rendered = visible text or at least one control mounted.
  const d = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    text: (document.body.innerText || '').trim().length,
    controls: document.querySelectorAll('input, button, a[href], select, textarea').length,
  }));
  const rendered = d.text > 0 || d.controls > 0;
  console.log(`url        ${d.url}`);
  console.log(`title      ${d.title || '(empty)'}`);
  console.log(`controls   ${d.controls}   text chars ${d.text}`);
  console.log(`rendered   ${rendered ? 'YES' : 'NO — empty shell; check the web log and the console errors'}`);
  console.log(`screenshot ${file}`);
  if (errs.length) console.log(`console errors (${errs.length}):\n  ${[...new Set(errs)].slice(0, 6).join('\n  ')}`);
  await b.close();
  return rendered ? 0 : 2;
}

const [cmd, ...rest] = process.argv.slice(2);
const code =
  cmd === 'status' ? await status()
  : cmd === 'up' ? await up()
  : cmd === 'down' ? down()
  : cmd === 'shot' ? await shot(rest[0] || local.web, rest[1])
  : (console.error('usage: driver.mjs status | up | down | shot <url> <out.png>'), 1);
process.exit(code);
