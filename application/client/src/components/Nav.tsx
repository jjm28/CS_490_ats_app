import { Link } from "react-router-dom";
import "../styles/Navbar.css";
import { Disclosure } from "@headlessui/react";

function Navbar() {
  return (
    <nav className="relative bg-gray-800">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">

          {/* Left: Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                alt="Logo"
                className="h-8 w-auto"
              />
              <span className="ml-2 text-white font-semibold">MyApp</span>
            </Link>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden sm:flex space-x-4">
            <Link
              to="#"
              className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              to="#"
              className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
            >
              Job Posts
            </Link>
            <Link
              to="#"
              className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
            >
              Application Tracking
            </Link>
            <Link
              to="#"
              className="text-gray-300 hover:bg-white/5 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
            >
              Analytics
            </Link>
          </div>

          {/* Right: Sign In */}
          <div className="flex items-center space-x-4">
            <Link
              to="/Registration"
              className="text-gray-300 hover:text-white text-sm font-medium"
            >
              Sign In
            </Link>

            {/* Mobile Menu (Disclosure) */}
            <Disclosure as="div" className="sm:hidden">
              {({ open }) => (
                <>
                  <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                    <Link
                      to="#"
                      className="block px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="#"
                      className="block px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Job Posts
                    </Link>
                    <Link
                      to="#"
                      className="block px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Application Tracking
                    </Link>
                    <Link
                      to="#"
                      className="block px-4 py-2 text-gray-300 hover:bg-white/5 hover:text-white"
                    >
                      Analytics
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
