import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pwRx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; // 8+, upper, lower, number

export default function RegisterPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!emailRx.test(form.email)) e.email = 'Enter a valid email.';
    if (!pwRx.test(form.password))
      e.password = 'Min 8 chars, 1 upper, 1 lower, 1 number.';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.';
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSubmitting(true);
      // TODO: replace with real API call (UC-001)
      // await api('/api/auth/register', { method: 'POST', body: JSON.stringify(form) });
      login();           // mark authed in dev
      nav('/profile');   // go to profile
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
        <h1 className="text-xl font-semibold text-center mb-6">Welcome </h1>

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

          <div>
            <label className={label}>Confirm Password</label>
            <input
              name="confirm"
              type="password"
              className={input}
              value={form.confirm}
              onChange={onChange}
            />
            {errors.confirm && <p className={err}>{errors.confirm}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>First Name</label>
              <input
                name="firstName"
                className={input}
                value={form.firstName}
                onChange={onChange}
              />
              {errors.firstName && <p className={err}>{errors.firstName}</p>}
            </div>
            <div>
              <label className={label}>Last Name</label>
              <input
                name="lastName"
                className={input}
                value={form.lastName}
                onChange={onChange}
              />
              {errors.lastName && <p className={err}>{errors.lastName}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-10 w-full rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>
        </form>
      </div>
    </main>
  );
}
