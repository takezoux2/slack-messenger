import type { ChannelTarget } from './channel-target'

/**
 * User specification for targeting named channel lists
 */
export interface ListSelector {
  /** Selected list name */
  name: string

  /** Whether list exists in configuration */
  isValid: boolean

  /** Resolved channel targets */
  channels?: ChannelTarget[]
}

/**
 * Validation rules for ListSelector:
 * - Name must exist in loaded configuration
 * - Validity determined during configuration lookup
 * - Channels populated only if valid
 */
