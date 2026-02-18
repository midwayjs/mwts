# core-toolchain Specification

## Purpose
TBD - created by archiving change update-mwts-2-0-gts7. Update Purpose after archive.
## Requirements
### Requirement: Mwts 2.0 MUST Adopt a Modern gts-Aligned Toolchain Baseline
`mwts` 2.0 SHALL upgrade its core linting and formatting ecosystem to versions compatible with the latest supported `gts` major baseline, including modern ESLint and TypeScript ESLint tooling.

#### Scenario: Fresh install uses modern dependency baseline
- **WHEN** a maintainer installs dependencies for `mwts` 2.0
- **THEN** the repository dependency graph SHALL include modern supported major versions aligned with latest `gts`
- **AND** installation SHALL not rely on the legacy ESLint 7-era baseline

#### Scenario: Init generates modern lint config model
- **WHEN** a user runs `mwts init` in a new project
- **THEN** generated lint configuration SHALL follow the modern gts-compatible model
- **AND** generated dependencies/scripts SHALL be compatible with that model

### Requirement: Mwts 2.0 MUST Be Explicitly Breaking with Documented Compatibility Floor
`mwts` 2.0 SHALL define and document its minimum supported Node.js and TypeScript versions as part of the release.

#### Scenario: Consumer checks compatibility before adoption
- **WHEN** a consumer reads project docs or package metadata for `mwts` 2.0
- **THEN** minimum Node.js and TypeScript compatibility SHALL be clearly stated
- **AND** compatibility SHALL reflect the upgraded gts/toolchain constraints

