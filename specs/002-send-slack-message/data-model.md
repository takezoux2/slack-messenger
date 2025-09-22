# Data Model: Send Slack Message to Channel

**Date**: 2025-09-23  
**Feature**: 002-send-slack-message

## Entity Overview

This feature involves three core entities extracted from the functional requirements: SlackMessage, ChannelTarget, and AuthenticationCredentials.

## Core Entities

### SlackMessage

**Purpose**: Represents the markdown-formatted message content to be sent to Slack

**Fields**:

- `content: string` - The markdown-formatted message text
- `channelId: string` - Target Slack channel identifier
- `timestamp?: Date` - Optional timestamp for the message (defaults to current time)

**Validation Rules**:

- Content must not be empty or only whitespace
- Content must not exceed Slack's 40,000 character limit
- Channel ID must match Slack channel format (C followed by 10+ alphanumeric characters)
- Content must be valid markdown (basic validation)

**State Transitions**:

```
Draft → Validated → Sending → Sent
                  → Failed (with retry count)
```

### ChannelTarget

**Purpose**: Represents the destination Slack channel for the message

**Fields**:

- `id: string` - Slack channel ID (e.g., "C1234567890")
- `name?: string` - Optional human-readable channel name for logging

**Validation Rules**:

- ID must match pattern: `^C[A-Z0-9]{10,}$`
- ID is required and cannot be empty
- No validation of channel existence (per requirements)

**Relationships**:

- One-to-one with SlackMessage
- No persistence or caching required

### AuthenticationCredentials

**Purpose**: Encapsulates Slack API authentication information from environment

**Fields**:

- `botToken: string` - Slack bot token from SLACK_BOT_TOKEN environment variable
- `tokenType: 'bot' | 'user'` - Derived from token prefix (xoxb- or xoxp-)

**Validation Rules**:

- Token must not be empty
- Token must match Slack token format: `^xox[bp]-[A-Za-z0-9\-]+$`
- Bot tokens (xoxb-) preferred for channel messaging
- Token must be loaded from environment, never hardcoded

**Security Constraints**:

- Never log token values
- Never persist tokens to disk
- Validate token format before API calls

## Derived Models

### CommandLineOptions

**Purpose**: Represents parsed and validated CLI arguments

**Fields**:

- `channelId: string` - Target channel ID
- `message: string` - Message content
- `verbose?: boolean` - Optional verbose logging flag

**Validation Rules**:

- Both channelId and message are required
- Apply same validation as core entities
- Provide helpful error messages for missing/invalid arguments

### MessageDeliveryResult

**Purpose**: Represents the outcome of a message sending operation

**Fields**:

- `success: boolean` - Whether the message was delivered
- `messageTs?: string` - Slack timestamp of sent message (on success)
- `error?: string` - Error description (on failure)
- `retryCount: number` - Number of retry attempts made
- `channelId: string` - Target channel ID for logging

**State Flow**:

```
Pending → InProgress → Success
                    → Failed (with retry) → InProgress (if retries remain)
                                        → Failed (final)
```

## Entity Relationships

```
CommandLineOptions ──→ SlackMessage
                  ──→ ChannelTarget

AuthenticationCredentials ──→ SlackApiClient

SlackMessage + ChannelTarget + AuthenticationCredentials ──→ MessageDeliveryResult
```

## Validation Flow

1. **Input Validation**: CommandLineOptions validates CLI arguments
2. **Entity Creation**: Create SlackMessage and ChannelTarget from validated options
3. **Authentication**: Load and validate AuthenticationCredentials from environment
4. **Business Logic**: Combine entities for API operation
5. **Result Mapping**: Convert API response to MessageDeliveryResult

## Error Model

### ValidationError

- Invalid channel ID format
- Empty or oversized message content
- Missing required CLI arguments

### AuthenticationError

- Missing SLACK_BOT_TOKEN environment variable
- Invalid token format
- Token lacks required permissions

### DeliveryError

- Network connectivity issues
- Slack API rate limiting
- Channel not found or inaccessible
- API service unavailable

## Data Flow

```
CLI Args → CommandLineOptions → SlackMessage + ChannelTarget
Environment → AuthenticationCredentials
API Call → MessageDeliveryResult → Console Output + Exit Code
```

## Implementation Notes

### Type Safety

- All entities will be TypeScript interfaces with strict typing
- Validation functions return strongly-typed results
- No `any` types in entity definitions

### Immutability

- Entities are readonly after creation
- State changes create new instances
- Supports functional programming patterns

### Testing Approach

- Each entity has comprehensive unit tests
- Validation rules are independently testable
- Mock implementations for integration testing

### Constitutional Compliance

- ✅ TypeScript-first with strict types
- ✅ Clear interface definitions
- ✅ No implementation details in data model
- ✅ Supports test-first development approach
