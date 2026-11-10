# Global OpenCode Rules

Full instructions are loaded from `~/.claude/CLAUDE.md` via `opencode.json`.

## OpenCode-Specific Notes

- Use `pnpm` for all package manager commands — never `npm` or `yarn`
- Use `playwright` MCP for visual QA tasks; close the browser after each session
- Always prefer built-in CLI tools (`git`, `gh`) over MCP equivalents
- Never commit or push without an explicit user instruction
- Keep responses concise but complete; retain necessary explanations and uncertainty rather than enforcing abbreviated sentences.
- Preserve existing Markdown structure. Use an H1 for standalone documents; omit it only when a site template generates the title. Require blog front matter only where the project's schema defines it, not in READMEs or agent instructions.
- Use background execution for long-running commands or independent work when supported; wait for required results before proceeding. Use the current tool's documented arguments, not editor-specific flags.
- Prefer a direct CLI command over a script. When scripting is necessary, use shell or Node.js without adding dependencies unnecessarily. Use the assistant's question tool for clarification; avoid interactive terminal prompts in unattended commands.
- Update shared AI instructions in the actual dotfiles checkout's `.copilot/`, `.claude/CLAUDE.md`, and `.opencode/`, keeping applicable guidance consistent. Resolve the checkout from the current workspace or ask for its location; do not assume a fixed path or edit deployed home copies as the source of truth.
