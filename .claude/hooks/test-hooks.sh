#!/bin/bash
# Self-check for the kit's Claude Code hooks. Feeds fixed payloads to each hook and
# asserts the verdict. Run after any hook change:
#   bash .claude/hooks/test-hooks.sh
# Builds a throwaway kit project (git repo + .claude/kit.config.json) in a temp dir;
# touches nothing in the real project. Needs node and git; gh is faked.
set -u
HOOKS="$(cd "$(dirname "$0")" && pwd)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
pass=0; fail=0

# verdict <hook> <json>  -> deny | ask | allow | block(exit 2) | note
verdict() {
  local out code
  out=$(printf '%s' "$2" | PATH="$T/bin:$PATH" node "$HOOKS/$1" 2>/dev/null); code=$?
  if [ $code -eq 2 ]; then echo block; return; fi
  case "$out" in
    *'"permissionDecision":"deny"'*) echo deny ;;
    *'"permissionDecision":"ask"'*) echo ask ;;
    *additionalContext*) echo note ;;
    *) echo allow ;;
  esac
}
expect() { # expect <want> <label> <hook> <json>
  local got; got=$(verdict "$3" "$4")
  if [ "$got" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL $2: want $1, got $got"; fi
}
bash_json() { node -e 'process.stdout.write(JSON.stringify({tool_name:"Bash",cwd:process.argv[2],tool_input:{command:process.argv[1]}}))' "$1" "${2:-$T/repo}"; }
file_json() { node -e 'const [t,f,c]=process.argv.slice(1);process.stdout.write(JSON.stringify({tool_name:t,tool_input:t==="Write"?{file_path:f,content:c}:{file_path:f,old_string:c.split("|||")[0],new_string:c.split("|||")[1]}}))' "$1" "$2" "${3:-}"; }

# --- throwaway kit project on a ticket branch ------------------------------
R="$T/repo"; mkdir -p "$R/.claude/skills/e2e" "$R/api/migrations" "$R/api/src/x" "$R/web"
( cd "$R" && git init -q -b KIT-1 && git config user.email t@t && git config user.name t
  cat > .claude/kit.config.json <<'CFG'
{
  "ticketPrefix": "KIT",
  "docsDir": ".claude/docs/ai",
  "workspaces": { "api": "api", "web": "web" },
  "techLead": { "name": null, "github": null },
  "guards": {
    "forbiddenLiterals": [
      { "pattern": "\\borgId\\s*[!=]==?\\s*\\d+", "message": "org id compared to a literal" }
    ]
  }
}
CFG
  printf 'export const a = 1;\n' > api/src/x/a.ts
  printf '{\n  "name": "api",\n  "scripts": { "start": "node x" },\n  "dependencies": { "x": "1.0.0" }\n}\n' > api/package.json
  printf '# team\n' > CLAUDE.md
  printf '.claude/docs/\n.claude/worktrees/\n.claude/state/\n' > .gitignore
  git add -A && git commit -qm init )

# --- secrets-guard ----------------------------------------------------------
expect deny  "cat .env"                 secrets-guard.cjs "$(bash_json 'cat api/.env')"
expect deny  "cat .env.production"      secrets-guard.cjs "$(bash_json 'cat api/.env.production')"
expect deny  "head .secrets"            secrets-guard.cjs "$(bash_json 'head -5 .secrets')"
expect deny  "cat key.pem"              secrets-guard.cjs "$(bash_json 'cat certs/key.pem')"
expect deny  "grep value from .env"     secrets-guard.cjs "$(bash_json 'cd api && grep -oE "^#? *E2E_PASSWORD=.*" .env | sed -E "s/x//"')"
expect deny  "echo \$(cat .env)"        secrets-guard.cjs "$(bash_json 'echo $(cat .env)')"
expect allow "key names only"           secrets-guard.cjs "$(bash_json 'grep -oE "^#? *[A-Z_0-9]+=" .env | tr -d "# " | sort -u')"
expect allow "set -a source"            secrets-guard.cjs "$(bash_json 'set -a; . ./api/.env; set +a')"
expect allow "capture into var"         secrets-guard.cjs "$(bash_json 'export E2E_EMAIL=$(grep -oE "^E2E_EMAIL=.*" api/.env | sed -E "s/^[^=]+=//")')"
expect allow ".env.example"             secrets-guard.cjs "$(bash_json 'cat api/.env.example')"
expect allow "unrelated"                secrets-guard.cjs "$(bash_json 'git status')"

# --- outward-gate (fake gh for merge state) ----------------------------------
mkdir -p "$T/bin"
cat > "$T/bin/gh" <<'GH'
#!/bin/bash
if [ -n "${FAKE_PR:-}" ]; then echo "$FAKE_PR"; else echo '{"number":1,"title":"fix(KIT-1): x","reviewDecision":"","statusCheckRollup":[],"baseRefName":"main"}'; fi
GH
chmod +x "$T/bin/gh"
expect ask   "git push"                 outward-gate.cjs "$(bash_json 'git push -u origin KIT-1')"
expect ask   "git push tag"             outward-gate.cjs "$(bash_json 'git push origin 20261023-P1')"
expect ask   "gh pr create"             outward-gate.cjs "$(bash_json 'gh pr create --title x --body y')"
expect ask   "gh pr comment"            outward-gate.cjs "$(bash_json 'gh pr comment 12 --body-file f.md')"
expect ask   "gh pr review"             outward-gate.cjs "$(bash_json 'gh pr review 12 --approve')"
expect ask   "gh api POST"              outward-gate.cjs "$(bash_json 'gh api repos/o/r/issues/1/comments -f body=x')"
expect allow "gh api GET"               outward-gate.cjs "$(bash_json 'gh api repos/o/r/pulls/1 --jq .title')"
expect ask   "gh workflow run"          outward-gate.cjs "$(bash_json 'gh workflow run deploy.yml -f tag=x')"
expect ask   "gh run rerun"             outward-gate.cjs "$(bash_json 'gh run rerun 123 --failed')"
expect ask   "gh release create"        outward-gate.cjs "$(bash_json 'gh release create v1.2.0')"
expect allow "ticket.mjs is local"      outward-gate.cjs "$(bash_json 'node .claude/skills/_lib/ticket.mjs comment KIT-1 f.md')"
expect allow "gh pr view"               outward-gate.cjs "$(bash_json 'gh pr view 12 --json state')"
expect ask   "merge fix pr"             outward-gate.cjs "$(bash_json 'gh pr merge 1 --squash')"
export FAKE_PR='{"number":1,"title":"feat(KIT-1): x","reviewDecision":"REVIEW_REQUIRED","statusCheckRollup":[]}'
expect ask   "merge feat, no approval"  outward-gate.cjs "$(bash_json 'gh pr merge 1 --squash')"
export FAKE_PR='{"number":1,"title":"feat(KIT-1): x","reviewDecision":"CHANGES_REQUESTED","statusCheckRollup":[]}'
expect deny  "merge changes requested"  outward-gate.cjs "$(bash_json 'gh pr merge 1 --squash')"
unset FAKE_PR

# --- g0-gate (defaults derived from workspaces; record under docsDir) ---------
MIG="$R/api/migrations/20990101000000-x.js"
expect deny  "migration without G0"     g0-gate.cjs "$(file_json Write "$MIG" 'module.exports = {};')"
expect deny  "npm install pkg"          g0-gate.cjs "$(bash_json "cd $R/api && npm install left-pad")"
expect deny  "pnpm add pkg"             g0-gate.cjs "$(bash_json "pnpm add -D left-pad")"
expect allow "npm ci"                   g0-gate.cjs "$(bash_json "cd $R/api && npm ci")"
expect allow "npm i in .claude tooling" g0-gate.cjs "$(bash_json "cd $R/.claude/skills/e2e && npm i playwright")"
expect deny  "add dependency"           g0-gate.cjs "$(file_json Edit "$R/api/package.json" '"x": "1.0.0"|||"x": "1.0.0", "y": "2.0.0"')"
expect allow "edit scripts only"        g0-gate.cjs "$(file_json Edit "$R/api/package.json" '"node x"|||"node x --watch"')"
expect allow "non-migration source"     g0-gate.cjs "$(file_json Write "$R/api/src/x/b.ts" 'export {};')"
mkdir -p "$R/.claude/docs/ai/KIT-0/KIT-1" && echo ok > "$R/.claude/docs/ai/KIT-0/KIT-1/g0-approved.md"
expect allow "migration with G0"        g0-gate.cjs "$(file_json Write "$MIG" 'module.exports = {};')"
# worktree: record is read from the MAIN checkout's docsDir
W="$R/.claude/worktrees/KIT-2"
( cd "$R" && git worktree add -q "$W" -b KIT-2 )
expect deny  "worktree migration no G0" g0-gate.cjs "$(file_json Write "$W/api/migrations/20990102000000-y.js" 'module.exports = {};')"
mkdir -p "$R/.claude/docs/ai/KIT-2" && echo ok > "$R/.claude/docs/ai/KIT-2/g0-approved.md"
expect allow "worktree migration w/ G0" g0-gate.cjs "$(file_json Write "$W/api/migrations/20990102000000-y.js" 'module.exports = {};')"

# --- no-customer-literals (PostToolUse: file must exist with the change) ------
printf 'export const a = 1;\nif (orgId === 18) { run(); }\n' > "$R/api/src/x/a.ts"
expect block "orgId === 18"             no-customer-literals.cjs "$(file_json Edit "$R/api/src/x/a.ts" 'x|||y')"
printf 'export const a = 1;\nif (settings.enableX) { run(); }\n' > "$R/api/src/x/a.ts"
expect allow "flag check"               no-customer-literals.cjs "$(file_json Edit "$R/api/src/x/a.ts" 'x|||y')"
printf 'it("x", () => { if (orgId === 18) {} });\n' > "$R/api/src/x/a.test.ts"
expect allow "test file skipped"        no-customer-literals.cjs "$(file_json Write "$R/api/src/x/a.test.ts" '')"
printf 'if (orgId === 18) {}\n' > "$R/api/migrations/20990103000000-z.js"
expect allow "migration skipped"        no-customer-literals.cjs "$(file_json Write "$R/api/migrations/20990103000000-z.js" '')"
printf 'if (orgId === 18) {}\n' > "$W/api/src/x/c.ts"
expect block "worktree reads config"    no-customer-literals.cjs "$(file_json Write "$W/api/src/x/c.ts" '')"
N="$T/plain"; mkdir -p "$N" && ( cd "$N" && git init -q ) && printf 'if (orgId === 18) {}\n' > "$N/c.ts"
expect allow "no patterns = no-op"      no-customer-literals.cjs "$(file_json Write "$N/c.ts" '')"
( cd "$R" && git checkout -q -- api/src/x/a.ts && rm -f api/src/x/a.test.ts api/migrations/20990103000000-z.js )

# --- no-any-casts (shared diff helper) ----------------------------------------
printf 'const b = x as any;\n' > "$R/api/src/x/new.ts"
expect block "as any in new file"       no-any-casts.cjs "$(file_json Write "$R/api/src/x/new.ts" '')"
printf 'export const a = 1;\nconst c: number = 2;\n' > "$R/api/src/x/a.ts"
expect allow "clean change"             no-any-casts.cjs "$(file_json Edit "$R/api/src/x/a.ts" 'x|||y')"
printf 'export const a = 1;\nconst d = y as unknown;\n' > "$R/api/src/x/a.ts"
expect block "as unknown in edit"       no-any-casts.cjs "$(file_json Edit "$R/api/src/x/a.ts" 'x|||y')"
printf 'const rx = "as any";\n' > "$R/.claude/skills/tool.js"
expect allow ".claude script skipped"   no-any-casts.cjs "$(file_json Write "$R/.claude/skills/tool.js" '')"
( cd "$R" && git checkout -q -- api/src/x/a.ts && rm -f api/src/x/new.ts )

# --- test-lock ----------------------------------------------------------------
mkdir -p "$R/.claude/state"
echo '{"ticket":"KIT-1","allow":["api/src/x/a.test.ts"]}' > "$R/.claude/state/test-lock.json"
expect deny  "other spec while locked"  test-lock.cjs "$(file_json Edit "$R/api/src/x/b.test.ts" 'a|||b')"
expect allow "regression spec allowed"  test-lock.cjs "$(file_json Edit "$R/api/src/x/a.test.ts" 'a|||b')"
expect allow "source file allowed"      test-lock.cjs "$(file_json Edit "$R/api/src/x/a.ts" 'a|||b')"
expect allow "other checkout unlocked"  test-lock.cjs "$(file_json Edit "$W/api/src/x/b.test.ts" 'a|||b')"
rm "$R/.claude/state/test-lock.json"
expect allow "no lock"                  test-lock.cjs "$(file_json Edit "$R/api/src/x/b.test.ts" 'a|||b')"

# --- config-change-reminder ---------------------------------------------------
expect note  "CLAUDE.md edit"           config-change-reminder.cjs "$(file_json Edit "$R/CLAUDE.md" 'a|||b')"
expect note  "skill edit"               config-change-reminder.cjs "$(file_json Edit "$R/.claude/skills/x/SKILL.md" 'a|||b')"
expect allow "e2e node_modules"         config-change-reminder.cjs "$(file_json Edit "$R/.claude/skills/e2e/node_modules/p/x.js" 'a|||b')"
expect allow "product edit"             config-change-reminder.cjs "$(file_json Edit "$R/api/src/x/a.ts" 'a|||b')"

echo "hooks self-check: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
