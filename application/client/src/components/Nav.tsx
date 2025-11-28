import logo from "../assets/img/logos/ontrac-trans-2.png";
import {
  Disclosure,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, ChevronDown } from "lucide-react";
import "../styles/Navbar.css";
import Button from "./StyledComponents/Button";

function Navbar() {
  const [loggedIn, setLoggedIn] = useState<boolean>(
    () => !!localStorage.getItem("authToken")
  );
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
    localStorage.removeItem("devUserId");
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
            <NavLink
              to="/ProfileDashboard"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              Dashboard
            </NavLink>

            <Popover className="relative">
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium inline-flex items-center gap-1">
                Qualifications
                <ChevronDown size={16} />
              </PopoverButton>
              <PopoverPanel className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg z-50">
                <NavLink
                  to="/Skills"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Skills
                </NavLink>
                <NavLink
                  to="/Education"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Education
                </NavLink>
                <NavLink
                  to="/Certifications"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Certifications
                </NavLink>
              </PopoverPanel>
            </Popover>

            <Popover className="relative">
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium inline-flex items-center gap-1">
                Experience
                <ChevronDown size={16} />
              </PopoverButton>
              <PopoverPanel className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg z-50">
                <NavLink
                  to="/Projects"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Projects
                </NavLink>
                <NavLink
                  to="/EmploymentPage"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Employment
                </NavLink>
              </PopoverPanel>
            </Popover>
            <Popover className="relative">
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium inline-flex items-center gap-1">
                Documents
                <ChevronDown size={16} />
              </PopoverButton>
              <PopoverPanel className="absolute left-0 mt-2 w-56 rounded-md bg-white shadow-lg z-50">
                <NavLink
                  to="/resumes/new"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Resume Templates
                </NavLink>
                <NavLink
                  to="/resumes"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  My Resumes
                </NavLink>
                <NavLink
                  to="/coverletter"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Cover Letters
                </NavLink>
              </PopoverPanel>
            </Popover>
            <Popover className="relative">
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium inline-flex items-center gap-1">
                Job Search
                <ChevronDown size={16} />
              </PopoverButton>
              <PopoverPanel className="absolute left-0 mt-2 w-48 rounded-md bg-white shadow-lg z-50">
                <NavLink
                  to="/Jobs"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Browse Jobs
                </NavLink>
                <NavLink
                  to="/Applications"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  My Applications
                </NavLink>
                <NavLink
                  to="/company-research"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Company Search
                </NavLink>
                  <NavLink
                  to="/manage-References"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  References
                </NavLink>
                <NavLink 
                to="/peer-groups" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Peer Support Groups
                  </NavLink>
              </PopoverPanel>
            </Popover>
          </div>

          <div className="flex items-center space-x-4">
            {!loggedIn ? (
              <>
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
              <Popover className="relative">
                <PopoverButton className="p-2 text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-full focus:outline-none">
                  <User size={24} />
                </PopoverButton>
                <PopoverPanel className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg z-50">
                  <NavLink
                    to="/ProfilePage"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    My Profile
                  </NavLink>
                  <NavLink
                    to="/Notifications"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Notification Settings
                  </NavLink>
                  <button
                    onClick={logout}
                    className="block w-full text-center px-4 py-2 text-red-600 font-semibold hover:bg-red-50 border-t border-gray-200"
                  >
                    Log Out
                  </button>
                </PopoverPanel>
              </Popover>
            )}

            <Disclosure as="div" className="md:hidden">
              {({ open }) => (
                <>
                  <Disclosure.Button className="p-2 text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md focus:outline-none">
                    {!open ? <Menu size={24} /> : <X size={24} />}
                  </Disclosure.Button>
                  <Disclosure.Panel className="absolute top-16 right-0 w-48 bg-gray-800 rounded-md shadow-lg py-2 z-50">
                    <NavLink
                      to="/ProfileDashboard"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Dashboard
                    </NavLink>
                    <NavLink
                      to="/ProfilePage"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      My Profile
                    </NavLink>
                    <div className="border-t border-gray-700 my-2"></div>
                    <NavLink
                      to="/Skills"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Skills
                    </NavLink>
                    <NavLink
                      to="/Education"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Education
                    </NavLink>
                    <NavLink
                      to="/Certifications"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Certifications
                    </NavLink>
                    <div className="border-t border-gray-700 my-2"></div>
                    <NavLink
                      to="/Projects"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Projects
                    </NavLink>
                    <NavLink
                      to="/EmploymentPage"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Employment
                    </NavLink>
                    <div className="border-t border-gray-700 my-2"></div>
                    <NavLink
                      to="/resumes"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Resumes
                    </NavLink>
                    <NavLink
                      to="/coverletter"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Cover Letters
                    </NavLink>
                    <div className="border-t border-gray-700 my-2"></div>
                    <NavLink
                      to="/Jobs"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      Browse Jobs
                    </NavLink>
                    <NavLink
                      to="/Applications"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      My Applications
                    </NavLink>
                    <div className="border-t border-gray-700 my-2"></div>
                    <button
                      onClick={logout}
                      className="block w-full text-center px-4 py-2 text-red-600 font-semibold hover:bg-gray-700"
                    >
                      Log Out
                    </button>
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