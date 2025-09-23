/**
 * Channel with both ID and name resolved via Slack API
 */
export interface ResolvedChannel {
  /** Slack channel ID (C1234567890) */
  id: string

  /** Slack channel name (general) */
  name: string

  /** Whether channel is private */
  isPrivate: boolean

  /** Whether bot is a member */
  isMember: boolean

  /** Whether channel is archived (optional) */
  isArchived?: boolean
}

/**
 * Validation rules for ResolvedChannel:
 * - ID must be valid Slack channel ID format
 * - Name must match actual Slack channel name
 * - Membership status determines delivery capability
 */
