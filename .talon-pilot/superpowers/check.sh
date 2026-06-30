#!/usr/bin/env bash
# check.sh — verify the integrity of the vendored superpowers v5.1.0 bundle.
#
# Run this from any working directory; it locates itself via $0.
# Exits 0 on success, non-zero with a printed diagnosis otherwise.
#
# Usage:
#   bash crates/pilot-api/assets/superpowers-v5/check.sh

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- expected constants (keep in sync with VENDORED.md) ----------------------
EXPECTED_VERSION="5.1.0"

# 14 canonical skill directory names.
EXPECTED_SKILLS=(
  brainstorming
  dispatching-parallel-agents
  executing-plans
  finishing-a-development-branch
  receiving-code-review
  requesting-code-review
  subagent-driven-development
  systematic-debugging
  test-driven-development
  using-git-worktrees
  using-superpowers
  verification-before-completion
  writing-plans
  writing-skills
)

# Anchor: sha256 of using-superpowers/SKILL.md as shipped in v5.1.0.
EXPECTED_USING_SUPERPOWERS_SHA256="316e29381219adf0cac62190c67aeabf427d6e6e5f2735541d502b3d339be7aa"

# --- helpers -----------------------------------------------------------------
fail() { echo "FAIL: $*" >&2; exit 1; }
ok()   { echo "ok:   $*"; }

sha256_of() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{print $1}'
  else
    fail "no sha256sum or shasum tool available"
  fi
}

# --- 1. structural checks ----------------------------------------------------
[[ -d "$DIR/skills" ]] || fail "missing skills/ at $DIR/skills"

actual_count=$(find "$DIR/skills" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
[[ "$actual_count" == "14" ]] || fail "expected 14 skills, found $actual_count"
ok "skills/ contains 14 directories"

for skill in "${EXPECTED_SKILLS[@]}"; do
  [[ -d "$DIR/skills/$skill" ]]            || fail "missing skill directory: $skill"
  [[ -f "$DIR/skills/$skill/SKILL.md" ]]   || fail "missing $skill/SKILL.md"
done
ok "all 14 expected skill directories + SKILL.md files present"

for f in CLAUDE.md GEMINI.md AGENTS.md LICENSE VENDORED.md; do
  [[ -f "$DIR/$f" ]] || fail "missing top-level file: $f"
done
ok "bootstrap files (CLAUDE.md, GEMINI.md, AGENTS.md), LICENSE, VENDORED.md present"

# --- 2. content anchor (sha256) ---------------------------------------------
actual_sha=$(sha256_of "$DIR/skills/using-superpowers/SKILL.md")
if [[ "$actual_sha" != "$EXPECTED_USING_SUPERPOWERS_SHA256" ]]; then
  fail "using-superpowers/SKILL.md sha256 mismatch
       expected: $EXPECTED_USING_SUPERPOWERS_SHA256
       actual:   $actual_sha
       (vendored content has been modified — investigate or re-vendor)"
fi
ok "using-superpowers/SKILL.md sha256 matches v$EXPECTED_VERSION anchor"

# --- 3. AGENTS.md should be a regular file (not a stale symlink) -------------
if [[ -L "$DIR/AGENTS.md" ]]; then
  fail "AGENTS.md is a symlink — vendor copy must materialise it as a regular file"
fi
ok "AGENTS.md is a regular file"

echo
echo "superpowers v$EXPECTED_VERSION vendor bundle: OK"
