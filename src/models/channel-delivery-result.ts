import type { ResolvedChannel } from './resolved-channel'

/**
 * Slack error information
 */
export interface SlackError {
  /** Error type from Slack API */
  type: string

  /** Error message */
  message: string

  /** Additional error details */
  details?: any

  /** Retry after seconds (for rate limiting) */
  retryAfter?: number
}

/**
 * Individual channel delivery status and details
 */
export interface ChannelDeliveryResult {
  /** Target channel information */
  channel: ResolvedChannel

  /** Delivery outcome */
  status: 'success' | 'failed' | 'skipped'

  /** Slack message ID if successful */
  messageId?: string

  /** Error details if failed */
  error?: SlackError

  /** Timestamp of successful delivery */
  deliveredAt?: Date
}

/**
 * Validation rules for ChannelDeliveryResult:
 * - Success status requires messageId
 * - Failed status requires error details
 * - Skipped status for channels where bot lacks access
 * - Delivery timestamp only present for successful deliveries
 */
