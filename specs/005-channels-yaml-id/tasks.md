# Tasks: Mention Name Mapping & In-Message Placeholder Resolution

Input: Design documents from `specs/005-channels-yaml-id/`
Prerequisites: plan.md (required), research.md, data-model.md, contracts/cli-mention-resolution.md, quickstart.md

Feature Goal: Add placeholder mention resolution (`@{name}` and boundary-limited `@name`) using YAML `mentions:` mapping per channel, integrate into broadcast flow, and emit deterministic summary lines.

> Legend: [P] = Can run in parallel (different files, no dependency/order coupling). Tasks without [P] must be executed in listed order. All test tasks must be written so they FAIL before implementation (TDD gate).

## Phase 3.1: Setup / Environment

These establish branch, fixtures, and confirm dependency surface (no new runtime deps expected).

1. T001 Create / update feature branch 005-channels-yaml-id from latest main (git fetch; git checkout -b 005-channels-yaml-id origin/main or rebase if exists).
2. T002 [P] Add test fixtures directory `tests/fixtures/mentions/` with:
   - `channels.basic.yaml` (has mentions mapping for alice, team-lead)
   - `channels.edge.yaml` (mentions mapping for team-lead only)
   - `message.basic.md` (quickstart example)
   - `message.edge.md` (edge cases: code fence, inline code, block quote, punctuation)
3. T003 [P] Ensure no new npm dependencies required; update `README.md` planned features section (add placeholder mention feature line marked WIP).

## Phase 3.2: Tests First (TDD) – MUST FAIL INITIALLY

Contract, unit, and integration tests authored before any implementation.

4. T004 [P] Contract test for CLI summary output per `contracts/cli-mention-resolution.md` in `tests/contract/cli-mention-resolution.test.ts` (assert textual summary format cases: replacements only, unresolved, none).
5. T005 [P] Unit test tokenizer in `tests/unit/mention-tokenizer.test.ts` covering:
   - Detect `@{name}` & boundary-limited `@name`
   - Skip inside fenced code blocks
   - Skip inline code spans and block quote lines
   - Ignore `@{}` empty
   - Ensure positions captured.
6. T006 [P] Unit test resolver in `tests/unit/mention-resolver.test.ts` (mapping application, unmapped tokens remain, counts aggregation, case sensitivity, duplicate key last-wins scenario using synthetic mapping object).
7. T007 [P] Unit test summary generator in `tests/unit/mention-summary.test.ts` (alphabetical ordering for replacements, unresolved order-of-first-appearance, none cases → `Placeholders: none`).
8. T008 [P] Integration test basic quickstart flow in `tests/integration/mention-broadcast-basic.test.ts` using `channels.basic.yaml` + `message.basic.md` asserting message sent (mock Slack) and summary lines.
9. T009 [P] Integration test edge cases in `tests/integration/mention-broadcast-edge-cases.test.ts` using `channels.edge.yaml` + `message.edge.md` (ensures skipping logic and selective replacements).
10. T010 [P] Integration test dry-run behavior in `tests/integration/mention-broadcast-dry-run.test.ts` (with `--dry-run` flag ensures no Slack call, but summary produced).
11. T011 Add negative unit test for punctuation adjacency in `tests/unit/mention-tokenizer-boundary.test.ts` (ensures `@name,` not replaced for no-brace form; end-of-line works).

## Phase 3.3: Core Model & Service Implementation

Models first, then parsing/resolution service, then configuration & pipeline integration.

12. T012 [P] Implement `MentionMapping` type in `src/models/mention-mapping.ts` per data-model (map loader interface only; no logic yet).
13. T013 [P] Implement `PlaceholderToken` type in `src/models/placeholder-token.ts`.
14. T014 [P] Implement `ResolutionSummary` type in `src/models/resolution-summary.ts`.
15. T015 Create `src/services/mention-resolution.service.ts` scaffold exporting interfaces: `extractTokens(text: string): PlaceholderToken[]`, `applyMentions(text, mapping): { text: string; summary: ResolutionSummary }` with TODO bodies (return pass-through).
16. T016 Implement tokenizer logic in `mention-resolution.service.ts` (single-pass scanner with state for fenced code, inline code, block quotes) – satisfy T005 & T011.
17. T017 Implement resolver + summary aggregation in `mention-resolution.service.ts` (counts, alphabetical sorting, unresolved ordering) – satisfy T006 & T007.
18. T018 Extend YAML config loader `src/services/yaml-config.service.ts` to parse per-channel `mentions:` map producing `MentionMapping` record available during broadcast (ensure no side effects if absent). Update related type in `src/models/channel-configuration.ts` if needed.
19. T019 Integrate mention resolution into broadcast pipeline before Slack send: modify `src/services/slack.service.ts` or the message assembly step (choose layer where final text is available) capturing transformed text and summary object. Provide hook to skip if no placeholders.
20. T020 Update CLI output code (`src/services/console.service.ts` or relevant command) to print deterministic summary lines after broadcast/dry-run (ensuring existing outputs preserved). Must satisfy T004 contract tests.
21. T021 Ensure dry-run path (`broadcast-dry-run.service.ts`) also invokes resolution & summary printing (no Slack API call) – satisfy T010.
22. T022 Add guard + unit test adjustments if necessary for performance (fast path: if `@` absent in string, skip tokenizer) (update service & add assertion in existing unit test file or new `tests/unit/mention-performance-fastpath.test.ts`).

