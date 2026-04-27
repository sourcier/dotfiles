# Global OpenCode Rules

Full instructions are loaded from `~/.claude/CLAUDE.md` via `opencode.json`.

## OpenCode-Specific Notes

- Use `pnpm` for all package manager commands — never `npm` or `yarn`
- Use `playwright` MCP for visual QA tasks; close the browser after each session
- Always prefer built-in CLI tools (`git`, `gh`) over MCP equivalents
- Never commit or push without an explicit user instruction
