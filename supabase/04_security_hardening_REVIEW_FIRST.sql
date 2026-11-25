-- KDC V2 SECURITY HARDENING (2026-11). REVIEW/TEST ON A CLONE BEFORE APPLYING.
-- Requires schema.sql and 02_personal_info.sql to have been applied already.
-- Does not delete patient data or rotate keys; must be run by a trusted database administrator.
BEGIN;

-- New writes are validated at the database, not merely in the browser.
CREATE OR REPLACE FUNCTION public.kdc_guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role OR
     NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Protected profile fields cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(NEW.full_name)) NOT BETWEEN 2 AND 120 OR
     char_length(NEW.phone) > 20 OR
     char_length(NEW.contact_email) > 254 OR
     (NEW.contact_email <> '' AND NEW.contact_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'Invalid profile fields' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS kdc_profile_update_guard ON public.profiles;
CREATE TRIGGER kdc_profile_update_guard BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.kdc_guard_profile_update();

-- The appointment row's identity and booking details must never change through
-- a generic UPDATE, even for doctor accounts. Only status transitions are allowed.
CREATE OR REPLACE FUNCTION public.prevent_appointment_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE doctor boolean;
BEGIN
  doctor := public.is_doctor();
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.patient_id IS DISTINCT FROM OLD.patient_id OR
     NEW.service IS DISTINCT FROM OLD.service OR NEW.visit_date IS DISTINCT FROM OLD.visit_date OR
     NEW.visit_time IS DISTINCT FROM OLD.visit_time OR NEW.note IS DISTINCT FROM OLD.note OR
     NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Booking fields are immutable' USING ERRCODE='42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF doctor THEN
      IF NOT ((OLD.status='pending' AND NEW.status IN ('confirmed','declined')) OR
              (OLD.status='confirmed' AND NEW.status IN ('completed','declined','cancelled'))) THEN
        RAISE EXCEPTION 'Invalid appointment transition' USING ERRCODE='42501';
      END IF;
    ELSE
      IF OLD.status NOT IN ('pending','confirmed') OR NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Patients can only cancel an active appointment' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- Patients may ONLY mark their own notifications as read. An IDOR-capable UPDATE
-- cannot rewrite the message or transfer it to another user.
CREATE OR REPLACE FUNCTION public.kdc_guard_notification_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id OR
     NEW.message IS DISTINCT FROM OLD.message OR NEW.created_at IS DISTINCT FROM OLD.created_at OR
     (OLD.read = true AND NEW.read = false) THEN
    RAISE EXCEPTION 'Only marking a notification read is permitted' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS kdc_notification_update_guard ON public.notifications;
CREATE TRIGGER kdc_notification_update_guard BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.kdc_guard_notification_update();

-- Uploaded-file metadata must be scoped to a patient and a recognized path.
-- Browser-reported MIME is not proof of content: require magic-byte validation
-- in the client AND a server upload proxy/malware scanner before real patient use.
CREATE OR REPLACE FUNCTION public.kdc_guard_document_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE suffix text;
BEGIN
  IF char_length(btrim(NEW.title)) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'Invalid document title' USING ERRCODE='22023';
  END IF;
  IF NEW.file_path !~ ('^' || NEW.patient_id::text || '/[0-9a-fA-F-]{36}\.(pdf|png|jpg|webp)$') THEN
    RAISE EXCEPTION 'Invalid patient file path' USING ERRCODE='22023';
  END IF;
  suffix := lower(split_part(NEW.file_path, '.', 2));
  IF NOT ((suffix='pdf' AND NEW.file_type='application/pdf') OR
          (suffix='png' AND NEW.file_type='image/png') OR
          (suffix='jpg' AND NEW.file_type='image/jpeg') OR
          (suffix='webp' AND NEW.file_type='image/webp')) THEN
    RAISE EXCEPTION 'File type does not match path' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS kdc_document_insert_guard ON public.documents;
CREATE TRIGGER kdc_document_insert_guard BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.kdc_guard_document_insert();

-- Ensure the API cannot mutate document metadata after creation.
REVOKE UPDATE, DELETE ON TABLE public.documents FROM authenticated, anon;
REVOKE DELETE ON TABLE public.notifications FROM authenticated, anon;

-- Replace only the named KDC policies; do not touch unrelated storage buckets.
DROP POLICY IF EXISTS "Storage: doctor upload" ON storage.objects;
CREATE POLICY "Storage: doctor upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='patient-files' AND public.is_doctor() AND
  name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(pdf|png|jpg|webp)$' AND
  EXISTS(SELECT 1 FROM public.profiles p
         WHERE p.id::text=(storage.foldername(name))[1] AND p.role='patient')
);
DROP POLICY IF EXISTS "Storage: controlled read" ON storage.objects;
CREATE POLICY "Storage: controlled read" ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id='patient-files' AND (
   EXISTS (SELECT 1 FROM public.documents d
     WHERE d.file_path=name AND
      (public.is_doctor() OR (d.patient_id=(SELECT auth.uid()) AND d.visible_to_patient)))
   -- Allow a doctor to remove THEIR OWN failed upload before metadata was created.
   OR (public.is_doctor() AND owner_id=(SELECT auth.uid())::text AND NOT EXISTS
       (SELECT 1 FROM public.documents d WHERE d.file_path=name))
 )
);
DROP POLICY IF EXISTS "Storage: cleanup orphaned upload" ON storage.objects;
CREATE POLICY "Storage: cleanup orphaned upload" ON storage.objects FOR DELETE TO authenticated
USING (
 bucket_id='patient-files' AND public.is_doctor() AND
 owner_id=(SELECT auth.uid())::text AND NOT EXISTS
 (SELECT 1 FROM public.documents d WHERE d.file_path=name)
);

COMMIT;
NOTIFY pgrst, 'reload schema';
