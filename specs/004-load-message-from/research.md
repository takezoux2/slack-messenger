# Research: Load message from markdown file

Date: 2025-09-24
Feature: 004-load-message-from

## Decisions and Rationale

### 1) UTF-8 validation and decoding

- Decision: Use WHATWG TextDecoder with `{ fatal: true }` to reject non-UTF-8 inputs when decoding a Buffer.
- Rationale: Ensures strict UTF-8 requirement (FR-007) and produces clear errors on invalid byte sequences.
- Alternatives: `fs.readFile('utf8')` (silently replaces invalid sequences); iconv-lite (adds dependency, unnecessary).

### 2) CLI option design

- Decision: Introduce `--message-file <path>` (alias `-F`) for both `send-message` and `broadcast` commands. It is mutually exclusive with the positional `<message...>` argument. If both provided → error (FR-004). If neither provided → existing validations apply (missing message).
- Rationale: Preserves backward compatibility (FR-002) while enabling file-based input (FR-001).
- Alternatives: New subcommand (too heavy), environment variable (less explicit and harder to test).

### 3) Trimming behavior

- Decision: Trim trailing whitespace and final newline(s) only (right-strip), preserving leading whitespace and internal formatting: `content.replace(/[\s\n]+$/u, '')`.
- Rationale: Matches FR-012. Preserves Markdown formatting (FR-013).
- Alternatives: full `.trim()` would remove leading whitespace used for code blocks; not acceptable.

### 4) Message length enforcement

- Decision: Enforce 2,000-character limit after trimming. Reject when `content.length > 2000` with validation error (FR-006).
- Rationale: Clear, deterministic behavior before any API call.
- Alternatives: Allow longer and let Slack reject; violates FR-006.

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
