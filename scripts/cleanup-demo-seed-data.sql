-- Cleanup script for the demo seed data created during the catalog
-- screenshot session in May 2026.
--
-- WHAT THIS REMOVES:
--   - 31 classroom_sessions in May 2026 for the 5 demo classrooms
--     (수학 기초반, 수학 중급반, 수학 심화반, 과학 심화반, 영어 중급반)
--   - 31 attendance records for student1 on those sessions
--   - 56 assignments in those sessions
--   - 56 grades for student1 on those assignments
--   - 3 assignment_comments on those assignments
--   - 1 invoice (4ea70b3d-007b-4770-a0a2-8e2f1049a935 — "5월 수강료")
--   - 1 student_report (0670e47d-0e48-40ee-8de2-3dd709d72fa2)
--
-- WHAT THIS DOES NOT REMOVE:
--   - The student1 user account itself (it remains as a demo login)
--   - The 5 demo classrooms
--   - The demo academy
--   - Any sessions / assignments / grades outside May 2026
--   - Any data belonging to other students
--
-- Verified pre-run on 2026-05-25:
--   - 0 grades from other students on the demo assignments
--   - 0 attendance from other students on the demo sessions
--   - All deletion targets are exclusively student1's demo footprint.
--
-- Idempotent: re-running after a successful run is a no-op (every
-- DELETE matches 0 rows).
--
-- Reusable: if you re-seed the demo data in the future, the WHERE
-- clauses still apply as long as the 5 classroom IDs are stable.

BEGIN;

-- Delete comments first (FK depends on assignments)
DELETE FROM assignment_comments
WHERE assignment_id IN (
  SELECT a.id
  FROM assignments a
  JOIN classroom_sessions cs ON cs.id = a.classroom_session_id
  WHERE cs.date BETWEEN '2026-05-01' AND '2026-05-31'
    AND cs.classroom_id IN (
      '03020b06-247f-4b90-aa22-097c3fd50372',  -- 수학 기초반
      'a0b25206-d589-442e-9a1f-00e2a8c70b31',  -- 수학 중급반
      'f040eff7-7e66-49d7-b612-ba91f1054016',  -- 수학 심화반
      '2db2b71a-1218-4321-ac8a-0bd9d8562358',  -- 과학 심화반
      '777750de-5c2f-47f0-be27-32de6682650f'   -- 영어 중급반
    )
);

-- Delete grades (FK depends on assignments)
DELETE FROM assignment_grades
WHERE student_id = 'de0dc678-82ab-4503-86b1-0d48cff8116c'
  AND assignment_id IN (
    SELECT a.id
    FROM assignments a
    JOIN classroom_sessions cs ON cs.id = a.classroom_session_id
    WHERE cs.date BETWEEN '2026-05-01' AND '2026-05-31'
      AND cs.classroom_id IN (
        '03020b06-247f-4b90-aa22-097c3fd50372',
        'a0b25206-d589-442e-9a1f-00e2a8c70b31',
        'f040eff7-7e66-49d7-b612-ba91f1054016',
        '2db2b71a-1218-4321-ac8a-0bd9d8562358',
        '777750de-5c2f-47f0-be27-32de6682650f'
      )
  );

-- Delete assignments (FK depends on classroom_sessions)
DELETE FROM assignments
WHERE classroom_session_id IN (
  SELECT id FROM classroom_sessions
  WHERE date BETWEEN '2026-05-01' AND '2026-05-31'
    AND classroom_id IN (
      '03020b06-247f-4b90-aa22-097c3fd50372',
      'a0b25206-d589-442e-9a1f-00e2a8c70b31',
      'f040eff7-7e66-49d7-b612-ba91f1054016',
      '2db2b71a-1218-4321-ac8a-0bd9d8562358',
      '777750de-5c2f-47f0-be27-32de6682650f'
    )
);

-- Delete attendance (FK depends on classroom_sessions; also targets
-- student1 specifically for safety even though we verified no other
-- students have attendance on these sessions)
DELETE FROM attendance
WHERE student_id = 'de0dc678-82ab-4503-86b1-0d48cff8116c'
  AND classroom_session_id IN (
    SELECT id FROM classroom_sessions
    WHERE date BETWEEN '2026-05-01' AND '2026-05-31'
      AND classroom_id IN (
        '03020b06-247f-4b90-aa22-097c3fd50372',
        'a0b25206-d589-442e-9a1f-00e2a8c70b31',
        'f040eff7-7e66-49d7-b612-ba91f1054016',
        '2db2b71a-1218-4321-ac8a-0bd9d8562358',
        '777750de-5c2f-47f0-be27-32de6682650f'
      )
  );

-- Delete the sessions themselves
DELETE FROM classroom_sessions
WHERE date BETWEEN '2026-05-01' AND '2026-05-31'
  AND classroom_id IN (
    '03020b06-247f-4b90-aa22-097c3fd50372',
    'a0b25206-d589-442e-9a1f-00e2a8c70b31',
    'f040eff7-7e66-49d7-b612-ba91f1054016',
    '2db2b71a-1218-4321-ac8a-0bd9d8562358',
    '777750de-5c2f-47f0-be27-32de6682650f'
  );

-- Standalone records
DELETE FROM invoices WHERE id = '4ea70b3d-007b-4770-a0a2-8e2f1049a935';
DELETE FROM student_reports WHERE id = '0670e47d-0e48-40ee-8de2-3dd709d72fa2';

COMMIT;
