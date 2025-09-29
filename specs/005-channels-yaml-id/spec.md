# Feature Specification: Mention Name Mapping in channels.yaml for In-Message User Mentions

**Feature Branch**: `005-channels-yaml-id`  
**Created**: 2025-09-30  
**Status**: Draft  
**Input**: User description: "channels.yamlに、名前をユーザーIDにマッピングする"mension"設定を追加し、メッセージ中で"@{name}"が記載されていてnameのマップが指定されている場合は、slackのメンションに置き換えて送信して。マップが存在しない場合は、そのまま送って"

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

### Edge Cases

- Placeholder name appears but is empty: `@{}` → [NEEDS CLARIFICATION: Should empty names be ignored, produce an error, or left literally unchanged?]
- Name contains characters other than letters/digits/hyphen/underscore: [NEEDS CLARIFICATION: Allowed character set for mapping keys?]
- Duplicate mapping keys in the configuration: [NEEDS CLARIFICATION: Should later entries override earlier, or be rejected?]
- Very large number of placeholders in a single message (performance / size limits): [NEEDS CLARIFICATION: Any limit on replacements per message?]
- Placeholder appears inside code block or quoted text: [NEEDS CLARIFICATION: Should replacements occur everywhere or only in standard text regions?]
- Case sensitivity: `@{Alice}` vs `@{alice}` / `@Alice ` vs `@alice `: [NEEDS CLARIFICATION: Are mapping lookups case-sensitive?]
- No-brace form at end of line without trailing space: `@alice\n` → [NEEDS CLARIFICATION: Is this considered a valid placeholder or must a space explicitly follow?]
- No-brace form followed by punctuation instead of space (e.g., `@alice,`) → [NEEDS CLARIFICATION: Should punctuation be accepted or is the space mandatory exactly as specified?]
- Consecutive placeholders `@alice @bob ` mixing forms and spacing—ensure each independently resolved.
- Avoid matching email/usernames like `@alice_dev` unless braces used or exact key plus space criterion met.

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
- **FR-014**: System SHOULD make it possible for authors to know which placeholders were replaced vs. left unchanged (e.g., via summary) [NEEDS CLARIFICATION: Is author-facing feedback required?]
-- **FR-015**: System MUST not modify any message content outside the defined placeholder patterns.
-- **FR-020**: System MUST preserve exactly one space after the mention when replacing the no-brace form `@name `; the space remains after the inserted mention.
-- **FR-021**: System MUST NOT treat `@name` lacking both braces and trailing space as a placeholder (unless clarified otherwise) [NEEDS CLARIFICATION: Should end-of-line or punctuation be accepted as boundary?].
-- **FR-022**: System MUST avoid replacing substrings inside email addresses or longer identifiers containing `@name` unless they match an accepted pattern boundary.
- **FR-016**: System SHOULD define a clear validation rule for acceptable mapping keys [NEEDS CLARIFICATION: What exact key character constraints?].
- **FR-017**: System SHOULD define behavior for conflicting/duplicate keys [NEEDS CLARIFICATION: Override or error?].
- **FR-018**: System SHOULD define case-sensitivity policy for keys [NEEDS CLARIFICATION: Case-sensitive or insensitive lookups?].
- **FR-019**: System SHOULD specify maximum number of mappings or placeholders per message if limits exist [NEEDS CLARIFICATION: Are there limits?].

### Key Entities _(include if feature involves data)_

- **Mention Mapping**: A collection of key-value pairs where each key is a human-friendly name and each value is a platform user identifier. Used during message composition to resolve placeholder mentions.
- **Message Placeholder Token**: A literal substring in authored message text with pattern `@{name}` indicating intent to mention the user mapped to `name`.
- **Composed Message**: The final message string after all eligible placeholder tokens are resolved and replaced; may still contain unresolved tokens if mappings were absent.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

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
