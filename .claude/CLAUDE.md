# Global Instructions

## Code Commenting

Write code that speaks for itself. Comment only when necessary to explain WHY, not WHAT.

### When to comment
- Complex business logic or non-obvious algorithms
- Regex patterns
- API constraints, rate limits, or external gotchas
- TODO/FIXME/HACK/NOTE annotations with context

### When NOT to comment
- Obvious or redundant statements (e.g. `counter++ // increment counter`)
- Code that a better variable/function name would explain
- Commented-out dead code — delete it, git has history
- Changelog comments — that's what git log is for
- Decorative divider comments

### Public APIs
Use JSDoc/TSDoc with `@param`, `@returns`, and a one-line description. Skip for internal functions where the signature is self-documenting.

## Security (OWASP)

Apply a security-first mindset to all generated code:

- Never hardcode secrets — use environment variables or secret stores
- Use parameterized queries — never string-concatenate user input into SQL or commands
- Sanitize all user-controlled data displayed in HTML (prefer `.textContent` over `.innerHTML`)
- Default to deny for access control decisions
- Use strong, modern algorithms (bcrypt/argon2 for passwords, AES-256 for encryption)
- Default to HTTPS for all network requests
- Set security headers: CSP, HSTS, X-Content-Type-Options
- Configure cookies with HttpOnly, Secure, SameSite=Strict
- Validate and sanitize URLs from user input to prevent SSRF
- Warn about insecure patterns during code review — explain the risk, not just the fix

## Accessibility (WCAG 2.1/2.2)

Build inclusive interfaces by default:

- Use semantic HTML first — add ARIA only when native elements don't suffice
- All interactive elements must be keyboard accessible with visible focus indicators
- All images need meaningful alt text (or be marked decorative)
- Use logical heading hierarchy — never skip levels
- Labels on every form input (not just placeholders)
- Inline error messages associated programmatically with their fields
- Respect `prefers-reduced-motion` — wrap heavy animations in a media query
- Ensure 4.5:1 contrast ratio minimum for text (3:1 for large text)
- Minimum 44px touch targets on mobile
- Test: keyboard-only navigation, screen reader smoke test, 400% zoom

## Code Quality

- Follow SOLID, DRY, YAGNI, and KISS principles
- Active voice in all written content
- Use TypeScript with strict mode where available
- Handle all error paths — no silent failures
- Prefer readable code over clever code
- Test pyramid: many unit tests, focused integration tests, few critical e2e tests

## Technical Writing

When writing documentation, blog posts, or technical content:

- Start with WHY before HOW
- Use progressive disclosure (simple to complex)
- One main idea per paragraph
- Define technical terms on first use
- Include working code examples — test them before including
- Active voice and direct address ("you" not "one")
- Short sentences for complex concepts
- Structure: hook, problem, approach, implementation, results, takeaways

## SEO and Search Optimization

For web projects:

- Unique, descriptive title tags (50-60 chars) and meta descriptions (150-160 chars)
- Proper heading hierarchy (single H1, logical H2-H6 structure)
- Schema markup (Article, FAQ, Breadcrumb) where applicable
- Short, descriptive URLs with keywords
- Alt text on all images
- Internal linking between related content
- Question-style headings for featured snippet eligibility
- Short paragraphs (2-4 sentences) for readability and AI parsing
- Include FAQ sections with schema for question-based queries

## React (19.x)

When working on React projects:

### Core Principles
- Functional components only — class components are legacy
- Use TypeScript with strict mode and proper interface design
- No React import needed (new JSX transform)
- Ref as prop (React 19) — no need for `forwardRef`
- Context without Provider (React 19) — render context directly
- Ref callbacks can return cleanup functions (React 19)

### Modern Hooks
- `use()` for promise handling and async data fetching with Suspense
- `useFormStatus` for form loading states
- `useOptimistic` for optimistic UI updates during async operations
- `useActionState` for managing form action state
- `useEffectEvent()` (19.2) to extract non-reactive logic from effects
- `useDeferredValue` with initial value for better UX

### Patterns
- **Forms:** Use Actions API with `useFormStatus` for progressive enhancement
- **Server Components:** Use RSC for data-heavy components, mark client components with `'use client'`
- **Concurrent rendering:** Use `startTransition` for non-urgent updates, `useDeferredValue` for deferred values
- **Suspense boundaries** for async data fetching and code splitting
- **`<Activity>` component** (19.2) for UI visibility and state preservation
- **`cacheSignal`** (19.2) for cache lifetime management in RSC

### Performance
- Let React Compiler handle optimization — avoid manual memoization unless profiling shows a need
- Use `React.lazy()` and dynamic imports for code splitting
- Proper dependency arrays in `useEffect`, `useMemo`, `useCallback`
- Profile with React DevTools and Performance Tracks (19.2)

### Accessibility
- Semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- All interactive elements keyboard accessible
- Proper error boundaries with fallback UIs and recovery
- Document metadata (`<title>`, `<meta>`) directly in components (React 19)

### Testing
- React Testing Library for component tests (test behaviour, not implementation)
- Vitest or Jest for unit tests
- Playwright or Cypress for e2e

## UX Principles

When building user-facing features:

- Understand the user's job-to-be-done before designing
- Progressive disclosure — don't overwhelm with options
- Clear progress indicators for multi-step flows
- Contextual help inline, not in separate docs
- Preserve user input on errors
- Mobile-first responsive design
- Consistent navigation and help placement
