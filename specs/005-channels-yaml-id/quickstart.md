# Quickstart: Mention Placeholder Resolution

## 1. Add mention mappings to channels.yaml

```yaml
channels:
  - id: C123456
    mentions:
      alice: U111AAA
      team-lead: U222BBB
```

## 2. Write a message file (message.md)

```
Deployment complete @{alice}.
Thanks @team-lead for coordination.
```

## 3. Run broadcast (example)

```
node dist/main.js broadcast --file message.md --config channels.yaml
```

## 4. Expected stdout summary

```
Replacements: alice=1, team-lead=1 (total=2)
Unresolved: none
```

## 5. Edge case example

Message:

```
`@alice` -> inline code
> @{team-lead} -> block quote
@team-lead, punctuation after (no replacement)
@team-lead end-of-line should replace
```

Summary (assuming mapping for team-lead only):

```
Replacements: team-lead=1 (total=1)
Unresolved: none
```

(Inline code, block quote, and punctuation case skipped.)

## 6. Dry Run

If CLI supports dry-run flag (`--dry-run`), summary still produced; message not sent.

## 7. Failure Handling

If `mentions` section absent, feature is inert; summary may show `Placeholders: none` (if no tokens) or unresolved tokens if present.
