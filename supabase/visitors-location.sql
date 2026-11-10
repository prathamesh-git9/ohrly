-- Approximate location for visitor names: city, region and country only. The IP address is never stored.
-- Safe to re-run.
alter table public.visitors add column if not exists city text check (city is null or char_length(city) <= 80);
alter table public.visitors add column if not exists region text check (region is null or char_length(region) <= 80);
alter table public.visitors add column if not exists country text check (country is null or char_length(country) <= 80);

-- Test runs of the post-image script on 10 Nov 2026 recorded the name "Alex" before the automation skip
-- was deployed; they are not visitors.
delete from public.visitors where name = 'Alex' and created_at between '2026-11-10 11:20:00+00' and '2026-11-10 11:35:00+00';
