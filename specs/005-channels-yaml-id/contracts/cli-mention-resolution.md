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

Global root-level `mentions` mapping (applies to all channels/messages) plus existing channel list. Each entry is an object with `id` and optional `type` (default `user`). Built-in `@here` / `@{here}` do not require an entry.

```yaml
mentions:
  alice:
    id: U111AAA
  team-lead:
    id: S444TEAM
    type: team
  qa-owner:
    id: U333CCC

channels:
  - id: C123456
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

- `@{name}` → replace if `name` exists in the root-level mapping OR is built-in `here`.
- `@name` (no braces) → replace only if followed by single space OR end-of-line and `name` exists (or is `here`).
- `type: user` → `<@ID>` replacement; `type: team` → `<!subteam^ID>` replacement; built-in `here` → `<!here>`.
- Skip inside fenced code blocks, inline code, block quotes.
- Unmapped tokens left literal.

## Output

1. Sent message (internal) with formatted mention tokens inserted (e.g., `<@U123>`, `<!subteam^S456>`, `<!here>`).
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
  "replacements": { "alice": 2, "team-lead": 1, "here": 1 },
  "unresolved": ["@{unknown}"],
  "totalReplacements": 4,
  "hadPlaceholders": true
}
```

(Internal representation; CLI prints textual form above.)
