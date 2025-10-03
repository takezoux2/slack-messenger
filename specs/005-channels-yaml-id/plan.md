# Implementation Plan: Mention Name Mapping & In-Message Placeholder Resolution

**Branch**: `005-channels-yaml-id` | **Date**: 2025-09-30 | **Spec**: `specs/005-channels-yaml-id/spec.md`
**Input**: Feature specification from `/specs/005-channels-yaml-id/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Add support for author-friendly placeholder tokens in message bodies (`@{name}` and boundary-limited `@name`) that resolve to Slack user mentions using a new mention mapping section within existing `channels.yaml` configuration. Unmapped tokens remain literal. Replacements are skipped in code blocks, inline code, and block quotes. Always output a deterministic summary listing replaced keys with counts, unresolved placeholders, and a total. No artificial limits on number of mappings or placeholders; performance is linear in token count. Case-sensitive lookup; last duplicate key wins.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 22)  
**Primary Dependencies**: @slack/web-api, commander.js, js-yaml  
**Storage**: YAML configuration file (`channels.yaml`); no database  
**Testing**: Vitest (existing suite: contract, integration, unit)  
**Target Platform**: CLI execution on Node.js (cross-platform)  
**Project Type**: Single CLI / library project  
**Performance Goals**: Negligible CPU impact for typical message sizes (< 5ms per message for <500 placeholders; linear scan)  
**Constraints**: Preserve message formatting; zero mutation outside defined patterns; stable summary output  
**Scale/Scope**: Expected tens to low hundreds of mappings; messages typically < 5000 chars; no imposed artificial limits

Unknowns resolved: No remaining NEEDS CLARIFICATION markers; chosen policy: no limits.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution file is a placeholder scaffold (principles not yet populated). No explicit governance or constraints beyond general test-first & simplicity ethos inferred from repository patterns. Plan aligns with simplicity (single-pass parser, no over-engineering). No violations identified.

Initial Constitution Check: PASS

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

ios/ or android/

### Source Code (repository root)

```
src/
├── main.ts
├── commands/
├── config/
├── models/            # Add new model(s) if needed (e.g., mention token entity) (optional)
└── services/          # Add mention resolution service (new)

tests/
├── contract/          # Add contract test for CLI summary output & placeholder behavior
├── integration/       # Add integration tests for end-to-end message send with placeholders
└── unit/              # Add unit tests for tokenizer/resolver
```

**Structure Decision**: Single-project CLI; extend `services` with a mention resolution service; potentially small helper in `models` only if structuring token shapes improves clarity (otherwise inline types in service). No new top-level packages.

## Phase 0: Outline & Research

All functional ambiguities removed; minimal research needed. Focus areas validated:

1. Token parsing approach: single-pass line-oriented scan excluding fenced/inline code & block quotes.
2. Boundary detection for no-brace form: regex vs manual scan – choose manual scan for precise boundary control & lower false positives.
3. Summary output format: adopt stable multi-line human-readable with deterministic ordering (alphabetical by key for replacements; lexical order of appearance for unresolved). Provide future extensibility for machine parsing if needed.

Research Findings (see `research.md`):

- Decision: Manual parser vs complex regex chain.
- Decision: Deterministic summary format described below.
- Decision: No artificial limits; rely on Slack message size.
- Decision: Case-sensitive maps; last key wins implemented via sequential overwrite.

Output: `research.md` created with decisions, rationale, alternatives.

## Phase 1: Design & Contracts

Prerequisite satisfied (research complete).

1. Entities & Data Model: Define MentionMapping, PlaceholderToken, ResolutionSummary in `data-model.md`.
2. Contracts: Feature is internal CLI enhancement; no HTTP API. Provide a CLI contract spec: input message file + config → output summary structure. Represent contract as a markdown pseudo-schema under `contracts/cli-mention-resolution.md` plus a JSON example.
3. Contract Tests: Add contract test asserting summary output shape & counts (failing initially). Additional unit tests for tokenizer & resolver; integration test for end-to-end broadcast including unmapped tokens.
4. Scenarios mapped from spec acceptance cases to integration tests; quickstart shows minimal config + message file and expected summary lines.
5. Update agent context file using provided script after design artifacts exist.

Outputs produced in this phase: `data-model.md`, `contracts/cli-mention-resolution.md`, `quickstart.md` (draft), placeholder for contract test names documented (tests not created by /plan per template— will be tasks later).

Post-Design Constitution Check: PASS (still simple, no over-engineering).

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy** (for /tasks):

- Derive tasks from: entities (parser, resolver, summary), contracts (CLI summary contract), acceptance scenarios.
- Each acceptance scenario → integration test task [P]
- Unit test tasks: tokenizer, resolver (mapped + unmapped, boundaries, skip regions) [P]
- Contract test task: summary format [P]
- Implementation tasks follow after failing tests: implement parser, integrate into send path, summary generator, config loading extension, dry-run support.
- Refactor tasks: ensure idempotent replacements, performance pass for large placeholder counts.

**Ordering Strategy**:

1. Data model types
2. Tokenizer unit tests → tokenizer implementation
3. Resolver unit tests → resolver implementation
4. Summary contract test → summary generator
5. Integration tests (scenarios) → CLI integration changes
6. Edge cases & refactors

Estimated Output: ~15-18 tasks (feature scope is narrow; fewer than generic template estimate).

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
