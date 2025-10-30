import logo from "../assets/img/logos/ontrac-trans-2.png";
import { Disclosure, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";
import Button from "./StyledComponents/Button";

function Navbar() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => !!localStorage.getItem("authToken"));
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("authToken"));
  }, [pathname]);

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
    <nav className="relative border-b border-gray-300 shadow-sm bg-white">
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/">
              <img src={logo} alt="Logo" className="w-32" />
            </Link>
          </div>

        <div className="hidden md:flex space-x-4">
            <NavLink to="/" className={({ isActive }) =>
              `rounded-md px-3 py-2 text-lg font-medium ${isActive ? "bg-(--brand-sage) text-(--brand-navy)"
                : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
              }`
            }>Home</NavLink>

            <NavLink to="/Skills" className={({ isActive }) =>
              `rounded-md px-3 py-2 text-lg font-medium ${isActive ? "bg-(--brand-sage) text-(--brand-navy)"
                : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
              }`
            }>Skills</NavLink>

            <NavLink to="/Education" className={({ isActive }) =>
              `rounded-md px-3 py-2 text-lg font-medium ${isActive ? "bg-(--brand-sage) text-(--brand-navy)"
                : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
              }`
            }>Education</NavLink>

            <NavLink to="/Certifications" className={({ isActive }) =>
              `rounded-md px-3 py-2 text-lg font-medium ${isActive ? "bg-(--brand-sage) text-(--brand-navy)"
                : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
              }`
            }>Certifications</NavLink>
            <NavLink
              to="/Projects"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              Projects
            </NavLink>

            <NavLink
              to="/ProfilePage"
              className={({ isActive }) => 
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }>Profile</NavLink>

            <NavLink
              to="/EmploymentPage"
              className={({ isActive }) => 
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }>Employment</NavLink>


           {/* <Popover className="relative">
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium">
                Profile
              </PopoverButton>
              <PopoverPanel className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg">
                <NavLink to="/ProfilePage" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Profile Page</NavLink>
                <NavLink to="/ProfileForm" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Profile Form</NavLink>
                <NavLink to="/Employment" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Employment History</NavLink>
                <NavLink to="/EmploymentForm" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Add Employment</NavLink>
              </PopoverPanel>
            </Popover> */}
          </div> 

          <div className="flex items-center space-x-4">
            {!loggedIn ? (
              <>
                <Button variant="primary" onClick={() => navigate("/Registration")}>Sign up</Button>
                <Button variant="primary" onClick={() => navigate("/Login")}>Log in</Button>
              </>
            ) : (
              <Button variant="primary" onClick={logout}>Log out</Button>
            )}

            <Disclosure as="div" className="md:hidden">
              {({ open }) => (
                <>
                  <Disclosure.Button className="p-2 text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md focus:outline-none">
                    {!open ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </Disclosure.Button>
                  <Disclosure.Panel className="absolute top-16 right-0 w-48 bg-gray-800 rounded-md shadow-lg py-2 z-50">
                    <NavLink to="/" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white">Home</NavLink>
                    <NavLink to="/ProfilePage" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white">Profile</NavLink>
                    <NavLink to="/Education" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white">Education</NavLink>
                    <NavLink to="/Skills" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white">Skills</NavLink>
                    <NavLink to="/Certifications" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white">Certifications</NavLink>
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