/**
 * CLI options and flags for broadcast command
 */
export interface BroadcastOptions {
  /** Path to YAML configuration file */
  configPath: string

  /** Named channel list to target */
  listName: string

  /** Message content to broadcast */
  message: string

  /** Whether to simulate delivery */
  dryRun: boolean

  /** Whether to show detailed output */
  verbose: boolean

  /** Slack API token override */
  token?: string

  /** Optional sender name override */
  senderName?: string

  /** Optional sender icon emoji override */
  senderIconEmoji?: string

  /** Optional sender icon URL override */
  senderIconUrl?: string

  /** Allow default identity usage when configuration lacks sender identity */
  allowDefaultIdentity?: boolean
}

/**
 * Validation rules for BroadcastOptions:
 * - Config path must be valid file path
 * - List name must be non-empty string
 * - Message must be non-empty string
 * - Boolean flags have default values
 */
