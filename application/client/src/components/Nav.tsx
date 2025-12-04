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
import { getAuthMeta } from "../types/cohort";

interface OrgTheme {
  orgName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  poweredBy: boolean;
  isOrgBranded: boolean;
  navbarbg: string;
  backgroundcolor: string;
}

const DEFAULT_THEME: OrgTheme = {
  orgName: "ATS for Candidates",
  logoUrl: logo,
  navbarbg: "bg-white",
  primaryColor: "#2563eb",
  secondaryColor: "#e5e7eb",
  poweredBy: true,
  isOrgBranded: false,
  backgroundcolor: "#F6F4EF"
};

  const { userId, role, organizationId } = getAuthMeta();

function Navbar() {
  const [loggedIn, setLoggedIn] = useState<boolean>(
    () => !!localStorage.getItem("authToken")
  );
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [theme, setTheme] = useState(DEFAULT_THEME);
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

    
    useEffect(() => {
     if (organizationId) loadTheme();
    }, []);

    async function loadTheme() {
      try {
        const res = await fetch("/api/org/branding/me", {
          credentials: "include",   headers: {
              ...(userId
                ? {
                    "x-user-id": userId,
                    "x-user-role": role,
                    "x-org-id": organizationId || "",
                  }
                : {}),
            },
        });


        const json = await res.json();
        setTheme({ ...DEFAULT_THEME, ...json });
        
        const docstyle = { ...DEFAULT_THEME, ...json }
        document.body.style.backgroundColor = docstyle.backgroundcolor;
  //   const root = document.getElementById("root") as HTMLElement | null;
  //   if (!root) {
  //     console.warn("#root not found");
  //     return;
  //   }

  //   // Example: change some of your CSS variables
  //   // root.style.setProperty("--brand-navy", "#ff5722");
        
  //       root.style.setProperty('--brand-teal', docstyle.primaryColor);
  // root.style.setProperty('--link', docstyle.primaryColor);
  // root.style.setProperty('--brand-olive', docstyle.secondaryColor);

  // root.style.setProperty('--bg-light', docstyle.backgroundcolor);
  // root.style.setProperty('--body-bg', docstyle.backgroundcolor);

  // root.style.setProperty('--navbar-bg', docstyle.navbarbg);
      } catch (err) {
        console.error("Theme load failed:", err);
        setTheme(DEFAULT_THEME);
      }
    }
  


  
  return (
    <nav className={`relative border-b border-gray-300 shadow-sm ${theme.navbarbg}`}>
      
      <div className="px-2 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            
            <Link to="/">
              <img src={theme.logoUrl} alt="Logo" className="w-32" />
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

            
 {(role === "org_admin" || role === "super_admin") && (  <NavLink
              to="/enterprise/cohorts"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              Cohorts
            </NavLink>

          )}
           {(role === "org_admin" || role === "super_admin") && (              <NavLink
              to="/enterprise/users"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
              User Management
            </NavLink>


          )}
                     {(role === "org_admin" || role === "super_admin") && (                                 <NavLink
              to="/enterprise/onboarding"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
Bulk Onboarding
            </NavLink>

          )}
                               {(role === "org_admin" || role === "super_admin") && (                                 <NavLink
              to="/enterprise/analytics"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-lg font-medium ${isActive
                  ? "bg-(--brand-sage) text-(--brand-navy)"
                  : "text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy)"
                }`
              }
            >
Analytics            </NavLink>

          )}


           {(role === "job_seeker" || role === "super_admin") && (   
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
           )}
            {(role === "job_seeker" || role === "super_admin") && (  
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
            )}
             {(role === "job_seeker" || role === "super_admin") && (  
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
             )}
              {(role === "job_seeker" || role === "super_admin") && (  
            <Popover className="relative">
              <PopoverButton className="text-(--brand-sage) hover:bg-(--brand-sage) hover:text-(--brand-navy) rounded-md px-3 py-2 text-lg font-medium inline-flex items-center gap-1">
                Job Search
                <ChevronDown size={16} />
              </PopoverButton>

              {/* MAIN MENU */}
              <PopoverPanel className="absolute left-0 mt-2 w-56 rounded-md bg-white shadow-lg z-50">
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
                  to="/manage-references"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  References
                </NavLink>
                <NavLink
                  to="/Interview-Prep"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Interview Prep
                </NavLink>
                <NavLink 
                to="/peer-groups" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Peer Support Groups
                  </NavLink>
                     <NavLink 
                to="/support" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Family Support
                  </NavLink>
                    <NavLink
                  to="/job-search/sharing"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100" >
                Sharing & Accountability
              </NavLink>
 <NavLink
                  to="/advisors"
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100" >
                Advisors & Coaches
              </NavLink>
                  <NavLink
                    to="/networking"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Networking Hub
                  </NavLink>
                {/* DIVIDER */}
                <div className="border-t border-gray-200 my-2"></div>

                {/* ANALYTICS SUBMENU HEADER */}
                <div className="px-4 py-2 text-gray-500 text-sm font-semibold select-none">
                  Analytics
                </div>

                {/* ANALYTICS SUB PAGES */}
                <NavLink
                  to="/analytics/overview"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Overview Dashboard
                </NavLink>
                <NavLink
                  to="/analytics/application-success"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Application Success
                </NavLink>
                <NavLink
                  to="/analytics/interview-insights"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Interview Insights
                </NavLink>
                <NavLink
                  to="/analytics/networking-roi"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Networking ROI
                </NavLink>
                <NavLink
                  to="/analytics/salary-market"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Salary & Market
                </NavLink>
                <NavLink
                  to="/analytics/goal-tracking"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Goal Tracking
                </NavLink>
                <NavLink
                  to="/analytics/productivity"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Productivity
                </NavLink>
                <NavLink
                  to="/Jobs/CompetitiveAnalysis"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Competitive Analysis
                </NavLink>
                <NavLink
                  to="/analytics/market-trends"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >

                  Market Trends
                </NavLink>
              </PopoverPanel>
            </Popover>
              )}
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