## Phase 3.4: Integration & Validation Enhancements

23. T023 Add validation in `config-validation.service.ts` for `mentions:` map shape (string→string; ignore non-string values) with unit test `tests/unit/mentions-config-validation.test.ts`.
24. T024 Add additional integration test for multiple channels each with its own mentions mapping in `tests/integration/mention-multi-channel.test.ts` (ensures channel-specific resolution).
25. T025 Add integration test ensuring unmapped placeholders remain literal and reported summary in `tests/integration/mention-unmapped.test.ts`.
26. T026 Refactor mention-resolution service for purity & export internal helper for test clarity (if complexity > ~150 LOC) – keep public API stable.
27. T027 Add logging (debug level) around resolution counts in `src/services/logging.service.ts` (only when placeholders found) without changing summary output.

## Phase 3.5: Polish & Documentation

28. T028 [P] Add exhaustive unit tests for edge parsing (consecutive placeholders, start/end of file, large counts) in `tests/unit/mention-tokenizer-exhaustive.test.ts`.
29. T029 [P] Add performance benchmark test (Vitest approximate timing) in `tests/unit/mention-performance.test.ts` (generate message with 500 placeholders, assert runtime < 5ms average or mark as informational without hard fail if environment variance).
30. T030 Update `README.md` & `quickstart.md` with final syntax, summary examples, and note about skipped regions (remove WIP label). Include config example.
31. T031 Update `specs/005-channels-yaml-id/spec.md` reference section if needed and ensure tasks.md cross-links added.
32. T032 Run full test suite + lint; fix any remaining style issues; finalize feature branch for PR.
33. T033 Prepare CHANGELOG entry (if project uses one; else append to README change log section) summarizing feature.
34. T034 Remove any leftover TODO comments related to mention feature and ensure code comments concise.

## Dependencies Summary

- T001 precedes all implementation tasks.
- Fixtures (T002) required before integration tests (T008-T010, T024-T025).
- Contract & unit/integration tests (T004-T011) must exist and fail before implementing models/services (T012+).
- Model types (T012-T014) before service implementation (T015-T017) if tests import them. (Parallel safe if tests reference non-existing modules initially; recommended order ensures compile.)
- T016 depends on T015; T017 depends on T016.
- Config loader extension (T018) depends on model types (T012) and may be performed in parallel with T017 only after types exist.
- Pipeline integration (T019-T021) depends on resolver implementation (T017) & config loader (T018).
- Fast path optimization (T022) depends on baseline service working (T016-T017).
- Validation (T023) depends on config loader (T018).
- Additional integration tests (T024-T025) depend on full pipeline (T019-T021).
- Refactor (T026) after core correctness established (post T017) and before extensive polish tests (T028-T029) to avoid churn.
- Logging (T027) after integration (T019) so it can hook into final summary data.
- Polish tasks (T028-T034) after all core & integration tasks done.

## Parallel Execution Guidance

Example 1 (after T001):
Run in parallel: T002, T003

Example 2 (tests authoring phase):
Parallel group: T004, T005, T006, T007, T008, T009, T010, T011 (distinct files)

Example 3 (model creation):
Parallel group: T012, T013, T014

Example 4 (polish exhaustive tests):
Parallel group: T028, T029, T030 (docs independent), T033 (CHANGELOG) – ensure core complete first.

## Task → File Mapping Quick Index

- Models: src/models/mention-mapping.ts, placeholder-token.ts, resolution-summary.ts
- Service: src/services/mention-resolution.service.ts
- Config changes: src/services/yaml-config.service.ts, src/models/channel-configuration.ts
- Pipeline: slack.service.ts, broadcast-dry-run.service.ts, console.service.ts
- Validation: config-validation.service.ts
- Tests (contract): tests/contract/cli-mention-resolution.test.ts
- Tests (unit): tests/unit/_mention_.test.ts
- Tests (integration): tests/integration/mention-\*.test.ts
- Fixtures: tests/fixtures/mentions/\*

## Validation Checklist (GATE before marking feature complete)

- [ ] All tasks T004-T011 implemented & were failing before implementation commits
- [ ] All model & service tasks complete (T012-T021)
- [ ] Summary output matches contract for all scenarios
- [ ] Edge cases (code fences, inline code, block quotes, punctuation) covered & passing
- [ ] Performance test indicates linear behavior (informational threshold)
- [ ] Docs updated (T030) & changelog (T033)
- [ ] No leftover TODOs (T034)

## Notes

- Avoid regex backtracking complexity; manual parser per research.
- Maintain deterministic alphabetical ordering for summary replacements.
- Ensure unresolved list preserves first appearance ordering (store Set for seen, Array for order).
- Keep service pure; no I/O inside tokenizer/resolver.

---

Ready for Phase 3 execution. Follow numbering & parallel guidance strictly to preserve TDD discipline.
