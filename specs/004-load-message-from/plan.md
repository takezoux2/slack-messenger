# Implementation Plan: Load message from markdown file

Branch: 004-load-message-from | Date: 2025-09-24 | Spec: E:\program\takezoux2\slack-messenger\specs\004-load-message-from\spec.md
Input: Feature specification from E:\program\takezoux2\slack-messenger\specs\004-load-message-from\spec.md

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → Loaded successfully from absolute path
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project type detected: single TypeScript CLI
   → No NEEDS CLARIFICATION markers present in spec
3. Fill the Constitution Check section based on the constitution
4. Evaluate Constitution Check section
   → No violations; proceed
   → Progress updated: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → Completed; decisions documented; no open unknowns
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent file updated
7. Re-evaluate Constitution Check section
   → No new violations
   → Progress updated: Post-Design Constitution Check PASS
8. Plan Phase 2 → Describe task generation approach (documentation only)
9. STOP - Ready for /tasks command
```

## Summary

Allow users to supply message content from a UTF-8 markdown file for both send and broadcast commands, while preserving the current inline message argument. Enforce a 2,000-character maximum, trim trailing whitespace/newlines, reject non-UTF-8 or empty files, and clearly indicate the source (file vs inline) in verbose/dry-run output. CLI will add a mutually-exclusive option to load from file to maintain backward compatibility with the positional message argument.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 22
**Primary Dependencies**: commander.js, @slack/web-api, js-yaml (existing); Node fs, path, and WHATWG TextDecoder for UTF-8 validation
**Storage**: N/A (stateless)
**Testing**: Vitest with unit, contract, and integration tests
**Target Platform**: Node CLI (Windows, macOS, Linux)
**Project Type**: single
**Performance Goals**: File read/validation under 50ms for typical <10KB messages; linear with file size
**Constraints**: Max message length 2,000 chars; files must be UTF-8; no sensitive content leaked in logs; preserve verbose/dry-run modes
**Scale/Scope**: Single-user CLI invocations; low concurrency; no persistence

## Constitution Check

GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.

- TypeScript-First Development: PASS — all code and new types will be in TypeScript with strict mode.
- Yarn Package Management: PASS — repository uses Yarn; no new deps required.
- Test-First Development (TDD): PASS — plan schedules contract/integration tests before implementation.
- Specification-Driven Development: PASS — spec complete and referenced.
- Slack API Compliance: PASS — no API changes; message content source does not alter API usage.
- TypeScript Standards & Structure: PASS — no structural deviations; single-project layout retained.

## Project Structure

### Documentation (this feature)

```
specs/004-load-message-from/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── contracts/           # Phase 1 output (/plan command)
```

### Source Code (repository root)

```
src/
├── models/
├── services/
└── commands/

tests/
├── contract/
├── integration/
└── unit/
```

Structure Decision: Option 1 (single project) confirmed.

## Phase 0: Outline & Research

Key unknowns and decisions are documented in research.md:

- Robust UTF-8 validation (use TextDecoder with fatal: true)
- Backward-compatible CLI design (positional message OR --message-file)
- Trimming behavior (rstrip whitespace/newlines only)
- Verbose/dry-run output patterns (show source and 200-char preview)
- Consistent enforcement of 2,000-char limit before API call

Output: research.md with decisions and rationale (created).

## Phase 1: Design & Contracts

Artifacts generated:

- data-model.md — defines MessageInput entity and validation rules
- contracts/cli-interface.md — updates CLI contract to include --message-file and exclusivity rules
- quickstart.md — usage examples for file-based messages
- Agent context file updated via update-agent-context.ps1

## Phase 2: Task Planning Approach

This phase will be executed by the /tasks command (not in /plan):

Task Generation Strategy:

- Generate tasks from Phase 1 docs (contracts, data model, quickstart)
- Contracts → contract test tasks [P]
- Entities → model creation tasks [P]
- User stories → integration test tasks
- Implementation tasks to make tests pass

Ordering Strategy:

- TDD order: write failing tests first
- Dependency order: parser/models → services → commands
- Mark [P] for tasks that are parallelizable

Estimated Output: ~15-20 tasks in tasks.md

## Phase 3+: Future Implementation

Out of scope for /plan. Will proceed after tasks.md is generated.

## Complexity Tracking

No deviations from constitution; table intentionally left empty.

## Progress Tracking

Phase Status:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

Gate Status:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---

Based on Constitution v1.0.0 — See E:\program\takezoux2\slack-messenger\.specify\memory\constitution.md
