# Quickstart: Multi-Channel Message Broadcasting

**Feature**: Load channel lists from YAML config and broadcast messages  
**Date**: September 23, 2025

## Overview

This feature enables sending the same message to multiple Slack channels simultaneously by organizing channels into named lists within a YAML configuration file.

## Prerequisites

- Node.js 18+ installed
- Slack bot token with required permissions
- Basic understanding of YAML format

## Quick Setup

### 1. Install Dependencies

```bash
cd slack-messenger
yarn install
```

### 2. Create Configuration File

Create `channels.yaml` in your project root:

```yaml
channel_lists:
  dev-team:
    - '#backend-dev'
    - '#frontend-dev'
    - '#devops'

  marketing:
    - '#marketing-general'
    - '#social-media'
    - '#content-team'

  company-wide:
    - '#general'
    - '#announcements'
    - 'C1234567890' # You can also use channel IDs
```

### 3. Set Slack Token

```bash
# Option 1: Environment variable
export SLACK_BOT_TOKEN="xoxb-your-bot-token"

# Option 2: Pass via command line
slack-messenger broadcast --token "xoxb-your-bot-token" ...
```

### 4. Test Your Setup

List available channel lists:

```bash
yarn start list-channels --config channels.yaml
```

Expected output:

```
Available channel lists in ./channels.yaml:

dev-team (3 channels):
  - #backend-dev
  - #frontend-dev
  - #devops

marketing (3 channels):
  - #marketing-general
  - #social-media
  - #content-team

company-wide (3 channels):
  - #general
  - #announcements
  - general

Total: 3 lists, 9 unique channels
```

## Basic Usage Examples

### Simple Broadcast

Send a message to all channels in the "dev-team" list:

```bash
yarn start broadcast dev-team "Deploy completed successfully! 🚀"
```

### Dry Run (Preview)

See which channels would receive the message without sending:

```bash
yarn start broadcast dev-team "Test message" --dry-run
```

Expected output:

```
Dry run for "dev-team" (3 channels):

→ #backend-dev (C1234567890)
→ #frontend-dev (C1234567891)
→ #devops (C1234567892)

Message preview:
"Deploy completed successfully! 🚀"

No messages sent (dry run mode)
```

### Verbose Output

Get detailed status for each channel:

```bash
yarn start broadcast dev-team "Weekly standup reminder" --verbose
```

Expected output:

```
Broadcasting to "dev-team" (3 channels)...

✓ #backend-dev: Message sent (ts: 1234567890.123456)
✓ #frontend-dev: Message sent (ts: 1234567890.123457)
✓ #devops: Message sent (ts: 1234567890.123458)

Broadcast completed: 3/3 channels successful
```

### Custom Configuration File

Use a different configuration file:

```bash
yarn start broadcast marketing "New product launch!" --config ./configs/production-channels.yaml
```

## Advanced Examples

### Handling Partial Failures

When some channels fail (e.g., bot not in channel):

```bash
yarn start broadcast company-wide "Important announcement" --verbose
```

Possible output:

```
Broadcasting to "company-wide" (3 channels)...

✓ #general: Message sent (ts: 1234567890.123456)
✗ #announcements: Failed - not_in_channel
✓ private-channel: Message sent (ts: 1234567890.123458)

Broadcast completed: 2/3 channels successful
1 channel failed - see details above
```

### Long Messages

Messages with line breaks and formatting:

```bash
yarn start broadcast dev-team "📢 Weekly Update:

• Backend API v2.1 deployed
• Frontend tests passing
• Code freeze starts Friday

Questions? Ask in #general"
```

### Channel ID Usage

Using direct channel IDs in configuration:

```yaml
channel_lists:
  special-channels:
    - 'C1234567890' # Private channel ID
    - 'C0987654321' # Another channel ID
    - '#public-channel' # Mix with channel names
```

## Troubleshooting

### Common Configuration Errors

#### Invalid YAML Format

```bash
Error: Invalid YAML configuration at line 5:
  mapping values are not allowed here
```

**Solution**: Check indentation (use spaces, not tabs) and YAML syntax.

#### Channel List Not Found

