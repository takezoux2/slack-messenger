# Quickstart — Load message from file

This feature lets you send or broadcast a message whose content comes from a local markdown file instead of typing it inline.

## Prerequisites

- SLACK_BOT_TOKEN set in your environment or provided via --token
- The file must be UTF-8 encoded and under 2,000 characters after trimming trailing whitespace/newlines

## Send a single message from file

```bash
npm run run -- send-message C1234567890 --message-file ./message.md
```

## Broadcast from file (dry-run first)

```bash
npm run run -- broadcast all-teams --message-file ./announcement.md --dry-run --verbose
```

Expected verbose output includes the source indication and a 200-char preview of the file content.
