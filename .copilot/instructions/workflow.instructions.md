---
applyTo: '*'
description: 'Operational workflow preferences for how GitHub Copilot should behave across all projects.'
---

# Workflow Preferences

## Tools

- Always prefer CLI tools over MCP servers — use MCP only when there is no CLI equivalent (e.g. use `git` directly, not a GitKraken MCP tool)
- Always use background terminals (`isBackground: true`) when running commands

## Git

- Never commit or push automatically — always wait for an explicit "commit" or "push" instruction from the user
