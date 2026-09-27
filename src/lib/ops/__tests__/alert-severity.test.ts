import { toDbSeverity } from '../alert'

describe('toDbSeverity', () => {
  it("maps the code's vocabulary onto the table's CHECK (low/medium/high/critical)", () => {
    expect(toDbSeverity('critical')).toBe('critical')
    expect(toDbSeverity('warning')).toBe('medium')
    expect(toDbSeverity('info')).toBe('low')
    expect(toDbSeverity('high')).toBe('high')
  })
  it('never returns a value the CHECK rejects, even for an unknown label', () => {
    for (const v of ['warning', 'info', 'major', 'nit', 'bogus', '']) {
      expect(['low', 'medium', 'high', 'critical']).toContain(toDbSeverity(v))
    }
  })
})
