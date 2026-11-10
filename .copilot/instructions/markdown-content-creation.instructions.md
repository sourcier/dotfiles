---
description: 'Accessible Markdown with project-specific content conventions'
applyTo: '**/*.md, **/*.mdx'
---

# Markdown Guidelines

- Preserve the document's existing structure and repository conventions.
- Use a descriptive H1 for standalone documents and a logical heading hierarchy.
- Use fenced code blocks with a language identifier, descriptive link text,
  meaningful image alt text, and properly formatted lists and tables.
- Keep lines readable and separate blocks with blank lines.
- Do not add blog metadata, front matter, or generated-title conventions to
  READMEs, agent instructions, or general documentation.
- For blog posts or content collections, inspect the project's schema and
  neighboring content before choosing headings and front matter.
- Only omit an H1 when the site's template generates the title.
- Only require metadata fields defined by the project; do not invent author,
  alias, category, or publication fields.
- Run existing documentation validators when available; do not claim validators
  exist without checking.
