import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { authService } from '../services/supabaseAuth';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { supabase } from '../services/supabase';

interface LoginForm {
  email: string;
  password: string;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function Login() {
  const { register: regLogin, handleSubmit: handleLogin, formState: { errors: loginErrors } } = useForm<LoginForm>();
  const { register: regContact, handleSubmit: handleContact, reset: resetContact, formState: { errors: contactErrors } } = useForm<ContactForm>();
  const [loginLoading, setLoginLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const navigate = useNavigate();
  const { appUser } = useAuth();

  if (appUser) {
    const dest = appUser.user_type === 'member' ? '/member/dashboard' : '/admin/dashboard';
    navigate(dest, { replace: true });
    return null;
  }

  async function onLogin(data: LoginForm) {
    setLoginLoading(true);
    try {
      await authService.login(data.email, data.password);
      setTimeout(() => navigate('/'), 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  }

  async function onContact(data: ContactForm) {
    setContactLoading(true);
    try {
      const { error } = await supabase.from('contact_inquiries').insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message || null,
      });
      if (error) throw error;
      setContactSent(true);
      resetContact();
      toast.success('Thanks! We\'ll be in touch soon.');
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700">180Cars</h1>
          <p className="mt-2 text-gray-600">Vehicle subscription management</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin(onLogin)} className="card space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>
          <div>
            <label className="form-label">Email address</label>
            <input
              {...regLogin('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
              type="email"
              className="form-input"
              placeholder="you@example.com"
            />
            {loginErrors.email && <p className="form-error">{loginErrors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              {...regLogin('password', { required: 'Password is required' })}
              type="password"
              className="form-input"
              placeholder="••••••••"
            />
            {loginErrors.password && <p className="form-error">{loginErrors.password.message}</p>}
          </div>
          <button type="submit" disabled={loginLoading} className="btn-primary w-full">
            {loginLoading ? <LoadingSpinner size="sm" /> : 'Sign in'}
          </button>
        </form>

        {/* Contact / enquiry section */}
        <div className="card space-y-4">
          <button
            type="button"
            onClick={() => setShowContact((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-medium text-gray-900">Interested in a vehicle subscription?</span>
            <span className="text-blue-600 text-sm">{showContact ? 'Hide ▲' : 'Contact us ▼'}</span>
          </button>

          {showContact && (
            contactSent ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-green-700 font-medium">Enquiry received!</p>
                <p className="text-sm text-gray-600 mt-1">Our team will be in touch shortly.</p>
                <button onClick={() => { setContactSent(false); setShowContact(false); }} className="btn-secondary mt-3 text-sm">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleContact(onContact)} className="space-y-4 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                    <input
                      {...regContact('name', { required: 'Name is required' })}
                      className="form-input"
                      placeholder="Jane Smith"
                    />
                    {contactErrors.name && <p className="form-error">{contactErrors.name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      {...regContact('phone')}
                      className="form-input"
                      placeholder="04XX XXX XXX"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Email <span className="text-red-500">*</span></label>
                  <input
                    {...regContact('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                  />
                  {contactErrors.email && <p className="form-error">{contactErrors.email.message}</p>}
                </div>
                <div>
                  <label className="form-label">Message</label>
                  <textarea
                    {...regContact('message')}
                    className="form-input"
                    rows={3}
                    placeholder="Tell us a bit about what you're looking for…"
                  />
                </div>
                <button type="submit" disabled={contactLoading} className="btn-primary w-full">
                  {contactLoading ? 'Sending…' : 'Send Enquiry'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
