import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const link = 'px-3 py-2 rounded text-sm';
const active = 'bg-blue-800/60';
const ghost = 'hover:bg-blue-800/40 text-white';
const btn = 'px-3 py-2 rounded bg-black text-white hover:opacity-90 text-sm';

export default function NavBar() {
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-blue-900 text-white"> {/* navy bar */}
      <div className="max-w-6xl mx-auto h-14 px-4 flex items-center justify-between">
        {/* Home button always available */}
        <Link to="/" className="inline-flex items-center gap-2 font-semibold">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-300" />
          <span>ATS for Candidates</span>
        </Link>

        {/* Center label (optional) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
          <span className="text-sm text-blue-100">Home Page</span>
        </div>

        <nav className="flex items-center gap-2">
          <NavLink to="/" end className={({ isActive }) => `${link} ${isActive ? active : ghost}`}>
            Home
          </NavLink>

          {/* Only show Profile entry if authed */}
          {isAuthed && (
            <NavLink to="/profile" className={({ isActive }) => `${link} ${isActive ? active : ghost}`}>
              Profile
            </NavLink>
          )}

          {/* Right side actions */}
          {!isAuthed ? (
            <>
              <NavLink to="/register" className={btn}>Sign up</NavLink>
              <NavLink to="/login" className={btn}>Log in</NavLink>
            </>
          ) : (
            <button
              className={btn}
              onClick={() => {
                logout();
                navigate('/'); // return home after logout
              }}
            >
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
