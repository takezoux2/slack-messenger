# `channels.yaml` Configuration Schema

This document explains the expected structure for the `channels.yaml` file that powers the CLI commands in this project (`broadcast`, `send-message`, and `list-channels`). The same schema applies when you point the CLI at an alternate file via `--config`.

> **Scope.** The loader accepts both snake_case and camelCase key names for certain sections, but snake_case is preferred throughout this document.

## Root Object

The root of the YAML file must be a map (object) with the keys below. Unknown keys are ignored, but the required structure must be present.

| Key               | Required | Type                      | Notes                                                                                                          |
| ----------------- | -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `channel_lists`   | ✅       | array of objects          | Must contain at least one list definition. This is the only required top-level section.                        |
| `mentions`        | ➖       | map<string, MentionEntry> | Provides placeholder → mention mappings reused across all messages.                                            |
| `sender_identity` | ➖       | object                    | Optional default sender profile applied to Slack API calls. CamelCase alias `senderIdentity` is also accepted. |

## `channel_lists` (required)

Each entry describes a named bundle of channels that can be broadcast to. The CLI resolves a list by its `name`.

| Field         | Required | Type          | Notes                                                                                                    |
| ------------- | -------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `name`        | ✅       | string        | Non-empty, unique across the file. Trimmed; duplicates raise an error.                                   |
| `channels`    | ✅       | array<string> | 1–100 entries. Each entry is validated and deduplicated within the list.                                 |
| `description` | ➖       | string        | Optional freeform description for human readers. Currently ignored by the CLI but preserved for tooling. |

### Channel identifiers

Every item in `channels` must be either a channel ID or a channel name:

- **Channel ID**: Matches the regex $^C[A-Z0-9]{10}$ (case-insensitive when authoring; internally upper-cased). Example: `C1234567890`.
- **Channel name**: Begins with `#` followed by lowercase letters, digits, hyphens, or underscores (`^[a-z0-9\-_]+$`). Example: `#engineering-alerts`.

If a channel fails validation, loading the configuration throws an error. Duplicate identifiers inside the same list are also rejected. Different lists may reference the same channel.

## `mentions` (optional)

Defines reusable mention placeholders. Keys are the placeholder tokens (case-sensitive). Values support either the full object form or a shorthand string.

```yaml
mentions:
  alice:
    id: U111AAA
    type: user
  platform-team:
    id: S222TEAM
    type: team
  legacy-user: U333LEGACY # shorthand → treated as { id: 'U333LEGACY', type: 'user' }
```

| Field  | Required | Type               | Notes                                                                                              |
| ------ | -------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| `id`   | ✅       | string             | Slack user, subteam (a.k.a. user group), or other special identifier. Trimmed; must be non-empty.  |
| `type` | ➖       | `'user' \| 'team'` | Defaults to `'user'`. `'team'` produces `<!subteam^{id}>`. Unknown values are coerced to `'user'`. |

Additional rules:

- Placeholder lookups are exact-match and case-sensitive.
- Duplicate keys are allowed; the last definition wins.
- Shorthand string values (plain `id`) are supported for backward compatibility.
- Placeholders support both `@{name}` and `@name` (followed by a space or end-of-line) in message text. Unmapped placeholders are left unchanged.
- Built-in `@here` and `@{here}` always resolve to `<!here>` and are counted under the key `here`.

## `sender_identity` (optional)

Controls the default display name and icon used when the CLI posts messages. Both snake_case and camelCase field names are accepted; snake_case preferred below.

| Field                    | Required | Type    | Notes                                                                                                                                    |
| ------------------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                   | ✅\*     | string  | Required when the section is present. Trimmed, must be non-empty.                                                                        |
| `icon_emoji`             | ✅\*     | string  | Slack emoji shortcode (e.g. `:rocket:`). Mutually exclusive with `icon_url`. Alias: `iconEmoji`.                                         |
| `icon_url`               | ✅\*     | string  | HTTPS image URL used as avatar. Alias: `iconUrl`.                                                                                        |
| `icon`                   | ➖       | string  | Legacy alias for `icon_emoji`. If it matches `:shortcode:`, it is mapped automatically.                                                  |
| `allow_default_identity` | ➖       | boolean | When `true`, the CLI may fall back to Slack’s default bot identity if overrides strip both name and icon. Alias: `allowDefaultIdentity`. |

\*At least one icon field (`icon_emoji` or `icon_url`) must be supplied alongside `name`. If both icons are omitted or both are provided, validation fails.

CLI flags (`--sender-name`, `--sender-icon-emoji`, `--sender-icon-url`) override these fields. When overrides specify an emoji, any configured URL is cleared (and vice versa).

## Validation Summary

- The root document must be a single YAML object.
- `channel_lists` must exist, must be an array, and cannot be empty.
- Each list name is trimmed, non-empty, unique, and cannot exceed 100 channels.
- Channel identifiers are trimmed; IDs are upper-cased; names must stay lowercase.
- `mentions` (if present) must be a mapping whose values are objects or strings. Every entry must resolve to a non-empty `id`.
- `sender_identity` (if present) must supply `name` and exactly one icon field; optional `allow_default_identity` must be boolean.

Any rule violation causes the loader to throw, and downstream CLI commands surface the validation message to the user.

## Examples

### Minimal configuration

```yaml
channel_lists:
  - name: 'alerts'
    channels:
      - C1234567890
```

### Full configuration with mentions and identity

```yaml
sender_identity:
  name: 'Release Notifier'
  icon_emoji: ':rocket:'

mentions:
  takezoux2:
    id: U05S5GBRSSV
  leaders:
    id: S06EP3W9NQ1
    type: team

channel_lists:
  - name: 'test'
    description: 'Channels for development team'
    channels:
      - C09HERT8BFA
      - C09GFMCJSLT
  - name: 'prod-alerts'
    channels:
      - '#prod-incidents'
      - '#oncall'
```

## Operational Notes

- The CLI caches parsed configurations per file path and reloads only when the file’s modification time changes.
- Use `slack-messenger list-channels --config <path>` to verify that your file parses correctly; validation errors will surface immediately.
- Tests under `tests/integration` cover additional edge cases such as empty lists, invalid channels, and mention resolution. Consult them when extending the schema.
