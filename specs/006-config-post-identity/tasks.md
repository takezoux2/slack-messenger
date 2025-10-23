# Tasks: Config-based Posting Identity

**Input**: Design documents from `/specs/006-config-post-identity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared fixtures and examples so identity behaviour can be exercised consistently across commands and tests.

- [ ] T001 Update shared configuration example with a `sender_identity` block in `channels.yaml` at repo root.
- [ ] T002 Add default `sender_identity` values to `test-config.yml` to support identity-aware tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce core models, parsing, and validation that all user stories require before commands can apply sender identity.

- [ ] T003 Create `src/models/sender-identity.ts` defining resolved and configured sender identity types.
- [ ] T004 Extend `src/models/channel-configuration.ts` to surface optional sender identity configuration metadata.
- [ ] T005 [P] Add sender identity parsing logic to `src/services/yaml-config.service.ts` and persist origin details on the configuration model.
- [ ] T006 [P] Cover sender identity parsing scenarios (emoji vs URL, legacy `icon`) in `tests/unit/services/yaml-config.service.test.ts`.
- [ ] T007 Update `src/services/config-validation.service.ts` with schema rules and error messaging for the `sender_identity` section.
- [ ] T008 Add validation unit tests for sender identity requirements in `tests/unit/services/config-validation.service.test.ts`.
- [ ] T009 Introduce resolved identity metadata storage on `src/models/message-delivery-result.ts` for audit logging.

**Checkpoint**: Identity data can be loaded and validated from configuration before any command logic runs.

---

## Phase 3: User Story 1 - Post message with configured identity (Priority: P1) 🎯 MVP

**Goal**: Ensure `send-message` applies the configured identity and reports the applied values in verbose output.

**Independent Test**: Run `yarn start send-message C1234567890 "Deployment complete" --config ./channels.yaml --verbose` with a configured identity and verify Slack receives the configured name/icon while verbose logs show the resolved identity source.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add identity resolution unit coverage to `tests/unit/services/identity-resolution.service.test.ts`.
- [ ] T011 [US1] Extend `tests/unit/commands/send-message.command.test.ts` (or create if absent) to assert configured identity is passed to SlackService with verbose logging metadata.

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement `src/services/identity-resolution.service.ts` to merge configuration identity data and produce provenance warnings.
- [ ] T013 [US1] Integrate identity loading into `src/config/app-config.ts` so commands receive validated sender identity alongside channel lists.
- [ ] T014 [US1] Update `src/commands/send-message.command.ts` to resolve sender identity, include provenance logs, and supply metadata to delivery results.
- [ ] T015 [US1] Expand `src/services/slack.service.ts` to accept optional sender identity fields when posting messages and record Slack scope failures in metadata.
- [ ] T016 [US1] Capture applied identity details on `src/models/message-delivery-result.ts` instances for verbose/audit output.

**Checkpoint**: Single-channel sends automatically use the configured identity and provide traceability.

---

## Phase 4: User Story 2 - Broadcast with shared identity (Priority: P2)

**Goal**: Ensure broadcasts reuse the shared sender identity across all channels with consistent logging.

**Independent Test**: Execute `yarn start broadcast release-alerts "Deploying now" --config ./channels.yaml --verbose` and confirm each reported channel send includes the configured identity metadata.

### Tests for User Story 2

- [ ] T017 [US2] Add broadcast identity expectations to `tests/integration/cli-identity-flows.test.ts`, covering multi-channel consistency.

### Implementation for User Story 2

- [ ] T018 [US2] Update `src/commands/broadcast-message.command.ts` to resolve and apply sender identity for each delivery, including verbose provenance logs.
- [ ] T019 [US2] Ensure broadcast result aggregation in `src/services/broadcast-dry-run.service.ts` and related helpers preserves sender identity metadata.
- [ ] T020 [US2] Expose identity-aware delivery summaries in `src/services/logging.service.ts` so broadcast verbose output lists the applied identity.

**Checkpoint**: Broadcasts send consistent sender identity across channel lists with clear operator feedback.

---

## Phase 5: User Story 3 - Override fallback handling (Priority: P3)

**Goal**: Prompt operators about incomplete identity data, support overrides, and document fallback provenance.

**Independent Test**: Remove the icon from configuration, run `yarn start send-message C1234567890 "Test" --config ./channels.yaml` interactively to confirm fallback prompt, then rerun with `--allow-default-identity` to verify non-interactive consent.

### Tests for User Story 3

- [ ] T021 [P] [US3] Add prompt consent unit tests covering TTY and non-TTY flows in `tests/unit/utils/prompt.service.test.ts`.
- [ ] T022 [US3] Extend `tests/unit/commands/send-message.command.test.ts` to assert fallback confirmation and CLI override precedence.
- [ ] T023 [US3] Add non-interactive pipeline coverage to `tests/integration/cli-identity-flows.test.ts` for `--allow-default-identity` behaviour.

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create `src/utils/prompt.service.ts` providing TTY-aware confirmation prompts with injectable adapters for tests.
- [ ] T025 [US3] Extend `src/models/command-line-options.ts` with sender override getters and the `allowDefaultIdentity` consent flag.
- [ ] T026 [US3] Register new CLI flags (`--sender-name`, `--sender-icon-emoji`, `--sender-icon-url`, `--allow-default-identity`) in `src/services/cli.service.ts` and plumb them into `CommandLineOptions` construction.
- [ ] T027 [US3] Enhance `src/services/identity-resolution.service.ts` to prioritize CLI overrides, request confirmation via PromptService when identity is incomplete, and emit warnings when falling back.
- [ ] T028 [US3] Update `src/commands/send-message.command.ts` and `src/commands/broadcast-message.command.ts` to use PromptService for fallback consent and respect `--allow-default-identity` in non-interactive runs.
- [ ] T029 [US3] Surface identity provenance and fallback warnings in verbose output via `src/services/logging.service.ts` and delivery summaries.

**Checkpoint**: Operators must explicitly confirm or override identity fallbacks, with automation-friendly flags available.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, schemas, and developer experience for the identity workflow.

- [ ] T030 Refresh schema documentation in `specs/006-config-post-identity/contracts/sender-identity.schema.yaml` to reflect final implementation nuances.
- [ ] T031 Update `README.md` quickstart instructions with sender identity configuration and CLI override guidance.
- [ ] T032 [P] Add regression fixtures for missing identity scenarios in `tests/fixtures/` to support future testing.
- [ ] T033 Perform end-to-end validation of identity workflows via `tests/integration/cli-identity-flows.test.ts` and update snapshots/log expectations.
- [ ] T034 Conduct final lint/test run (`npm test && npm run lint`) and summarize results in release notes or changelog entry if applicable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 → Phase 2**: Foundational work requires shared fixtures to exist.
- **Phase 2 → Phase 3**: User Story 1 depends on identity models, parsing, and validation.
- **Phase 3 → Phase 4**: Broadcast identity relies on send-message identity resolution patterns being available.
- **Phase 4 → Phase 5**: Fallback handling builds atop shared identity workflows established for send and broadcast.
- **Phase 5 → Phase 6**: Polish tasks complete after all user stories are functional.

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2; establishes baseline identity handling.
- **US2 (P2)**: Depends on US1’s identity resolution service and Slack service enhancements.
- **US3 (P3)**: Depends on US1 and US2 for identity plumbing before layering override and consent mechanics.

### Within Each User Story

- Write or update tests before implementing corresponding production changes.
- Implement services/utilities before integrating them into commands and logging.
- Verify verbose/audit metadata after Slack service enhancements are in place.

### Parallel Opportunities

- Tasks marked [P] operate on distinct files or pure test additions and can proceed concurrently.
- Separate contributors can tackle send-message (US1) and broadcast (US2) flows once foundational work is complete.
- Prompt service development (T024) can happen in parallel with CLI flag wiring (T026) after US1 stabilizes.

---

## Parallel Example: User Story 1

```bash
# Parallelizable tasks once foundational types exist
# Developer A: identity resolution service implementation
Task: "T012 [P] [US1] Implement src/services/identity-resolution.service.ts"

# Developer B: identity resolution tests
Task: "T010 [P] [US1] Add identity resolution unit coverage to tests/unit/services/identity-resolution.service.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phases 1 and 2 to load and validate sender identity.
2. Deliver Phase 3 so `send-message` uses configured identity with provenance logging.
3. Run targeted unit tests and a manual send to confirm MVP behaviour.

### Incremental Delivery

1. Ship MVP (US1) with config-driven identity for single sends.
2. Layer US2 to extend identity to broadcasts without regressing single-channel sends.
3. Add US3 to enforce overrides and fallback consent for robustness.
4. Finish with Phase 6 polish tasks, documentation, and regression coverage.

### Parallel Team Strategy

- After Phase 2, assign US1 core logic and tests to one developer while another preps broadcast adaptations (US2) awaiting shared services.
- A third developer can build PromptService (T024) and CLI overrides (T026) in parallel, coordinating with US1 owner for integration points once initial identity resolution lands.

---

