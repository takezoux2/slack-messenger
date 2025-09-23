/**
 * Message content and metadata for multi-channel delivery
 */
export interface BroadcastMessage {
  /** Message text to broadcast */
  content: string

  /** Named list to broadcast to */
  targetListName: string

  /** Whether to simulate delivery */
  isDryRun: boolean

  /** When broadcast was initiated */
  timestamp: Date
}

/**
 * Validation rules for BroadcastMessage:
 * - Content cannot be empty
 * - Target list name must exist in configuration
 * - Content must comply with Slack message limits
 */
