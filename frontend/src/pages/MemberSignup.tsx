import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { authService } from '../services/supabaseAuth';

interface SignupForm {
  email: string;
  password: string;
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

export default function MemberSignup() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(data: SignupForm) {
    setLoading(true);
    try {
      await authService.registerMember(data as unknown as Record<string, unknown>);
      setDone(true);
      toast.success('Application submitted! Pending admin approval.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center card">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted</h2>
          <p className="text-gray-600 mb-4">Your application is pending admin approval. You'll be contacted once it's reviewed.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Back to Login</button>
        </div>
      </div>
    );
  }

  const Field = ({ name, label, type = 'text', required = false, placeholder = '' }: {
    name: keyof SignupForm; label: string; type?: string; required?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
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
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">180Cars</h1>
          <p className="text-gray-600 mt-1">Apply for a vehicle subscription</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="email" label="Email" type="email" required />
            <Field name="password" label="Password" type="password" required />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Details</h2>
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

          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Employment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field name="employer_name" label="Employer Name" />
            <Field name="employer_phone" label="Employer Phone" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Banking Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field name="bank_account_name" label="Account Name" />
            <Field name="bank_bsb" label="BSB" placeholder="XXX-XXX" />
            <Field name="bank_account_number" label="Account Number" />
          </div>

          <div className="flex gap-4 pt-2">
            <Link to="/login" className="btn-secondary flex-1 text-center">Back to Login</Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
