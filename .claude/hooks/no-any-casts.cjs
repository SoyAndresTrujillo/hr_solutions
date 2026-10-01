#!/usr/bin/env node
/**
 * PostToolUse hook: enforce no `any`/`unknown`/`as never` casts in TS/TSX/JS/JSX
 * edits — but ONLY for OUR changes (lines in the working-tree diff vs HEAD).
 * Pre-existing violations in untouched parts of the same file do NOT block.
 *
 * Algorithm:
 *   1. Read tool_input.file_path from PostToolUse stdin envelope
 *   2. `git diff -U0 HEAD -- <file>` → parse hunk headers for new-file line ranges
 *   3. Scan full file, flag forbidden patterns only on lines inside those ranges
 *   4. If git unavailable (no repo, no HEAD yet) → fallback to scanning all
 *      so brand-new files still get checked
 *
 * Enforces team-rules §B10 (no any/unknown casts).
 * Triggers from .claude/settings.json (.cjs so a "type": "module" root package.json cannot break it):
 *   PostToolUse matcher = "Edit|Write"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FORBIDDEN_PATTERNS = [
  { rx: /\bas\s+any\b/, label: '`as any`' },
  { rx: /\bas\s+unknown\b/, label: '`as unknown`' },
  { rx: /\bas\s+never\b/, label: '`as never`' },
  { rx: /:\s*any\b(?!\s*=\s*['"`])/, label: '`: any` annotation' },
  { rx: /:\s*unknown\b/, label: '`: unknown` annotation' },
];

const TARGET_EXT = /\.(ts|tsx|js|jsx)$/;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch (_e) {
    return '';
  }
}

/**
 * Returns array of [startLine, endLine] inclusive ranges in the NEW file
 * that the working tree has changed vs HEAD. Returns:
 *   - []   when file matches HEAD (no diff)
 *   - null on git failure (caller should fallback to full scan)
 */
function getChangedLineRanges(filePath) {
  try {
    const repoRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    const diff = execSync(`git diff -U0 HEAD -- "${rel}"`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (!diff.trim()) {
      // File matches HEAD — nothing of ours to check.
      return [];
    }
    const ranges = [];
    const hunkRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
    let m;
    while ((m = hunkRe.exec(diff)) !== null) {
      const start = parseInt(m[1], 10);
      const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
      if (count === 0) continue; // pure deletion at this position
      ranges.push([start, start + count - 1]);
    }
    return ranges;
  } catch (_e) {
    return null;
  }
}

function inRange(ln, ranges) {
  if (ranges === null) return true; // fallback: scan all
  return ranges.some(([s, e]) => ln >= s && ln <= e);
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (_e) {
    process.exit(0);
  }

  const filePath =
    payload?.tool_input?.file_path ?? payload?.tool_input?.path ?? '';
  if (!filePath || !TARGET_EXT.test(filePath)) {
    process.exit(0);
  }

  let body;
  try {
    body = fs.readFileSync(filePath, 'utf-8');
  } catch (_e) {
    process.exit(0);
  }

  const ranges = getChangedLineRanges(filePath);

  // If file is committed and untouched, ranges === [] → nothing to check.
  if (Array.isArray(ranges) && ranges.length === 0) {
    process.exit(0);
  }

  const hits = [];
  body.split('\n').forEach((line, idx) => {
    const ln = idx + 1;
    if (!inRange(ln, ranges)) return;
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    FORBIDDEN_PATTERNS.forEach(({ rx, label }) => {
      if (rx.test(line))
        hits.push({ ln, label, snippet: line.trim() });
    });
  });

  if (hits.length === 0) {
    process.exit(0);
  }

  const scopeNote =
    ranges === null
      ? '(git diff unavailable — scanned whole file)'
      : '(scanned only your changed lines vs HEAD)';

  const message = [
    'no-any-casts hook: forbidden cast(s) in YOUR changes to ' + filePath,
    scopeNote,
    '',
    ...hits.map((h) => `  L${h.ln} ${h.label}: ${h.snippet}`),
    '',
    'Per team-rules §B10 (.claude/skills/_shared/team-rules.md):',
    '  - NO `any`, NO `unknown`, NO `as never` in code YOU write (including tests)',
    '  - Pre-existing violations in untouched parts of the same file are NOT flagged',
    '  - Use typed factories via `Object.assign(Object.create(Class.prototype), {...})`',
    '  - For test fixtures, see `Pick<Model, ...>` patterns',
    '  - Narrow `as Type` AFTER a runtime guard is acceptable; broad `as any`/`unknown` is not',
    '',
    'Patch the cast(s) above and retry.',
  ].join('\n');

  console.error(message);
  process.exit(2);
}

main();
