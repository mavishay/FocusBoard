# Project Agents

<!-- TEAM_AI_DIRECTIVES START -->
## Team AI Directives

**Repository**: [mavishay/FocusBoard](https://github.com/mavishay/FocusBoard) — Electron desktop app (React + SQLite) for unified email, tasks, calendar, and AI-powered triage.

**Team directives path**: `/Users/mavishay/Projects/MaorInnovations/team-ai-directives`
**Team Constitution**: `/Users/mavishay/Projects/MaorInnovations/team-ai-directives/context_modules/constitution.md`

**Product docs in-repo**: `.adlc/product/` (PRD sections, requirements REQ-NNN, PDRs in `.adlc/memory/pdr/`)

### GitHub Account Verification

Before performing ANY GitHub CLI action (creating issues, PRs, comments, or any `gh` command), you MUST verify the active GitHub user is `mavishay`:

```bash
gh api user --jq '.login'
```

If the output is not `mavishay`, run:
```bash
gh auth switch --user mavishay
```

This prevents creating issues/PRs under the wrong account. Never skip this check.

### Writing GitHub Issues

When creating issues for this project, follow this format exactly:

#### Body Structure

Every issue body MUST contain these sections in order:

1. **Summary** — 1-2 sentence description
2. **PRD Reference** — map to PRD sections, user stories, requirements (REQ-NNN), and PDRs
3. **Current State** — what exists today in the codebase with specific `file:line` references
4. **Implementation Requirements** — numbered subsections with:
   - File paths to create/modify
   - Code snippets (TypeScript interfaces, SQL migrations, IPC handlers)
   - Exact method signatures and API contracts
5. **Acceptance Criteria** — checkbox list (`- [ ]`)
6. **Dependencies** — which issues block this one, which this one blocks, related issues
7. **Labels** — `enhancement`, `blocked-by: #N`, `wave: N-name`

#### Codebase References

Always include `file:line` references from the actual codebase. Explore the codebase first to find:
- Existing implementations to build on
- Patterns to follow (IPC handlers in `electron/main/ipc/`, preload APIs, React components in `src/`)
- Database tables and migration numbering (currently at schema version 24 in `electron/main/db/index.ts`)

#### Labeling Convention

- **`enhancement`** — all feature issues
- **`blocked-by: #N`** — each dependency gets its own label
- **`wave: N-name`** — execution wave for FocusBoard:
  - `1-foundation` — docs, daily-status shell, core layout
  - `2-parallel` — metrics, banners, task cards (can run in parallel after foundation)
  - `3-dependent` — Slack card, bot routine port (depends on UI shell)
  - `4-improvements` — quotes, notes, AI chat, task planner, and other enhancements

#### GitHub Relationships

After creating issues, add **blocked-by relationships** via GraphQL (not just labels):

```bash
gh api graphql -f query="mutation { addBlockedBy(input: {issueId: \"<subject_node_id>\", blockingIssueId: \"<blocking_node_id>\"}) { clientMutationId } }"
```

To get node IDs:
```bash
gh api graphql -f query='{ repository(owner: "mavishay", name: "FocusBoard") { issues(first: 50) { nodes { number id } } } }'
```

#### Project Board

Add every issue to the project board:
```bash
gh project item-add 1 --owner mavishay --url "https://github.com/mavishay/FocusBoard/issues/<number>"
```

Project: https://github.com/users/mavishay/projects/1 (FocusBoard)

### PR Best Practices

**ALWAYS connect PRs to their corresponding issues.** When creating a PR, include the issue number in the title or body (e.g., `#68` in title or `Closes #68` in body) so GitHub links them automatically.

**ALWAYS fix merge conflicts immediately after creating a PR.** If the PR branch has conflicts with the base branch, resolve them before proceeding to any other work. Never leave a PR with unresolved conflicts.

### Test Cleanup

After running tests, always run `pnpm test:cleanup` to kill any stale vitest worker processes. Vitest spawns child workers that can become orphaned when agent sessions end, blocking CPU. The `vitest.config.ts` uses `pool: 'forks'` with `singleFork: true` to minimize worker count.

#### Checklist for New Issues

1. `gh api user --jq '.login'` → verify `mavishay`
2. Explore codebase for `file:line` references
3. Write body to `/tmp/issue-<name>.md` (avoid shell escaping issues)
4. `gh issue create --repo mavishay/FocusBoard --title "..." --label "enhancement" --body-file /tmp/issue-<name>.md`
5. `gh project item-add 1 --owner mavishay --url "https://github.com/mavishay/FocusBoard/issues/<number>"`
6. `gh issue edit <N> --repo mavishay/FocusBoard --add-label "blocked-by: #X,wave: N-name"`
7. Add GraphQL blocked-by relationships
8. Clean up temp files

### Issue Numbering

Issues are numbered sequentially. Current max: #73. Next issue should be #74.

### Existing Issues Reference

| # | Title | Status | Wave |
|---|-------|--------|------|
| 53 | Daily Quote at Top of Home Page | OPEN | 4-improvements |
| 54 | Notes Feature with DB Storage and Agent Integration | OPEN | 4-improvements |
| 55 | AI Chat Assistant for Data Queries and Actions | OPEN | 4-improvements |
| 57 | Task Planner Wizard with AI Deadline Suggestions | OPEN | 4-improvements |
| 67 | Docs: Fix AGENTS.md for FocusBoard (remove mydashboard leftovers) | OPEN | 1-foundation |
| 68 | UI: Daily Status shell matching local HTML mock (RTL Hebrew) | OPEN | 1-foundation |
| 69 | UI: Metrics strip (meetings, tasks, mail, Slack) | OPEN | 2-parallel |
| 70 | UI: Next-up banner for daily status | OPEN | 2-parallel |
| 71 | UI: Split tasks into today + tomorrow cards | OPEN | 2-parallel |
| 72 | Feature: Slack open-actions card on daily status | OPEN | 3-dependent |
| 73 | Feature: Port FocusBoard bot routines/skills into Electron app | OPEN | 3-dependent |

### Wave Execution Order

1. **Wave 1-foundation** (#67, #68) — agent docs and daily-status UI shell
2. **Wave 2-parallel** (#69, #70, #71) — metrics, banner, task cards (parallel after #68)
3. **Wave 3-dependent** (#72, #73) — Slack card and bot routine port (depends on daily-status shell)
4. **Wave 4-improvements** (#53, #54, #55, #57) — quotes, notes, AI chat, task planner
<!-- TEAM_AI_DIRECTIVES END -->
