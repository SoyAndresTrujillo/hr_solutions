#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write|MultiEdit): while /fix Step 4 holds the test lock,
 * the agent fixing the code cannot weaken the tests that check it.
 *
 * Lock file: <checkout>/.claude/state/test-lock.json (the ticket worktree), written
 * by /fix Step 4 after the regression test failed on pre-patch code, removed when
 * the fast gate is green. Shape: { "ticket": "<ID>", "allow": ["<repo-relative spec>"], "created": "<ISO>" }.
 *
 * ponytail: guards the edit tools only; `sed -i` on a spec through Bash is not
 * seen. Review still rejects test edits in a fix PR. Test-file pattern is the
 * JS/TS one; add a guards key when a second stack lands.
 */
const fs = require('fs');
const path = require('path');
const { readPayload, decide, existingDir, toplevel, repoRelative } = require('./lib/hook-io.cjs');

const TEST_FILE = /\.(spec|test)\.[cm]?[jt]sx?$/;

const input = readPayload();
const filePath = input.tool_input?.file_path;
if (!filePath || !TEST_FILE.test(filePath)) process.exit(0);

const top = toplevel(existingDir(filePath));
const lockPath = top && path.join(top, '.claude', 'state', 'test-lock.json');
if (!lockPath || !fs.existsSync(lockPath)) process.exit(0);

let lock = {};
try {
  lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
} catch (_e) {
  // A broken lock still locks.
}
const rel = repoRelative(filePath);
if ((lock.allow || []).includes(rel)) process.exit(0);

decide(
  'deny',
  `test-lock: ${lock.ticket || 'a /fix run'} is in its patch step, so test files are locked — fix the code, not the test. ` +
    `Only ${(lock.allow || []).join(', ') || 'no file'} may change. ` +
    `If a test truly must change, stop and return to the root-cause step; the lock is removed at ${path.relative(top, lockPath)} when the fast gate is green.`,
);
