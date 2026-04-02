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

## General

- Always favour the simple solution over a complex one
- If unsure about intent or approach, ask the user before proceeding
- When updating Copilot or Claude instructions, always edit `~/workspace/dotfiles/.copilot/` and `~/workspace/dotfiles/.claude/CLAUDE.md`, keeping both in sync — the bootstrap script handles copying to `~/`
