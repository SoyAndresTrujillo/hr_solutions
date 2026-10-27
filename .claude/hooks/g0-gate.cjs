#!/usr/bin/env node
/**
 * PreToolUse (Write|Edit|MultiEdit|Bash): team-rules §S5 (migrations) and §B5
 * (new dependencies) need a recorded G0 approval before the change is written.
 *
 * The approval record is `<docsDir>/**\/<ID>/g0-approved.md` in the main
 * checkout, written by the /implement Step 2 and /fix Step 3 G0 gates when the
 * user confirms the Tech Lead's reply. The ticket comes from the branch name
 * (team-rules §D1: the branch is the bare ticket ID).
 *
 * Stack facts come from kit.config.json `guards` (repo-relative regex strings):
 *   guards.migrationPaths  default ["^<api>/migrations/"]
 *   guards.manifests       default ["^(<api>/|<web>/)?package\\.json$"]
 * A JSON manifest gates only when its dependency maps change (scripts edits pass);
 * any other manifest gates on any change.
 */
const fs = require('fs');
const path = require('path');
const {
  readPayload, decide, existingDir, kitRoot, loadConfig, mainCheckout, toplevel, repoRelative, ticketFromBranch, regexes,
} = require('./lib/hook-io.cjs');

const INSTALL = /^(npm\s+(install|i|add)|yarn\s+add|pnpm\s+(add|install|i))\s+(.*)$/;

function guards(config) {
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const api = esc(config.workspaces?.api || 'api');
  const web = esc(config.workspaces?.web || 'web');
  const g = config.guards || {};
  return {
    migrations: regexes(g.migrationPaths || [`^${api}/migrations/`]),
    manifests: regexes(g.manifests || [`^(${api}/|${web}/)?package\\.json$`]),
  };
}

function hasApproval(cwd, config, ticket) {
  const root = path.join(kitRoot(cwd) || mainCheckout(toplevel(cwd) || cwd), config.docsDir || '.claude/docs/ai');
  const walk = (dir, depth) => {
    if (depth > 3 || !fs.existsSync(dir)) return false;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(dir, e.name);
      if (e.name.toUpperCase() === ticket && fs.existsSync(path.join(p, 'g0-approved.md'))) return true;
      if (walk(p, depth + 1)) return true;
    }
    return false;
  };
  return walk(root, 0);
}

function gate(cwd, config, rule, what) {
  const ticket = ticketFromBranch(cwd, config);
  if (ticket && hasApproval(cwd, config, ticket)) process.exit(0);
  const docs = config.docsDir || '.claude/docs/ai';
  decide(
    'deny',
    `g0-gate: ${what} needs a G0 approval first (team-rules §${rule}). ` +
      (ticket
        ? `Record the proposal (what / why / risk) on ${ticket} with \`node .claude/skills/_lib/ticket.mjs comment\`, wait for the Tech Lead's confirmation, then confirm the pipeline's G0 gate — it writes ${docs}/…/${ticket}/g0-approved.md in the main checkout.`
        : `The branch name has no ${config.ticketPrefix || '<ticketPrefix>'}-<n> ticket ID, so the approval record cannot be found. Work on the ticket branch (team-rules §D1).`),
  );
}

function deps(text) {
  try {
    const j = JSON.parse(text);
    return JSON.stringify([j.dependencies, j.devDependencies, j.peerDependencies, j.optionalDependencies]);
  } catch (_e) {
    return text;
  }
}

const input = readPayload();
const tool = input.tool_name;
const ti = input.tool_input || {};

if (tool === 'Bash') {
  let dir = input.cwd || process.cwd();
  for (const raw of String(ti.command || '').split(/&&|;|\|\||\n/)) {
    const seg = raw.trim();
    const cd = seg.match(/^cd\s+(['"]?)([^'"]+)\1$/);
    if (cd) dir = path.resolve(dir, cd[2].replace(/^~/, process.env.HOME || '~'));
    const m = seg.match(INSTALL);
    if (!m) continue;
    const where = repoRelative(path.join(dir, 'x')) || '';
    if (where.startsWith('.claude/')) continue; // kit tooling (e.g. e2e Playwright), not product code
    const pkgs = m[4].split(/\s+/).filter((a) => a && !a.startsWith('-'));
    if (pkgs.length) gate(dir, loadConfig(dir), 'B5', `Installing ${pkgs.join(', ')}`);
  }
  process.exit(0);
}

if (!['Write', 'Edit', 'MultiEdit'].includes(tool) || !ti.file_path) process.exit(0);
const rel = repoRelative(ti.file_path);
if (!rel) process.exit(0);
const cwd = existingDir(ti.file_path);
const config = loadConfig(cwd);
const g = guards(config);

if (g.migrations.some((rx) => rx.test(rel))) gate(cwd, config, 'S5', `Writing migration ${path.basename(rel)}`);

if (g.manifests.some((rx) => rx.test(rel))) {
  const before = fs.existsSync(ti.file_path) ? fs.readFileSync(ti.file_path, 'utf-8') : '';
  let after = before;
  if (tool === 'Write') after = ti.content || '';
  const edits = tool === 'MultiEdit' ? ti.edits || [] : tool === 'Edit' ? [ti] : [];
  for (const e of edits) after = e.replace_all ? after.split(e.old_string).join(e.new_string) : after.replace(e.old_string, () => e.new_string);
  if (deps(before) !== deps(after)) gate(cwd, config, 'B5', `Changing dependencies in ${rel}`);
}
process.exit(0);
