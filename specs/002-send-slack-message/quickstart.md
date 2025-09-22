# Quickstart: Send Slack Message to Channel

**Date**: 2025-09-23  
**Feature**: 002-send-slack-message

## Prerequisites

- Node.js 21+ installed
- Yarn package manager
- Slack workspace with bot token
- Access to a Slack channel for testing

## Setup Instructions

### 1. Install Dependencies

```bash
cd slack-messenger
yarn install
yarn add @slack/web-api commander
```

### 2. Configure Slack Bot Token

#### Create Slack App (if needed)

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "Slack Messenger")
4. Select your workspace

#### Configure Bot Permissions

1. Go to "OAuth & Permissions" in your app settings
2. Add the following Bot Token Scopes:
   - `chat:write` - Send messages to channels
   - `chat:write.public` - Send messages to public channels without joining
3. Install app to workspace
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

#### Set Environment Variable

```bash
# Linux/macOS
export SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Windows PowerShell
$env:SLACK_BOT_TOKEN="xoxb-your-bot-token-here"

# Or create .env file (not recommended for production)
echo "SLACK_BOT_TOKEN=xoxb-your-bot-token-here" > .env
```

### 3. Find Target Channel ID

#### Method 1: Via Slack Desktop App

1. Right-click on channel name
2. Select "Copy link"
3. Extract channel ID from URL: `https://workspace.slack.com/archives/C1234567890`
4. Channel ID is `C1234567890`

#### Method 2: Via Browser Developer Tools

1. Open Slack in browser
2. Navigate to target channel
3. Open Developer Tools (F12)
4. Look for channel ID in URL or page source

## Usage Examples

### Basic Message

```bash
npm run run -- send-message C1234567890 "Hello from the command line!"
```

### Formatted Message

```bash
npm run run -- send-message C1234567890 "*Important announcement:* Please review the _quarterly reports_"
```

### Code Block Message

```bash
npm run run -- send-message C1234567890 "Build completed successfully:\n\`\`\`\nnpm run build\n✅ Build completed in 2.3s\n\`\`\`"
```

### Multi-line Message

```bash
npm run run -- send-message C1234567890 "Daily standup update:
• Completed user authentication
• Working on API integration
• Blocked on design review"
```

### With Verbose Logging

```bash
npm run run -- send-message C1234567890 "Debug message" --verbose
```

## Validation Tests

### Test 1: Basic Functionality

```bash
# Should succeed and return exit code 0
npm run run -- send-message C1234567890 "Test message"
echo $?  # Should output: 0
```

### Test 2: Invalid Channel ID

```bash
# Should fail with exit code 1
npm run run -- send-message invalid-channel "Test message"
echo $?  # Should output: 1
```

### Test 3: Missing Token

```bash
# Should fail with exit code 2
unset SLACK_BOT_TOKEN
npm run run -- send-message C1234567890 "Test message"
echo $?  # Should output: 2
```

### Test 4: Empty Message

```bash
# Should fail with exit code 1
npm run run -- send-message C1234567890 ""
echo $?  # Should output: 1
```

### Test 5: Help Command

```bash
# Should show help and exit with code 0
npm run run -- send-message --help
echo $?  # Should output: 0
```

## Expected Output

### Success Case

```
Message sent to C1234567890
Message ID: 1699891234.567890
```

### Verbose Success Case

```
[INFO] Validating arguments...
[INFO] Channel ID: C1234567890
[INFO] Message length: 26 characters
[INFO] Loading authentication...
[INFO] Token loaded: xoxb-****-****-****
[INFO] Connecting to Slack API...
[INFO] Sending message...
[INFO] Message sent successfully
Message sent to C1234567890
Message ID: 1699891234.567890
```

### Error Cases

```bash
# Invalid arguments
Error: Invalid channel ID format. Must be like C1234567890

# Authentication error
Error: SLACK_BOT_TOKEN environment variable required

# Channel not found
Error: Channel not found or inaccessible
Channel: C1234567890
Please verify the channel ID and bot permissions.

# Network error
Error: Unable to connect to Slack API
Please check your internet connection and try again.
```

## Troubleshooting

### Common Issues

#### "Channel not found" Error

- Verify channel ID format (starts with 'C')
- Ensure bot is added to the channel (for private channels)
- Check bot has `chat:write` permission

#### "Invalid auth" Error

- Verify token starts with `xoxb-`
- Ensure token is current (not revoked)
- Check token has required scopes

#### "Rate limited" Error

- Wait for rate limit to reset
- Reduce message frequency
- Application will automatically retry

#### Network Timeout

- Check internet connectivity
- Verify Slack API is accessible
- Application will automatically retry

### Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
npm run run -- send-message C1234567890 "Debug test" --verbose
```

### Token Validation

Test token validity:

```bash
# Should succeed if token is valid
npm run run -- send-message C1234567890 "Token test"
```

## Integration with Scripts

### Shell Scripts

```bash
#!/bin/bash
CHANNEL="C1234567890"
MESSAGE="Deployment completed: $(date)"

if npm run run -- send-message "$CHANNEL" "$MESSAGE"; then
    echo "Notification sent successfully"
else
    echo "Failed to send notification"
    exit 1
fi
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Notify Slack
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
  run: |
    npm run run -- send-message C1234567890 "Build ${{ github.sha }} completed"
```

## Performance Expectations

- **Typical latency**: 500ms - 2 seconds
- **With retries**: Up to 15 seconds maximum
- **Memory usage**: <50MB
- **Network**: Requires HTTPS access to slack.com

## Security Notes

- Never commit tokens to version control
- Use environment variables or secure secret storage
- Tokens are never logged or displayed
- Use least-privilege bot permissions

## Next Steps

After successful quickstart:

1. Integrate into your automation workflows
2. Set up monitoring for failed messages
3. Consider implementing message templates
4. Add custom error handling for your use case

## Support

For issues:

1. Check troubleshooting section above
2. Verify Slack app configuration
3. Test with minimal example
4. Check application logs with `--verbose`
