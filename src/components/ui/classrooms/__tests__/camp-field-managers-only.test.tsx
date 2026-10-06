/**
 * Owner decision 2026-10-07: only an ACTIVE MANAGER may attach a classroom
 * to a camp. Wiring a classroom makes its teacher a camp teacher who sees
 * every camp student's Study results, so a teacher must not be able to
 * grant that to themselves.
 *
 * The database is the guard (migration 123, tested in a rolled-back
 * transaction — see the bottom of that file). These tests pin the two
 * client halves that keep a teacher from ever reaching it:
 *   - CampClassroomField is read-only for a non-manager, with a bilingual
 *     note saying why;
 *   - classrooms-page never sends a teacher's form value for
 *     camp_program_id (create sends none, edit resends the original).
 */
import fs from 'fs'
import path from 'path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampClassroomField } from '../CampClassroomField'
import en from '@/locales/en.json'
import ko from '@/locales/ko.json'

const programs = [
  { id: 'camp-1', name: 'Summer SAT', test_family: 'sat', starts_on: null, ends_on: null, student_cap: 30 },
]
const t = (key: string) => key

describe('CampClassroomField — managers only', () => {
  it('a teacher sees the field disabled with the manager-only note, and cannot toggle it', async () => {
    const onChange = jest.fn()
    render(<CampClassroomField programs={programs} value="" onChange={onChange} canManageCamp={false} t={t} />)
    const box = screen.getByRole('checkbox')
    expect(box).toBeDisabled()
    expect(screen.getByTestId('camp-manager-only').textContent).toContain('classrooms.camp.managerOnly')
    await userEvent.click(box)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('a teacher editing an existing camp classroom sees the camp but cannot change it', () => {
    render(<CampClassroomField programs={programs} value="camp-1" onChange={jest.fn()} canManageCamp={false} t={t} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByRole('combobox')).toBeDisabled()
    // The "once it has assignments you can't change it" warning is for
    // someone who CAN change it.
    expect(screen.queryByText('classrooms.camp.fixedWarning')).toBeNull()
  })

  it('a manager can toggle it, and sees no manager-only note', async () => {
    const onChange = jest.fn()
    render(<CampClassroomField programs={programs} value="" onChange={onChange} canManageCamp t={t} />)
    const box = screen.getByRole('checkbox')
    expect(box).not.toBeDisabled()
    expect(screen.queryByTestId('camp-manager-only')).toBeNull()
    await userEvent.click(box)
    expect(onChange).toHaveBeenCalledWith('camp-1')
  })

  it('the note exists in both languages', () => {
    const enCamp = (en as { classrooms: { camp: Record<string, string> } }).classrooms.camp
    const koCamp = (ko as { classrooms: { camp: Record<string, string> } }).classrooms.camp
    expect(enCamp.managerOnly).toMatch(/manager/i)
    expect(koCamp.managerOnly).toMatch(/관리자/)
  })
})

describe('classrooms-page — a teacher never sends a camp change', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/components/ui/classrooms-page.tsx'), 'utf8')

  it('create sends no camp for a non-manager', () => {
    expect(src).toMatch(/const createProgram = isManager \? formData\.camp_program_id : ''/)
    expect(src).toMatch(/camp_program_id: createProgram \|\| null/)
  })

  it('edit resends the ORIGINAL camp for a non-manager', () => {
    expect(src).toMatch(/const campFrozen = campLocked \|\| !isManager/)
    expect(src).toMatch(/camp_program_id: campFrozen\s*\?\s*\(editingClassroom\.camp_program_id \|\| null\)/)
  })

  it('both modals pass isManager to the field', () => {
    for (const m of ['ClassroomCreateModal', 'ClassroomEditModal']) {
      const modal = fs.readFileSync(path.join(process.cwd(), `src/components/ui/classrooms/modals/${m}.tsx`), 'utf8')
      expect(modal).toMatch(/canManageCamp=\{isManager\}/)
    }
  })
})

describe('migration 123', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'database/migrations/123_camp_wiring_managers_only.sql'), 'utf8')

  it('checks the manager rule BEFORE the early return for a non-camp row (so clearing a camp is covered)', () => {
    const rule = sql.indexOf('may attach a classroom to a camp')
    const earlyReturn = sql.indexOf('if new.camp_program_id is null then')
    expect(rule).toBeGreaterThan(0)
    expect(earlyReturn).toBeGreaterThan(rule)
  })

  it('keeps 122\'s rules 1, 2, 3 and the staff rule, and exempts service role', () => {
    expect(sql).toMatch(/does not belong to academy/)
    expect(sql).toMatch(/has been deleted/)
    expect(sql).toMatch(/must be an active teacher or manager/)
    expect(sql).toMatch(/only staff of academy/)
    expect(sql).toMatch(/if caller is not null and camp_changed then/)
  })

  it('is marked NOT APPLIED', () => {
    expect(sql).toMatch(/^-- NOT APPLIED\./m)
  })
})
