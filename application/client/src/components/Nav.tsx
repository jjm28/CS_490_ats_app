// src/components/Nav.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  // ✅ show logged-in state based on token
  const [loggedIn, setLoggedIn] = useState<boolean>(() => !!localStorage.getItem("authToken"));
  const navigate = useNavigate();
  const { pathname } = useLocation(); // ✅ re-check token when route changes

  // ✅ update state when route changes (same-tab logins/registrations)
  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("authToken"));
  }, [pathname]);

  // ✅ update state when another tab logs in/out
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "authToken" || e.key === "auth:changed") {
        setLoggedIn(!!localStorage.getItem("authToken"));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");   // ✅ clear token
    localStorage.removeItem("authUser");
    // optional “poke” to notify other tabs
    localStorage.setItem("auth:changed", String(Date.now()));
    localStorage.removeItem("auth:changed");
    setLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="relative bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Left: brand + links */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center">
              <img
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                alt="Your Company"
                className="h-8 w-auto"
              />
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                <Link to="/" className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
                  Home Page
                </Link>
                <Link
                  to="/Profile"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Right: auth actions */}
          <div className="flex items-center gap-3">
            {!loggedIn ? (
              <>
                {/* Shown when NOT signed in */}
                <Link
                  to="/Registration"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign up
                </Link>
                <Link
                  to="/Login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Log in
                </Link>
              </>
            ) : (
              // Shown ONLY when signed in
              <button
                onClick={logout}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
