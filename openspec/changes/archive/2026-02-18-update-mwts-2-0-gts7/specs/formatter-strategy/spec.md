## ADDED Requirements
### Requirement: Default Formatter Strategy SHALL Remain Prettier Plus ESLint
`mwts` 2.0 SHALL keep `Prettier + ESLint` as the default formatter/lint strategy for initialized projects.

#### Scenario: User runs init with default options
- **WHEN** a user runs `mwts init` without selecting a custom formatter strategy
- **THEN** generated project configuration SHALL include Prettier-integrated lint workflow
- **AND** generated scripts SHALL support standard `lint` and `fix` flows

### Requirement: Init SHALL Support an Optional ESLint Stylistic Strategy
`mwts` 2.0 SHALL provide a user-selectable option to generate a project using `ESLint + Stylistic` instead of Prettier.

#### Scenario: User opts into stylistic mode
- **WHEN** a user explicitly selects the stylistic formatter option during `mwts init`
- **THEN** generated dependencies and config SHALL omit required Prettier integration for formatting
- **AND** generated lint/style setup SHALL be consistent with ESLint Stylistic mode

#### Scenario: Non-interactive automation selects stylistic mode
- **WHEN** a user runs `mwts init` in non-interactive automation and passes the formatter mode selection explicitly
- **THEN** initialization SHALL apply the stylistic mode deterministically without interactive prompts
