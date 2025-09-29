# Quickstart: Mention Placeholder Resolution

## 1. Define global mentions mapping (channels.yaml)

```yaml
mentions:
  alice:
    id: U111AAA
  team-lead:
    id: S222TEAM
    type: team

channel_lists:
  - name: basic
    channels:
      - C1234567890
```

## 2. Create message file (message.md)

```markdown
Deployment complete @{alice}.
Thanks @team-lead for coordination.
```

## 3. Dry-run broadcast

```powershell
yarn start broadcast basic -F message.md --dry-run
```

Output summary:

```
Replacements: alice=1, team-lead=1 (total=2)
Unresolved: none
```

## 4. Edge cases (skipped regions & boundaries)

```markdown
`@team-lead` inline code

> @{team-lead} block quote
```

@{team-lead} code fence skipped

```
@team-lead, (punctuation -> not replaced)
@team-lead end-of-line replaced
```

Result (only one replacement):

```
Replacements: team-lead=1 (total=1)
Unresolved: none
```

## 5. Built-in token

`@here` / `@{here}` は常に `<!here>` に変換され、`here` としてカウントされます。

## 6. Failure / fallback

- `mentions` が無くても既存動作は維持。
- 未定義プレースホルダはリテラルのまま `Unresolved:` に表示。

## 7. No placeholders

プレースホルダが一切無い場合: `Placeholders: none`
