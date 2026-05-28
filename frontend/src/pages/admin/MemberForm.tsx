import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import api from '../../services/api';

interface MemberFormData {
  email: string;
  first_name: string;
  last_name: string;
  dob: string;
  mobile: string;
  address: string;
  drivers_license_number: string;
  medicare_number: string;
  employer_name: string;
  employer_phone: string;
  bank_account_name: string;
  bank_bsb: string;
  bank_account_number: string;
}

export default function MemberForm() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<MemberFormData>();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ memberId: string; tempPassword: string; name: string } | null>(null);

  async function onSubmit(data: MemberFormData) {
    setLoading(true);
    try {
      const { data: result } = await api.post('/admin/members', data);
      setCreated({
        memberId: result.member.id,
        tempPassword: result.temp_password,
        name: `${data.first_name} ${data.last_name}`,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Failed to create member');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6">
        <div className="card text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-semibold text-gray-900">{created.name} added</h2>
          <p className="text-gray-600 text-sm">Share these login details with the member:</p>
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 border border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email</span>
              <span className="font-mono font-medium">{created.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Temp Password</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{created.tempPassword}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(created.tempPassword); toast.success('Copied!'); }}
                  className="text-xs text-gray-500 hover:text-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-600">The member should change this password after first login.</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => navigate(`/admin/members/${created.memberId}`)} className="btn-primary">
              View Member Profile
            </button>
            <button onClick={() => { setCreated(null); }} className="btn-secondary">
              Add Another Member
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Field = ({
    name, label, type = 'text', required = false, placeholder = '',
  }: {
    name: keyof MemberFormData; label: string; type?: string; required?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="form-label">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        {...register(name, required ? { required: `${label} is required` } : {})}
        type={type}
        className="form-input"
        placeholder={placeholder}
      />
      {errors[name] && <p className="form-error">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Add Member</h1>
      </div>

      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        A temporary password will be generated on save. Share it with the member so they can log in.
        Their account is pre-approved and ready for a vehicle assignment.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">

        <h2 className="text-lg font-semibold border-b pb-2">Account</h2>
        <Field name="email" label="Email Address" type="email" required placeholder="member@email.com" />

        <h2 className="text-lg font-semibold border-b pb-2">Personal Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="first_name" label="First Name" required />
          <Field name="last_name" label="Last Name" required />
          <Field name="dob" label="Date of Birth" type="date" />
          <Field name="mobile" label="Mobile" placeholder="04XX XXX XXX" />
        </div>
        <Field name="address" label="Residential Address" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="drivers_license_number" label="Driver's License Number" />
          <Field name="medicare_number" label="Medicare Number" />
        </div>

        <h2 className="text-lg font-semibold border-b pb-2">Employment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="employer_name" label="Employer Name" />
          <Field name="employer_phone" label="Employer Phone" />
        </div>

        <h2 className="text-lg font-semibold border-b pb-2">Banking Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field name="bank_account_name" label="Account Name" />
          <Field name="bank_bsb" label="BSB" placeholder="XXX-XXX" />
          <Field name="bank_account_number" label="Account Number" />
        </div>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating…' : 'Create Member & Send Invite'}
          </button>
        </div>
      </form>
    </div>
  );
}
