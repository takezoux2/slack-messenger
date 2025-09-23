# Data Model: Multi-Channel Message Broadcasting

**Feature**: Load channel lists from YAML config and broadcast messages  
**Date**: September 23, 2025

## Core Entities

### ChannelConfiguration

**Purpose**: Represents the complete YAML configuration file structure  
**Fields**:

- `channelLists: Record<string, NamedChannelList>` - Map of list names to channel lists
- `filePath: string` - Path to the configuration file
- `lastModified?: Date` - Configuration file modification time

**Validation Rules**:

- Must contain at least one named channel list
- Channel list names must be non-empty strings
- File path must exist and be readable
- YAML must be valid and parseable

**State Transitions**: Immutable after loading from file

### NamedChannelList

**Purpose**: Individual named group of channels for targeted broadcasting  
**Fields**:

- `name: string` - Human-readable identifier (e.g., "engineering-teams")
- `channels: ChannelTarget[]` - Array of channel references
- `resolvedChannels?: ResolvedChannel[]` - Channels after ID resolution

**Validation Rules**:

- Name must be non-empty and unique within configuration
- Must contain at least one channel target
- Maximum 100 channels per list
- No duplicate channels within the same list

**Relationships**:

- Belongs to one ChannelConfiguration
- Contains multiple ChannelTarget entities

### ChannelTarget

**Purpose**: Individual channel specification within a named list  
**Fields**:

