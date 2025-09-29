# Tasks — 004-load-message-from

Date: 2025-09-24
Branch: 004-load-message-from

Notes and assumptions:

- Encoding: Per spec, do not validate encodings; always read as UTF-8. Some earlier design docs mention strict UTF-8 validation — we will align them here.
- Length limit: To avoid regressions with existing 40,000-char behavior, we will enforce 2,000 chars only for file-based input while keeping current limits for inline messages. We will update docs to reflect this nuance.

Legend:

- [P] = can be done in parallel

---

T001 — Align design docs with spec (no encoding validation) [P]

- Type: docs
- What: Update research.md and contracts/cli-interface.md to remove UTF-8 validation language and clarify: “assume UTF-8; no validation”. Clarify 2,000-char limit applies to file-based input; inline remains at existing limit.
- Files: specs/004-load-message-from/research.md, specs/004-load-message-from/contracts/cli-interface.md
- Depends: —
- Acceptance:
  - Docs no longer require UTF-8 validation
  - CLI contract reflects file-only 2,000-char limit and mutual exclusivity

T002 — Add CLI contract tests for --message-file [P]

- Type: test (contract)
- What: New tests to verify CLI parsing and errors for --message-file: help text shows option; providing both message and file errors with exit code 1; providing only file path sets messageFile and leaves positional message undefined.
- Files: tests/contract/cli-interface-message-file.test.ts (new)
- Depends: T001
- Acceptance:
  - Tests encode mutual exclusivity and parsing behavior

T003 — Add MessageInput model tests [P]

- Type: test (unit)
- What: Validate rstrip, preview(200), length constraints (1..2000) for file-based messages; preserve content otherwise.
- Files: tests/unit/message-input.test.ts (new)
- Depends: —
- Acceptance:
  - Tests cover empty/whitespace-only, exactly 2000, >2000, trailing newlines

T004 — Add CLI parsing tests for message-file option [P]

- Type: test (unit)
- What: ParseArgs with send-message and broadcast: with --message-file only; with both provided → error; without → unchanged.
- Files: tests/unit/cli-message-file.test.ts (new)
- Depends: T002
- Acceptance:
  - Parsing behavior matches contract tests

T005 — Integration: valid file → send-message succeeds

- Type: test (integration)
- What: Provide small markdown file; ensure message content is loaded (after rstrip), sent, and success path logs include source indicator in verbose.
- Files: tests/integration/message-from-file.send.test.ts (new), tests/integration/fixtures/message-ok.md (new)
- Depends: T002, T004
- Acceptance:
  - Passes with exit code 0; verbose shows “source: file …” and 200-char preview

T006 — Integration: inline still works (no regression)

- Type: test (integration)
- What: Ensure original inline message path remains unchanged and not affected by file logic.
- Files: tests/integration/message-inline-regression.test.ts (new)
- Depends: —
- Acceptance:
  - Existing behavior preserved; exit code and logs unchanged

T007 — Integration: both file and inline provided → block

- Type: test (integration)
- What: Provide positional message and --message-file; expect exit code 1 and error message.
- Files: tests/integration/message-file-both-inputs.test.ts (new)
- Depends: T002, T004
- Acceptance:
  - Clear error; no send attempted

T008 — Integration: missing/unreadable file → block

- Type: test (integration)
- What: Use non-existent path or locked file; expect exit code 1 with actionable error.
- Files: tests/integration/message-file-missing.test.ts (new)
- Depends: T005
- Acceptance:
  - Error mentions checking path/permissions

T009 — Integration: empty/whitespace-only file → block

- Type: test (integration)
- What: File contains only whitespace/newlines; expect exit code 1 and clear error.
- Files: tests/integration/message-file-empty.test.ts (new), tests/integration/fixtures/whitespace-only.md (new)
- Depends: T005
- Acceptance:
  - Error “Message cannot be empty” (or equivalent validation wording)

T010 — Integration: >2000 chars file → block

- Type: test (integration)
- What: File with 2001+ chars; expect exit code 1 and length error.
- Files: tests/integration/message-file-too-long.test.ts (new), tests/integration/fixtures/too-long.md (new)
- Depends: T005
- Acceptance:
  - Error references 2,000 limit

T011 — Integration: encoding not validated

- Type: test (integration) [P]
- What: Create file with a couple invalid UTF-8 byte sequences; reading should not throw; content includes replacement chars; command proceeds to apply other validations.
- Files: tests/integration/message-file-encoding-not-validated.test.ts (new), tests/integration/fixtures/invalid-utf8.bin (new)
- Depends: T005
- Acceptance:
  - No encoding-specific failure; behavior consistent with spec

T012 — Integration: trailing whitespace/newlines trimmed

- Type: test (integration)
- What: File ends with multiple newlines/spaces; ensure rstrip applied before send.
- Files: tests/integration/message-file-rstrip.test.ts (new), tests/integration/fixtures/with-trailing.md (new)
- Depends: T005
- Acceptance:
  - Delivered content excludes trailing whitespace/newlines

