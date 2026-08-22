# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on the **fork**: `RibatTRW/lnreader`. Upstream `lnreader/lnreader` is read-only reference (we are outside contributors there). Use the `gh` CLI for all operations.

> `gh` lives at `C:\Program Files\GitHub CLI\gh.exe` on this host; add it to
> PATH or call it with the full path. First use requires a one-time
> `gh auth login`.

## Conventions

- **Create an issue**: `gh issue create -R RibatTRW/lnreader --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> -R RibatTRW/lnreader --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list -R RibatTRW/lnreader --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> -R RibatTRW/lnreader --body "..."`
- **Apply / remove labels**: `gh issue edit <number> -R RibatTRW/lnreader --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> -R RibatTRW/lnreader --comment "..."`

When run inside `C:\Users\clang\dev\lnreader`, `gh` resolves to `origin` (= the fork) automatically; pass `-R` explicitly when working from elsewhere.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

Upstream PRs at `lnreader/lnreader` may be referenced read-only for context (`gh pr view <n> -R lnreader/lnreader`) but are never part of our triage queue.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue on the fork.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> -R RibatTRW/lnreader --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create -R RibatTRW/lnreader --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/RibatTRW/lnreader/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/RibatTRW/lnreader/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open -R RibatTRW/lnreader`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> -R RibatTRW/lnreader --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
