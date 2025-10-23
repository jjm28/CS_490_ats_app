import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!emailRx.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSubmitting(true);
      // TODO: replace with real login API (UC-002)
      // await api('/api/auth/login', { method: 'POST', body: JSON.stringify(form) });
      login();
      nav('/profile');
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    'mt-1 w-full h-10 rounded px-3 border border-gray-300 bg-white text-black focus:outline-none focus:ring-2 focus:ring-black';
  const label = 'block text-sm font-medium text-black';
  const err = 'text-sm text-red-600 mt-1';

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <div className="border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-center mb-4">
          <span className="inline-block w-6 h-6 rounded-full bg-blue-600" />
        </div>
        <h1 className="text-xl font-semibold text-center mb-6">Log in</h1>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div>
            <label className={label}>Email address</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              className={input}
              value={form.email}
              onChange={onChange}
            />
            {errors.email && <p className={err}>{errors.email}</p>}
          </div>

          <div>
            <label className={label}>Password</label>
            <input
              name="password"
              type="password"
              className={input}
              value={form.password}
              onChange={onChange}
            />
            {errors.password && <p className={err}>{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-10 w-full rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>

          <p className="text-sm text-gray-600 text-center mt-2">
            Don’t have an account?{' '}
            <Link to="/register" className="underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
