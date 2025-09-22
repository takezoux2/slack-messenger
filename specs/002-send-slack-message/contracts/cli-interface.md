# CLI Interface Contract

**Date**: 2025-09-23  
**Feature**: 002-send-slack-message

## Command Line Interface

### Primary Command

```bash
npm run run -- send-message <channel-id> <message>
```

### Parameters

#### Required Arguments

- `<channel-id>`: Slack channel ID (format: C followed by 10+ alphanumeric characters)
- `<message>`: Message content supporting Slack markdown formatting

#### Optional Flags

- `--verbose, -v`: Enable verbose logging output
- `--help, -h`: Display usage information
- `--version`: Display application version

### Environment Variables

#### Required

- `SLACK_BOT_TOKEN`: Slack bot token with chat:write permission

#### Optional

- `SLACK_LOG_LEVEL`: Logging verbosity (error|warn|info|debug, default: info)

### Exit Codes

| Code | Meaning              | Description                               |
| ---- | -------------------- | ----------------------------------------- |
| 0    | Success              | Message sent successfully                 |
| 1    | Invalid Arguments    | Missing or invalid command-line arguments |
| 2    | Authentication Error | Invalid or missing SLACK_BOT_TOKEN        |
| 3    | Channel Error        | Channel not found or inaccessible         |
| 4    | Network Error        | Unable to connect to Slack API            |
| 5    | Rate Limited         | Slack API rate limit exceeded             |
| 6    | API Error            | Other Slack API error                     |

### Input Validation

#### Channel ID Format

- Pattern: `^C[A-Z0-9]{10,}$`
- Examples: `C1234567890`, `CABCD1234EF`
- Invalid: `#general`, `general`, `123456`

#### Message Content

- Minimum: 1 non-whitespace character
- Maximum: 40,000 characters (Slack limit)
- Format: Slack markdown (mrkdwn)
- Supported formatting: `*bold*`, `_italic_`, `` `code` ``, `> quote`

### Usage Examples

#### Basic Usage

```bash
# Send simple message
npm run run -- send-message C1234567890 "Hello, world!"

# Send formatted message
npm run run -- send-message C1234567890 "*Important:* Please review the _new policy_"

# Send message with code block
npm run run -- send-message C1234567890 "Build completed:\n\`\`\`\nnpm run build\nSuccess: 0 errors\n\`\`\`"
```

#### With Environment Setup

```bash
# Set authentication token
export SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Send with verbose logging
npm run run -- send-message C1234567890 "Debug message" --verbose
```

#### Error Scenarios

```bash
# Missing arguments (Exit 1)
npm run run -- send-message
# Output: Error: Missing required arguments. Use --help for usage.

# Invalid channel ID (Exit 1)
npm run run -- send-message invalid-channel "message"
# Output: Error: Invalid channel ID format. Must be like C1234567890

# Missing token (Exit 2)
unset SLACK_BOT_TOKEN
npm run run -- send-message C1234567890 "message"
# Output: Error: SLACK_BOT_TOKEN environment variable required
```

### Output Format

#### Success Output

```
Message sent to C1234567890
Message ID: 1234567890.123456
```

#### Verbose Success Output

```
[INFO] Validating arguments...
[INFO] Channel ID: C1234567890
[INFO] Message length: 45 characters
[INFO] Loading authentication...
[INFO] Connecting to Slack API...
[INFO] Sending message...
[INFO] Message sent successfully
Message sent to C1234567890
Message ID: 1234567890.123456
```

#### Error Output

```
Error: Channel not found or inaccessible
Channel: C1234567890
Please verify the channel ID and bot permissions.
```

### Contract Test Scenarios

1. **Valid Arguments**: Verify command accepts properly formatted channel ID and message
2. **Help Display**: Verify --help flag shows usage information and exits 0
3. **Version Display**: Verify --version flag shows version and exits 0
4. **Missing Arguments**: Verify missing channel/message shows error and exits 1
5. **Invalid Channel Format**: Verify malformed channel ID shows error and exits 1
6. **Empty Message**: Verify empty/whitespace message shows error and exits 1
7. **Missing Token**: Verify missing SLACK_BOT_TOKEN shows error and exits 2
8. **Verbose Flag**: Verify --verbose enables detailed logging output

### Integration Points

#### Configuration Loading

- Environment variable validation
- CLI argument parsing and validation
- Default value application

#### Error Handling

- Structured error messages with context
- Appropriate exit codes for automation
- Help text generation

#### Logging

- Configurable verbosity levels
- Structured log format for parsing
- No sensitive data in logs (token masking)

### Constitutional Compliance

- ✅ TypeScript interfaces for all CLI contracts
- ✅ Test-first development with failing contract tests
- ✅ Clear separation of CLI concerns from business logic
- ✅ Constitutional error handling patterns
