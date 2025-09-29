import { readFile } from 'fs/promises'
import { resolve, isAbsolute } from 'path'
import { MessageInput } from '../models/message-input.js'

export class FileMessageLoaderService {
  /**
   * Load message content from a file as UTF-8 text without strict validation.
   * Applies trailing trim and validates 1..2000 char length.
   */
  static async load(path: string): Promise<MessageInput> {
    try {
      const absolute = isAbsolute(path) ? path : resolve(process.cwd(), path)
      const raw = await readFile(absolute, { encoding: 'utf8' })
      // No explicit encoding validation; rely on Node's decoding behavior
      return MessageInput.fromFileContent(raw, absolute)
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
        throw new Error(`Message file not found: ${path}`)
      }
      if (err && err.code === 'EACCES') {
        throw new Error(`Cannot read message file (permission denied): ${path}`)
      }
      throw new Error(
        `Failed to read message file: ${path} (${err?.message || 'unknown error'})`
      )
    }
  }
}
