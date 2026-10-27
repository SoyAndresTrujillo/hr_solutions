/**
 * Shared plumbing for the kit's Claude Code hooks: read the hook payload, emit a
 * PreToolUse decision, resolve checkout / main checkout / ticket, and load
 * .claude/kit.config.json. Node stdlib only.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function readPayload() {
  try {
    const raw = fs.readFileSync(0, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (_e) {
    return {};
  }
}

/** PreToolUse verdict. `deny` reasons go to Claude, `ask` reasons to the person. */
function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** PostToolUse note that Claude reads without the action being blocked. */
function note(text) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text },
    }),
  );
  process.exit(0);
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (_e) {
    return '';
  }
}

/** Absolute path with symlinks resolved (macOS /var -> /private/var), even if it does not exist yet. */
function realPath(p) {
  let dir = path.resolve(p);
  const tail = [];
  while (!fs.existsSync(dir) && dir !== path.dirname(dir)) {
    tail.unshift(path.basename(dir));
    dir = path.dirname(dir);
  }
  return path.join(fs.realpathSync(dir), ...tail);
}

/** Nearest existing directory for a path that may not exist yet (a new file). */
function existingDir(p) {
  let dir = path.dirname(realPath(p));
  while (!fs.existsSync(dir) && dir !== path.dirname(dir)) dir = path.dirname(dir);
  return dir;
}

/** Checkout the path belongs to: the main checkout or a ticket worktree. */
function toplevel(cwd) {
  return git(['rev-parse', '--show-toplevel'], cwd);
}

/**
 * Same rule as skills/_lib/config.mjs: inside a worktree `.git` is a FILE
 * "gitdir: <main>/.git/worktrees/<name>"; resolve it to <main>.
 */
function mainCheckout(dir) {
  const dotGit = path.join(dir, '.git');
  if (!fs.existsSync(dotGit) || fs.statSync(dotGit).isDirectory()) return dir;
  const m = fs.readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)$/m);
  if (!m) return dir;
  const gitdir = path.resolve(dir, m[1].trim());
  return path.basename(path.dirname(gitdir)) === 'worktrees' ? path.dirname(path.dirname(path.dirname(gitdir))) : dir;
}

/** Main checkout holding .claude/kit.config.json (and <docsDir>), or null outside a kit project. */
function kitRoot(cwd) {
  let dir = realPath(cwd || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, '.claude', 'kit.config.json'))) return mainCheckout(dir);
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/** kit.config.json as an object; {} when missing or unreadable (hooks degrade, never crash). */
function loadConfig(cwd) {
  const root = kitRoot(cwd);
  if (!root) return {};
  try {
    return JSON.parse(fs.readFileSync(path.join(root, '.claude', 'kit.config.json'), 'utf8'));
  } catch (_e) {
    return {};
  }
}

/** Path relative to its checkout, or null outside a repo. */
function repoRelative(filePath) {
  const top = toplevel(existingDir(filePath));
  return top ? path.relative(realPath(top), realPath(filePath)).replace(/\\/g, '/') : null;
}

/** Branch name is the bare ticket ID (team-rules §D1); null when it has none. */
function ticketFromBranch(cwd, config) {
  const prefix = ((config || loadConfig(cwd)).ticketPrefix || '[A-Z][A-Z0-9]*').replace(/[^\w[\]-]/g, '');
  const m = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd).match(new RegExp(`\\b${prefix}-\\d+\\b`, 'i'));
  return m ? m[0].toUpperCase() : null;
}

/** Split a shell command into its simple commands (;, &&, ||, |, newline). */
function segments(command) {
  return String(command || '')
    .split(/\|\||&&|;|\||\n/)
    .map((s) => s.trim().replace(/^(\w+=\S*\s+)+/, '')) // drop leading VAR=value
    .filter(Boolean);
}

/** Compile config regex strings; a bad pattern is skipped, not fatal. */
function regexes(list, flags) {
  return (list || []).flatMap((s) => {
    try {
      return [new RegExp(s, flags)];
    } catch (_e) {
      return [];
    }
  });
}

module.exports = {
  readPayload,
  decide,
  note,
  git,
  realPath,
  existingDir,
  toplevel,
  mainCheckout,
  kitRoot,
  loadConfig,
  repoRelative,
  ticketFromBranch,
  segments,
  regexes,
};
