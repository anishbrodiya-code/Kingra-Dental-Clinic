-- KDC V2 single-clinic portfolio pilot. Run once in the Supabase SQL Editor.
-- Uses ONLY synthetic demo records. Do not put real patient records into this pilot.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 phone text not null default '',
 role text not null default 'patient' check (role in ('patient','doctor')),
 created_at timestamptz not null default now()
);
create table if not exists public.appointments (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.profiles(id) on delete cascade,
 service text not null check (char_length(service) between 1 and 100),
 visit_date date not null,
 visit_time time not null,
 note text not null default '',
 status text not null default 'pending' check (status in ('pending','confirmed','declined','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- Concurrent confirmations for the same slot cannot both succeed.
create unique index if not exists appointments_one_confirmed_slot on public.appointments(visit_date,visit_time)
 where status = 'confirmed';
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.profiles(id) on delete cascade,
 uploaded_by uuid not null references public.profiles(id),
 title text not null,
 file_path text not null unique,
 file_type text not null,
 visible_to_patient boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 message text not null,
 read boolean not null default false,
 created_at timestamptz not null default now()
);
create or replace function public.is_doctor() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role='doctor');
$$;
create or replace function public.register_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,full_name,phone,role) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'name',''),split_part(coalesce(new.email,''),'@',1), 'Patient'),coalesce(new.raw_user_meta_data->>'phone',''),'patient');
 return new;
end $$;
drop trigger if exists auth_user_created on auth.users;
create trigger auth_user_created after insert on auth.users for each row execute procedure public.register_profile();
-- Never allow clients to grant themselves doctor privileges.
create or replace function public.prevent_role_edit() returns trigger language plpgsql as $$
begin
 if new.role is distinct from old.role then raise exception 'Role changes require administrator'; end if;
 return new;
end $$;
drop trigger if exists profile_role_protection on public.profiles;
create trigger profile_role_protection before update on public.profiles for each row execute procedure public.prevent_role_edit();
create or replace function public.prevent_appointment_mutation() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_doctor() then
  if old.patient_id is distinct from new.patient_id or old.visit_date is distinct from new.visit_date or old.visit_time is distinct from new.visit_time or old.service is distinct from new.service or old.note is distinct from new.note then
   raise exception 'Patients cannot change booked appointment details';
  end if;
  if old.status not in ('pending','confirmed') or new.status <> 'cancelled' then
   raise exception 'Patients may only cancel pending or confirmed appointments';
  end if;
 end if;
 new.updated_at=now();
 return new;
end $$;
drop trigger if exists appointment_update_guard on public.appointments;
create trigger appointment_update_guard before update on public.appointments for each row execute procedure public.prevent_appointment_mutation();
-- Demo office hours: Monday-Saturday, 09:30-19:30 starts on half-hours; Sundays closed.
create or replace function public.validate_booking() returns trigger language plpgsql as $$
begin
 if new.visit_date < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Choose a future date'; end if;
 if extract(dow from new.visit_date)=0 then raise exception 'Clinic is closed on Sunday'; end if;
 if new.visit_time < time '09:30' or new.visit_time > time '19:30' or extract(minute from new.visit_time) not in (0,30) then raise exception 'Choose a listed appointment time'; end if;
 if new.visit_date = (now() at time zone 'Asia/Kolkata')::date and new.visit_time <= (now() at time zone 'Asia/Kolkata')::time then raise exception 'Choose a future time'; end if;
 return new;
end $$;
drop trigger if exists booking_check on public.appointments;
create trigger booking_check before insert on public.appointments for each row execute procedure public.validate_booking();
alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
create policy "Profiles: self or doctor read" on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_doctor());
create policy "Profiles: self update" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy "Appointments: scoped read" on public.appointments for select to authenticated using (patient_id=(select auth.uid()) or public.is_doctor());
create policy "Appointments: patient request" on public.appointments for insert to authenticated with check (patient_id=(select auth.uid()) and status='pending');
create policy "Appointments: patient cancel or doctor change" on public.appointments for update to authenticated using (patient_id=(select auth.uid()) or public.is_doctor()) with check (patient_id=(select auth.uid()) or public.is_doctor());
create policy "Documents: scoped read" on public.documents for select to authenticated using (public.is_doctor() or (patient_id=(select auth.uid()) and visible_to_patient));
create policy "Documents: doctor upload" on public.documents for insert to authenticated with check (public.is_doctor() and uploaded_by=(select auth.uid()));
create policy "Notifications: own read" on public.notifications for select to authenticated using (recipient_id=(select auth.uid()));
create policy "Notifications: own update" on public.notifications for update to authenticated using (recipient_id=(select auth.uid())) with check (recipient_id=(select auth.uid()));
-- Trigger notification, including patient confirmation/decline and doctor request notice.
create or replace function public.notify_booking() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='INSERT' then
  insert into public.notifications(recipient_id,message)
  select id,'New appointment request: '||new.service||' on '||new.visit_date::text from public.profiles where role='doctor';
 else
  if old.status is distinct from new.status then
   insert into public.notifications(recipient_id,message)
   values(new.patient_id,'Your appointment on '||new.visit_date::text||' is now '||new.status||'.');
  end if;
 end if;
 return new;
end $$;
drop trigger if exists appointments_notify on public.appointments;
create trigger appointments_notify after insert or update of status on public.appointments for each row execute procedure public.notify_booking();
-- Storage bucket is private. File path MUST begin with patient UUID: patient_uuid/random_filename.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('patient-files','patient-files',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "Storage: doctor upload" on storage.objects for insert to authenticated with check (
 bucket_id='patient-files' and public.is_doctor() and exists(select 1 from public.profiles where id::text=(storage.foldername(name))[1] and role='patient')
);
create policy "Storage: controlled read" on storage.objects for select to authenticated using (
 bucket_id='patient-files' and exists (
 select 1 from public.documents d where d.file_path=name and (public.is_doctor() or (d.patient_id=(select auth.uid()) and d.visible_to_patient))
 )
);
-- A separate INSERT policy lets doctors create metadata after an upload, and patients only read released files.
-- IMPORTANT: Test access controls thoroughly before handling any real health data.
