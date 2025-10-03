import { describe, it, expect } from 'vitest'
// @ts-expect-error applyMentions not implemented yet
import { applyMentions } from '../../src/services/mention-resolution.service'

describe('team type replacement', () => {
  it('formats team mention using <!subteam^ID>', () => {
    const mapping = { team: { id: 'S123TEAM', type: 'team' } }
    const input = 'Ping @team '
    const { text } = applyMentions(input, mapping)
    expect(text).toContain('<!subteam^S123TEAM>')
  })
})
