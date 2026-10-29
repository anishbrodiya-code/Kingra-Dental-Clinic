-- Run in Supabase SQL Editor after accidentally deleting profile records.
-- Restore ONLY authenticated users missing a profile. Existing accounts and roles are untouched.
-- Review which accounts will be restored before running the INSERT.
SELECT u.id, u.email, u.phone FROM auth.users u
LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL;

INSERT INTO public.profiles(id,full_name,phone,role)
SELECT u.id, COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''), NULLIF(u.raw_user_meta_data->>'name',''), NULLIF(split_part(COALESCE(u.email,''),'@',1),''), 'Patient'), COALESCE(u.phone,''), 'patient'
FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
WHERE p.id IS NULL;

NOTIFY pgrst, 'reload schema';
