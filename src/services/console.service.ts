import { Message, MessageLevel } from '../models/message.js'

/**
 * Console service for message output
 */
export class ConsoleService {
  /**
   * Output a message to the console with appropriate formatting
   */
  write(message: Message): void {
    const formatted = message.format()

    switch (message.level) {
      case MessageLevel.ERROR:
        console.error(formatted)
        break
      case MessageLevel.DEBUG:
        console.debug(formatted)
        break
      case MessageLevel.INFO:
      default:
        console.log(formatted)
        break
    }
  }

  /**
   * Output simple text to console (for basic hello world functionality)
   */
  writeText(text: string): void {
    console.log(text)
  }

  /**
   * Output info-level message
   */
  info(content: string): void {
    const message = Message.info(content)
    this.write(message)
  }

  /**
   * Output error-level message
   */
  error(content: string): void {
    const message = Message.error(content)
    this.write(message)
  }

  /**
   * Output debug-level message
   */
  debug(content: string): void {
    const message = Message.debug(content)
    this.write(message)
  }
}
