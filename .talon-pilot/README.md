# .talon-pilot/

Talon Pilot 项目的**平台元信息 + 方法论目录**,跟代码同 commit、同 push。

> repo 根的 [`CLAUDE.md`](../CLAUDE.md) / [`AGENTS.md`](../AGENTS.md) 才是
> agent 入口契约,本目录是它指向的"参考资料"。

| 子目录 | 内容 | 谁在用 |
|--------|------|--------|
| openspec/ | 项目长期规格、记忆、跨 mission 共享的事实 | OpenSpec store v2 / 本地 agent CLI |
| superpowers/ | 阶段流程定义(brainstorming / writing-plans / executing-plans / TDD / ...) | 由方法论 skill 自身指引 LLM 主动 Read |
| missions/&lt;id&gt;/decisions.md | 单次 mission 的 boss 裁决 / acceptance delta 快照 | 历史可追溯 |

> 设计依据:`docs/adr/canonical-repo-conservative-defaults.md` 的 D5 / D13。
>
> 团队成员配置(谁在群里、谁是 chair、各 executor 偏好)已经迁移到 **Talon Pilot 控制面**
> (`tp.list_employees` / `tp.group.list_members` / `tp.group.add_member`),
> 不再用本目录的 `employees.yaml`。
