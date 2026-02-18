## Context
`mwts` is a derived wrapper around `gts` conventions. The current codebase still reflects older ESLint config conventions and dependency versions.

Users reported concrete pain points in PR #16 discussion, especially around outdated ESLint ecosystem compatibility and the need to support `@typescript-eslint` v8+.

## Goals / Non-Goals
- Goals:
  - Align `mwts` 2.0 with modern `gts` baseline and dependency ecosystem.
  - Preserve simple default experience (`init`, `lint`, `fix`, `clean`) for most users.
  - Keep default formatter behavior as Prettier-based while enabling an explicit alternative mode.
- Non-Goals:
  - Redesigning the full CLI UX beyond what is needed for toolchain modernization.
  - Supporting legacy Node/TypeScript baselines in `mwts 2.0`.

## Decisions
- Decision: Ship as a major (`2.0`) with explicit breaking constraints.
  - Why: Node/tooling baseline upgrades and config model migration are breaking by nature.
- Decision: Follow latest gts major conventions for lint stack and generated defaults.
  - Why: Reduces long-term maintenance drift and resolves ecosystem incompatibility.
- Decision: Keep `Prettier + ESLint` as default, but introduce a supported opt-in path for `ESLint + Stylistic`.
  - Why: Preserves compatibility for existing users while covering community demand for non-Prettier workflow.

## Risks / Trade-offs
- Risk: Existing downstream projects may rely on old generated files or Node baseline.
  - Mitigation: Document migration path and enforce clear major-version release notes.
- Risk: Dual formatter modes increase maintenance/testing matrix.
  - Mitigation: Keep one default and one explicit opt-in mode with dedicated tests.
- Risk: Flat-config migration can impact custom ESLint extension behavior.
  - Mitigation: Provide generated config examples and compatibility guidance in README.

## Migration Plan
1. Define and document 2.0 runtime/toolchain compatibility floor.
2. Update dependencies and generated config templates to gts-aligned modern structure.
3. Implement optional formatter mode selection during `init` (non-interactive + interactive path).
4. Update tests and docs, including explicit migration notes from 1.x.
5. Release as `2.0.0` with breaking-change changelog.

## Open Questions
- Exact minimum Node/TypeScript versions will follow the selected latest gts major and final compatibility verification during implementation.
