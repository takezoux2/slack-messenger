# Data Model: Mention Mapping & Placeholder Resolution

## Entities

### MentionMapping

| Field   | Type                | Description                                                                                           |
| ------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| entries | Map<string, string> | Key: placeholder name; Value: Slack user ID (e.g., U123ABC). Last duplicate key wins. Case-sensitive. |

Constraints:

- Keys: any visible non-whitespace Unicode chars (brace form excludes `}`) length >= 1.
- Values: Non-empty Slack user IDs (validated upstream if needed).

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

- Duplicate keys: Overwrite prior value (during map load).
- Unknown key: Token remains literal and added to `unresolved`.
- Replacement mention formatting delegated to Slack service (wrap user ID per existing logic, e.g., `<@U123>`).

## Data Flow

1. Load YAML config including mention mapping section (to be specified - likely `mentions:` or nested under a channel block; planning tasks will refine exact key name).
2. Build MentionMapping map (apply duplicate overwrite semantics).
3. Parse message -> tokens (skip excluded regions).
4. For each token: lookup mapping; build replaced string or leave literal.
5. Accumulate counts/unresolved; produce ResolutionSummary.
6. Emit transformed message to Slack API; emit summary to stdout.

## Open Design Notes

- Config key naming (e.g., `mentions:`) will be finalized during tasks planning; tests will assert structure.
- Summary output format finalized in research; data model supports extension (e.g., durations, performance metrics) if later needed.
