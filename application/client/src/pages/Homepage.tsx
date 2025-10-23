import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function HomePage() {
  const { isAuthed } = useAuth();
  return (
    <main className="max-w-6xl mx-auto px-4 py-12 text-center">
      <p className="mt-2 text-gray-700">
        Create your professional profile and manage your applications.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        {isAuthed ? (
          <Link to="/profile" className="px-5 py-2.5 rounded bg-black text-white hover:opacity-90">
            Create / Edit Profile
          </Link>
        ) : (
          <Link to="/register" className="px-5 py-2.5 rounded bg-black text-white hover:opacity-90">
            Get Started
          </Link>
        )}
      </div>
    </main>
  );
}
