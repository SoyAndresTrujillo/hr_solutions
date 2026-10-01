#!/usr/bin/env node
/**
 * Shared browser session for e2e runs — LAYER 1 (plumbing).
 *
 * Owns everything about *reaching* the app: environment, credentials, login, the
 * browser traps that produce silently-wrong results, and the evidence file. It knows
 * nothing about any business module — that lives in flows/ (layer 2) — and the
 * assertions live in the ticket's own scenario (layer 3).
 *
 *   import { open } from '<root>/.claude/skills/e2e/session.mjs';
 *   const s = await open({ env: 'qa', out: here });
 *   await s.goto('/employees');
 *   await s.record('AC1 leave balance visible', '12 days', await s.text('[data-field=balance]'));
 *   await s.close();                       // writes results-<env>.json
 *
 * Config (.claude/kit.config.json):
 *   environments.<env>.web / .api    base URLs (production is refused in code)
 *   environments.<env>.credentialsEnv  optional per-env override of e2e.credentialsEnv
 *   e2e.credentialsEnv               { email: '<ENV VAR NAME>', password: '<ENV VAR NAME>' }
 *   e2e.envFile                      file the credential vars are read from (real env vars win)
 *   e2e.loginFlow                    flow path under flows/, e.g. 'auth/login'
 *   e2e.token                        where s.api() finds the Bearer token (see TOKEN below)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, readEnv } from '../_lib/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * TOKEN — where s.api() reads the Bearer token after login. `<source>:<key>`:
 *   'localStorage:token'  the web app stores the token in localStorage under `token` (default)
 *   'cookie:token'        the token is a cookie named `token` (httpOnly works: read server-side)
 *   'none'                no Bearer header; cookies ride along on their own
 * Set per project in e2e.token, or per call site with open({ token }).
 */
const DEFAULT_TOKEN = 'localStorage:token';

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error('playwright not installed: cd .claude/skills/e2e && npm i && npx playwright install chromium');
  }
}

// Evidence files already written by THIS process. close() starts a file clean the first
// time and merges on every later call, so a multi-role scenario (one session per role)
// keeps all of its rows without a fresh run inheriting a stale file.
const writtenThisRun = new Set();

/**
 * @param {object} o
 * @param {string} [o.env]       key of `environments` (default 'local'); 'production' is refused
 * @param {boolean} [o.headed]   show the browser
 * @param {string} [o.email]     login address override; the password still comes from the env file
 * @param {{email: string, password: string}} [o.credentialsEnv] env var NAMES for another account
 *   (e.g. a manager-role login); values are read from the env file, never inlined
 * @param {string} [o.out]       evidence directory (default: cwd)
 * @param {string} [o.token]     token source override (see TOKEN)
 * @param {boolean} [o.login]    false = do not log in (public pages, the login flow itself)
 * @param {boolean} [o.resume]   merge into an EXISTING results-<env>.json instead of starting it
 *   clean. For a follow-up round that re-runs a SUBSET; rows are keyed by case name, so prefix
 *   the resumed round's names (`R2 · …`) or they replace the earlier rows.
 */
