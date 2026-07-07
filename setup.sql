-- Recipes table. ingredients/steps are stored as JSON arrays (jsonb) rather
-- than separate tables — for two people and a personal collection, a full
-- relational ingredients table would add joins with no real benefit; jsonb
-- keeps it simple while still being queryable if you ever need that later.
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cuisine text,
  servings int,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  photo_url text,
  created_at timestamptz not null default now()
);

-- RLS is ON by default on new Supabase tables, which means a fresh table
-- starts fully closed — nobody can read or write until a policy explicitly
-- allows it. These four policies open it up to "anyone with the anon key,"
-- which — since you chose no login — means anyone who has the app's URL.
alter table recipes enable row level security;

create policy "public can read recipes" on recipes
  for select using (true);
create policy "public can insert recipes" on recipes
  for insert with check (true);
create policy "public can update recipes" on recipes
  for update using (true) with check (true);
create policy "public can delete recipes" on recipes
  for delete using (true);

-- Cuisines get their own tiny table so a custom cuisine you add shows up
-- for Emelie immediately too, even before either of you saves a recipe
-- that actually uses it.
create table if not exists cuisines (
  name text primary key
);

alter table cuisines enable row level security;

create policy "public can read cuisines" on cuisines
  for select using (true);
create policy "public can insert cuisines" on cuisines
  for insert with check (true);

insert into cuisines (name) values
  ('Italian'), ('Thai'), ('Mexican'), ('Indian'),
  ('Swedish'), ('Japanese'), ('Vegetarian')
on conflict (name) do nothing;

-- Storage bucket for recipe photos. `public = true` means anyone with a
-- file's URL can view it (fine for photos), but uploading/deleting still
-- needs an explicit policy below — public read and public write are
-- separate permissions in Supabase Storage.
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

create policy "public can view recipe photos" on storage.objects
  for select using (bucket_id = 'recipe-photos');
create policy "public can upload recipe photos" on storage.objects
  for insert with check (bucket_id = 'recipe-photos');
create policy "public can delete recipe photos" on storage.objects
  for delete using (bucket_id = 'recipe-photos');