```bash
Error: Channel list "typo-name" not found in configuration

Available lists:
  - dev-team
  - marketing
  - company-wide
```

**Solution**: Check spelling of list name or use `list-channels` command.

### Common API Errors

#### Bot Not in Channel

```
✗ #private-channel: Failed - not_in_channel
```

**Solution**: Invite the bot to the channel or remove it from the configuration.

#### Invalid Channel

```
✗ #nonexistent: Failed - channel_not_found
```

**Solution**: Verify channel exists and bot can access it.

#### Token Issues

```bash
Error: Invalid authentication token
```

**Solution**: Check your `SLACK_BOT_TOKEN` is valid and has required permissions.

## Configuration File Reference

### Complete Example

```yaml
# channels.yaml - Complete configuration example
channel_lists:
  # Development teams
  engineering:
    - '#backend-dev'
    - '#frontend-dev'
    - '#mobile-dev'
    - '#devops'

  # Product teams
  product:
    - '#product-management'
    - '#design-team'
    - '#user-research'

  # Marketing teams
  marketing:
    - '#marketing-general'
    - '#social-media'
    - '#content-creation'
    - '#growth-team'

  # Company-wide broadcasts
  everyone:
    - '#general'
    - '#announcements'
    - '#company-updates'

  # Special channels (using IDs for private channels)
  leadership:
    - 'C1234567890' # private-leadership
    - 'C0987654321' # exec-team
    - '#board-updates' # public board channel

  # Regional teams
  us-team:
    - '#us-general'
    - '#us-sales'
    - '#us-support'

  eu-team:
    - '#eu-general'
    - '#eu-sales'
    - '#eu-support'
```

### Validation Rules

- Maximum 100 channels per list
- Channel names must start with `#`
- Channel IDs must match pattern `C[A-Z0-9]{10}`
- List names must be unique and non-empty
- At least one channel required per list

## Integration Examples

### CI/CD Pipeline

```bash
# In your deployment script
if [ "$DEPLOY_STATUS" = "success" ]; then
  yarn start broadcast dev-team "✅ Production deploy completed: $BUILD_VERSION"
else
  yarn start broadcast dev-team "❌ Production deploy failed: $BUILD_VERSION - Check logs"
fi
```

### Monitoring Alerts

```bash
# Alert notification
yarn start broadcast engineering "🚨 High CPU usage detected on api-server-01 - investigating"
```

### Daily Standup Reminders

```bash
# Cron job for daily reminders
0 9 * * 1-5 yarn start broadcast dev-team "📅 Daily standup in 30 minutes! #standup-room"
```

## Best Practices

### Configuration Management

1. **Version Control**: Keep configuration files in version control
2. **Environment-Specific**: Use different configs for dev/staging/prod
3. **Documentation**: Comment your YAML to explain channel purposes
4. **Regular Cleanup**: Remove channels that no longer exist

### Message Guidelines

1. **Clear Subject**: Start with emoji or clear identifier
2. **Actionable**: Include next steps or links when relevant
3. **Appropriate Channels**: Use targeted lists, avoid spamming #general
4. **Test First**: Use `--dry-run` for important announcements

### Security Considerations

1. **Token Security**: Never commit tokens to version control
2. **Limited Scope**: Use tokens with minimal required permissions
3. **Access Control**: Restrict who can modify channel configurations
4. **Audit Trail**: Log important broadcasts for compliance

## Performance Tips

### Large Channel Lists

- Use sequential delivery (built-in) to respect rate limits
- Monitor for rate limiting responses
- Consider breaking very large lists into smaller ones

### Network Optimization

- Run from stable network connection for large broadcasts
- Use `--verbose` to monitor delivery progress
- Retry failed deliveries manually if needed

## Next Steps

1. **Explore Advanced Features**: Try all CLI options and configurations
2. **Set Up Monitoring**: Track broadcast success rates and failures
3. **Automate Workflows**: Integrate with your CI/CD and monitoring systems
4. **Scale Usage**: Create team-specific configurations and processes

For more detailed information, see:

- [Data Model Documentation](./data-model.md)
- [API Integration Contracts](./contracts/)
- [Implementation Tasks](./tasks.md) (after planning phase)
