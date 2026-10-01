// Loads .claude/kit.config.json from the nearest ancestor of cwd. Shared by every kit script.
import fs from 'node:fs';
import path from 'node:path';

// Inside a git worktree, `.git` is a file "gitdir: <main>/.git/worktrees/<name>". Resolve to the main
// checkout so tickets and docs stay one copy, not one per worktree.
function mainCheckout(dir) {
  const git = path.join(dir, '.git');
  if (!fs.existsSync(git) || fs.statSync(git).isDirectory()) return dir;
  const m = fs.readFileSync(git, 'utf8').match(/^gitdir:\s*(.+)$/m);
  if (!m) return dir;
  const gitdir = path.resolve(dir, m[1].trim());
  return path.basename(path.dirname(gitdir)) === 'worktrees' ? path.dirname(path.dirname(path.dirname(gitdir))) : dir;
}

export function findRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.claude', 'kit.config.json'))) return mainCheckout(dir);
    const up = path.dirname(dir);
    if (up === dir) {
      console.error('kit.config.json not found: run agent-kit/install.sh <project> first.');
      process.exit(2);
    }
    dir = up;
  }
}

export function loadConfig(start) {
  const root = findRoot(start);
  const config = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'kit.config.json'), 'utf8'));
  return { root, config };
}

// Minimal KEY=value reader for .env files; real env vars win.
export function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return { ...out, ...process.env };
}
