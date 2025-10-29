import logo from "../assets/img/logos/ontrac-trans-2.png";
import {
  Disclosure,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
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
    localStorage.removeItem("authToken"); // ✅ clear token
    localStorage.removeItem("authUser");
    // optional “poke” to notify other tabs
    localStorage.setItem("auth:changed", String(Date.now()));
    localStorage.removeItem("auth:changed");
    setLoggedIn(false);
    navigate("/");
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
          <div className="absolute left-1/2 transform -translate-x-1/2 hidden sm:flex space-x-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              Home Page
            </NavLink>

            <NavLink
              to="/Skills"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              Skills
            </NavLink>

            <NavLink
              to="/Education"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              Education
            </NavLink>

            <Popover>
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium">
                Profile
              </PopoverButton>
              <PopoverPanel className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg">
                <NavLink
                  to="/ProfilePage"
                  className={({ isActive }) =>
                    `block px-4 py-2 ${isActive ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  Profile Page
                </NavLink>
                <NavLink
                  to="/ProfileForm"
                  className={({ isActive }) =>
                    `block px-4 py-2 ${isActive ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  Profile Form
                </NavLink>
              </PopoverPanel>
            </Popover>
          </div>

          {/* <Popover>
      {({ open }) => (
        <>
          <PopoverButton>Solutions</PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                static
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                anchor="bottom"
                className="flex origin-top flex-col"
              >
                <a href="/analytics">Analytics</a>
                <a href="/engagement">Engagement</a>
                <a href="/security">Security</a>
                <a href="/integrations">Integrations</a>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover> */}

          {/* Right: auth actions */}
          <div className="flex items-center space-x-4">
            {!loggedIn ? (
              <>
                {/* Shown when NOT signed in */}
                <Button variant="primary" onClick={navigate("/Registration")}>
                  Sign up
                </Button>
                <Button variant="primary" onClick={navigate("/Login")}>
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
            <Disclosure as="div" className="sm:hidden">
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

                  <Disclosure.Panel className="absolute top-16 right-0 w-48 bg-gray-800 shadow-lg rounded-md py-2 z-50">
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        `block px-4 py-2 ${isActive
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      Home Page
                    </NavLink>

                    <NavLink
                      to="/ProfilePage"
                      className={({ isActive }) =>
                        `block px-4 py-2 ${isActive
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      Profile
                    </NavLink>

                    <NavLink
                      to="/Skills"
                      className={({ isActive }) =>
                        `block px-4 py-2 ${isActive
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      Skills
                    </NavLink>

                    <NavLink
                      to="/Education"
                      className={({ isActive }) =>
                        `block px-4 py-2 ${isActive
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      Education
                    </NavLink>

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