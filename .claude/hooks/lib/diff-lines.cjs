/**
 * Line ranges a file's working tree changed vs HEAD, so PostToolUse hooks only
 * flag lines OUR change added. Shared by no-any-casts.cjs and no-customer-literals.cjs.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const run = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });

/**
 * Returns [startLine, endLine] inclusive ranges in the NEW file:
 *   - []   when the file matches HEAD (no diff)
 *   - null for a brand-new (untracked) file or on git failure → caller scans the whole file
 */
function getChangedLineRanges(filePath) {
  try {
    const real = fs.realpathSync(filePath);
    const repoRoot = run(['rev-parse', '--show-toplevel'], path.dirname(real)).trim();
    const rel = path.relative(fs.realpathSync(repoRoot), real).replace(/\\/g, '/');
    const diff = run(['diff', '-U0', 'HEAD', '--', rel], repoRoot);
    if (!diff.trim()) {
      // Tracked and unchanged, or untracked (new file) — tell the two apart.
      return run(['ls-files', '--', rel], repoRoot).trim() ? [] : null;
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

module.exports = { getChangedLineRanges, inRange };
