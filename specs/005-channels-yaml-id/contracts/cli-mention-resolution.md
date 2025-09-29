# Contract: CLI Mention Placeholder Resolution

## Purpose

Defines input & output contract for resolving mention placeholders during message send.

## Inputs

1. channels.yaml containing mention mapping section (example below)
2. Message file or inline message text with placeholder tokens.
3. CLI invocation (existing command):

```
node dist/main.js broadcast --file path/to/message.md --config channels.yaml
```

(Exact command variant depends on existing CLI; tasks will map to current command structure.)

## Configuration Example (YAML)

```yaml
channels:
  - id: C123456
    mentions:
      alice: U111AAA
      team-lead: U222BBB
      QA: U333CCC
```

## Message Example (input)

```
Hello @{alice} and @team-lead we deployed.
> Block quote with @{alice} not replaced
Code fence:
```

`@alice` inline code

```

```

## Replacement Rules Summary

- `@{name}` → replace if `name` in mapping.
- `@name` (no braces) → replace only if followed by single space OR end-of-line.
- Skip inside fenced code blocks, inline code, block quotes.
- Unmapped tokens left literal.

## Output

1. Sent message (internal) with `<@UserID>` inserted.
2. Summary lines to stdout:

```
Replacements: alice=2, team-lead=1 (total=3)
Unresolved: @{unknown}
```

Or if no tokens at all:

```
Placeholders: none
```

Or if none unresolved:

```
Replacements: alice=2 (total=2)
Unresolved: none
```

## Failure Modes

- Missing config file: existing CLI error path (unchanged by feature).
- Invalid YAML: existing validation (unchanged) - mention mapping ignored until valid.

## Non-Goals

- No auto-fetch of user IDs by human name.
- No channel mention or role expansion beyond explicit keys.

## Testable Assertions

- Every replaced token corresponds to a key in mapping (one count increment).
- Ordering: replacement keys alphabetical; unresolved tokens in first-appearance order.
- Empty `@{}` absent from both lists.

## JSON Example (Derived Summary Object)

```json
{
  "replacements": { "alice": 2, "team-lead": 1 },
  "unresolved": ["@{unknown}"],
  "totalReplacements": 3,
  "hadPlaceholders": true
}
```

(Internal representation; CLI prints textual form above.)
