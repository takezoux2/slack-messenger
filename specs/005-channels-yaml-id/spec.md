# Feature Specification: Mention Name Mapping in channels.yaml for In-Message User Mentions

**Feature Branch**: `005-channels-yaml-id`  
**Created**: 2025-09-30  
**Status**: Draft  
**Input**: User description: "channels.yamlに、名前をユーザーIDにマッピングする"mension"設定を追加し、メッセージ中で"@{name}"が記載されていてnameのマップが指定されている場合は、slackのメンションに置き換えて送信して。マップが存在しない場合は、そのまま送って"

## Clarifications

### Session 2025-09-30

- Q: How should the no-brace placeholder form @name be recognized (what counts as a valid boundary after the name)? → A: Space or end-of-line

- Q: What exact character set should be allowed for mapping keys (the placeholder name)? → A: Any visible non-space characters until boundary

- Q: How should duplicate mapping keys in channels.yaml be handled? → A: Last definition wins (silently overrides earlier)

- Q: What is the case-sensitivity policy for mapping key lookups? → A: Case-sensitive (exact match required)

- Q: Is author-facing feedback required to summarize which placeholders were replaced vs left unchanged? → A: Always output a summary to stdout after send

- Q: How should an empty placeholder `@{}` be handled? → A: Ignore (treat as literal text)

- Q: Should replacements occur inside code blocks or quoted text? → A: No; only in standard text regions

- Q: What is the scoping model for mention mappings in channels.yaml? → A: Single global mapping at root; applies to all messages/channels uniformly
  \n+- Q: What fixed output format should the post-send summary use? → A: Multi-line human-readable (3 lines: Replaced:/Unresolved:/Total:)
  \n+- Q: What YAML key name will store the global mention mapping? → A: mentions

Applied: Mapping keys accept any visible non-whitespace Unicode characters. For brace form `@{name}` the key is any sequence of one or more characters excluding `}`. For no-brace form `@name` the key is any sequence of one or more non-whitespace characters terminated by a space or end-of-line. This broad rule enables flexible role/style keys (e.g., `dev.ops-lead+2025`). Empty keys are invalid (still clarifying handling if encountered as `@{}` placeholder).

Applied: The no-brace form `@name` is a placeholder only when immediately followed by exactly one space OR the end-of-line/string boundary. It is NOT recognized when followed by punctuation, another word character, or other symbols. Punctuation-separated forms (e.g., `@alice,`) remain literal text. Acceptance scenarios and FR-021 updated; edge case bullets adjusted to remove ambiguity.

Applied: When duplicate mapping keys appear, only the last occurrence in the configuration is used; earlier occurrences are ignored without producing an error or warning. This ensures deterministic behavior while allowing authors to override earlier definitions implicitly.

Applied: Mapping key lookups are case-sensitive. `Alice` and `alice` are distinct keys; authors must reference placeholders using the exact declared casing. This avoids unexpected collisions and preserves intentional stylistic distinctions. No normalization is performed.

Applied: After every message send (including dry-run modes if they perform resolution), the system outputs a deterministic summary to stdout listing: (a) each unique replaced placeholder key with count of replacements, (b) each unresolved placeholder token (literal form) that remained, and (c) total replacements performed. If no placeholders present, outputs an empty-summary line (e.g., "Placeholders: none").

Applied: The empty placeholder form `@{}` is not a valid placeholder token. It is left unchanged in the message, produces no replacement, and is not counted as an unresolved placeholder in the summary (it is simply ignored by the resolver). This prevents accidental noise from stray braces.

Applied: Placeholder resolution is skipped inside: (1) fenced code blocks delimited by triple backticks `...`, (2) inline code spans enclosed in single backticks, and (3) block quotes (lines beginning with ">"). Placeholders appearing in these regions remain literal, are not counted as replaced, and are not reported as unresolved to keep summaries focused on actionable content.

## Execution Flow (main)

