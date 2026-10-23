-- Willow privacy test for the athlete side. Paste into Supabase -> SQL Editor -> Run.
-- Needs supabase/schema.sql, athlete-side.sql, consent.sql and self-signup.sql applied first.
-- It makes fake users and data, checks who can see/do what, shows a PASS/FAIL table,
-- then ROLLS BACK so nothing is left behind. Every row of the result should say PASS.

begin;

create temp table results (n serial, test text, expected text, actual text);
grant all on results to public;
grant usage, select on sequence results_n_seq to public;

-- ---------- fake data (as the database owner) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'coach.a@test.local', '{"role":"coach","full_name":"Coach A"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'coach.b@test.local', '{"role":"coach","full_name":"Coach B"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'athlete@test.local', '{"role":"athlete","full_name":"Athlete One"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'outsider@test.local', '{"role":"athlete","full_name":"Outsider"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'coach.c@test.local', '{"role":"coach","full_name":"Coach C"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'noconsent@test.local', '{"role":"athlete","full_name":"No Consent Yet"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'solo@test.local', '{"role":"athlete","full_name":"Solo Student"}');

insert into athletes (id, coach_id, user_id, name) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'A1 (linked to athlete)'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', null, 'A2 (same coach, other student)'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1', null, 'B1 (other coach)'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'A4 (athlete who has not given consent yet)');

-- consent exists for the main test athlete (A1) only
insert into consents (athlete_id, user_id, consenter_name, consenter_role, notice_version) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'Test Parent', 'parent_guardian', 'test');

insert into videos (id, athlete_id, uploaded_by, storage_path, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'x/v1.mp4', 'analyzed'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'x/v2.mp4', 'analyzed'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1', 'x/v3.mp4', 'analyzed');

insert into analyses (video_id, config_version, overall, metrics) values
  ('20000000-0000-0000-0000-000000000001', 't', 70, '[]'),
  ('20000000-0000-0000-0000-000000000002', 't', 60, '[]'),
  ('20000000-0000-0000-0000-000000000003', 't', 50, '[]');

insert into coach_notes (athlete_id, author_id, body, visible_to_athlete) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'private note', false),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'shared note', true);

insert into storage.objects (bucket_id, name) values
  ('videos', '00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000001/own.mp4'),
  ('videos', '00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000002/other-student.mp4'),
  ('videos', '00000000-0000-0000-0000-0000000000b1/10000000-0000-0000-0000-000000000003/other-coach.mp4');

insert into invites (athlete_id, email, created_by) values
  ('10000000-0000-0000-0000-000000000002', 'newkid@test.local', '00000000-0000-0000-0000-0000000000a1');

-- helper: run a statement, record whether it was allowed (affected a row / raised an error)
create or replace function pg_temp.attempt(label text, expected text, stmt text) returns void
language plpgsql as $$
declare n int;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
    insert into results(test, expected, actual) values (label, expected, case when n > 0 then 'allowed' else 'blocked' end);
  exception when others then
    insert into results(test, expected, actual) values (label, expected, 'blocked');
  end;
end $$;
grant execute on function pg_temp.attempt(text, text, text) to public;

create or replace function pg_temp.count_as(label text, expected int, q text) returns void
language plpgsql as $$
declare n int;
begin
  begin
    execute 'select count(*) from (' || q || ') s' into n;
  exception when others then n := 0;
  end;
  insert into results(test, expected, actual) values (label, expected::text, n::text);
end $$;
grant execute on function pg_temp.count_as(text, int, text) to public;

-- ---------- ATHLETE (linked to A1) ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","email":"athlete@test.local"}', true);

select pg_temp.count_as('athlete: sees only own student record', 1, 'select 1 from athletes');
select pg_temp.count_as('athlete: sees only own videos', 1, 'select 1 from videos');
select pg_temp.count_as('athlete: sees only own analyses', 1, 'select 1 from analyses');
select pg_temp.count_as('athlete: sees only shared notes', 1, 'select 1 from coach_notes');
select pg_temp.count_as('athlete: cannot see invites', 0, 'select 1 from invites');
select pg_temp.count_as('athlete: can see own consent record', 1, 'select 1 from consents');
select pg_temp.attempt('athlete: cannot edit the consent record', 'blocked',
  $q$update consents set consenter_name = 'someone else'$q$);
select pg_temp.attempt('athlete: cannot delete the consent record', 'blocked',
  $q$delete from consents$q$);
