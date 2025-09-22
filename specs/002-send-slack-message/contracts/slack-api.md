# Slack API Contract

**Date**: 2025-09-23  
**Feature**: 002-send-slack-message

## Slack Web API Integration

### API Endpoint

**POST** `https://slack.com/api/chat.postMessage`

### Authentication

- **Type**: Bearer Token (Bot Token)
- **Header**: `Authorization: Bearer xoxb-your-bot-token`
- **Token Format**: `xoxb-` prefix for bot tokens

### Request Schema

#### Headers

```typescript
{
  "Authorization": "Bearer xoxb-...",
  "Content-Type": "application/json; charset=utf-8",
  "User-Agent": "slack-messenger/1.0.0"
}
```

#### Body

```typescript
{
  "channel": "C1234567890",        // Required: Channel ID
  "text": "Hello, world!",         // Required: Message content
  "mrkdwn": true,                 // Required: Enable markdown
  "unfurl_links": false,          // Optional: Disable link previews
  "unfurl_media": false           // Optional: Disable media previews
}
```

### Response Schema

#### Success Response (200 OK)

```typescript
{
  "ok": true,
  "channel": "C1234567890",
  "ts": "1234567890.123456",      // Message timestamp
  "message": {
    "type": "message",
    "subtype": null,
    "text": "Hello, world!",
    "ts": "1234567890.123456",
    "username": "bot-name",
    "bot_id": "B1234567890"
  }
}
```

#### Error Response (200 OK with ok: false)

```typescript
{
  "ok": false,
  "error": "channel_not_found",    // Error code
  "detail": "Value passed for channel was invalid." // Optional detail
}
```

### Error Codes

| Error Code          | HTTP Status | Meaning              | Retry Strategy     |
| ------------------- | ----------- | -------------------- | ------------------ |
| `invalid_auth`      | 200         | Invalid token        | No retry (Exit 2)  |
| `not_authed`        | 200         | Missing token        | No retry (Exit 2)  |
| `channel_not_found` | 200         | Invalid channel      | No retry (Exit 3)  |
| `not_in_channel`    | 200         | Bot not in channel   | No retry (Exit 3)  |
| `rate_limited`      | 429         | Rate limit hit       | Retry with backoff |
| `fatal_error`       | 200         | Slack internal error | Retry with backoff |
| Network errors      | 5xx/timeout | Infrastructure       | Retry with backoff |

### Rate Limiting

#### Tier 2 Rate Limits (chat.postMessage)

- **Limit**: 20+ requests per minute per workspace
- **Headers**:
  - `Retry-After`: Seconds to wait before retry
  - `X-Rate-Limit-Remaining`: Requests remaining
  - `X-Rate-Limit-Reset`: Timestamp when limit resets

#### Retry Strategy

- **Max Attempts**: 3 (including initial request)
- **Backoff**: Exponential with jitter
  - Attempt 1: Immediate
  - Attempt 2: 1-2 seconds
  - Attempt 3: 2-4 seconds
- **Jitter**: ±25% random variation

### Request Validation

#### Pre-flight Checks

- Token format validation: `^xoxb-[A-Za-z0-9\-]+$`
- Channel ID format: `^C[A-Z0-9]{10,}$`
- Message length: 1-40,000 characters
- Message encoding: UTF-8

#### Markdown Support

Slack uses "mrkdwn" format (subset of markdown):

- **Bold**: `*text*`
- **Italic**: `_text_`
- **Code**: `` `text` ``
- **Code block**: ` `text` `
- **Quote**: `> text`
- **Link**: `<https://example.com|Link text>`

### SDK Integration (@slack/web-api)

#### Client Configuration

```typescript
import { WebClient } from '@slack/web-api'

const client = new WebClient(token, {
  retryConfig: {
    maxRetries: 2, // 3 total attempts
    retryDelay: 1000, // Base delay
    factor: 2, // Exponential factor
  },
  timeout: 5000, // Request timeout
})
```

#### API Call

```typescript
const result = await client.chat.postMessage({
  channel: channelId,
  text: message,
  mrkdwn: true,
  unfurl_links: false,
  unfurl_media: false,
})
```

### Contract Test Scenarios

#### Authentication Tests

1. **Valid Token**: Verify successful authentication with valid bot token
2. **Invalid Token**: Verify `invalid_auth` error with malformed token
3. **Missing Token**: Verify `not_authed` error with empty token

#### Channel Tests

4. **Valid Channel**: Verify message sent to valid, accessible channel
5. **Invalid Channel**: Verify `channel_not_found` error with invalid channel ID
6. **Inaccessible Channel**: Verify `not_in_channel` error when bot lacks access

#### Message Tests

7. **Plain Text**: Verify plain text message delivery
8. **Markdown Formatting**: Verify markdown formatting preserved
9. **Empty Message**: Verify API rejects empty message content
10. **Large Message**: Verify API handles messages near 40k character limit

#### Error Handling Tests

11. **Rate Limiting**: Verify 429 response triggers retry with backoff
12. **Network Timeout**: Verify timeout handling and retry
13. **Server Error**: Verify 5xx responses trigger appropriate retry

#### Response Processing Tests

14. **Success Response**: Verify extraction of message timestamp and channel
15. **Error Response**: Verify proper error code and message extraction
16. **Malformed Response**: Verify handling of unexpected response format

### Performance Requirements

- **Timeout**: 5 seconds per request
- **Total Operation**: <15 seconds including retries
- **Memory**: <50MB for single message operation
- **Latency**: Target <1 second in optimal conditions

### Security Considerations

- Never log token values (mask in logs)
- Validate all inputs before API calls
- Use HTTPS for all communications
- Implement proper error handling without token exposure

### Constitutional Compliance

- ✅ TypeScript interfaces for all API contracts
- ✅ Comprehensive error handling per Slack best practices
- ✅ Rate limiting implementation following Slack guidelines
- ✅ Test-first development with API contract validation
