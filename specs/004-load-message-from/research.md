# Research: Load message from markdown file

Date: 2025-09-24
Feature: 004-load-message-from

## Decisions and Rationale

### 1) UTF-8 handling (no validation)

- Decision: Do not perform explicit UTF-8 validation. Read files as UTF-8 text using Node's default decoding (e.g., `fs.readFile` with `utf8`). If invalid sequences exist, they may be replaced with the Unicode replacement character by the runtime; the command must proceed to apply other validations.
- Rationale: Aligns with the updated spec: “assume UTF-8; no validation.” Avoids failing on minor encoding glitches and keeps behavior consistent across platforms.
- Alternatives (rejected for this feature): Using `TextDecoder` with `{ fatal: true }` to enforce strict validation.

### 2) CLI option design

- Decision: Introduce `--message-file <path>` (alias `-F`) for both `send-message` and `broadcast` commands. It is mutually exclusive with the positional `<message...>` argument. If both provided → error (FR-004). If neither provided → existing validations apply (missing message).
- Rationale: Preserves backward compatibility (FR-002) while enabling file-based input (FR-001).
- Alternatives: New subcommand (too heavy), environment variable (less explicit and harder to test).

### 3) Trimming behavior

- Decision: Trim trailing whitespace and final newline(s) only (right-strip), preserving leading whitespace and internal formatting: `content.replace(/[\s\n]+$/u, '')`.
- Rationale: Matches FR-012. Preserves Markdown formatting (FR-013).
- Alternatives: full `.trim()` would remove leading whitespace used for code blocks; not acceptable.

### 4) Message length enforcement

- Decision: Enforce 2,000-character limit after trailing-trim, but only for file-based input. Inline message arguments retain the existing 40,000-character limit used today.
- Rationale: Prevent regressions for existing users while applying a safer default for file-based content.
- Alternatives: Apply 2,000 to all inputs (would be a breaking change) or remove the limit (risks API failures and inconsistent UX).

### 5) Verbose and dry-run output

- Decision: When verbose or dry-run, include: source indicator (`source=file|inline`), for file show absolute path and preview (first 200 chars), and message length.
- Rationale: FR-008 and acceptance scenario 5.
- Alternatives: Full content dump; risks leaking sensitive data.

### 6) Empty/whitespace-only files

- Decision: After trimming, if content is empty, error (FR-011).
- Rationale: Prevent sending blank messages.

### 7) Consistency across commands

- Decision: Apply identical logic for `send-message` and `broadcast` (FR-009) via shared parsing/model layer (`CommandLineOptions` or a new helper) to avoid duplication.

## Open Questions

- None — spec is unambiguous for this scope.

## References

- WHATWG TextDecoder: Node.js v21 global implementation
- Commander.js options API (mutual exclusivity handled via validation)
