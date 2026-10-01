#!/bin/sh
# collect.sh — evidence pack for /review-implementation.
# Usage: collect.sh [commit-range]   (default: <git.mainBranch>...HEAD)
# Prints: changed files by area, diffstat, and the silent-failure WARNINGS.
# Reads workspaces.api / workspaces.web / git.mainBranch from .claude/kit.config.json
# (node, else jq); defaults api / web / main.
set -eu

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) ||
  { echo "collect.sh: run me from inside a git repo" >&2; exit 1; }
cd "$ROOT"

CFG=.claude/kit.config.json
CONF=
if [ -f "$CFG" ] && command -v node >/dev/null 2>&1; then
  CONF=$(node -e 'const c=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const w=c.workspaces||{};console.log([w.api,w.web,(c.git||{}).mainBranch].map(v=>v||"").join("\n"))' "$CFG" 2>/dev/null) || CONF=
elif [ -f "$CFG" ] && command -v jq >/dev/null 2>&1; then
  CONF=$(jq -r '.workspaces.api // "", .workspaces.web // "", .git.mainBranch // ""' "$CFG" 2>/dev/null) || CONF=
fi
API=$(printf '%s\n' "$CONF" | sed -n 1p); API=${API:-api}
WEB=$(printf '%s\n' "$CONF" | sed -n 2p); WEB=${WEB:-web}
MAIN=$(printf '%s\n' "$CONF" | sed -n 3p); MAIN=${MAIN:-main}

RANGE="${1:-$MAIN...HEAD}"

FILES=$(git diff --name-only "$RANGE")
if [ -z "$FILES" ]; then
  printf 'range: %s\n(no changed files)\n' "$RANGE"
  exit 0
fi
ADDED=$(git diff --name-only --diff-filter=A "$RANGE")
IFS='
'

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

is_test() {
  case "$1" in *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*/__tests__/*|*/e2e/*) return 0 ;; esac
  return 1
}

for f in $FILES; do
  if is_test "$f"; then b=tests
  else
    case "$f" in
      */migrations/*|migrations/*) b=migrations ;;
      *.md)                         b=docs ;;
      "$API"/*)                     b=api ;;
      "$WEB"/*)                     b=web ;;
      *)                            b=other ;;
    esac
  fi
  echo "$f" >> "$TMP/$b"
done

printf '== %s == %s files (api=%s web=%s)\n' "$RANGE" "$(echo "$FILES" | wc -l | tr -d ' ')" "$API" "$WEB"
for b in api web migrations tests docs other; do
  [ -f "$TMP/$b" ] || continue
  printf '\n-- %s (%s) --\n' "$b" "$(wc -l < "$TMP/$b" | tr -d ' ')"
  cat "$TMP/$b"
done

printf '\n== diffstat ==\n'
git --no-pager diff --stat "$RANGE" | tail -20

# --- silent-failure surfaces: see SKILL.md "Implemented but inert" ---
printf '\n== WARNINGS (read the body, do not trust the diff) ==\n'
W=0
warn() { printf '  [%s] %s\n        %s\n' "$1" "$2" "$3"; W=1; }
ENV_EXAMPLES=$(find . -name .env.example -not -path '*/node_modules/*')

for f in $FILES; do
  [ -f "$f" ] || continue
  is_test "$f" && continue

  case "$f" in
    *.schema.ts)
      warn SCHEMA "$f" "object schemas strip unknown keys silently — confirm the create AND update schema each declare every key the web sends (row 1)" ;;
  esac

  case "$f" in
    */migrations/*|migrations/*)
      if ! grep -qiE '(^|[^a-z])down([^a-z]|$)' "$f"; then
        warn MIGRATION "$f" "no down step found — team-rules S5 requires a working down (row 7)"
      fi
      if grep -qiE 'on conflict|do nothing|insert or ignore|skipDuplicates' "$f"; then
        warn SEED "$f" "insert-if-absent: a seed that hits an existing key exits 0 and writes nothing (row 7)"
      fi ;;
  esac

  case "$f" in
    *[Aa]uth*|*[Pp]ermission*|*[Rr]ole*|*[Ff]lag*|*[Gg]uard*|*[Pp]olicy*|*[Pp]olicies*)
      warn ACCESS "$f" "auth/permission/flag plumbing — is it applied to every route, and does the web default agree with the stored value? (rows 5, 6, 8)" ;;
  esac

  case "$f" in
    *.tsx)
      if grep -qE 'rules=|register\(|zodResolver|useForm\(' "$f" &&
         ! grep -qE 'onSubmit|handleSubmit|onFinish|validateFields|trigger\(' "$f"; then
        warn FORM "$f" "validation declared but no submit handler in this file — the rules may never run (row 4)"
      fi ;;
  esac

  case "$f" in
    "$API"/*.ts)
      if grep -qE 'select: *[{[]|\.select\(|attributes: *\[' "$f"; then
        warn SELECT "$f" "hand-maintained column list — diff it against every field the consumer reads (row 2)"
      fi ;;
  esac

  # env vars introduced by this diff but missing from every .env.example
  for v in $(git diff "$RANGE" -- "$f" | grep '^+' | grep -oE '(process\.env|import\.meta\.env)\.[A-Z_][A-Z0-9_]*' | sed 's/.*\.//' | sort -u); do
    if [ -z "$ENV_EXAMPLES" ] || ! grep -qs "^$v=" $ENV_EXAMPLES; then
      warn ENV "$f" "$v is read but not registered in any .env.example — team-rules B7 (row 11)"
    fi
  done
done

# new source files nothing imports: route not mounted, hook/component unused (rows 8, 9)
for f in $ADDED; do
  [ -f "$f" ] || continue
  is_test "$f" && continue
  case "$f" in "$API"/*.ts) ws=$API ;; "$WEB"/*.ts|"$WEB"/*.tsx) ws=$WEB ;; *) continue ;; esac
  name=$(basename "$f"); name=${name%.*}
  case "$name" in index|main|server|app|App|vite-env.d) continue ;; esac
  if [ -z "$(grep -rlsF --include='*.ts' --include='*.tsx' --exclude-dir=node_modules "$name" "$ws" | grep -vxF "$f")" ]; then
    warn UNUSED "$f" "new file with no importer in $ws — defined but never mounted or used (rows 8, 9)"
  fi
done

[ "$W" = 1 ] || echo '  (none)'
