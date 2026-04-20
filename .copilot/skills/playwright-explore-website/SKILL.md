---
name: playwright-explore-website
description: 'Website exploration for testing using Playwright MCP'
---

# Website Exploration for Testing

Your goal is to explore the website and identify key functionalities.

## MCP Server Setup

If the Playwright MCP tools are not available, instruct the user to install it using one of the following methods:

**Option 1 — CLI (recommended):**

```sh
code --add-mcp '{"name":"playwright","command":"pnpx","args":["@playwright/mcp@latest"]}'
```

**Option 2 — Manual:** Add the following to VS Code `settings.json`:

```json
"mcp": {
  "servers": {
    "playwright": {
      "command": "pnpx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Then restart VS Code / reload the Copilot extension and accept the prompt to start the server.

## Specific Instructions

1. Navigate to the provided URL using the Playwright MCP Server. If no URL is provided, ask the user to provide one.
2. If you need to compare multiple pages or breakpoints, inspect them serially or in separate tabs. Do not queue parallel navigations and screenshots against the same Playwright page context.
3. Use Playwright to review the rendered UI directly. For implementation or regression checks, inspect the current state first, then verify the updated state after changes instead of relying on code inspection alone.
4. Identify and interact with 3-5 core features or user flows.
5. For visual audits, explicitly note supporting-label readability, hero-to-first-section spacing, footer divider spacing, and last-section-to-footer separation when relevant.
6. Document the user interactions, relevant UI elements (and their locators), and the expected outcomes.
7. Delete any temporary screenshots you created during the session unless the user explicitly asked to keep them.
8. Close the browser context upon completion.
9. Provide a concise summary of your findings.
10. Propose and generate test cases based on the exploration.
