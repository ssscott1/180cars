import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { authService } from '../services/supabaseAuth';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { appUser } = useAuth();

  // Already logged in
  if (appUser) {
    const dest = appUser.user_type === 'member' ? '/member/dashboard' : '/admin/dashboard';
    navigate(dest, { replace: true });
    return null;
  }

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      await authService.login(data.email, data.password);
      // Profile load happens via AuthContext, navigate after brief delay
      setTimeout(() => navigate('/'), 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700">180Cars</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          <div>
            <label className="form-label">Email address</label>
            <input
              {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
              type="email"
              className="form-input"
              placeholder="you@example.com"
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              {...register('password', { required: 'Password is required' })}
              type="password"
              className="form-input"
              placeholder="••••••••"
            />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
          </button>
          <p className="text-center text-sm text-gray-600">
            New member?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Apply for a vehicle
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
