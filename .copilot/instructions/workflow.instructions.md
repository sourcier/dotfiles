---
applyTo: '*'
description: 'Operational workflow preferences for how GitHub Copilot should behave across all projects.'
---

# Workflow Preferences

## Tools

- Always prefer CLI tools over MCP servers — use MCP only when there is no CLI equivalent (e.g. use `git` directly, not a GitKraken MCP tool)
- Always use background terminals (`isBackground: true`) when running commands

## Package Manager

- Always use `pnpm` for all package manager commands — never `npm` or `yarn`
- Install: `pnpm add`, global: `pnpm add -g`, one-off execution: `pnpm dlx`

## Git

- Never commit or push automatically — always wait for an explicit "commit" or "push" instruction from the user
- In multi-repo workspaces, inspect which repository each change belongs to before staging, committing, or pushing
- Apply branching rules per repository — do not assume nested repositories follow the same workflow
- When work spans multiple repositories, stage and commit each repository separately with repo-specific commit messages

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
- Use glass, blur, and transparency selectively. They work best on overlays and accent surfaces; keep primary reading and dense content surfaces solid unless the existing design language clearly supports translucency.
- When iterating on an existing UI, prefer structural fixes over one-off spacing tweaks; keep compact labels short, surface important status text as its own badge or label, and use full-bleed separators when the design intent is edge-to-edge alignment
- When updating Copilot or Claude instructions, always edit `~/workspace/dotfiles/.copilot/` and `~/workspace/dotfiles/.claude/CLAUDE.md`, keeping both in sync — the bootstrap script handles copying to `~/`