T013 — Integration: markdown preserved

- Type: test (integration)
- What: Markdown file with headings/lists; verify it’s passed through untouched (rendering assertion is indirect; check flags/logs or SlackMessage model).
- Files: tests/integration/message-file-markdown.test.ts (new), tests/integration/fixtures/markdown.md (new)
- Depends: T005
- Acceptance:
  - No alteration beyond trailing trim

T014 — Integration: broadcast from file (dry-run)

- Type: test (integration)
- What: Use broadcast with --message-file in dry-run; preview shows source=file and 200-char preview.
- Files: tests/integration/broadcast-from-file-dry-run.test.ts (new)
- Depends: T005
- Acceptance:
  - Output shows source and preview; no sends performed

T015 — Implement MessageInput model

- Type: code
- What: New src/models/message-input.ts with: source: 'file' | 'inline'; content; filePath?; helpers rstrip(), preview200(), isTooLong(2000); validation for 1..2000 when source=file.
- Files: src/models/message-input.ts (new)
- Depends: T003
- Acceptance:
  - Exports factory methods for fromFileContent() and fromInline(); tests in T003 pass

T016 — Implement FileMessageLoader service

- Type: code
- What: Read file as UTF-8 text (no validation), right-trim trailing whitespace/newlines, assert length 1..2000, return MessageInput.
- Files: src/services/file-message-loader.service.ts (new)
- Depends: T015
- Acceptance:
  - Throws friendly errors for not found/unreadable/empty/too long

T017 — Extend CommandLineOptions for messageFile

- Type: code
- What: Add optional messageFile property; validation: for send-message/broadcast, require either message or messageFile; if both present → validation error. Keep existing 40,000 limit for inline; defer file length to loader.
- Files: src/models/command-line-options.ts (update)
- Depends: T002, T004
- Acceptance:
  - New getters: messageFile?; updated hasRequiredArgs and validationErrors; unit tests pass

T018 — Update CliService to add -F, --message-file

- Type: code
- What: Add option to send-message and broadcast; ensure parseArgs maps to CommandLineOptions.messageFile and handles positional message accordingly; update help text.
- Files: src/services/cli.service.ts (update)
- Depends: T017
- Acceptance:
  - Contract tests in T002 pass; help shows new option

T019 — Update SendMessageCommand to support file input

- Type: code
- What: If options.messageFile present: load via FileMessageLoader; log source=file path + preview (when verbose/dry-run); trim applied; pass content to SlackMessage. Else behave as today (source=inline logs).
- Files: src/commands/send-message.command.ts (update), src/services/file-message-loader.service.ts (use)
- Depends: T016, T017, T018
- Acceptance:
  - Integration tests T005, T007–T013 pass for send-message

T020 — Update BroadcastMessageCommand to support file input

- Type: code
- What: Same as T019 for broadcast; ensure dry-run preview includes source=file and 200-char preview.
- Files: src/commands/broadcast-message.command.ts (update)
- Depends: T016, T017, T018
- Acceptance:
  - Integration tests T014 plus relevant shared cases pass

T021 — Verbose/dry-run source indicators

- Type: code [P]
- What: Add consistent source logging helpers to avoid duplication; e.g., “[INFO] source: file (path: …) | preview: …” or “source: inline (length: …)”.
- Files: src/services/logging.service.ts (update) or inline within commands
- Depends: T019, T020
- Acceptance:
  - Logs match spec; previews limited to 200 chars; no sensitive data leaked

T022 — Docs: quickstart and contracts refresh [P]

- Type: docs
- What: Update quickstart.md with examples; ensure CLI examples include -F/--message-file. Clarify no encoding validation and file-only 2,000-char limit.
- Files: specs/004-load-message-from/quickstart.md, specs/004-load-message-from/contracts/cli-interface.md
- Depends: T001
- Acceptance:
  - Examples align with implemented behavior

T023 — Quality gates and smoke run

- Type: chores
- What: Run typecheck, lint, and full test suite. Fix any minor typing or lint issues.
- Files: —
- Depends: T019, T020, T022
- Acceptance:
  - Build PASS, Lint PASS, Tests PASS

T024 — Small refactors and follow-ups [P]

- Type: chores
- What: Inline duplication cleanup in commands; add JSDoc for new public APIs; ensure Windows path handling for absolute file path in logs.
- Files: src/\*\*
- Depends: T023
- Acceptance:
  - No behavior changes; code readability improved

---

Mapping to user stories (integration):

- T005 → Acceptance 1
- T006 → Acceptance 2
- T007 → Acceptance 3
- T008 → Acceptance 4
- T005 (verbose part) + T014 → Acceptance 5
- T009 → Acceptance 6
- T010 → Acceptance 7
- T011 → Acceptance 8
- T012 → Acceptance 9
- T013 → Acceptance 10
