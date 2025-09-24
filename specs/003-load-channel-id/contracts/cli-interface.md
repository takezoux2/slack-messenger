# CLI Interface Contract

**Feature**: Multi-Channel Message Broadcasting  
**Date**: September 23, 2025

## Command Interface

### Broadcast Command

```bash
slack-messenger broadcast <list-name> <message> [options]
```

**Arguments**:

- `list-name` (required): Name of the channel list from configuration
- `message` (required): Message content to broadcast

**Options**:

- `--config <path>`: Path to YAML configuration file (default: ./channels.yaml)
- `--dry-run`: Preview channels without sending messages
- `--verbose`: Show detailed delivery status for each channel
- `--token <token>`: Override Slack API token
- `--help`: Show command help

### List Command

```bash
slack-messenger list-channels [options]
```

**Arguments**: None

**Options**:

- `--config <path>`: Path to YAML configuration file (default: ./channels.yaml)
- `--help`: Show command help

## Input Contracts

### Command Line Arguments

```typescript
interface BroadcastCommandArgs {
  listName: string
  message: string
  config?: string
  dryRun?: boolean
  verbose?: boolean
  token?: string
}

interface ListCommandArgs {
  config?: string
}
```

### Configuration File Format

```yaml
# channels.yaml
channel_lists:
  engineering-teams:
    - '#backend-dev'
    - '#frontend-dev'
    - 'C1234567890' # Direct channel ID
  marketing-channels:
    - '#marketing-general'
    - '#social-media'
  all-hands:
    - '#general'
    - '#announcements'
```

**Validation Rules**:

- YAML must be valid and parseable
- `channel_lists` key is required at root level
- Each list name must be a non-empty string
- Each list must contain at least one channel
- Maximum 100 channels per list
- Channel identifiers must be either:
  - Channel names starting with `#` (e.g., `#general`)
  - Channel IDs matching pattern `C[A-Z0-9]{10}` (e.g., `C1234567890`)

## Output Contracts

### Successful Broadcast Output

```
Broadcasting to "engineering-teams" (3 channels)...

✓ #backend-dev: Message sent (ts: 1234567890.123456)
✓ #frontend-dev: Message sent (ts: 1234567890.123457)
✓ general: Message sent (ts: 1234567890.123458)

Broadcast completed: 3/3 channels successful
```

### Partial Success Output

```
Broadcasting to "engineering-teams" (3 channels)...

✓ #backend-dev: Message sent (ts: 1234567890.123456)
✗ #frontend-dev: Failed - channel_not_found
✓ general: Message sent (ts: 1234567890.123458)

Broadcast completed: 2/3 channels successful
1 channel failed - see details above
```

### Dry Run Output

```
Dry run for "engineering-teams" (3 channels):

→ #backend-dev (C1234567890)
→ #frontend-dev (C1234567891)
→ general (C1234567892)

Message preview:
"Hello team! This is a test broadcast message."

No messages sent (dry run mode)
```

### List Channels Output

```
Available channel lists in ./channels.yaml:

engineering-teams (3 channels):
  - #backend-dev
  - #frontend-dev
  - general

marketing-channels (2 channels):
  - #marketing-general
  - #social-media

all-hands (2 channels):
  - #general
  - #announcements

Total: 3 lists, 7 unique channels
```

### Error Output Examples

#### Configuration File Not Found

```
Error: Configuration file not found: ./channels.yaml

Create a YAML file with channel lists:
  channel_lists:
    my-team:
      - "#general"
      - "#announcements"

Or specify a different path with --config <path>
```

#### Invalid List Name

```
Error: Channel list "invalid-name" not found in configuration

Available lists:
  - engineering-teams
  - marketing-channels
  - all-hands

Use: slack-messenger list-channels to see all available lists
```

#### YAML Parse Error

```
Error: Invalid YAML configuration at line 5:
  mapping values are not allowed here

Check your YAML syntax:
  - Use proper indentation (spaces, not tabs)
  - Ensure list items start with "-"
  - Quote channel names if they contain special characters
```

### Exit Codes

- `0`: Success (all channels delivered successfully)
- `1`: Partial success (some channels failed)
- `2`: Complete failure (no channels delivered)
- `3`: Configuration error
- `4`: Authentication error
- `5`: Invalid arguments

## Behavioral Contracts

### Error Handling Behavior

1. **Configuration Validation**: Fail fast if configuration is invalid
2. **Channel Resolution**: Attempt to resolve all channels before delivery
3. **Delivery Failures**: Continue delivering to remaining channels if some fail
4. **Rate Limiting**: Respect Slack API limits automatically
5. **Authentication**: Validate token before attempting any deliveries

### Performance Contracts

1. **Response Time**: Configuration loading < 1 second for typical files
2. **Channel Resolution**: < 100ms per channel for API calls
3. **Memory Usage**: < 50MB for configurations with 100 channels
4. **Concurrent Limits**: Sequential delivery to respect rate limits

### Compatibility Contracts

1. **Node.js Version**: Compatible with Node.js 18+
2. **Slack API**: Compatible with current Slack Web API
3. **YAML Format**: Standard YAML 1.2 specification
4. **File Paths**: Cross-platform path handling (Windows/Unix)

### Security Contracts

1. **Token Handling**: Never log or display Slack tokens
2. **File Access**: Only read configuration files, no write operations
3. **Error Messages**: Don't expose sensitive channel information
4. **Path Validation**: Prevent directory traversal attacks
