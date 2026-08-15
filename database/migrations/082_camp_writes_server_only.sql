-- 082: Camp writes are server-side only.
--
-- 081 gave academy managers FOR ALL on camp_programs — but a program's
-- question_quota IS the thing schools pay for (manually, for v1), so a
-- manager-writable programs table means any academy can grant itself a
-- free camp. Same shape on camp_assignments: a client-side INSERT
-- bypasses the API route that enforces and decrements the quota.
--
-- New rule: clients READ, the service role WRITES. Program creation is
-- our manual grant; assignment creation goes through the quota-checking
-- API route. (service_role bypasses RLS, so no write policy is needed.)

drop policy "Academy managers manage camp programs" on camp_programs;
create policy "Academy managers read camp programs" on camp_programs
  for select using (
    exists (
      select 1 from managers m
      where m.user_id = auth.uid() and m.academy_id = camp_programs.academy_id
    )
  );

drop policy "Teachers and managers manage camp assignments" on camp_assignments;
create policy "Teachers and managers read camp assignments" on camp_assignments
  for select using (
    exists (
      select 1 from classrooms c
      where c.id = camp_assignments.classroom_id
        and (
          c.teacher_id = auth.uid()
          or exists (
            select 1 from managers m
            where m.user_id = auth.uid() and m.academy_id = c.academy_id
          )
        )
    )
  );
