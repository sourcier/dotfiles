---
description: "Astro development standards and best practices"
applyTo: "**/*.astro, **/*.ts, **/*.js, **/*.md, **/*.mdx"
---

# Astro Development Instructions

## Architecture

- Islands Architecture: server-render by default, hydrate selectively
- Default to zero JavaScript — only add `client:load` / `client:idle` / `client:visible` where needed
- Follow Multi-Page App (MPA) approach
- Component script structure: frontmatter at top, template below
- Static site generation (SSG) by default; add SSR only when needed

## TypeScript

- `tsconfig.json` should extend `astro/tsconfigs/base` (or `strict`)
- Types auto-generated in `.astro/types.d.ts` — run `astro sync` to refresh
- Define component props with TypeScript interfaces

## Component Design

- Use `.astro` components for static, server-rendered content
- Keep components focused and composable; use PascalCase names
- Use framework components (React, Vue, Svelte) only when interactivity is needed
- Scoped `<style>` in each component for component-specific styles
- Global / utility styles go in a shared stylesheet (e.g. `src/styles/global.scss` or `src/styles/global.css`)

### Scoped Style Pitfalls

- **Scoped Astro styles do not apply to elements injected via `innerHTML`** — put those styles in the global stylesheet
- **BEM `&-` nesting in scoped styles creates class concatenation, not descendant selectors.** `&-inner` inside `.card__blog--placeholder` compiles to `.card__blog--placeholder-inner[cid]`, targeting elements with that exact class — not children of the parent. Use explicit descendant selectors: `.card__blog--placeholder { .card__blog--placeholder-inner { … } }`
- **Components with no `<style>` block get no `data-astro-cid` attributes** on their elements, so scoped rules from parent components cannot match them. Always add a `<style>` block (even if minimal) to components that need to be styled by a parent.
- **To override a global rule from a scoped component style**, use a double-class selector (e.g. `.card.card__blog--placeholder`) to match global specificity — the CID attribute then acts as a tiebreaker. Avoid `:global()` or `!important` unless strictly necessary.
- **Conditional wrapper elements:** When a component needs a prop to toggle a wrapping element (e.g. `noContainer`), write **two full JSX branches** — one with the wrapper and one without. Do not try to conditionally render only the opening or closing tag (e.g. `{noContainer ? null : </div>}`) — this is invalid Astro/JSX syntax and will produce a broken template.

## Content Collections

Use the Content Layer API with `glob()` loader:

```typescript
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!README.md"],
    base: "./collections/posts",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      pubDate: z.coerce.date(),
      tags: z.array(z.string()),
      draft: z.boolean().default(false),
    }),
});
```

- Post ID (slug) is derived from the folder name, e.g. `posts/my-post/index.md` → `my-post`
- Use `z.coerce.date()` for date fields to handle ISO string input from frontmatter

## Styling Conventions

- BEM-style class naming: `.page-hero__title`, `.back-to-top--visible`
- CSS variables for theming — never hardcode colours outside `:root` / `[data-theme]`
- Support dark mode via a data attribute on `<html>` (e.g. `data-theme="dark"`) rather than `prefers-color-scheme` alone, so the user's explicit preference takes effect immediately

## UI Verification

- For any change that affects rendered UI, use Playwright to inspect the live interface before and after the change. Do not rely on code inspection alone for visual verification.
- Inspect multiple breakpoints or pages serially, or in separate tabs. Do not queue parallel navigations or screenshots against the same Playwright page context.
- Delete temporary screenshots created during Playwright review before handing off, unless the user explicitly asks to keep them.

## Testing with Vitest

The project uses Vitest with Astro's experimental Container API to snapshot-test reusable `.astro` components.

### Setup

- `vitest.config.ts` uses `getViteConfig` from `astro/config` so `.astro` files are processed correctly
- Add `/// <reference types="vitest/config" />` at the top of `vitest.config.ts` — this is the directive that augments Vite's `UserConfig` type with the `test` property (`/// <reference types="vitest" />` does **not** work for this)
- Test files follow the pattern `<ComponentName>.test.ts`
- Use a shared HTML normalizer that strips `data-astro-cid-*` hashes from rendered output before snapshotting, so Astro's scoped-style attribute changes don't cause spurious snapshot failures

### Container API usage

```ts
import { experimental_AstroContainer as AstroContainer } from "astro/container";

// Correct type annotation — constructor is private so InstanceType<> fails
let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

it("renders snapshot", async () => {
  const html = await container.renderToString(MyComponent, { props: { ... } });
  expect(normalizeHtml(html)).toMatchSnapshot();
});
```

- Do NOT use `InstanceType<typeof AstroContainer>` — the constructor is private and TypeScript will error
