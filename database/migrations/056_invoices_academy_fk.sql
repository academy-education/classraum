-- invoices.academy_id had no foreign key to academies.
--
-- PostgREST builds its embed graph from foreign keys, so
-- `invoices.select('..., academies(name)')` failed with
-- "Could not find a relationship between 'invoices' and 'academies' in
-- the schema cache" — the admin Recent Activity widget could not show
-- which academy a failed payment belonged to.
--
-- invoices was the ONLY table carrying academy_id without this
-- constraint; every other one already had it, which is why nothing else
-- hit the same wall.
--
-- Safe to add: verified before applying that all 2050 invoices have a
-- non-null academy_id and zero of them reference a missing academy.
--
-- ON DELETE RESTRICT, deliberately. Invoices are financial records —
-- deleting an academy must not silently take its billing history with
-- it, and must not leave the rows orphaned either. It should fail and
-- make someone decide.
begin;

alter table invoices
  add constraint invoices_academy_id_fkey
  foreign key (academy_id) references academies(id)
  on delete restrict;

commit;
