# Research: Mention Mapping & Placeholder Resolution

## Decisions

### Parsing Strategy

- Decision: Implement a manual single-pass line-oriented parser that tracks fenced code blocks, inline code spans, and block quote lines to skip replacement regions.
- Rationale: Manual scan gives precise control over boundaries and exclusion zones; reduces regex complexity and false positives around punctuation or markdown constructs.
- Alternatives Considered: Complex composite regex (harder to maintain, risk of catastrophic backtracking for large messages), Markdown AST parse (overkill; adds dependency and performance overhead).

### Placeholder Forms

- Decision: Support `@{name}` (brace) and `@name` boundary-limited by single space or end-of-line. Reject punctuation adjacency for no-brace form.
- Rationale: Matches clarified user expectations; avoids accidental replacements inside emails or composite identifiers.
- Alternatives: Accept punctuation (led to ambiguity), restrict characters to alphanumerics (less flexible for roles like `dev.ops-lead`).

### Mapping Policy

- Decision: Case-sensitive keys; last duplicate wins; any visible non-whitespace characters allowed (excluding `}` inside brace form). No artificial limits on number of mappings or placeholders.
- Rationale: Simplicity, predictability, and explicit author control.
- Alternatives: Case-insensitive (risk collisions); early-duplicate error (adds friction).

### Summary Output

- Decision: Multi-line deterministic format:
  - `Replacements: key1=count1, key2=count2 (total=X)` with keys sorted alphabetically.
  - `Unresolved: token1, token2` (list in first-appearance order) or `Unresolved: none`.
  - If no placeholders at all (neither replaced nor unresolved): `Placeholders: none` (single line).
- Rationale: Human friendly yet testable. Ordering rules enable stable assertions.
- Alternatives: JSON (machine friendly but more verbose); single-line only (harder to read with long lists).

### Performance

- Decision: O(n) scan of message text; token extraction uses string operations only. No additional caching.
- Rationale: Messages are short; optimization unnecessary; clarity prioritized.
- Alternatives: Precompiled regex; streaming generator (unneeded complexity).

### Error Handling

- Decision: Invalid empty `@{}` ignored silently (not unresolved). Unknown placeholders left literal and reported under Unresolved.
- Rationale: Minimizes noise and accidental errors.
- Alternatives: Emit warnings for empty tokens (adds noise) or treat unknowns as errors (breaks safe fallback requirement).

## Risks & Mitigations

| Risk                                         | Impact                 | Mitigation                                      |
| -------------------------------------------- | ---------------------- | ----------------------------------------------- |
| Mis-detection in complex markdown edge cases | Incorrect replacements | Conservative boundary + explicit skip zones     |
| Very large message with many placeholders    | Slight performance hit | Linear algorithm; acceptable for expected sizes |
| Config growth causing memory overhead        | Low (small YAML)       | In-memory map only; negligible                  |

## Open Items

None (all clarifications resolved).

## Summary

Adopt a minimal, deterministic, testable parsing and replacement approach requiring no external parsing libraries, while ensuring markdown code and quote exclusion and stable summary output. Ready for Phase 1 design.
