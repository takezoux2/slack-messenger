# Data Model: Load message from markdown file

Date: 2025-09-24
Feature: 004-load-message-from

## Entities

### MessageInput

- source: "inline" | "file"
- content: string (validated, trimmed right)
- filePath?: string (absolute path when source === "file")

#### Validation Rules

- When source === "file":
  - filePath MUST be provided
  - File MUST be readable and UTF-8 decodable
  - After decoding, trim trailing whitespace/newlines only
  - Content length MUST be 1..2000
- When source === "inline":
  - Content length MUST be 1..2000
- For both sources:
  - Content is treated as Markdown and should not be altered besides trailing trim

### CommandInvocation (contextual)

- command: "send-message" | "broadcast"
- verbose: boolean
- dryRun?: boolean
- messageInput: MessageInput

## Derived/Helper Logic

- preview(content): string → first 200 characters for logs
- isTooLong(content): boolean → `content.length > 2000`
- rstrip(str): string → remove trailing whitespace/newlines only
