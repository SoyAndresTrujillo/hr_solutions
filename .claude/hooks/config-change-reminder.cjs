#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write|MultiEdit): a change to anything that steers the
 * agent (CLAUDE.md, kit config, skills, agents, hooks, rules, stack profile,
 * settings, REVIEW.md) is regression-tested by the eval suite. Reminds; never blocks.
 */
const { readPayload, note, repoRelative } = require('./lib/hook-io.cjs');

const CONFIG = /^(CLAUDE\.md|\.claude\/(REVIEW\.md|settings\.json|kit\.config\.json|skills\/|agents\/|hooks\/|rules\/|stacks\/))/;

const input = readPayload();
const filePath = input.tool_input?.file_path;
const rel = filePath && repoRelative(filePath);
if (!rel || !CONFIG.test(rel) || rel.includes('/node_modules/')) process.exit(0);

note(`Agent configuration changed (${rel}). Run /eval-config before relying on it, and record the result.`);
