# Tasks: Mention Name Mapping & In-Message Placeholder Resolution

Input: Design documents from `specs/005-channels-yaml-id/`
Prerequisites: plan.md (required), research.md, data-model.md, contracts/cli-mention-resolution.md, quickstart.md

Feature Goal: Add placeholder mention resolution (`@{name}` and boundary-limited `@name`) using a global root-level YAML `mentions:` mapping (entries as objects: `{ id, type? }`) applied to all channels, supporting `type: user` → `<@id>`, `type: team` → `<!subteam^id>`, built-in `@here` / `@{here}` → `<!here>`, and emitting deterministic summary lines.

> Legend: [P] = Can run in parallel (different files, no dependency/order coupling). Tasks without [P] must be executed in listed order. All test tasks must be written so they FAIL before implementation (TDD gate).

## Phase 3.1: Setup / Environment

These establish branch, fixtures, and confirm dependency surface (no new runtime deps expected).

1. [x] T001 Create / update feature branch 005-channels-yaml-id from latest main (git fetch; git checkout -b 005-channels-yaml-id origin/main or rebase if exists).
2. [x] T002 [P] Add test fixtures directory `tests/fixtures/mentions/` with:
   - `channels.basic.yaml` (has mentions mapping for alice, team-lead)
   - `channels.edge.yaml` (mentions mapping for team-lead only)
   - `message.basic.md` (quickstart example)
   - `message.edge.md` (edge cases: code fence, inline code, block quote, punctuation)
3. [x] T003 [P] Ensure no new npm dependencies required; update `README.md` planned features section (add placeholder mention feature line marked WIP).

## Phase 3.2: Tests First (TDD) – MUST FAIL INITIALLY

Contract, unit, and integration tests authored before any implementation.

4. [x] T004 [P] Contract test for CLI summary output per `contracts/cli-mention-resolution.md` in `tests/contract/cli-mention-resolution.test.ts` (assert textual summary format cases: replacements only, unresolved, none).
5. [x] T005 [P] Unit test tokenizer in `tests/unit/mention-tokenizer.test.ts` covering:
   - Detect `@{name}` & boundary-limited `@name`
   - Skip inside fenced code blocks
   - Skip inline code spans and block quote lines
   - Ignore `@{}` empty
   - Ensure positions captured.
6. [x] T006 [P] Unit test resolver in `tests/unit/mention-resolver.test.ts` (mapping application with entry objects `{ id, type }`, unmapped tokens remain, counts aggregation, case sensitivity, duplicate key last-wins scenario).
7. [x] T007 [P] Unit test summary generator in `tests/unit/mention-summary.test.ts` (alphabetical ordering for replacements, unresolved order-of-first-appearance, none cases → `Placeholders: none`).
8. [x] T008 [P] Unit test built-in `here` tokens in `tests/unit/mention-here.test.ts` (both `@here ` and `@{here}` replaced with `<!here>` without mapping entry; counts under key `here`).
9. [x] T009 [P] Unit test team type replacement in `tests/unit/mention-team-type.test.ts` (entry `{ id: S123, type: 'team' }` → `<!subteam^S123>` replacement, counts use key not id).
10. [x] T010 [P] Unit test invalid or missing type fallback in `tests/unit/mention-invalid-type.test.ts` (unknown `type: 'x'` behaves as `user`; omitted type defaults to `user`).
11. [x] T011 [P] Integration test basic quickstart flow in `tests/integration/mention-broadcast-basic.test.ts` using `channels.basic.yaml` + `message.basic.md` (object-form entries) asserting message sent (mock Slack) and summary lines.
12. [x] T012 [P] Integration test edge cases in `tests/integration/mention-broadcast-edge-cases.test.ts` using `channels.edge.yaml` + `message.edge.md` (ensures skipping logic and selective replacements including `here`).
13. [x] T013 [P] Integration test dry-run behavior in `tests/integration/mention-broadcast-dry-run.test.ts` (with `--dry-run` flag ensures no Slack call, but summary produced).
14. [x] T014 Add negative unit test for punctuation adjacency in `tests/unit/mention-tokenizer-boundary.test.ts` (ensures `@name,` not replaced for no-brace form; end-of-line works).

## Phase 3.3: Core Model & Service Implementation

Models first, then parsing/resolution service, then configuration & pipeline integration.

