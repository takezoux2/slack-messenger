import type { ChannelTarget } from './channel-target'
import type { ResolvedChannel } from './resolved-channel.js'

/**
 * Individual named group of channels for targeted broadcasting
 */
export interface NamedChannelList {
  /** Human-readable identifier (e.g., "engineering-teams") */
  name: string

  /** Array of channel references */
  channels: ChannelTarget[]

  /** Channels after ID resolution */
  resolvedChannels?: ResolvedChannel[]
}

/**
 * Validation rules for NamedChannelList:
 * - Name must be non-empty and unique within configuration
 * - Must contain at least one channel target
 * - Maximum 100 channels per list
 * - No duplicate channels within the same list
 */
