#!/usr/bin/env node
/**
 * PreToolUse (Bash): outward-facing commands need the person's confirmation
 * (team-rules §D2). Pushes (branches and tags), PR create/comment/review/merge,
 * releases, workflow runs and gh api writes -> `ask`. A merge with changes
 * requested -> `deny`.
 *
 * Merge rule (team-rules §C3): fix PRs merge on green CI plus the user's
 * go-ahead; any other type needs Tech Lead approval (`techLead` in
 * kit.config.json; null = the user). A missing approval is reported in the
 * `ask`, never denied — the person decides.
 *
 * Not gated: `_lib/ticket.mjs` (tickets are local files).
 */
const { execFileSync } = require('child_process');
const { readPayload, decide, segments, git, loadConfig } = require('./lib/hook-io.cjs');

const input = readPayload();
if (input.tool_name !== 'Bash') process.exit(0);
const command = String(input.tool_input?.command || '');
const cwd = input.cwd || process.cwd();

function prState(numberArg) {
  try {
    const args = ['pr', 'view', ...(numberArg ? [numberArg] : []), '--json', 'title,reviewDecision,statusCheckRollup,number,baseRefName'];
    return JSON.parse(execFileSync('gh', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }));
  } catch (_e) {
    return null;
  }
}

function mergeVerdict(seg) {
  const num = (seg.match(/\bgh\s+pr\s+merge\s+(\d+|https:\S+)/) || [])[1];
  const pr = prState(num);
  if (!pr) return ['ask', 'Merges a PR. Could not read its review/CI state with gh — confirm it is approved and green.'];
  const checks = pr.statusCheckRollup || [];
  const bad = checks
    .filter((c) => ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR'].includes(c.conclusion || c.state))
    .map((c) => c.name || c.context);
  const pending = checks.filter((c) => (c.status && c.status !== 'COMPLETED') || c.state === 'PENDING').map((c) => c.name || c.context);
  const kind = (String(pr.title || '').match(/^(\w+)\(/) || [])[1] || 'unknown';
  if (pr.reviewDecision === 'CHANGES_REQUESTED') {
    return ['deny', `PR #${pr.number} has changes requested. Address the review (/address-review) and get a new approval before merging.`];
  }
  const lead = loadConfig(cwd).techLead?.name || 'the user (techLead is null)';
  const lines = [`Merges PR #${pr.number} (${kind}) into ${pr.baseRefName || 'the base branch'}.`];
  lines.push(
    `Review: ${pr.reviewDecision || 'none'}` +
      (['fix', 'chore'].includes(kind) ? ` (${kind} PRs need no Tech Lead approval — team-rules §C3).` : ` (${kind} needs approval from ${lead} — team-rules §C3).`),
  );
  if (bad.length) lines.push(`Failing checks: ${bad.join(', ')} — confirm none of them is the real CI.`);
  if (pending.length) lines.push(`Still running: ${pending.join(', ')}.`);
  return ['ask', lines.join(' ')];
}

const reasons = [];
for (const seg of segments(command)) {
  if (/^git\s+push\b/.test(seg)) {
    reasons.push(
      /\s(--force\S*|-f)\b/.test(seg)
        ? 'Force-pushes to the remote.'
        : /--tags|--follow-tags|refs\/tags\/|\s\d{8}-\w+|\sv?\d+\.\d+/.test(seg)
          ? 'Pushes a tag (starts a release line).'
          : 'Pushes to the remote.',
    );
  } else if (/^gh\s+pr\s+merge\b/.test(seg)) {
    const [d, r] = mergeVerdict(seg);
    if (d === 'deny') decide('deny', r);
    reasons.push(r);
  } else if (/^gh\s+pr\s+(create|comment|review|close|edit|ready|reopen)\b/.test(seg)) {
    reasons.push(`Changes a pull request on GitHub (gh pr ${seg.split(/\s+/)[2]}).`);
  } else if (/^gh\s+api\b/.test(seg) && /(-X\s*(POST|PATCH|PUT|DELETE)|--method\s+(POST|PATCH|PUT|DELETE)|\s-[fF]\s|--field|--raw-field|--input)/.test(seg)) {
    reasons.push('Writes to GitHub through gh api.');
  } else if (/^gh\s+(workflow\s+run|release\s+(create|edit|delete|upload)|run\s+rerun)\b/.test(seg)) {
    reasons.push('Starts a workflow, deployment or release on GitHub.');
  }
}
if (reasons.length) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  decide('ask', `Outward-facing action${branch ? ` from ${branch}` : ''}: ${reasons.join(' ')} Approve only if the user asked for it in this request (team-rules §D2).`);
}
process.exit(0);