```
1. Parse user description from Input
	→ If empty: ERROR "No feature description provided"
2. Extract key concepts from description
	→ Identify: actors (sender / system), actions (map name to user ID, replace pattern), data (mapping entries, message text), constraints (leave unchanged if not mapped)
3. For each unclear aspect:
	→ Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
	→ If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
	→ Each requirement must be testable
	→ Mark ambiguous requirements
6. Identify Key Entities (mapping, message)
7. Run Review Checklist
	→ If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
	→ If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a person composing a broadcast or direct message using the existing messaging tool, I want to write human-friendly placeholder tokens like `@{sales}` or `@{owner}` in the message body so that the system sends the final message with proper user mentions for mapped names, while leaving any unmapped placeholders unchanged, enabling readable drafts and safe fallback behavior.

### Acceptance Scenarios

1. **Given** a configuration contains a mapping entry for name "alice" pointing to a specific user ID, **When** a message includes `@{alice}`, **Then** the sent message contains a proper user mention referencing Alice's user ID.
2. **Given** a configuration contains a mapping entry for name "alice" and a message includes the no-brace form `@alice ` (note trailing space), **When** the message is sent, **Then** the system replaces `@alice ` with the proper user mention followed by a single space preserved after the mention.
3. **Given** a message contains `@{unknown}` and no mapping for "unknown" exists, **When** the message is sent, **Then** the literal text `@{unknown}` remains unchanged in the delivered message.
4. **Given** a message contains `@unknown ` (no braces, trailing space) and no mapping for "unknown" exists, **When** sent, **Then** the literal text `@unknown ` remains unchanged.
5. **Given** multiple occurrences using both forms `@{alice}` and `@alice ` appear in a single message, **When** the message is sent, **Then** each occurrence (both forms) is replaced consistently with the same resolved mention form, preserving spaces where present.
6. **Given** a mapping exists for "team-lead" and the message contains adjacent punctuation like `(@{team-lead})`, **When** the message is sent, **Then** only the placeholder is replaced and punctuation is preserved.
7. **Given** a mapping exists and the message contains a similar substring not following an accepted placeholder pattern (e.g., `@{alice_extra}` with only "alice" mapped), **When** sent, **Then** only exact placeholder tokens with matching names are replaced.
8. **Given** a mapping exists and a message contains an email address `user@example.com`, **When** the message is sent, **Then** the email address is NOT altered (no false positive replacement).
9. **Given** a mapping exists for "alice" and the message line ends with `@alice` immediately before a newline (no trailing space), **When** the message is sent, **Then** `@alice` at end-of-line is treated as a valid no-brace placeholder and replaced with the proper mention (newline preserved).
10. **Given** a mapping exists for "alice" and the message contains `@alice,` (comma directly after), **When** the message is sent, **Then** `@alice,` is NOT treated as a placeholder and remains unchanged (still allowing brace form `@{alice}` for replacement if present elsewhere).
11. **Given** a message containing two `@{alice}` placeholders and one unmapped `@{unknown}` token, **When** the message is sent, **Then** stdout includes a summary indicating `alice: 2 replacements`, lists `@{unknown}` as unresolved, and reports `total_replacements=2`.

### Edge Cases

- Placeholder name appears but is empty: `@{}` → Ignored: treated as literal text (no replacement, not listed as unresolved, not counted toward totals).
- Mapping key allowed characters: any visible non-whitespace characters; brace form forbids `}` inside the key; no-brace form ends at space or end-of-line. Empty key not permitted.
- Duplicate mapping keys in the configuration: Last definition wins silently; earlier entries ignored (no warning or error).
- Very large number of placeholders in a single message: No artificial limit; system processes all occurrences subject only to overall Slack message length constraints.
- Placeholder appears inside code block or quoted text: No replacements performed; tokens left literal and omitted from unresolved summary counts.
- Case sensitivity: Lookups are case-sensitive; `Alice` and `alice` are different mapping keys and must be referenced exactly as declared.
- No-brace form at end of line without trailing space: `@alice\n` → Treated as a valid placeholder (end-of-line is an accepted boundary).
- No-brace form followed by punctuation instead of space (e.g., `@alice,`) → Not a placeholder; punctuation does not satisfy the boundary rule.
- Consecutive placeholders `@alice @bob ` mixing forms and spacing—ensure each independently resolved.
- Avoid matching email/usernames like `@alice_dev` unless braces used or exact key plus space criterion met.
  // Scope clarification
- Mention mapping is a single global dictionary; no per-channel override or channel-specific shadowing is supported (explicitly out-of-scope for this feature).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow defining a set of name → user identifier mappings within the existing channel configuration file (referred to as "mention mapping").
  -- **FR-002**: System MUST recognize placeholder tokens in message text formatted either as `@{name}` OR as `@name ` (no braces, single trailing space) where `name` corresponds exactly to a configured mapping key.
- **FR-003**: System MUST replace each recognized placeholder token with a valid user mention for the mapped user identifier prior to sending the message.
- **FR-004**: System MUST leave any placeholder token unchanged if no mapping for its `name` exists.
- **FR-005**: System MUST perform replacements consistently for all occurrences of the same placeholder within a single message.
- **FR-006**: System MUST preserve all surrounding whitespace and punctuation when performing replacements.
- **FR-007**: System MUST handle messages containing zero, one, or many placeholder tokens.
- **FR-008**: System MUST not alter substrings that resemble parts of a placeholder but do not match the full `@{name}` pattern.
- **FR-009**: System MUST provide a predictable resolution order that does not depend on mapping declaration order (i.e., each placeholder resolved independently by exact key lookup).
- **FR-010**: System SHOULD allow mapping keys that are human-readable short names meaningful to authors (e.g., team roles, personal identifiers).
- **FR-011**: System MUST avoid partial replacements (either a full placeholder is replaced or it is fully preserved).
- **FR-012**: System SHOULD ensure that adding the mention mapping feature does not require authors to change existing messages that do not use placeholders (backwards compatibility).
- **FR-013**: System MUST treat unmapped placeholders as normal text without generating an error or warning visible to message recipients.
- **FR-014**: System MUST always output a post-send summary to stdout indicating: unique replaced keys with counts, unresolved placeholder tokens (if any), and total replacements.
  -- **FR-015**: System MUST not modify any message content outside the defined placeholder patterns.
  -- **FR-020**: System MUST preserve exactly one space after the mention when replacing the no-brace form `@name `; the space remains after the inserted mention.
  - **FR-021**: System MUST treat `@name` as a placeholder only when followed by exactly one space OR end-of-line; otherwise (e.g., followed by punctuation or alphanumeric) it is NOT a placeholder.
    -- **FR-022**: System MUST avoid replacing substrings inside email addresses or longer identifiers containing `@name` unless they match an accepted pattern boundary.
- **FR-016**: System MUST accept mapping keys composed of any visible non-whitespace Unicode characters; brace-form keys exclude `}` and must be at least one character; no-brace form keys end at a space or end-of-line. Empty key is invalid.
- **FR-017**: System MUST, when duplicate mapping keys occur, retain only the last occurrence (later definition overrides earlier silently; no warning emitted).
- **FR-018**: System MUST treat mapping keys as case-sensitive (no normalization); authors must use exact casing in placeholders.
- **FR-019**: System WILL NOT enforce an artificial maximum on mapping entries or placeholders per message; processing is O(n) in placeholder count and naturally bounded by Slack's message size limits.
- **FR-023**: System MUST emit a 3-line human-readable summary in this exact order and format (UTF-8, newline terminated):
  1. `Replaced: <comma-separated key=count entries sorted lexicographically by key>` OR `Replaced: none` if zero replacements.
  2. `Unresolved: <space-separated literal tokens in encounter order>` OR `Unresolved: none` if none.
  3. `Total: <integer>` where integer equals the sum of all replacement counts.
     Example: `Replaced: alice=2,bob=1` / `Unresolved: @{unknown}` / `Total: 3`. No additional lines or prefixes are allowed. Whitespace is fixed: single space after each colon. Empty unresolved list uses `none`. Empty replaced list uses `none` and Total will be 0.
- **FR-024**: System MUST treat `@{}` (empty name) as literal text with no replacement and exclude it from replacement and unresolved counts in the summary.
- **FR-025**: System MUST skip placeholder detection and replacement inside fenced code blocks (```), inline code spans (`code`), and block quote lines (starting with ">"); tokens therein remain literal and are excluded from unresolved lists and counts.
  - **FR-026**: System MUST load mention mappings from a single global root-level YAML mapping keyed exactly as `mentions` in `channels.yaml`, applied uniformly to all channels; per-channel overrides are out-of-scope for this feature.

### Key Entities _(include if feature involves data)_

- **Mention Mapping**: A collection of key-value pairs where each key is a human-friendly name and each value is a platform user identifier. Used during message composition to resolve placeholder mentions.
- **Message Placeholder Token**: A literal substring in authored message text with pattern `@{name}` indicating intent to mention the user mapped to `name`.
- **Composed Message**: The final message string after all eligible placeholder tokens are resolved and replaced; may still contain unresolved tokens if mappings were absent.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs) <!-- Contains implementation artifacts: O(n), main(), resolution ordering -->
- [ ] Focused on user value and business needs <!-- Mixed with technical phrasing -->
- [ ] Written for non-technical stakeholders <!-- Developer-oriented terms present -->
- [x] All mandatory sections completed <!-- Scenarios & Requirements present -->

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous <!-- All placeholder boundaries, summary format, and mapping key finalized -->
- [ ] Success criteria are measurable <!-- Lacks quantitative success metrics -->
- [ ] Scope is clearly bounded <!-- Mapping scope clarified: single global mapping; per-channel overrides out-of-scope -->
- [ ] Dependencies and assumptions identified <!-- Assumptions about YAML structure, Slack ID validity not listed -->

---

## Execution Status

_Updated by main() during processing_

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
