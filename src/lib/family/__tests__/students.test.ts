import { dedupeFamilyStudents } from '../students'

const row = (id: string, academy_id: string | null, name = 'Kim', email = 'k@x.com') =>
  ({ id, name, email, academy_id })

describe('dedupeFamilyStudents', () => {
  it('collapses a child enrolled in two academies into one row', () => {
    const out = dedupeFamilyStudents([
      row('a', 'academy-2', '김준수', 'jason@gmail.com'),
      row('a', 'academy-1', '김준수', 'jason@gmail.com'),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('a')
    expect(out[0].academy_ids).toEqual(['academy-1', 'academy-2'])
  })

  it('picks the first sorted academy id for the legacy academy_id field', () => {
    const out = dedupeFamilyStudents([row('a', 'zz'), row('a', 'aa')])
    expect(out[0].academy_id).toBe('aa')
  })

  it('keeps distinct children as distinct rows, in first-seen order', () => {
    const out = dedupeFamilyStudents([
      row('a', 'academy-1', '김준수'),
      row('b', 'academy-1', 'Sean Park'),
      row('a', 'academy-2', '김준수'),
    ])
    expect(out.map(s => s.id)).toEqual(['a', 'b'])
    expect(out[0].academy_ids).toEqual(['academy-1', 'academy-2'])
    expect(out[1].academy_ids).toEqual(['academy-1'])
  })

  it('does not repeat an academy id when the same pair appears twice', () => {
    const out = dedupeFamilyStudents([row('a', 'academy-1'), row('a', 'academy-1')])
    expect(out[0].academy_ids).toEqual(['academy-1'])
  })

  it('tolerates a null academy_id (child with no enrolment row)', () => {
    const out = dedupeFamilyStudents([row('a', null)])
    expect(out[0].academy_ids).toEqual([])
    expect(out[0].academy_id).toBe('')
  })

  it('drops rows with no id rather than keying on undefined', () => {
    expect(dedupeFamilyStudents([row('', 'academy-1')])).toHaveLength(0)
  })
})
