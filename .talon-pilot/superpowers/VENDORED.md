# Vendored: superpowers v5.1.0

This directory is a **read-only vendor copy** of the [obra/superpowers](https://github.com/obra/superpowers)
methodology asset bundle. It is consumed by `pilot-api` Stage 2 provisioning to
seed `.talon-pilot/superpowers/` inside every canonical repo (see
[`docs/adr/canonical-repo-conservative-defaults.md`](../../../../docs/adr/canonical-repo-conservative-defaults.md)
section D5).

## Provenance

| Field          | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| Source repo    | https://github.com/obra/superpowers                                                  |
| Version        | 5.1.0                                                                                |
| Vendored at    | 2026-05-06                                                                           |
| Vendored by    | talon-pilot (#173 Stage-4 prep)                                                      |
| License        | See `LICENSE` next to this file (preserved from upstream)                            |

## What is included

- `skills/` — 14 skill directories (full methodology surface area):
  - `brainstorming/`
  - `dispatching-parallel-agents/`
  - `executing-plans/`
  - `finishing-a-development-branch/`
  - `receiving-code-review/`
  - `requesting-code-review/`
  - `subagent-driven-development/`
  - `systematic-debugging/`
  - `test-driven-development/`
  - `using-git-worktrees/`
  - `using-superpowers/`
  - `verification-before-completion/`
  - `writing-plans/`
  - `writing-skills/`
- `CLAUDE.md` — bootstrap for Claude Code
- `GEMINI.md` — bootstrap for Gemini CLI
- `AGENTS.md` — bootstrap for Codex / generic agent CLIs (in upstream this is a
  symlink to `CLAUDE.md`; here it is materialised as a **regular file with
  identical content** so that `git` and `cp -R` work uniformly across hosts).
- `LICENSE` — upstream license (must remain alongside the vendored content).

## What is intentionally NOT included

These files belong to the upstream development project, not to consumers of the
methodology, so they are excluded:

- `tests/`, `scripts/`, `hooks/`, `docs/`, `assets/`
- `package.json`, `gemini-extension.json`
- `README.md`, `RELEASE-NOTES.md`, `CODE_OF_CONDUCT.md`
- `.git/`, `.github/`, `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`,
  `.opencode/`, `.gitattributes`, `.gitignore`, `.version-bump.json`

## Reproduction recipe

The exact commands used to populate this directory:

```bash
SRC=/Users/dark/.claude/plugins/cache/superpowers-marketplace/superpowers/5.1.0
DEST=<repo-root>/crates/pilot-api/assets/superpowers-v5

mkdir -p "$DEST"
cp -R "$SRC/skills"    "$DEST/skills"
cp    "$SRC/CLAUDE.md" "$DEST/CLAUDE.md"
cp    "$SRC/GEMINI.md" "$DEST/GEMINI.md"
cp -L "$SRC/AGENTS.md" "$DEST/AGENTS.md"   # resolve symlink to file
cp    "$SRC/LICENSE"   "$DEST/LICENSE"
```

After running, `check.sh` (next to this file) verifies the result.

## Integrity anchors

A small set of sha256 anchors are kept here so that accidental mutations
(reformatting, copy paste edits) get caught by `check.sh`.

| File                                | sha256                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| `skills/using-superpowers/SKILL.md` | `316e29381219adf0cac62190c67aeabf427d6e6e5f2735541d502b3d339be7aa` |

If you legitimately upgrade to a new superpowers version, re-run the
reproduction recipe above and update both this table and the constant inside
`check.sh`.

## Upgrade procedure

1. Pull the new upstream release into a workspace (e.g. via the `superpowers`
   marketplace plugin cache).
2. Wipe this directory **except** `VENDORED.md` and `check.sh`:
   ```bash
   find crates/pilot-api/assets/superpowers-v5 -mindepth 1 -maxdepth 1 \
        ! -name VENDORED.md ! -name check.sh -exec rm -rf {} +
   ```
3. Re-run the reproduction recipe with the new `SRC` path.
4. Update the version row + sha256 anchors in this file.
5. Update `check.sh` constants to match.
6. Commit with subject `chore(canonical-repo): bump superpowers vendor to vX.Y.Z`.
7. (Optional) Bump the directory name to `superpowers-vN` if upstream ships a
   breaking major; older callers that pin a specific major can keep working
   side-by-side.

## DO NOT modify the vendored content directly

Any divergence from upstream must be tracked here and justified. The default
posture is **strict mirror**.
