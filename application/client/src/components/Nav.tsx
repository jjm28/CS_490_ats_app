import logo from "../assets/img/logos/ontrac-trans-2.png";
import { Disclosure } from "@headlessui/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";
import Button from "./StyledComponents/Button";

function Navbar() {
  // ✅ show logged-in state based on token
  const [loggedIn, setLoggedIn] = useState<boolean>(
    () => !!localStorage.getItem("authToken")
  );
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
    setLoggedIn(false);
    navigate("/Logout");
  };

  return (
    <nav className="relative border-b border-gray-300 shadow-sm">
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center">
            <Link to="/">
              <img src={logo} alt="Logo" className="w-1/2" />
            </Link>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex space-x-4">
            <Link
              to="/"
              className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium"
            >
              Home
            </Link>
            <Link
              to="/ProfilePage"
              className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium"
            >
              Profile
            </Link>
            <Link
              to="/Education"
              className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium"
            >
              Education
            </Link>
            <Link
              to="/Skills"
              className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium"
            >
              Skills
            </Link>
          </div>

          {/* Right: auth actions */}
          <div className="flex items-center space-x-4">
            {!loggedIn ? (
              <>
                {/* Shown when NOT signed in */}
                <Button
                  variant="primary"
                  onClick={() => navigate("/Registration")}
                >
                  Sign up
                </Button>
                <Button variant="primary" onClick={() => navigate("/Login")}>
                  Log in
                </Button>
              </>
            ) : (
              // Shown ONLY when signed in
              <Button variant="primary" onClick={logout}>
                Log out
              </Button>
            )}

            {/* Mobile Menu (Disclosure) */}
            <Disclosure as="div" className="md:hidden">
              {({ open }) => (
                <>
                  <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) focus:outline-none focus:ring-2 focus:ring-white">
                    <span className="sr-only">Open main menu</span>
                    {!open ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="size-6"
                      >
                        <path
                          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="size-6"
                      >
                        <path
                          d="M6 18 18 6M6 6l12 12"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Disclosure.Button>

                  <Disclosure.Panel className="absolute top-16 right-0 w-48 bg-(--brand-olive) shadow-lg rounded-md py-2 z-50">
                    <Link
                      to="/"
                      className="block px-4 py-2 text-white hover:bg-white/5 hover:text-white"
                    >
                      Home
                    </Link>
                    <Link
                      to="/ProfilePage"
                      className="block px-4 py-2 text-white hover:bg-white/5 hover:text-white"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/Education"
                      className="block px-4 py-2 text-white hover:bg-white/5 hover:text-white"
                    >
                      Education
                    </Link>
                    <Link
                      to="/Skills"
                      className="block px-4 py-2 text-white hover:bg-white/5 hover:text-white"
                    >
                      Skills
                    </Link>
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
