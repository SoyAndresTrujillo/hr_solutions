#!/usr/bin/env node
/**
 * PreToolUse (Bash): never print a secret file's values into the session.
 * Secret files: .env and .env.* (not .env.example / .sample / .template), .secrets, *.pem.
 *
 * Allowed: loading values into the shell (`source`, `. file`, `set -a; . ./.env`,
 * `VAR=$(...)`), kit scripts that read them internally (e2e/session.mjs via
 * _lib/config.mjs readEnv), and listing key NAMES only (`grep -o` with no `=.*` value part).
 * Denied: any other command that reads the file to stdout (cat, grep, sed, ...).
 *
 * ponytail: per-segment heuristic over the command text, not a shell parser;
 * `node -e "readFileSync('.env')"` slips through. Read-tool access is denied
 * separately by permissions.deny in .claude/settings.json.
 */
const { readPayload, decide } = require('./lib/hook-io.cjs');

const SECRET_FILE = /(^|[\s'"=<>/])(\.env(?!\.(example|sample|template)\b)(\.[\w-]+)*|\.secrets|[\w.-]+\.pem)(?=$|[\s'"|;&)>])/;
const PRINTERS = /^(sudo\s+)?(cat|bat|less|more|head|tail|grep|egrep|rg|ag|sed|awk|cut|sort|uniq|strings|xxd|od|base64|cp|scp|rsync|curl|nl|tac|diff|cmp|jq|tee|open|code)\b/;

const input = readPayload();
if (input.tool_name !== 'Bash') process.exit(0);
const command = String(input.tool_input?.command || '');
if (!SECRET_FILE.test(command)) process.exit(0);

for (const raw of command.split(/\|\||&&|;|\n/)) {
  const seg = raw.trim();
  if (!SECRET_FILE.test(seg)) continue;
  // `X=$(grep ... .env | sed ...)` loads the value into the shell; nothing prints.
  if (/^(export\s+)?[A-Za-z_][A-Za-z0-9_]*=\$\(/.test(seg)) continue;
  const stages = seg.split('|').map((s) => s.trim().replace(/^.*\$\(\s*/, ''));
  const reader = stages.find((s) => SECRET_FILE.test(s) || PRINTERS.test(s)) || '';
  if (!PRINTERS.test(reader) && !/\$\(\s*\w/.test(seg)) continue; // source / . / kit script
  const namesOnly = /^grep\b/.test(reader) && /\s-\w*o/.test(reader) && !/=\.[*+]/.test(reader);
  if (namesOnly) continue;
  decide(
    'deny',
    'secrets-guard: this command would print values from a secret file (.env / .secrets / *.pem) into the session. ' +
      'Load values without printing them: `source` the file (`set -a; . ./.env; set +a`), capture into a variable ' +
      '(`export X=$(grep ... .env | sed ...)`), or let the kit script read it (e2e/session.mjs). ' +
      'Key names only: `grep -oE "^#? *[A-Z_0-9]+=" .env`.',
  );
}
process.exit(0);
