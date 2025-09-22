# Tasks: Send Slack Message to Channel

**Input**: Design documents from `/specs/002-send-slack-message/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Completed: TypeScript 5.x + Node.js 21+, @slack/web-api, commander.js
2. Load optional design documents:
   → data-model.md: SlackMessage, ChannelTarget, AuthenticationCredentials, CommandLineOptions, MessageDeliveryResult
   → contracts/: cli-interface.md, slack-api.md → contract test tasks
   → research.md: Slack SDK decisions, CLI patterns, retry strategies
3. Generate tasks by category:
   → Setup: dependencies, linting setup
   → Tests: CLI contract tests, Slack API contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: main entry point, error handling
   → Polish: unit tests, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → CLI contract tests ✓
   → Slack API contract tests ✓
   → All entities have models ✓
   → Integration tests from quickstart ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md structure decision)
- All paths shown below follow existing project structure

## Phase 3.1: Setup

- [x] T001 Install new dependencies: yarn add @slack/web-api commander
- [x] T002 [P] Update TypeScript configuration for new dependencies in tsconfig.json
- [x] T003 [P] Configure ESLint rules for new CLI patterns in existing config

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T004 [P] CLI interface contract test in tests/contract/cli-interface.test.ts
- [ ] T005 [P] Slack API contract test in tests/contract/slack-api.test.ts
- [ ] T006 [P] Integration test: basic message sending in tests/integration/send-message.test.ts
- [ ] T007 [P] Integration test: error scenarios in tests/integration/error-handling.test.ts
- [ ] T008 [P] Integration test: verbose logging in tests/integration/verbose-mode.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [ ] T009 [P] SlackMessage model with validation in src/models/slack-message.ts
- [ ] T010 [P] ChannelTarget model with ID validation in src/models/channel-target.ts
- [ ] T011 [P] AuthenticationCredentials model in src/models/authentication-credentials.ts
- [ ] T012 [P] CommandLineOptions model in src/models/command-line-options.ts
- [ ] T013 [P] MessageDeliveryResult model in src/models/message-delivery-result.ts
- [ ] T014 Slack service with API integration in src/services/slack.service.ts
- [ ] T015 CLI service with argument parsing in src/services/cli.service.ts
- [ ] T016 Send message command implementation in src/commands/send-message.command.ts

## Phase 3.4: Integration

- [ ] T017 Main application entry point with commander.js in src/main.ts
- [ ] T018 Error handling and exit codes in src/services/error-handler.service.ts
- [ ] T019 Logging service with verbose support in src/services/logging.service.ts
- [ ] T020 Environment configuration loader in src/config/environment-config.ts

## Phase 3.5: Polish

- [ ] T021 [P] Unit tests for SlackMessage model in tests/unit/slack-message.test.ts
- [ ] T022 [P] Unit tests for validation utilities in tests/unit/validation.test.ts
- [ ] T023 [P] Unit tests for retry logic in tests/unit/retry.test.ts
- [ ] T024 [P] Performance test: message sending latency in tests/integration/performance.test.ts
- [ ] T025 [P] Update README.md with send-message command documentation
- [ ] T026 [P] Add JSDoc comments to all public interfaces
- [ ] T027 Run quickstart.md validation scenarios

## Dependencies

- Setup (T001-T003) before all other tasks
- Tests (T004-T008) before implementation (T009-T020)
- Models (T009-T013) before services (T014-T015)
- Services (T014-T015) before commands (T016)
- Commands (T016) before main integration (T017)
- Core integration (T017-T020) before polish (T021-T027)

## Parallel Example - Phase 3.2 (Test Creation)

```bash
# Launch T004-T008 together (all different files):
Task: "CLI interface contract test in tests/contract/cli-interface.test.ts"
Task: "Slack API contract test in tests/contract/slack-api.test.ts"
Task: "Integration test: basic message sending in tests/integration/send-message.test.ts"
Task: "Integration test: error scenarios in tests/integration/error-handling.test.ts"
Task: "Integration test: verbose logging in tests/integration/verbose-mode.test.ts"
```

## Parallel Example - Phase 3.3 (Model Creation)

```bash
# Launch T009-T013 together (all different files):
Task: "SlackMessage model with validation in src/models/slack-message.ts"
Task: "ChannelTarget model with ID validation in src/models/channel-target.ts"
Task: "AuthenticationCredentials model in src/models/authentication-credentials.ts"
Task: "CommandLineOptions model in src/models/command-line-options.ts"
Task: "MessageDeliveryResult model in src/models/message-delivery-result.ts"
```

## Task Details

### T004: CLI Interface Contract Test

- File: `tests/contract/cli-interface.test.ts`
- Test scenarios from contracts/cli-interface.md:
  - Valid arguments acceptance
  - Help/version display
  - Missing arguments handling
  - Invalid channel format detection
  - Empty message rejection
  - Missing token detection
  - Verbose flag functionality
  - Exit code validation

### T005: Slack API Contract Test

- File: `tests/contract/slack-api.test.ts`
- Test scenarios from contracts/slack-api.md:
  - Authentication with valid/invalid tokens
  - Channel validation (valid/invalid/inaccessible)
  - Message content validation (plain text/markdown/empty/large)
  - Error handling (rate limiting/network/server errors)
  - Response processing (success/error/malformed)

### T006-T008: Integration Tests

- Files: `tests/integration/send-message.test.ts`, `error-handling.test.ts`, `verbose-mode.test.ts`
- Scenarios from quickstart.md validation tests:
  - Basic functionality (exit code 0)
  - Invalid channel ID (exit code 1)
  - Missing token (exit code 2)
  - Empty message (exit code 1)
  - Help command (exit code 0)
  - Verbose logging output

### T009-T013: Data Models

- Files: Individual model files in `src/models/`
- Entities from data-model.md with TypeScript interfaces
- Validation logic for each entity
- State transitions where applicable
- Immutable patterns and type safety

### T014-T016: Service Layer

- Files: `src/services/slack.service.ts`, `cli.service.ts`, `src/commands/send-message.command.ts`
- Slack API integration with retry logic
- CLI argument parsing with commander.js
- Business logic bridging models and API

### T017-T020: Application Integration

- Files: `src/main.ts`, error handling, logging, config
- Main entry point with command routing
- Comprehensive error handling with proper exit codes
- Logging with verbosity levels
- Environment configuration loading

## Constitutional Compliance Checklist

- [x] **TypeScript-First**: All tasks specify TypeScript files with strict typing
- [x] **Test-First Development**: Tests (T004-T008) must complete before implementation
- [x] **Yarn Package Management**: T001 uses yarn for dependency installation
- [x] **Slack API Compliance**: T005, T014 implement proper rate limiting and error handling
- [x] **Specification-Driven**: All tasks derive from design documents

## Validation Checklist

_GATE: Checked before task execution_

- [x] All contracts have corresponding tests (T004: CLI, T005: Slack API)
- [x] All entities have model tasks (T009-T013: 5 models from data-model.md)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files marked [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Integration scenarios from quickstart.md covered (T006-T008)
- [x] CLI contract scenarios covered (T004)
- [x] Slack API contract scenarios covered (T005)

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Follow TDD cycle: Red → Green → Refactor
- Commit after each task completion
- Use existing project linting and formatting standards
- All new code must pass constitutional compliance checks
