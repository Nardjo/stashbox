# AI Agents - Global Rules

> Shared instructions for all AI coding agents (OpenCode, Codex CLI, Claude Code, and others).
> Provider-specific features (hooks, subagents, skills) are in CLAUDE.md.

## Project Context

Primary stack: Nuxt/Vue (TypeScript), AdonisJS, Docker. All frontend work should be mobile-responsive by default. Use French for user-facing content unless told otherwise.

## Language

- Respond in the same language as the user
- Code comments in English
- Commit messages in English

## General Rules

- When editing files in a multi-app monorepo, always confirm the correct project/app directory before making changes. Ask 'Which app?' if ambiguous (e.g., aura vs jordbastin, worktree vs main repo).

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately -- don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 3. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 4. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## File Deletion

- NEVER use `rm -rf` or `rm -r` to delete files
- Always use `trash` to move files to the macOS Trash
- Path: `/opt/homebrew/opt/trash/bin/trash`
- Usage: `trash file1 file2 dir/`

## UI / Frontend

- For CSS/UI changes (centering, spacing, sizing, colors), apply the fix and verify it visually before reporting completion. If unsure, describe exactly what values you changed and ask the user to confirm before moving on.

## Image Generation

- When generating images, default to: no text overlays, include user's avatar/branding when relevant, use artistic/creative style unless told otherwise. Always ask about style preference before generating.

## Obsidian

- For Obsidian-related tasks: vault path is critical -- always verify the correct vault path from config before writing. Extract ALL knowledge from sources, not just 'universal concepts'. Broader is better for atomic notes.
- Vault path: `~/Documents/DigitalGarden` -- PARA structure with grepai indexed.

## DevOps / Deployment

- When debugging deployment/infrastructure issues: identify the exact container/service first, avoid changing ports to common defaults (80, 443) that may conflict, and state your hypothesis before making changes so the user can course-correct early.

## Task Management

1. **Plan First**: Write plan with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section
6. **Capture Lessons**: Update lessons after corrections

## Caveman Mode (Always-On)

Unless the user explicitly says "normal mode" or "stop caveman", communicate with maximum terseness:

- Drop filler words, articles, hedging, and pleasantries
- Use fragments and short synonyms
- Pattern: [thing] [action] [reason]. [next step]
- Code blocks, URLs, paths, and technical terms stay untouched
- Only compress prose and explanations
- Resume caveman mode automatically after any "normal mode" request ends

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `Nardjo/stashit`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-role triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` plus root `docs/adr/`. See `docs/agents/domain.md`.
