/**
 * Mention entry definition used for placeholder resolution.
 * type defaults to 'user' when omitted or invalid (handled in resolver).
 */
export interface MentionEntry {
  id: string
  type?: 'user' | 'team'
}

/**
 * Mapping of placeholder name -> mention entry.
 * Last duplicate key wins (typical object overwrite during load phase).
 */
export type MentionMapping = Record<string, MentionEntry>