- `identifier: string` - Channel ID (C1234567890) or name (#general)
- `type: 'id' | 'name'` - Indicates whether identifier is ID or name

**Validation Rules**:

- Channel IDs must match pattern C[A-Z0-9]{10}
- Channel names must start with # and contain valid characters
- Identifier cannot be empty

**State Transitions**: Static after parsing from configuration

### ResolvedChannel

**Purpose**: Channel with both ID and name resolved via Slack API  
**Fields**:

- `id: string` - Slack channel ID (C1234567890)
- `name: string` - Slack channel name (general)
- `isPrivate: boolean` - Whether channel is private
- `isMember: boolean` - Whether bot is a member

**Validation Rules**:

- ID must be valid Slack channel ID format
- Name must match actual Slack channel name
- Membership status determines delivery capability

**Relationships**: Resolved from ChannelTarget via Slack API

### BroadcastMessage

**Purpose**: Message content and metadata for multi-channel delivery  
**Fields**:

- `content: string` - Message text to broadcast
- `targetListName: string` - Named list to broadcast to
- `isDryRun: boolean` - Whether to simulate delivery
- `timestamp: Date` - When broadcast was initiated

**Validation Rules**:

- Content cannot be empty
- Target list name must exist in configuration
- Content must comply with Slack message limits

**State Transitions**: Immutable after creation

### BroadcastResult

**Purpose**: Aggregated results from multi-channel message delivery  
**Fields**:

- `targetListName: string` - Which named list was targeted
- `totalChannels: number` - Total channels in the list
- `deliveryResults: ChannelDeliveryResult[]` - Per-channel delivery status
- `overallStatus: 'success' | 'partial' | 'failed'` - Aggregate status
- `completedAt: Date` - When broadcast completed

**Validation Rules**:

- Total channels must match delivery results length
- Overall status derived from individual results
- Completed timestamp must be after initiation

**Relationships**: Contains multiple ChannelDeliveryResult entities

### ChannelDeliveryResult

**Purpose**: Individual channel delivery status and details  
**Fields**:

- `channel: ResolvedChannel` - Target channel information
- `status: 'success' | 'failed' | 'skipped'` - Delivery outcome
- `messageId?: string` - Slack message ID if successful
- `error?: SlackError` - Error details if failed
- `deliveredAt?: Date` - Timestamp of successful delivery

**Validation Rules**:

- Success status requires messageId
- Failed status requires error details
- Skipped status for channels where bot lacks access
- Delivery timestamp only present for successful deliveries

**Relationships**: Belongs to one BroadcastResult, references one ResolvedChannel

### BroadcastOptions

**Purpose**: CLI options and flags for broadcast command  
**Fields**:

- `configPath: string` - Path to YAML configuration file
- `listName: string` - Named channel list to target
- `message: string` - Message content to broadcast
- `dryRun: boolean` - Whether to simulate delivery
- `verbose: boolean` - Whether to show detailed output
- `token?: string` - Slack API token override

**Validation Rules**:

- Config path must be valid file path
- List name must be non-empty string
- Message must be non-empty string
- Boolean flags have default values

**State Transitions**: Immutable after CLI parsing

### ListSelector

**Purpose**: User specification for targeting named channel lists  
**Fields**:

- `name: string` - Selected list name
- `isValid: boolean` - Whether list exists in configuration
- `channels?: ChannelTarget[]` - Resolved channel targets

**Validation Rules**:

- Name must exist in loaded configuration
- Validity determined during configuration lookup
- Channels populated only if valid

**Relationships**: References NamedChannelList from ChannelConfiguration

## Data Flow

### Configuration Loading Flow

```
File Path → YAML Parser → ChannelConfiguration → NamedChannelList[] → ChannelTarget[]
```

### Channel Resolution Flow

```
ChannelTarget → Slack API → ResolvedChannel → Membership Validation
```

### Broadcast Execution Flow

```
BroadcastOptions → ListSelector → NamedChannelList → ResolvedChannel[] →
ChannelDeliveryResult[] → BroadcastResult
```

### Error Handling Flow

```
Any Step → Error Detection → Error Classification → User-Friendly Message →
Graceful Degradation or Process Termination
```

## Persistence Strategy

### Configuration Storage

- **Format**: YAML files on local filesystem
- **Location**: User-specified path via CLI argument
- **Caching**: Load once per command execution
- **Validation**: Parse and validate on every load

### Runtime State

- **Scope**: Single command execution lifecycle
- **Memory**: Hold resolved channels and results in memory
- **Cleanup**: Automatic cleanup on command completion
- **No Persistence**: Results displayed to console, not stored

### API Response Caching

- **Scope**: Within single broadcast operation
- **Purpose**: Avoid duplicate API calls for same channel
- **Implementation**: In-memory Map<channelIdentifier, ResolvedChannel>
- **Lifetime**: Command execution duration only

## Error Handling Strategy

### Configuration Errors

- **File Not Found**: Clear message with path and suggestion
- **Invalid YAML**: Parse error with line number and correction hint
- **Empty Configuration**: Specific message about missing channel lists
- **Validation Failures**: Detailed field-level error descriptions

### Channel Resolution Errors

- **Invalid Channel**: Continue with valid channels, report invalid ones
- **API Failures**: Retry with exponential backoff, report persistent failures
- **Permission Denied**: Clear message about bot permissions
- **Rate Limiting**: Automatic handling via @slack/web-api library

### Delivery Errors

- **Network Issues**: Retry logic with timeout and failure reporting
- **Authentication**: Clear error about token validity
- **Channel Access**: Skip inaccessible channels, continue with accessible ones
- **Message Format**: Pre-validation to prevent API rejection

## Type Definitions

### TypeScript Interfaces

```typescript
interface ChannelConfiguration {
  channelLists: Record<string, NamedChannelList>
  filePath: string
  lastModified?: Date
}

interface NamedChannelList {
  name: string
  channels: ChannelTarget[]
  resolvedChannels?: ResolvedChannel[]
}

interface ChannelTarget {
  identifier: string
  type: 'id' | 'name'
}

interface ResolvedChannel {
  id: string
  name: string
  isPrivate: boolean
  isMember: boolean
}

interface BroadcastResult {
  targetListName: string
  totalChannels: number
  deliveryResults: ChannelDeliveryResult[]
  overallStatus: 'success' | 'partial' | 'failed'
  completedAt: Date
}

interface ChannelDeliveryResult {
  channel: ResolvedChannel
  status: 'success' | 'failed' | 'skipped'
  messageId?: string
  error?: SlackError
  deliveredAt?: Date
}

interface BroadcastOptions {
  configPath: string
  listName: string
  message: string
  dryRun: boolean
  verbose: boolean
  token?: string
}
```