select pg_temp.attempt('athlete: cannot record consent for another student', 'blocked',
  $q$insert into consents (athlete_id, user_id, consenter_name, consenter_role, notice_version) values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1','x','self_adult','t')$q$);
select pg_temp.count_as('athlete: sees only own files in storage', 1, 'select 1 from storage.objects');
select pg_temp.attempt('athlete: cannot upload a video to another student', 'blocked',
  $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1')$q$);
select pg_temp.attempt('athlete: cannot upload pretending to be the coach', 'blocked',
  $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1')$q$);
select pg_temp.attempt('athlete: CAN upload a video to own record', 'allowed',
  $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1')$q$);
select pg_temp.attempt('athlete: cannot mark a video reviewed', 'blocked',
  $q$update videos set reviewed_at = now() where id = '20000000-0000-0000-0000-000000000001'$q$);
select pg_temp.attempt('athlete: cannot move a video to another student', 'blocked',
  $q$update videos set athlete_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001'$q$);
select pg_temp.attempt('athlete: CAN update own video status', 'allowed',
  $q$update videos set status = 'analyzing' where id = '20000000-0000-0000-0000-000000000001'$q$);
select pg_temp.attempt('athlete: cannot change own analysis score', 'blocked',
  $q$update analyses set overall = 100 where video_id = '20000000-0000-0000-0000-000000000001'$q$);
select pg_temp.attempt('athlete: cannot write a new analysis', 'blocked',
  $q$insert into analyses (video_id, config_version, overall, metrics) values ('20000000-0000-0000-0000-000000000001','t',99,'[]') on conflict do nothing$q$);
select pg_temp.attempt('athlete: cannot edit student record', 'blocked',
  $q$update athletes set name = 'hacked' where id = '10000000-0000-0000-0000-000000000001'$q$);
select pg_temp.attempt('athlete: CAN upload file into own folder', 'allowed',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000001/t.mp4','00000000-0000-0000-0000-0000000000c1')$q$);
select pg_temp.attempt('athlete: cannot upload into another student folder', 'blocked',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000002/t.mp4','00000000-0000-0000-0000-0000000000c1')$q$);
select pg_temp.attempt('athlete with a coach: cannot delete files', 'blocked',
  $q$delete from storage.objects where name = '00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000001/own.mp4'$q$);
select pg_temp.attempt('athlete: cannot upload into another coach folder', 'blocked',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000b1/10000000-0000-0000-0000-000000000001/t.mp4','00000000-0000-0000-0000-0000000000c1')$q$);

-- ---------- INDEPENDENT STUDENT (signed up alone, no coach) ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated","email":"solo@test.local"}', true);
select pg_temp.attempt('solo: cannot create a record with a coach attached', 'blocked',
  $q$insert into athletes (id, coach_id, user_id, name, is_minor, date_of_birth) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1','x',false,'1990-01-01')$q$);
select pg_temp.attempt('solo: cannot create a record if under 18', 'blocked',
  $q$insert into athletes (id, coach_id, user_id, name, is_minor, date_of_birth) values ('10000000-0000-0000-0000-000000000005',null,'00000000-0000-0000-0000-0000000000f1','x',false,(current_date - interval '10 years')::date)$q$);
select pg_temp.attempt('solo: cannot create a record without a birth date', 'blocked',
  $q$insert into athletes (id, coach_id, user_id, name, is_minor) values ('10000000-0000-0000-0000-000000000005',null,'00000000-0000-0000-0000-0000000000f1','x',false)$q$);
select pg_temp.attempt('solo: CAN create own record (18+)', 'allowed',
  $q$insert into athletes (id, coach_id, user_id, name, is_minor, date_of_birth) values ('10000000-0000-0000-0000-000000000005',null,'00000000-0000-0000-0000-0000000000f1','Solo Student',false,'1990-01-01')$q$);
select pg_temp.attempt('solo: cannot create a second record', 'blocked',
  $q$insert into athletes (id, coach_id, user_id, name, is_minor, date_of_birth) values ('10000000-0000-0000-0000-000000000006',null,'00000000-0000-0000-0000-0000000000f1','Again',false,'1990-01-01')$q$);
select pg_temp.attempt('solo: cannot attach own record to a coach', 'blocked',
  $q$update athletes set coach_id = '00000000-0000-0000-0000-0000000000a1' where id = '10000000-0000-0000-0000-000000000005'$q$);
select pg_temp.attempt('solo: cannot change birth date to under 18', 'blocked',
  $q$update athletes set date_of_birth = (current_date - interval '10 years')::date where id = '10000000-0000-0000-0000-000000000005'$q$);
select pg_temp.attempt('solo: cannot upload a video before consent', 'blocked',
  $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: cannot upload a file before consent', 'blocked',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000f1/10000000-0000-0000-0000-000000000005/early.mp4','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: CAN record own consent', 'allowed',
  $q$insert into consents (athlete_id, user_id, consenter_name, consenter_role, notice_version) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1','Solo Student','self_adult','test')$q$);
select pg_temp.attempt('solo: CAN upload clip 1', 'allowed', $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: CAN upload clip 2', 'allowed', $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: CAN upload clip 3', 'allowed', $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: CAN upload clip 4', 'allowed', $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: CAN upload clip 5', 'allowed', $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: 6th clip in a day is blocked', 'blocked', $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: CAN upload a file into own folder', 'allowed',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000f1/10000000-0000-0000-0000-000000000005/t.mp4','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.attempt('solo: cannot upload into a coach folder', 'blocked',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000005/t.mp4','00000000-0000-0000-0000-0000000000f1')$q$);
select pg_temp.count_as('solo: sees only own student record', 1, 'select 1 from athletes');
select pg_temp.count_as('solo: sees only own 5 clips', 5, 'select 1 from videos');
select pg_temp.count_as('solo: sees only own file in storage', 1, 'select 1 from storage.objects');
select pg_temp.attempt('solo: cannot accept a coach invite (already has a record)', 'blocked',
  $q$select accept_invite((select token from invites limit 1))$q$);
select pg_temp.attempt('solo: CAN delete own file', 'allowed',
  $q$delete from storage.objects where name = '00000000-0000-0000-0000-0000000000f1/10000000-0000-0000-0000-000000000005/t.mp4'$q$);
select pg_temp.attempt('solo: CAN delete own record', 'allowed',
  $q$delete from athletes where id = '10000000-0000-0000-0000-000000000005'$q$);

-- ---------- ATHLETE WHO HAS NOT GIVEN CONSENT YET (A4) ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","email":"noconsent@test.local"}', true);
select pg_temp.attempt('no consent yet: cannot upload a video', 'blocked',
  $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000e1')$q$);
select pg_temp.attempt('no consent yet: cannot upload a file', 'blocked',
  $q$insert into storage.objects (bucket_id, name, owner) values ('videos','00000000-0000-0000-0000-0000000000c2/10000000-0000-0000-0000-000000000004/t.mp4','00000000-0000-0000-0000-0000000000e1')$q$);
select pg_temp.attempt('no consent yet: CAN record consent for own student', 'allowed',
  $q$insert into consents (athlete_id, user_id, consenter_name, consenter_role, notice_version) values ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000e1','Parent Two','parent_guardian','test')$q$);
select pg_temp.attempt('after consent: CAN upload a video', 'allowed',
  $q$insert into videos (athlete_id, uploaded_by) values ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000e1')$q$);

-- ---------- OUTSIDER (athlete account with no student record) ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","email":"outsider@test.local"}', true);
select pg_temp.count_as('outsider: sees no students', 0, 'select 1 from athletes');
select pg_temp.count_as('outsider: sees no videos', 0, 'select 1 from videos');
select pg_temp.count_as('outsider: sees no analyses', 0, 'select 1 from analyses');
select pg_temp.count_as('outsider: sees no notes', 0, 'select 1 from coach_notes');
select pg_temp.count_as('outsider: sees no consent records', 0, 'select 1 from consents');
select pg_temp.count_as('outsider: sees no files in storage', 0, 'select 1 from storage.objects');
select pg_temp.attempt('outsider: cannot accept an invite sent to another email', 'blocked',
  $q$select accept_invite((select token from invites limit 1))$q$);

-- ---------- COACH A ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"coach.a@test.local"}', true);
select pg_temp.count_as('coach A: sees own 2 students', 2, 'select 1 from athletes');
select pg_temp.count_as('coach A: sees own videos (2 + athlete upload)', 3, 'select 1 from videos');
select pg_temp.count_as('coach A: sees both notes', 2, 'select 1 from coach_notes');
select pg_temp.count_as('coach A: sees only own files (2 + athlete upload)', 3, 'select 1 from storage.objects');
select pg_temp.count_as('coach A: can see consent for own student', 1, 'select 1 from consents');
select pg_temp.count_as('coach A: sees own invite', 1, 'select 1 from invites');
select pg_temp.attempt('coach A: CAN mark a video reviewed', 'allowed',
  $q$update videos set reviewed_at = now() where id = '20000000-0000-0000-0000-000000000001'$q$);

-- ---------- COACH B ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","email":"coach.b@test.local"}', true);
select pg_temp.count_as('coach B: sees only own student', 1, 'select 1 from athletes');
select pg_temp.count_as('coach B: sees only own video', 1, 'select 1 from videos');
select pg_temp.count_as('coach B: sees none of coach A notes', 0, 'select 1 from coach_notes');
select pg_temp.count_as('coach B: sees no invites', 0, 'select 1 from invites');
select pg_temp.count_as('coach B: sees no consent records', 0, 'select 1 from consents');
select pg_temp.attempt('coach B: cannot create an independent student record', 'blocked',
  $q$insert into athletes (id, coach_id, user_id, name, is_minor, date_of_birth) values ('10000000-0000-0000-0000-000000000007',null,'00000000-0000-0000-0000-0000000000b1','x',false,'1990-01-01')$q$);
select pg_temp.count_as('coach B: sees only own file in storage', 1, 'select 1 from storage.objects');

-- ---------- LOGGED-OUT VISITOR ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.count_as('logged out: sees no students', 0, 'select 1 from athletes');
select pg_temp.count_as('logged out: sees no videos', 0, 'select 1 from videos');
select pg_temp.count_as('logged out: sees no analyses', 0, 'select 1 from analyses');
select pg_temp.count_as('logged out: sees no notes', 0, 'select 1 from coach_notes');
select pg_temp.count_as('logged out: sees no consent records', 0, 'select 1 from consents');

-- ---------- RESULT ----------
reset role;
select n, test, expected, actual, case when expected = actual then 'PASS' else '*** FAIL ***' end as result
from results order by n;

rollback;
