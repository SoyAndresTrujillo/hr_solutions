#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write|MultiEdit): per-customer / per-org behaviour goes through
 * the project's customization mechanism (CLAUDE.md §Customization), never an
 * inline id or name literal. Flags only lines this change added (lib/diff-lines.cjs;
 * a brand-new file is scanned whole), in product code — skips .claude/, tests,
 * fixtures, seeders and the migration paths (those legitimately name records).
 *
 * Patterns come from kit.config.json:
 *   guards.forbiddenLiterals: [{ "pattern": "<regex>", "message": "<why / what to use instead>" }]
 * Default [] — the hook is a no-op until the project lists patterns.
 */
const fs = require('fs');
const { getChangedLineRanges, inRange } = require('./lib/diff-lines.cjs');
const { readPayload, repoRelative, existingDir, loadConfig, regexes } = require('./lib/hook-io.cjs');

const SKIP = /(^\.claude\/|\.(spec|test)\.[\w]+$|(^|\/)(__tests__|__mocks__|fixtures|seeders?|seeds?|migrations)\/)/;

const input = readPayload();
const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);
const config = loadConfig(existingDir(filePath));
const rules = (config.guards?.forbiddenLiterals || [])
  .map((r) => ({ rx: regexes([r.pattern])[0], message: r.message || `matches ${r.pattern}` }))
  .filter((r) => r.rx);
if (!rules.length) process.exit(0);

const rel = repoRelative(filePath);
if (!rel || SKIP.test(rel) || regexes(config.guards?.migrationPaths).some((rx) => rx.test(rel))) process.exit(0);

let body;
try {
  body = fs.readFileSync(filePath, 'utf-8');
} catch (_e) {
  process.exit(0);
}
const ranges = getChangedLineRanges(filePath);
if (Array.isArray(ranges) && ranges.length === 0) process.exit(0);

const hits = [];
body.split('\n').forEach((line, idx) => {
  const ln = idx + 1;
  const t = line.trim();
  if (!inRange(ln, ranges) || t.startsWith('//') || t.startsWith('*') || t.startsWith('#')) return;
  for (const { rx, message } of rules) if (rx.test(line)) hits.push(`  L${ln} ${message}: ${t}`);
});
if (!hits.length) process.exit(0);

console.error(
  [
    `no-customer-literals hook: hardcoded customer/org check in YOUR changes to ${rel}`,
    ...hits,
    '',
    'Route per-customer behaviour through the mechanism in CLAUDE.md §Customization (a flag or setting),',
    'never an inline id or name. Replace the literal with the flag and retry.',
  ].join('\n'),
);
process.exit(2);
