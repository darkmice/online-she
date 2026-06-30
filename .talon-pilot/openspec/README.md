# .talon-pilot/openspec/

This is the project's **long-term spec / memory store**. Content placed here is
treated as a durable fact source by:

- the OpenSpec store v2 (the control plane caches but does not own this data)
- any local agent CLI (`claude-code`, `codex`, `gemini-cli`) running in a clone
  of this repo

Typical contents (filled in over the project's lifetime — empty is fine on day
one):

```
.talon-pilot/openspec/
  ├── domain/        # 领域模型与术语
  ├── architecture/  # 长期架构决策
  ├── glossary.md    # 项目内统一术语
  └── ...            # 其它跨 mission 共享的事实
```

> Why this lives in git: see ADR
> `docs/adr/canonical-repo-conservative-defaults.md` (D5) — making the spec
> store project-owned (not control-plane-owned) is what lets a downloaded
> project keep working offline with local agent CLIs.
