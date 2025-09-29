/**
 * Represents a detected placeholder token in message text.
 * Currently only 'brace' and 'nobrace' forms are planned; additional forms can extend the union.
 */
export interface PlaceholderToken {
  original: string
  name: string
  form: 'brace' | 'nobrace'
  startIndex: number
  endIndex: number // exclusive
  replaced: boolean
}