export async function open(o = {}) {
  const env = o.env || 'local';
  // Production is not a configuration choice. Any attempt to reach it aborts.
  if (env === 'production') throw new Error('refusing to drive the production environment');

  const { root, config } = loadConfig(HERE);
  const target = config.environments?.[env];
  if (!target) throw new Error(`environments.${env} is not configured in .claude/kit.config.json`);
  const web = String(target.web || '').replace(/\/$/, '');
  const api = String(target.api || '').replace(/\/$/, '');
  if (!web) throw new Error(`environments.${env}.web is empty`);

  const prod = config.environments?.production || {};
  const prodOrigins = [prod.web, prod.api].filter(Boolean).map((u) => new URL(u).origin);
  const assertNotProd = (url) => {
    if (prodOrigins.includes(new URL(url).origin)) throw new Error(`refusing to drive a production host: ${url}`);
  };
  assertNotProd(web);
  if (api) assertNotProd(api);

  const e2e = config.e2e || {};
  const names = o.credentialsEnv || target.credentialsEnv || e2e.credentialsEnv || {};
  const vars = readEnv(path.join(root, e2e.envFile || '.env'));
  const email = o.email || vars[names.email];
  const password = vars[names.password];
  const doLogin = o.login !== false;
  if (doLogin && (!email || !password)) {
    throw new Error(`credentials missing: set ${names.email} / ${names.password} in ${e2e.envFile} (or the environment)`);
  }

  const out = o.out || process.cwd();
  fs.mkdirSync(out, { recursive: true });
  const resultsFile = path.join(out, `results-${env}.json`);
  if (o.resume) writtenThisRun.add(resultsFile);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: !o.headed });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  const tokenSource = o.token || e2e.token || DEFAULT_TOKEN;
  async function readToken() {
    if (tokenSource === 'none') return null;
    const [from, key] = tokenSource.split(':');
    let v = null;
    if (from === 'localStorage') v = await page.evaluate((k) => localStorage.getItem(k), key);
    else if (from === 'cookie') v = (await ctx.cookies()).find((c) => c.name === key)?.value ?? null;
    else throw new Error(`unknown token source "${tokenSource}" (localStorage:<key> | cookie:<key> | none)`);
    return v ? decodeURIComponent(v).replace(/^"|"$/g, '') : null;
  }

  const rows = [];
  const created = [];

  const s = {
    env, web, api, page, ctx, browser, out, rows, created, config,

    /**
     * Navigate to a route (relative to the web base) or an absolute URL. A dev server that
     * keeps recompiling never reaches network idle, which surfaces as a bare goto timeout;
     * fall back to the DOM-ready signal and let the caller's explicit waits settle it.
     */
    async goto(route, opts = {}) {
      const url = /^https?:/.test(route) ? route : `${web}${route.startsWith('/') ? '' : '/'}${route}`;
      assertNotProd(url);
      try {
        await page.goto(url, { waitUntil: 'networkidle', ...opts });
      } catch (e) {
        if (!/Timeout/i.test(e.message)) throw e;
        console.log(`warning: ${url} never reached network idle - retrying on domcontentloaded`);
        await page.goto(url, { waitUntil: 'domcontentloaded', ...opts });
        await page.waitForTimeout(2000);
      }
    },

    /** Fill a form field found by its accessible label. */
    async fill(label, value) {
      await page.getByLabel(label).first().fill(String(value));
    },

    /**
     * Pick an option by label. A native <select> uses selectOption; a custom combobox is
     * opened with a real click and its option clicked by role — synthetic events are
     * ignored by many component libraries, and the dropdown then never opens.
     */
    async select(label, option) {
      await page.keyboard.press('Escape'); // a still-open panel swallows the next click
      const field = page.getByLabel(label).first();
      const tag = await field.evaluate((el) => el.tagName);
      if (tag === 'SELECT') {
        await field.selectOption({ label: option });
        return;
      }
      await field.click();
      await page.getByRole('option', { name: option }).first().click();
    },

    /** Click a button or link by its accessible name (string or RegExp). */
    async click(name) {
      await page.getByRole('button', { name }).or(page.getByRole('link', { name })).first().click();
    },

    /** Inner text of the first match, or null when nothing matches (absent ≠ empty ''). */
    async text(selector) {
      const l = page.locator(selector).first();
      return (await l.count()) ? (await l.innerText()).trim() : null;
    },
    async texts(selector) {
      return (await page.locator(selector).allInnerTexts()).map((t) => t.trim());
    },
    eval: (fn, arg) => page.evaluate(fn, arg),

    /**
     * Capture toast/notification text around an action. The observer is installed BEFORE
     * the action: toasts auto-dismiss, and reading after the fade returns "" — which is
     * indistinguishable from the bug where no toast is shown at all.
     * Matches nodes that are, or sit inside, role=alert / role=status / aria-live regions.
     */
    async toast(action) {
      await page.evaluate(() => {
        const sel = '[role="alert"], [role="status"], [aria-live]';
        window.__toasts = [];
        window.__toastObs?.disconnect();
        window.__toastObs = new MutationObserver((ms) => {
          for (const m of ms) {
            for (const n of m.addedNodes) {
              if (n.nodeType !== 1) continue;
              const t = n.textContent?.trim();
              if (t && (n.closest(sel) || n.querySelector(sel))) window.__toasts.push(t);
            }
          }
        });
        window.__toastObs.observe(document.body, { childList: true, subtree: true });
      });
      // ponytail: text swapped inside an existing live region (characterData) is not caught;
      // add characterData observation if the app reuses one toast node.
      await action();
      await page.waitForTimeout(1500);
      return page.evaluate(() => window.__toasts || []);
    },

    /**
     * Authenticated API call inside the logged-in browser context. Cookies ride along;
     * the Bearer header comes from the token source (see TOKEN). `init.body` is sent as JSON.
     */
    async api(route, init = {}) {
      if (!api) throw new Error(`environments.${env}.api is empty`);
      const url = /^https?:/.test(route) ? route : `${api}${route}`;
      assertNotProd(url);
      const token = await readToken();
      const r = await page.request.fetch(url, {
        method: init.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
        data: init.body,
      });
      const text = await r.text();
      try { return { status: r.status(), body: JSON.parse(text) }; } catch { return { status: r.status(), body: text.slice(0, 500) }; }
    },

    async shot(name) {
      const file = path.join(out, `${slug(name)}-${env}.png`);
      await page.screenshot({ path: file, fullPage: true });
      return file;
    },

    /** Register a record this run created — every one gets named in the QA report. */
    recordCreated(type, id) {
      created.push({ type, id });
    },

    /**
     * One evidence row + one screenshot. `expected` may be a string, a RegExp, a predicate,
     * or null for an informational row.
     */
    async record(name, expected, actual) {
      let pass = null;
      if (expected instanceof RegExp) pass = expected.test(String(actual));
      else if (typeof expected === 'function') pass = !!expected(actual);
      else if (expected != null) pass = String(expected).trim() === String(actual ?? '').trim();
      const shot = await s.shot(name);
      const row = { case: name, env, expected: String(expected), actual, pass, screenshot: path.basename(shot) };
      rows.push(row);
      console.log(`${pass === null ? 'INFO' : pass ? 'PASS' : 'FAIL'}  ${name}  actual=${JSON.stringify(actual)}`);
      return row;
    },

    /**
     * Write results-<env>.json. The first close() of a process starts the file clean; every
     * later close() in the SAME process (one session per role) merges into it, so earlier
     * sessions' rows are not silently discarded. A re-run case replaces its earlier row.
     */
    async close() {
      const fresh = !writtenThisRun.has(resultsFile);
      writtenThisRun.add(resultsFile);
      let priorRows = [];
      let priorCreated = [];
      if (!fresh && fs.existsSync(resultsFile)) {
        try {
          const old = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
          if (old?.env === env && Array.isArray(old.rows)) {
            priorRows = old.rows;
            priorCreated = Array.isArray(old.created) ? old.created : [];
          }
        } catch (e) {
          console.log(`warning: could not merge prior evidence (${e.message}) - keeping this session only`);
        }
      }
      const allRows = [...priorRows.filter((p) => !rows.some((r) => r.case === p.case)), ...rows];
      const allCreated = [...priorCreated, ...created];
      const failed = allRows.filter((r) => r.pass === false).length;
      fs.writeFileSync(resultsFile, JSON.stringify({
        env, web, api,
        ranAt: new Date().toISOString(),
        summary: {
          total: allRows.length,
          passed: allRows.filter((r) => r.pass === true).length,
          failed,
          info: allRows.filter((r) => r.pass === null).length,
        },
        created: allCreated,
        rows: allRows,
      }, null, 1));
      await browser.close();
      console.log(`\nevidence: ${resultsFile}  (${allRows.length} rows total, ${rows.length} from this session, ${failed} failed)`);
      if (created.length) console.log('records created:', JSON.stringify(created));
      return { file: resultsFile, failed };
    },
  };

  if (doLogin) {
    const flowPath = path.join(HERE, 'flows', `${e2e.loginFlow || 'auth/login'}.mjs`);
    try {
      const login = await import(pathToFileURL(flowPath).href);
      await login.run(s, { email, password });
    } catch (e) {
      await browser.close(); // a failed login must not leave the process hanging on the browser
      throw new Error(`login failed (${e2e.loginFlow || 'auth/login'}): ${e.message}`);
    }
  }
  return s;
}
