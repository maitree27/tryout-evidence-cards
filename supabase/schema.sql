-- Cricket coach app schema. Paste this whole file into Supabase -> SQL Editor -> Run.
-- Safe to re-run.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'coach' check (role in ('coach','athlete')),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null, -- future: athlete's own login
  name text not null,
  batting_hand text not null default 'right' check (batting_hand in ('right','left')),
  date_of_birth date,
  is_minor boolean not null default true,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  storage_path text,
  sport text not null default 'cricket',
  skill text not null default 'batting',
  shot_type text not null default 'drill',
  taken_on date not null default current_date,
  duration_s numeric,
  status text not null default 'uploaded' check (status in ('uploaded','analyzing','analyzed','failed')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique references videos(id) on delete cascade,
  config_version text not null,
  overall numeric not null,
  coach_overall numeric,
  metrics jsonb not null,          -- [{key,label,raw,score,reliable,detail}]
  quality jsonb,                   -- pose confidence, frames used, warnings
  feedback text,
  feedback_model text,
  created_at timestamptz not null default now()
);

create table if not exists coach_notes (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists score_overrides (
  video_id uuid not null references videos(id) on delete cascade,
  metric_key text not null,
  coach_score numeric not null check (coach_score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (video_id, metric_key)
);

create index if not exists athletes_coach_idx on athletes(coach_id);
create index if not exists videos_athlete_idx on videos(athlete_id, taken_on);
create index if not exists notes_athlete_idx on coach_notes(athlete_id);

-- Auto-create a profile when someone signs up (everyone is a coach in v1).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'role','coach'), new.raw_user_meta_data->>'full_name');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Row-level security: a coach can only ever touch their own students' data.
alter table profiles enable row level security;
alter table athletes enable row level security;
alter table videos enable row level security;
alter table analyses enable row level security;
alter table coach_notes enable row level security;
alter table score_overrides enable row level security;

create or replace function owns_athlete(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from athletes where id = a and coach_id = auth.uid());
$$;
create or replace function owns_video(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from videos vi join athletes a on a.id = vi.athlete_id
                 where vi.id = v and a.coach_id = auth.uid());
$$;

drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (id = auth.uid());

drop policy if exists athletes_coach on athletes;
create policy athletes_coach on athletes for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists videos_coach on videos;
create policy videos_coach on videos for all
  using (owns_athlete(athlete_id)) with check (owns_athlete(athlete_id) and uploaded_by = auth.uid());

drop policy if exists analyses_coach on analyses;
create policy analyses_coach on analyses for all
  using (owns_video(video_id)) with check (owns_video(video_id));

drop policy if exists notes_coach on coach_notes;
create policy notes_coach on coach_notes for all
  using (owns_athlete(athlete_id)) with check (owns_athlete(athlete_id) and author_id = auth.uid());

drop policy if exists overrides_coach on score_overrides;
create policy overrides_coach on score_overrides for all
  using (owns_video(video_id)) with check (owns_video(video_id));

-- Private video storage. Path convention: <coach_id>/<athlete_id>/<video_id>.<ext>
insert into storage.buckets (id, name, public, file_size_limit)
values ('videos', 'videos', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = 524288000;

drop policy if exists videos_obj_rw on storage.objects;
create policy videos_obj_rw on storage.objects for all
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
