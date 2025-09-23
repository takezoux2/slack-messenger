import type { ChannelDeliveryResult } from './channel-delivery-result.js'

/**
 * Aggregated results from multi-channel message delivery
 */
export interface BroadcastResult {
  /** Which named list was targeted */
  targetListName: string

  /** Total channels in the list */
  totalChannels: number

  /** Per-channel delivery status */
  deliveryResults: ChannelDeliveryResult[]

  /** Aggregate status */
  overallStatus: 'success' | 'partial' | 'failed'

  /** When broadcast completed */
  completedAt: Date
}

/**
 * Validation rules for BroadcastResult:
 * - Total channels must match delivery results length
 * - Overall status derived from individual results
 * - Completed timestamp must be after initiation
 */
