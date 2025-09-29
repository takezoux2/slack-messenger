/**
 * MessageInput model represents message content and its source (inline or file).
 * Includes helpers for trimming and previews, and validation rules.
 */

export type MessageSource = 'inline' | 'file'

export class MessageInput {
  readonly source: MessageSource
  readonly content: string
  readonly filePath: string | undefined

  private constructor(
    source: MessageSource,
    content: string,
    filePath?: string
  ) {
    this.source = source
    this.content = content
    this.filePath = filePath
  }

  static fromFileContent(
    rawContent: string,
    absolutePath: string
  ): MessageInput {
    const content = MessageInput.rstrip(rawContent)
    if (content.length === 0) {
      throw new Error(
        'Message cannot be empty after trimming trailing whitespace'
      )
    }
    if (content.length > 2000) {
      throw new Error('Message from file cannot exceed 2000 characters')
    }
    return new MessageInput('file', content, absolutePath)
  }

  static fromInline(rawContent: string): MessageInput {
    // Preserve existing 40,000-character limit for inline messages; trimming not applied here
    return new MessageInput('inline', rawContent)
  }

  isTooLong(limit = 2000): boolean {
    return this.content.length > limit
  }

  static preview200(text: string): string {
    return text.length <= 200 ? text : text.slice(0, 200)
  }

  static rstrip(text: string): string {
    // Remove trailing whitespace and newline characters only
    return text.replace(/[\s\n\r\t]+$/u, '')
  }
}
