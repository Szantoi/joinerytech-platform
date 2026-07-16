# Explorer Decisions Memory

> **Architectural decisions cache** — Cold memory (365d TTL)
>
> Kutatási eredmények és döntések.

## Technology Evaluation

### Code Search Tools
**Decision:** ripgrep + AST parsing hybrid
**Rationale:** Speed vs accuracy balance

### Documentation Strategy
**Decision:** Markdown + Mermaid diagrams
**Rationale:** Version control friendly, LLM-parseable

## Codebase Organization

### Module Discovery
**Decision:** File-based module boundaries
**Rationale:** /modules/<name>/ structure convention

### Naming Conventions
**Decision:** PascalCase aggregates, camelCase methods
**Rationale:** .NET ecosystem standard

---

**Last updated:** 2026-06-30
