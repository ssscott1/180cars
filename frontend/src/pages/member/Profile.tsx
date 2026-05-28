import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { Member } from '../../types';
import FileUpload from '../../components/shared/FileUpload';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

interface ContactForm { mobile: string; address: string; }

export default function MemberProfile() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm<ContactForm>();

  useEffect(() => {
    api.get('/members/profile').then(({ data }) => {
      setMember(data);
      reset({ mobile: data.mobile ?? '', address: data.address ?? '' });
      setLoading(false);
    });
  }, [reset]);

  async function saveContact(data: ContactForm) {
    setSaving(true);
    try {
      const { data: updated } = await api.put('/members/profile', data);
      setMember(updated);
      toast.success('Contact info updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function uploadLicense(file: File) {
    const form = new FormData();
    form.append('file', file);
    await api.post('/members/upload-driver-license', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.success('Driver license uploaded');
  }

  async function uploadBank(file: File) {
    const form = new FormData();
    form.append('file', file);
    await api.post('/members/upload-bank-statement', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    toast.success('Bank statement uploaded');
  }

  if (loading) return <LoadingSpinner />;
  if (!member) return null;

  const Detail = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Personal Details (read-only)</h2>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="First Name" value={member.first_name} />
            <Detail label="Last Name" value={member.last_name} />
            <Detail label="Email" value={member.email} />
            <Detail label="Date of Birth" value={member.dob ? format(new Date(member.dob), 'dd/MM/yyyy') : undefined} />
            <Detail label="License Number" value={member.drivers_license_number} />
            <Detail label="Medicare" value={member.medicare_number} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Update Contact Info</h2>
          <form onSubmit={handleSubmit(saveContact)} className="space-y-4">
            <div>
              <label className="form-label">Mobile</label>
              <input {...register('mobile')} className="form-input" placeholder="04XX XXX XXX" />
            </div>
            <div>
              <label className="form-label">Address</label>
              <textarea {...register('address')} className="form-input" rows={3} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      <div className="card space-y-6">
        <h2 className="font-semibold">Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="form-label mb-2">Driver License</p>
            {member.drivers_license_file_path ? (
              <p className="text-sm text-green-600 mb-2">✓ Uploaded — upload again to replace</p>
            ) : null}
            <FileUpload onFile={uploadLicense} label="Upload driver license (PDF/JPG/PNG)" />
          </div>
          <div>
            <p className="form-label mb-2">Bank Statement Header</p>
            {member.bank_statement_file_path ? (
              <p className="text-sm text-green-600 mb-2">✓ Uploaded — upload again to replace</p>
            ) : null}
            <FileUpload onFile={uploadBank} label="Upload bank statement (PDF/JPG/PNG)" />
          </div>
        </div>
      </div>
    </div>
  );
}
