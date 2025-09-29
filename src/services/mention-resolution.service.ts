import type { MentionMapping } from '../models/mention-mapping'
import type { PlaceholderToken } from '../models/placeholder-token'
import type { ResolutionSummary } from '../models/resolution-summary'

// --- Tokenizer (T019) -------------------------------------------------------

/**
 * Extract placeholder tokens from raw text.
 * Supports two forms:
 *  - Brace: @{name}
 *  - No-brace: @name (must be followed by space, newline, or end-of-string)
 * Skips detection within:
 *  - Fenced code blocks (``` ... ```)
 *  - Inline code spans (`...`)
 *  - Block quote lines (lines whose first non-space char is '>')
 *  - Empty brace form @{}
 *  - No-brace followed immediately by punctuation (e.g., @name,)
 */
export function extractTokens(text: string): PlaceholderToken[] {
  if (!text.includes('@')) return []
  const tokens: PlaceholderToken[] = []

  let i = 0
  const len = text.length
  let inFence = false
  let inlineCode = false

  while (i < len) {
    const ch = text[i]

    // Detect line starts for block quote & fences
    const atLineStart = i === 0 || text[i - 1] === '\n'
    if (atLineStart) {
      // Toggle fenced code blocks (```) - only when line starts with ```
      if (text.startsWith('```', i)) {
        // Toggle state and advance to end of line
        inFence = !inFence
        // Move i to end of line
        const nl = text.indexOf('\n', i + 3)
        i = nl === -1 ? len : nl + 1
        inlineCode = false // reset inline code on fence line
        continue
      }
    }

    // If inside fenced block, fast-forward to next line & check again
    if (inFence) {
      const nl = text.indexOf('\n', i)
      if (nl === -1) break
      i = nl + 1
      continue
    }

    // Block quote line: skip placeholder detection on entire line
    if (atLineStart) {
      let j = i
      while (j < len && text[j] === ' ') j++
      if (text[j] === '>') {
        // Skip to end of line
        const nl = text.indexOf('\n', j)
        if (nl === -1) break
        i = nl + 1
        continue
      }
    }

    // Handle inline code spans (toggle on backtick when not a fence)
    if (ch === '`') {
      inlineCode = !inlineCode
      i++
      continue
    }
    if (inlineCode) {
      i++
      continue
    }

    if (ch === '@') {
      const next = text[i + 1]
      // Brace form
      if (next === '{') {
        const close = text.indexOf('}', i + 2)
        if (close !== -1) {
          const name = text.slice(i + 2, close).trim()
          if (name.length > 0) {
            tokens.push({
              original: text.slice(i, close + 1),
              name,
              form: 'brace',
              startIndex: i,
              endIndex: close + 1,
              replaced: false,
            })
            i = close + 1
            continue
          }
        }
        // Empty or invalid brace form: treat as literal and continue past '@'
        i++
        continue
      }
      // No-brace form; collect until space or newline
      if (next && next !== ' ' && next !== '\n') {
        let j = i + 1
        while (j < len && text[j] !== ' ' && text[j] !== '\n') j++
        const boundaryChar = j < len ? text[j] : ''
        const name = text.slice(i + 1, j)
        // Boundary rule: must end at space, newline, or end-of-string
        if (
          name.length > 0 &&
          (boundaryChar === ' ' || boundaryChar === '' || boundaryChar === '\n')
        ) {
          // Punctuation adjacency check: ensure last char of name not punctuation followed immediately by punctuation char (handled by boundary rule already)
          // Additional rule: if next char after name is punctuation (e.g., comma) we skip (already excluded by boundaryChar condition)
          tokens.push({
            original: text.slice(i, i + 1 + name.length),
            name,
            form: 'nobrace',
            startIndex: i,
            endIndex: i + 1 + name.length,
            replaced: false,
          })
          i = i + 1 + name.length
          continue
        }
      }
    }

    i++
  }
  return tokens
}

// --- Resolver (T020) --------------------------------------------------------

function formatReplacement(
  name: string,
  entryId: string,
  type?: string
): string {
  if (name === 'here') return '<!here>'
  if (type === 'team') return `<!subteam^${entryId}>`
  // default user
  return `<@${entryId}>`
}

export function applyMentions(
  text: string,
  mapping: MentionMapping
): { text: string; summary: ResolutionSummary } {
  // Fast path: if no '@' then nothing to do
  if (!text.includes('@')) {
    return {
      text,
      summary: {
        replacements: {},
        unresolved: [],
        totalReplacements: 0,
        hadPlaceholders: false,
      },
    }
  }

  const tokens = extractTokens(text)
  if (tokens.length === 0) {
    return {
      text,
      summary: {
        replacements: {},
        unresolved: [],
        totalReplacements: 0,
        hadPlaceholders: false,
      },
    }
  }

  let output = ''
  let lastIndex = 0
  const counts: Record<string, number> = {}
  const unresolved: string[] = []
  const seenUnresolved = new Set<string>()

  for (const token of tokens) {
    // Append text preceding token
    if (token.startIndex > lastIndex) {
      output += text.slice(lastIndex, token.startIndex)
    }
    const name = token.name
    let replacedStr: string | null = null

    if (name === 'here') {
      replacedStr = formatReplacement(name, '', 'here')
    } else {
      const entry = (mapping as any)[name]
      if (entry) {
        // Support plain string shorthand entry => user id
        if (typeof entry === 'string') {
          replacedStr = formatReplacement(name, entry, 'user')
        } else if (entry.id) {
          const t = entry.type === 'team' ? 'team' : 'user'
          replacedStr = formatReplacement(name, entry.id, t)
        }
      }
    }

    if (replacedStr) {
      counts[name] = (counts[name] || 0) + 1
      output += replacedStr
    } else {
      // Leave literal
      output += token.original
      if (!seenUnresolved.has(token.original)) {
        seenUnresolved.add(token.original)
        unresolved.push(token.original)
      }
    }
    lastIndex = token.endIndex
  }
  // Append remainder
  if (lastIndex < text.length) {
    output += text.slice(lastIndex)
  }

  // Create alphabetically sorted replacements object
  const sortedKeys = Object.keys(counts).sort()
  const sorted: Record<string, number> = {}
  for (const k of sortedKeys) sorted[k] = counts[k]!

  const summary: ResolutionSummary = {
    replacements: sorted,
    unresolved,
    totalReplacements: sortedKeys.reduce((sum, k) => sum + counts[k]!, 0),
    hadPlaceholders: true,
  }

  return { text: output, summary }
}

/**
 * Format a resolution summary into deterministic human-readable lines.
 * Implemented early to support contract test scaffolding.
 */
export function formatResolutionSummary(summary: ResolutionSummary): string[] {
  if (!summary.hadPlaceholders) {
    return ['Placeholders: none']
  }

  const keys = Object.keys(summary.replacements).sort()
  const replacementLine =
    keys.length > 0
      ? `Replacements: ${keys
          .map(k => `${k}=${summary.replacements[k]}`)
          .join(', ')} (total=${summary.totalReplacements})`
      : 'Replacements: (total=0)'

  const unresolvedLine =
    summary.unresolved.length === 0
      ? 'Unresolved: none'
      : `Unresolved: ${summary.unresolved.join(', ')}`

  return [replacementLine, unresolvedLine]
}