15. [x] T015 [P] Implement `MentionMapping` & `MentionEntry` types in `src/models/mention-mapping.ts` per data-model (interface only; no logic yet).
16. [x] T016 [P] Implement `PlaceholderToken` type in `src/models/placeholder-token.ts`.
17. [x] T017 [P] Implement `ResolutionSummary` type in `src/models/resolution-summary.ts`.
18. [x] T018 Create `src/services/mention-resolution.service.ts` scaffold exporting: `extractTokens(text: string): PlaceholderToken[]`, `applyMentions(text: string, mapping: Record<string, MentionEntry>): { text: string; summary: ResolutionSummary }` with TODO bodies (return pass-through).
19. [x] T019 Implement tokenizer logic in `mention-resolution.service.ts` (single-pass scanner with state for fenced code, inline code, block quotes) – satisfy T005 & T014.
20. [x] T020 Implement resolver + summary aggregation & type-based formatting (`user` / `team` / built-in here) in `mention-resolution.service.ts` (counts, alphabetical sorting, unresolved ordering) – satisfy T006-T010.
21. [x] T021 Extend YAML config loader `src/services/yaml-config.service.ts` to parse root-level `mentions:` map into entry objects (validate object shape, default missing/invalid type to `user`). Update related type in `src/models/channel-configuration.ts` only if root-level typing needed.
22. [x] T022 Integrate mention resolution into broadcast pipeline before Slack send: modify appropriate service (e.g., `slack.service.ts` or message assembly layer) capturing transformed text and summary object. Provide hook to skip if no placeholders.
23. [x] T023 Update CLI output code (`src/services/console.service.ts` or relevant command) to print deterministic summary lines after broadcast/dry-run (ensuring existing outputs preserved). Must satisfy T004 contract tests.
24. [x] T024 Ensure dry-run path (`broadcast-dry-run.service.ts`) also invokes resolution & summary printing (no Slack API call) – satisfy T013.
25. [x] T025 Add guard + unit test adjustments if necessary for performance (fast path: if `@` absent in string, skip tokenizer) (update service & add assertion in existing unit test file or new `tests/unit/mention-performance-fastpath.test.ts`).

## Phase 3.4: Integration & Validation Enhancements

26. [x] T026 Add validation in `config-validation.service.ts` for `mentions:` map entry object shape (id required, optional type) with unit test `tests/unit/mentions-config-validation.test.ts`.
27. T027 Add additional integration test with multiple channels present validating the single global mapping usage in `tests/integration/mention-multi-channel.test.ts` (ensures uniform resolution across channels including team & here tokens if present).
28. T028 Add integration test ensuring unmapped placeholders remain literal and reported summary in `tests/integration/mention-unmapped.test.ts`.
29. T029 Refactor mention-resolution service for purity & export internal helper for test clarity (if complexity > ~150 LOC) – keep public API stable.
30. T030 Add logging (debug level) around resolution counts in `src/services/logging.service.ts` (only when placeholders found) without changing summary output.

## Phase 3.5: Polish & Documentation

31. T031 [P] Add exhaustive unit tests for edge parsing (consecutive placeholders, start/end of file, large counts) in `tests/unit/mention-tokenizer-exhaustive.test.ts`.
32. T032 [P] Add performance benchmark test (Vitest approximate timing) in `tests/unit/mention-performance.test.ts` (generate message with 500 placeholders, assert runtime < 5ms average or mark as informational without hard fail if environment variance).
33. T033 Update `README.md` & `quickstart.md` with final syntax (entry object, team, here), summary examples, and note about skipped regions (remove WIP label). Include config example.
34. T034 Update `specs/005-channels-yaml-id/spec.md` reference section if needed and ensure tasks.md cross-links added (reflect FR-028).
35. T035 Run full test suite + lint; fix any remaining style issues; finalize feature branch for PR.
36. T036 Prepare CHANGELOG entry (if project uses one; else append to README change log section) summarizing feature.
37. T037 Remove any leftover TODO comments related to mention feature and ensure code comments concise.

## Dependencies Summary

- T001 precedes all implementation tasks.
- Fixtures (T002) required before integration tests (T008-T010, T024-T025).
- Contract & unit/integration tests (T004-T014) must exist and fail before implementing models/services (T015+).
- Model types (T015-T017) before service scaffold (T018) and implementation (T019-T020).
- T019 depends on T018; T020 depends on T019.
- Config loader extension (T021) depends on model types (T015) & resolver interface (T018).
- Pipeline integration (T022-T024) depends on resolver implementation (T020) & config loader (T021).
- Fast path optimization (T025) depends on baseline service working (T019-T020).
- Validation (T026) depends on config loader (T021).
- Additional integration tests (T027-T028) depend on full pipeline (T022-T024).
- Refactor (T029) after core correctness established (post T020) and before extensive polish tests (T031-T032) to avoid churn.
- Logging (T030) after integration (T022) so it can hook into final summary data.
- Polish tasks (T031-T037) after all core & integration tasks done.

## Parallel Execution Guidance

Example 1 (after T001):
Run in parallel: T002, T003

Example 2 (tests authoring phase):
Parallel group: T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014 (distinct files)

Example 3 (model creation):
Parallel group: T012, T013, T014

Example 4 (polish exhaustive tests):
Parallel group: T028, T029, T030 (docs independent), T033 (CHANGELOG) – ensure core complete first.

## Task → File Mapping Quick Index

- Models: src/models/mention-mapping.ts, placeholder-token.ts, resolution-summary.ts
- Service: src/services/mention-resolution.service.ts
- Config changes: src/services/yaml-config.service.ts (root-level mentions parsing), src/models/channel-configuration.ts (if type update required)
- Pipeline: slack.service.ts, broadcast-dry-run.service.ts, console.service.ts
- Validation: config-validation.service.ts
- Tests (contract): tests/contract/cli-mention-resolution.test.ts
- Tests (unit): tests/unit/_mention_.test.ts and new: mention-here.test.ts, mention-team-type.test.ts, mention-invalid-type.test.ts
- Tests (integration): tests/integration/mention-\*.test.ts
- Fixtures: tests/fixtures/mentions/\*

## Validation Checklist (GATE before marking feature complete)

- [ ] All tasks T004-T014 implemented & were failing before implementation commits
- [ ] All model & service tasks complete (T015-T024)
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
