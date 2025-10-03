# Data Model: Mention Mapping & Placeholder Resolution

## Entities

### MentionEntry

| Field | Type                        | Description                                                                                                                                           |
| ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| id    | string                      | Slack identifier: user ID (U...) or user group / subteam ID for team mentions (e.g., S123 or an admin-provided subteam handle ID). Must be non-empty. |
| type  | 'user' \| 'team' (optional) | Determines replacement format; defaults to `user` when omitted or invalid.                                                                            |

Formatting Rules:

- type `user` → replacement token `<@{id}>`
- type `team` → replacement token `<!subteam^{id}>`
- Built-in special tokens (handled outside mapping): `@here` / `@{here}` → `<!here>`

### MentionMapping

| Field   | Type                      | Description                                                                                               |
| ------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| entries | Map<string, MentionEntry> | Key: placeholder name; Value: MentionEntry. Last duplicate key wins (overwrite). Keys are case-sensitive. |

Constraints:

- Keys: any visible non-whitespace Unicode chars (brace form excludes `}`) length >= 1.
- Entry object must have non-empty `id`.
- Unknown `type` values are treated as `user`.

### PlaceholderToken

| Field      | Type    | Description                                                      |
| ---------- | ------- | ---------------------------------------------------------------- |
| original   | string  | Literal substring as it appeared (e.g., `@{alice}` or `@alice`). |
| name       | string  | Extracted placeholder key (e.g., `alice`).                       |
| form       | 'brace' | 'nobrace' distinguishing syntax variant.                         |
| startIndex | number  | Index in original message string.                                |
| endIndex   | number  | Exclusive end index.                                             |
| replaced   | boolean | Whether mapping existed and replacement occurred.                |

### ResolutionSummary

| Field             | Type                   | Description                                                           |
| ----------------- | ---------------------- | --------------------------------------------------------------------- |
| replacements      | Record<string, number> | Counts by key (alphabetically sorted for output).                     |
| unresolved        | string[]               | Unresolved token literals in order of first appearance.               |
| totalReplacements | number                 | Sum of replacement counts.                                            |
| hadPlaceholders   | boolean                | True if any placeholder forms were detected (replaced or unresolved). |

## Relationships

- MentionMapping provides lookup for PlaceholderToken.name.
- PlaceholderToken instances derived from scanning raw message text excluding code/quote regions.
- ResolutionSummary aggregates PlaceholderToken results after processing.

## Derived Rules

- Empty `@{}` ignored: not a PlaceholderToken instance.
- Tokens inside fenced code blocks, inline code, or block quotes not parsed into PlaceholderToken list.
- No partial replacement: either full token replaced or left intact.

## Validation Rules

- Duplicate keys: Overwrite prior entry (during map load).
- Unknown placeholder key: Token remains literal and added to `unresolved`.
- Invalid entry object (missing id / wrong shape): Treat as absent mapping (placeholder unresolved).
- Built-in token `here` bypasses mapping and is always considered resolvable (counts under key `here`).

## Data Flow

1. Load YAML config root-level `mentions:` mapping (object of key → entry objects).
2. Build MentionMapping map (apply duplicate overwrite semantics; normalize invalid type to `user`).
3. Parse message -> tokens (skip excluded regions).
4. For each token: lookup mapping; build replaced string or leave literal.
5. Accumulate counts/unresolved; produce ResolutionSummary.
6. Emit transformed message to Slack API; emit summary to stdout.

## Open Design Notes

- Potential future backward compatibility: allow plain string value meaning `{ id: <string>, type: 'user' }`.
- Potential extension: add `display` or `alias` metadata for help output (not required for replacement mechanics).
