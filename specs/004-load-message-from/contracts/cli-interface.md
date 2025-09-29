# CLI Interface Contract — 004-load-message-from

Date: 2025-09-24
Feature: Load message from markdown file

## Commands Affected

- send-message
- broadcast

## New/Updated Options

### Common to send-message and broadcast

- `-F, --message-file <path>`: Load message content from a UTF-8 markdown file.

Rules:

- Mutually exclusive with positional `<message...>` argument.
- If both are provided, the command MUST fail with a clear error and exit code 1.
- If `--message-file` is provided, the file must:
  - Exist and be readable
  - Be treated as UTF-8 input; encoding is not validated (invalid sequences may be replaced during decoding)
  - After trimming trailing whitespace/newlines, content must be 1..2000 characters

### Existing Positional Arguments (unchanged)

- send-message: `<channel-id> <message...>`
- broadcast: `<channel-list> <message...>`

## Output/Logging Behavior

- Verbose (`--verbose`) and dry-run (`--dry-run`) modes MUST indicate the message source:
  - `source: file (path: <absolute-path>)` with a 200-char preview
  - or `source: inline` with length only

## Exit Codes (additions align with existing table)

- 1: Invalid Arguments (includes file not found/unreadable, empty after trim, too long, both inputs provided)

## Usage Examples

```bash
# Send from file
npm run run -- send-message C1234567890 --message-file ./release-notes.md

# Broadcast from file (dry-run)
npm run run -- broadcast all-teams --message-file ./announcement.md --dry-run

# Error when both provided
npm run run -- send-message C1234567890 "Hello" --message-file ./a.md
# → Error: Provide either a message or --message-file, not both
```
