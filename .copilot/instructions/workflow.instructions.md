---
applyTo: '*'
description: 'Operational workflow preferences for how GitHub Copilot should behave across all projects.'
---

# Workflow Preferences

## Tools

- Always prefer CLI tools over MCP servers — use MCP only when there is no CLI equivalent (e.g. use `docker` directly, not a Docker MCP tool)
- Use the `gh` CLI for all GitHub interactions (issues, PRs, releases, repos) — never use GitHub MCP tools or web browser automation for GitHub tasks
- Use the `git` CLI for all git operations — never use GUI git tools or git MCP servers
- Always use background terminals (`isBackground: true`) when running commands

## Package Manager

- Always use `pnpm` for all package manager commands — never `npm` or `yarn`
- Install: `pnpm add`, global: `pnpm add -g`, one-off execution: `pnpm dlx`

## Git

- Never commit or push automatically — always wait for an explicit "commit" or "push" instruction from the user
- In multi-repo workspaces, inspect which repository each change belongs to before staging, committing, or pushing
- Apply branching rules per repository — do not assume nested repositories follow the same workflow
- When work spans multiple repositories, stage and commit each repository separately with repo-specific commit messages

## Communication

- Default to concise responses. Lead with the result, decision, or next action, then include only the context needed to support it.
- Prefer short paragraphs. Use headings and lists only when they materially improve scanability.
- Do not restate full plans, prior summaries, or unchanged assumptions. Report only deltas.
- Keep progress updates to one or two sentences.
- Cap optional suggestions at three items unless the user asks for more.
- Expand only when the user asks for depth or when risk and complexity justify it.

## General

- Always favour the simple solution over a complex one
- If unsure about intent or approach, ask the user before proceeding
- When reviewing whether an existing framework, utility library, or CSS system is still required, audit actual usage first. Distinguish structural, behavioural, utility, and cosmetic dependency before recommending removal.
- When refining spacing in an existing UI, prefer a shared rhythm system: use shared tokens or utilities for external section spacing and reserve component padding for internal breathing room.
- When styling compact chips, eyebrow pills, or badges on light or neutral surfaces, verify the foreground, border, and fill contrast explicitly. Faint accent tokens often need dedicated label colours instead of inheriting the accent directly.
- Shared top-margin rhythm systems do not automatically solve page endings. Validate the first section after a hero, the last CTA or section before the footer, and the breathing room around footer dividers.
- When using browser automation for visual QA, inspect pages serially or in separate tabs. Do not issue parallel navigations or screenshots against the same Playwright page context.
- For any task that changes rendered UI, use Playwright to inspect the live interface before and after the change. Do not rely on code inspection alone for visual verification.
- Delete temporary screenshots created during Playwright review before handing off, unless the user explicitly asks to keep them.
- After finishing any Playwright MCP session, always close the browser by calling `mcp_playwright_browser_close` to avoid leaving it in a bad state.
- Use glass, blur, and transparency selectively. They work best on overlays and accent surfaces; keep primary reading and dense content surfaces solid unless the existing design language clearly supports translucency.
- Never end CSS gradients in `transparent` — it resolves to `rgba(0,0,0,0)` and browsers interpolate through dark tones, producing a washed-out or discoloured edge on light or coloured backgrounds. Always end in a real colour stop (e.g. `var(--surface-elevated)` or `color-mix(in srgb, var(--accent) 0%, var(--surface))`).
- When iterating on an existing UI, prefer structural fixes over one-off spacing tweaks; keep compact labels short, surface important status text as its own badge or label, and use full-bleed separators when the design intent is edge-to-edge alignment
- When the same content family appears across multiple UI surfaces, centralize icon and status mappings in shared helpers or data instead of duplicating page-local variants.
- When cards mix icons, headings, and status pills, give the badge a dedicated slot or row instead of forcing it to wrap inside the heading flow; explicitly validate the narrow-screen layout.
- When a user reports a visual inconsistency in one repeated card group, audit sibling groups on the same page for the same drift and confirm equal-height and top-alignment behaviour at desktop and mobile breakpoints.
- When updating Copilot or Claude instructions, always edit `~/workspace/dotfiles/.copilot/` and `~/workspace/dotfiles/.claude/CLAUDE.md`, keeping both in sync — the bootstrap script handles copying to `~/`

## Dependency Auditing

When fixing `pnpm audit` vulnerabilities:

1. Identify the vulnerable package, its patched version, and its dependency path
2. Check if the **direct dep** in `package.json` has a newer version that pulls in the fix — bump it if so
3. Only add `pnpm.overrides` when the direct dep is already at its latest and the transitive dep cannot be upgraded any other way
4. Never run `pnpm update --latest` — it resolves the entire dependency graph and can silently downgrade other packages
5. After editing `package.json`, run `pnpm install` then `pnpm audit` to verify
6. Peer dependency warnings after install indicate a version mismatch — check if the ecosystem supports the installed version before assuming latest is correct (e.g. TypeScript 6 vs `^5.0.0` peer requirements)

## GitHub Actions

- **Local composite actions require caller checkout first.** `uses: ./.github/actions/foo` resolves on the runner filesystem — the repo must already be checked out before that step. Put `actions/checkout@v4` as the first step in the calling job, not inside the composite action.
- **Prefer composite actions over reusable workflows for code reuse.** Reusable workflows (`on: workflow_call`) appear as separate entries in the GitHub Actions sidebar; composite actions do not.
