import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanDocumentTitle,validatePatientId,safeActionError} from './validation.js';
test('document names reject control characters',()=>assert.throws(()=>cleanDocumentTitle('x\u0000'),/document title/));
test('document names reject oversize strings',()=>assert.throws(()=>cleanDocumentTitle('a'.repeat(151)),/document title/));
test('UUID checks reject arbitrary user-controlled paths',()=>assert.throws(()=>validatePatientId('../../other')));
test('error messages do not leak raw SQL',()=>assert.equal(safeActionError({message:'SELECT secret FROM patient'}),'Unable to complete the request. Please try again, or contact the clinic.'));
test('document names accept normal names',()=>assert.equal(cleanDocumentTitle('  Dental X-ray  '),'Dental X-ray'));
test('UUID check accepts valid patient UUID',()=>assert.equal(validatePatientId('c5e7709c-9bf1-4e7f-873a-8eea109d55ae'),'c5e7709c-9bf1-4e7f-873a-8eea109d55ae'));
test('input validation rejects missing files',async()=>{
 const {validateUpload}=await import('./validation.js');
 await assert.rejects(validateUpload(null),/Choose a non-empty file/);
});
test('valid PDF signature is accepted',async()=>{
 const {validateUpload}=await import('./validation.js');
 const file=new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x37])],'scan.pdf',{type:'application/pdf'});
 assert.equal((await validateUpload(file)).extension,'pdf');
});
test('forged MIME is rejected',async()=>{
 const {validateUpload}=await import('./validation.js');
 const file=new File([new Uint8Array([0x00,0x01,0x02,0x03])],'fake.pdf',{type:'application/pdf'});
 await assert.rejects(validateUpload(file),/does not match/);
});
test('login error messages do not leak upstream internals',async()=>{
 const {publicAuthError}=await import('./validation.js');
 assert.equal(publicAuthError({message:'internal SQL SELECT * FROM auth.users'}),'Unable to sign in right now. Check your connection and try again.');
});
