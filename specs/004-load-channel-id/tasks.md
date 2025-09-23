# Tasks: Multi-Channel Message Broadcasting

**Input**: Design documents from `/specs/004-load-channel-id/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → COMPLETE: TypeScript 5.x + Node.js 21+, @slack/web-api, commander.js, js-yaml
2. Load optional design documents:
   → data-model.md: 9 entities extracted → 9 model tasks
   → contracts/: cli-interface.md, slack-api.md → 4 contract test tasks
   → research.md: YAML parsing, CLI patterns → setup tasks
3. Generate tasks by category:
   → Setup: js-yaml dependency, YAML validation, linting
   → Tests: CLI contract tests, Slack API mocks, integration tests
   → Core: models, services, CLI commands
   → Integration: YAML loading, multi-channel delivery
   → Polish: unit tests, error handling, documentation
4. Apply task rules:
   → Different files = marked [P] for parallel
   → CLI integration = sequential (shared commander setup)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests ✓
   → All entities have models ✓
   → All CLI commands implemented ✓
9. Return: SUCCESS (36 tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per implementation plan)
- TypeScript project with existing structure maintained

## Phase 3.1: Setup

- [ ] T001 Add js-yaml dependency via yarn and update package.json
- [ ] T002 [P] Create TypeScript types for @types/js-yaml in package.json
- [ ] T003 [P] Configure ESLint rules for YAML imports and new models

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests

- [ ] T004 [P] CLI broadcast command contract test in tests/contract/cli-broadcast.test.ts
- [ ] T005 [P] CLI list-channels command contract test in tests/contract/cli-list-channels.test.ts
- [ ] T006 [P] Slack API conversations.list contract test in tests/contract/slack-conversations-list.test.ts
- [ ] T007 [P] Slack API chat.postMessage batch contract test in tests/contract/slack-chat-post-batch.test.ts

### Integration Tests

- [ ] T008 [P] Broadcast to named list integration test in tests/integration/broadcast-message.test.ts
- [ ] T009 [P] YAML configuration loading integration test in tests/integration/yaml-config-loading.test.ts
- [ ] T010 [P] Dry-run preview integration test in tests/integration/dry-run-broadcast.test.ts
- [ ] T011 [P] Partial delivery failure handling integration test in tests/integration/partial-failure.test.ts
- [ ] T012 [P] Channel resolution with mixed IDs/names integration test in tests/integration/channel-resolution.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models

- [ ] T013 [P] ChannelConfiguration interface in src/models/channel-configuration.ts
- [ ] T014 [P] NamedChannelList interface in src/models/named-channel-list.ts
- [ ] T015 [P] ChannelTarget interface in src/models/channel-target.ts
- [ ] T016 [P] ResolvedChannel interface in src/models/resolved-channel.ts
- [ ] T017 [P] BroadcastMessage interface in src/models/broadcast-message.ts
- [ ] T018 [P] BroadcastResult interface in src/models/broadcast-result.ts
- [ ] T019 [P] ChannelDeliveryResult interface in src/models/channel-delivery-result.ts
- [ ] T020 [P] BroadcastOptions interface in src/models/broadcast-options.ts
- [ ] T021 [P] ListSelector interface in src/models/list-selector.ts

### Configuration Service

- [ ] T022 [P] YAML configuration loader in src/services/yaml-config.service.ts
- [ ] T023 [P] Configuration validation service in src/services/config-validation.service.ts

### Slack Service Extensions

- [ ] T024 Channel resolution service methods in src/services/slack.service.ts
- [ ] T025 Broadcast delivery service methods in src/services/slack.service.ts
- [ ] T026 [P] Dry-run simulation service in src/services/broadcast-dry-run.service.ts

### CLI Commands

- [ ] T027 Broadcast command implementation in src/commands/broadcast-message.command.ts
- [ ] T028 List-channels command implementation in src/commands/list-channels.command.ts
- [ ] T029 CLI argument parsing for broadcast options in src/services/cli.service.ts

## Phase 3.4: Integration

- [ ] T030 YAML configuration file loading integration in src/config/app-config.ts
- [ ] T031 Multi-channel delivery orchestration in src/services/slack.service.ts
- [ ] T032 Error aggregation and reporting in src/services/error-handler.service.ts
- [ ] T033 Console output formatting for broadcast results in src/services/console.service.ts

## Phase 3.5: Polish

- [ ] T034 [P] Unit tests for YAML validation in tests/unit/yaml-validation.test.ts
- [ ] T035 [P] Unit tests for channel resolution in tests/unit/channel-resolution.test.ts
- [ ] T036 [P] Error handling edge cases in tests/unit/error-handling.test.ts

## Dependencies

- Setup (T001-T003) before all other tasks
- Contract tests (T004-T007) before any implementation
- Integration tests (T008-T012) before implementation
- Models (T013-T021) before services (T022-T026)
- Services before CLI commands (T027-T029)
- CLI commands before integration (T030-T033)
- Integration before polish (T034-T036)

## Parallel Execution Examples

### Phase 3.2 Contract Tests (Run Together)

```bash
# All contract tests can run in parallel - different files
Task: "CLI broadcast command contract test in tests/contract/cli-broadcast.test.ts"
Task: "CLI list-channels command contract test in tests/contract/cli-list-channels.test.ts"
Task: "Slack API conversations.list contract test in tests/contract/slack-conversations-list.test.ts"
Task: "Slack API chat.postMessage batch contract test in tests/contract/slack-chat-post-batch.test.ts"
```

### Phase 3.2 Integration Tests (Run Together)

```bash
# All integration tests can run in parallel - different files
Task: "Broadcast to named list integration test in tests/integration/broadcast-message.test.ts"
Task: "YAML configuration loading integration test in tests/integration/yaml-config-loading.test.ts"
Task: "Dry-run preview integration test in tests/integration/dry-run-broadcast.test.ts"
Task: "Partial delivery failure handling integration test in tests/integration/partial-failure.test.ts"
```

### Phase 3.3 Data Models (Run Together)

```bash
# All model interfaces can be created in parallel - different files
Task: "ChannelConfiguration interface in src/models/channel-configuration.ts"
Task: "NamedChannelList interface in src/models/named-channel-list.ts"
Task: "ChannelTarget interface in src/models/channel-target.ts"
Task: "BroadcastMessage interface in src/models/broadcast-message.ts"
Task: "BroadcastResult interface in src/models/broadcast-result.ts"
```

### Phase 3.5 Unit Tests (Run Together)

```bash
# Unit tests can run in parallel - different files
Task: "Unit tests for YAML validation in tests/unit/yaml-validation.test.ts"
Task: "Unit tests for channel resolution in tests/unit/channel-resolution.test.ts"
Task: "Error handling edge cases in tests/unit/error-handling.test.ts"
```

## Task Details

### Key Implementation Notes

- **T024-T025**: Extend existing SlackService with new methods, don't modify existing send-message functionality
- **T027-T028**: Add new commander.js commands following existing pattern in src/commands/
- **T029**: Extend CLI service to parse new broadcast-specific options
- **T030**: Integrate YAML loading into existing app-config.ts structure

### Testing Strategy

- **Contract Tests**: Mock @slack/web-api responses, validate CLI argument parsing
- **Integration Tests**: End-to-end flows with test YAML configurations
- **Unit Tests**: Focus on validation logic, error handling, edge cases

### Configuration Test Data

```yaml
# Use in tests/fixtures/test-channels.yaml
channel_lists:
  test-team:
    - '#test-channel'
    - 'C1234567890'
  small-list:
    - '#general'
```

## Validation Checklist

_GATE: Checked before execution_

- [x] All contracts have corresponding tests (CLI + Slack API)
- [x] All entities have model tasks (9 models)
- [x] All tests come before implementation (TDD enforced)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Existing functionality preserved (extends, doesn't modify)
- [x] Constitutional compliance (TypeScript-first, test-first, Slack API patterns)
