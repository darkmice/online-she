# CLAUDE.md — Talon Pilot 项目契约

> 本文件是 **claude-code / codex / gemini-cli 自动加载的 agent 入口**。
> 你在这个 repo 里干活之前,这一份是必读的项目契约。
>
> 镜像 `AGENTS.md` 给走 `AGENTS.md` 约定的 CLI(codex 等)。两份内容一致;
> 改这份,记得也同步另一份(或保持 `AGENTS.md` 仅为指向本文件的转发占位)。

---

## 1. 这是什么 repo

由 **Talon Pilot** 托管的项目仓。它有一个**内部 bare repo**作为权威 origin,
所有 agent 干的活都得回到那条 origin 上,**不是**第三方代码托管平台。

- 项目元信息、群讨论、决议、Mission 编排全部在 Talon Pilot 控制面上。
- 你看到的工作树是 Talon edge 从内部 bare repo `git clone` 出来的副本。
- `.talon-pilot/superpowers/` 提供方法论 skill(brainstorming / TDD /
  executing-plans 等),要 Read 它们之前 **先看 `superpowers/CLAUDE.md`**。
- `.talon-skills/talon-ops/` 是 Talon 控制面工具(`tp.*`)的用法字典 ——
  群里要查员工 / 派工 / 看消息时,**先 Read 那里对应工具的 ref**,不要瞎试。

## 2. 不可逾越的铁律(违反 = turn 立即被驳回)

### 2.1 Git remote 与代码托管

- **`origin` 是 Talon Pilot 托管的内部 git 仓**(本地开发 `file://`,
  云端部署 `https://...`),由控制面配好,**指向哪里你不要管**。
- **禁止** `gh repo create` / `git remote add` 任何指向**第三方代码托管平台**
  (GitHub / GitLab / Gitea / Bitbucket / Codeberg / 自建公开 forge 等)的 remote。
- **禁止** `git push` 到任何非 `origin` 的 remote,即使该 remote 已经存在。
- **禁止** `git remote set-url origin <url>` 改写 origin。Origin 的归属
  由 Talon Pilot 控制面管理,不在你的职责内。
- 项目作者明确要求"发到第三方平台"时:**这是产品决策不是技术决策**,
  你必须把这条诉求写进群消息**让 chair / 用户拍板**,自己不能批准。
- 主持人(chair)收到"要不要建 GitHub repo / 推到第三方平台"这类请求时,
  **默认拒绝**并解释"项目代码归属 Talon Pilot 控制面托管",
  **不要替项目作者同意外发**。

### 2.2 提交与历史

- 完成一个可还原的语义单元就 **`git add` + `git commit`**,不要积压。
- **禁止** `git push --force` / `--force-with-lease`,即使是 feature 分支,
  除非用户显式授权(且本仓基本用不到)。
- Commit message 用 [Conventional Commits](https://www.conventionalcommits.org)
  风格(`feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `test:`)。
- Migration / schema 改动一律 **forward-only**;**禁止**改已 push 出去的
  migration 文件 —— 加新文件,不动旧的。

### 2.3 群协作

- 派活只用「显式 mention 协议」:`[@<显示名>](talon-mention://employee/<uuid>)`。
  字面 `@X` 不触发派工(避免「我建议 @Dark」误触发)。
- 看群里之前发生了什么 → 调 `tp.group.list_messages`,**不要**凭记忆猜。
- 取员工 UUID → 调 `tp.list_employees` / `tp.group.list_members`。
- 主持人(chair)每轮 turn **必须**以下面之一收尾:`@` 派下一步 / 输出
  `employee_proposal` 块 / 「会议告一段落」收口标记。**不允许**自己说完
  就停。详细规则见 chair 的 role_block(由 edge 在派工时注入)。

### 2.4 沉淀长期约定

群里讨论后**形成的项目特定约定**(选型 / 风格 / 流程 / 团队约束),
chair 必须 **Edit 本文件的「§3 项目特定约定」节,加一条,然后 commit**。
让下一轮 turn 的 LLM 自动看到。**禁止**只在群里口头同意就过。

## 3. 项目特定约定

> 由 Talon Pilot chair 在群里形成共识后,**自己** Edit 这一节追加。
> 每条约定一行,格式:`- <生效时间 YYYY-MM-DD>:<规则> —— 来源:群消息 <message_id 或简要>`。

- 2026-06-30:前端结构为纯静态三文件(`index.html` + `style.css` + `game.js`),用普通 `<script>` 标签(**非** ES module),保证 `open index.html` 在 `file://` 下零依赖直开可玩 —— 来源:群消息(立项贪吃蛇)
- 2026-06-30:`localStorage` 读写必须经 `safeGet`/`safeSet` 的 try/catch 兜底,异常(隐私模式 / sandboxed iframe `SecurityError`)时退化为内存值,不得阻断初始化或结束屏 —— 来源:群消息(代码门 P1)
- 2026-06-30:响应式必须覆盖横屏矮视口(`orientation:landscape` 两栏布局)而非仅竖屏,关键控件在所有目标视口须 inView 可达、整页 fit 不靠滚动 —— 来源:群消息(功能门 P2)

## 4. 工作目录与文件布局

```
项目根/
├── CLAUDE.md             # 本文件(claude-code 自动加载)
├── AGENTS.md             # codex 走的入口(与本文件同步)
├── .gitignore
├── specs/                # 验收标准库
├── harness/              # Talon Pilot harness 配置
│   └── skeleton.toml
├── .talon-skills/        # Talon 控制面 skill(tp.* 工具字典)
│   └── talon-ops/
│       ├── SKILL.md
│       └── references/tools/<tool>.md
└── .talon-pilot/         # 平台元信息 + 方法论 superpowers
    ├── README.md
    ├── openspec/
    └── superpowers/
        ├── CLAUDE.md     # 方法论入口(进 superpowers 时再看)
        └── skills/
```

## 5. 你拿不准时

- 拿不准 git remote 行为 → 先看本文件 §2.1,默认走 `origin`。
- 拿不准用哪个 `tp.*` 工具 → Read `.talon-skills/talon-ops/SKILL.md`。
- 拿不准 brainstorm / TDD / 写 plan 流程 → Read
  `.talon-pilot/superpowers/CLAUDE.md` 找对应 skill。
- 拿不准群里之前发生了什么 → 调 `tp.group.list_messages`。
- **拿不准就问群里**(主持人或同事),**不要**自己拍板做不可逆动作。
