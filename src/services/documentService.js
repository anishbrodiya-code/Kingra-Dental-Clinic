import {cleanDocumentTitle, validatePatientId, validateUpload} from '../security/validation.js';

/**
 * Browser-facing document operation. Authorization is ALWAYS enforced separately
 * by the Supabase database and Storage RLS policies.
 * Real clinical uploads need a server-side malware scanner before release.
 */
export async function uploadPatientDocument({client, patientId, userId, file, title}) {
  const id=validatePatientId(patientId);
  const safeTitle=cleanDocumentTitle(title);
  const {extension}=await validateUpload(file);
  const path=`${id}/${crypto.randomUUID()}.${extension}`;
  const {error:uploadError}=await client.storage.from('patient-files').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {error:documentError}=await client.from('documents').insert({
    patient_id:id,uploaded_by:userId,title:safeTitle,file_path:path,
    file_type:file.type,visible_to_patient:true,
  });
  if(documentError){
    // The SQL migration grants orphan-only delete rights to the original uploader.
    const {error:cleanupError}=await client.storage.from('patient-files').remove([path]);
    if(cleanupError)console.warn('An incomplete document upload requires administrator cleanup.');
    throw documentError;
  }
  return {path};
}
