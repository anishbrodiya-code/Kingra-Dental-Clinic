-- KDC V2 personal info: run once AFTER schema.sql in Supabase SQL Editor.
-- Profile completeness only affects UI; the role protection trigger and existing RLS remain enabled.
alter table public.profiles add column if not exists contact_email text not null default '';
alter table public.profiles add column if not exists profile_complete boolean not null default false;
-- Existing demo patients will be prompted to enter their details on their next visit.
-- Doctors bypass mandatory onboarding, but can update Personal Info themselves.
