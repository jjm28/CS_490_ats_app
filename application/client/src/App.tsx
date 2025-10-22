// src/App.tsx
import './App.css';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage';

function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-3xl md:text-4xl font-bold">ATS for Candidates</h1>
      <p className="mt-3 text-gray-600">
        Build a professional profile employers can trust. Start with your basic info.
      </p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          to="/profile"
          className="px-5 py-2.5 rounded bg-black text-white hover:opacity-90"
        >
          Create your profile
        </Link>
        <a
          href="#learn-more"
          className="px-5 py-2.5 rounded border hover:bg-gray-50"
        >
          
        </a>
      </div>

      <div id="learn-more" className="mt-12 grid gap-6 text-left">
        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">What you’ll add</h2>
          <ul className="mt-2 list-disc pl-5 text-gray-700">
            <li>Full name, email, phone, location</li>
            <li>Headline and short bio</li>
            <li>Industry and experience level</li>
          </ul>
        </div>
        <div className="rounded-2xl border p-5">
          <h2 className="font-semibold">Why it matters</h2>
          <p className="mt-2 text-gray-700">
            A complete profile helps recruiters quickly understand your background.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const link = 'px-3 py-2 rounded hover:bg-gray-100';
  const active = 'bg-gray-200';

  return (
    <div className="min-h-screen">
      {/* Simple header */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="font-semibold">
            ATS for Candidates
          </NavLink>
          <nav className="flex gap-2">
            <NavLink to="/" end className={({ isActive }) => `${link} ${isActive ? active : ''}`}>
              Home
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `${link} ${isActive ? active : ''}`}>
              Profile
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Routes */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
