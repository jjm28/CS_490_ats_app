// src/components/Login.tsx
import logo from "../../assets/img/logos/ontrac-trans-1.png";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoginUser ,UpdateRole} from "../../api/user-auth";
import { setAuth } from "../../utils/auth";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import "../../styles/StyledComponents/FormInput.css";

type RoleOptionKey =
  | "job_seeker"
  | "org_member"
  | "org_admin"
  | "advisor"
  | "super_admin";
interface StoredAuthUser {
  token?: string;
  userId?: string;
  user?: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string | null;
    organizationId?: string | null;
  };
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errPassword, setErrPassword] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // role selection state
  const [needsRole, setNeedsRole] = useState(false);
  const [authUser, setAuthUser] = useState<StoredAuthUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleOptionKey | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleErr, setRoleErr] = useState<string | null>(null);

  // If already logged in:
  // - if role exists -> go to ProfileDashboard
  // - if no role -> stay here and show role slider
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const rawUser = localStorage.getItem("authUser");
    const storedRole = localStorage.getItem("userRole");

    if (!token || !rawUser) return;
   
    try {
      const parsed = JSON.parse(rawUser) as StoredAuthUser;
      const role = parsed.user?.role || storedRole;
 console.log("Here", storedRole, role, parsed)
      if (role) {
        // normal behaviour: already logged in + has role
        console.log(role)
        navigate("/ProfileDashboard");
      } else {
        // logged in but no role -> show slider
        setAuthUser(parsed);
        setNeedsRole(true);
      }
    } catch (e) {
      console.error("Failed to parse authUser from localStorage", e);
      // fallback: just send to dashboard
      navigate("/ProfileDashboard");
    }
  }, [navigate]);

  // After success from email/password login, send to Dashboard
  // (unless we're in the needsRole flow)
  useEffect(() => {
    if (success && !needsRole) {
      const timer = setTimeout(() => navigate("/ProfileDashboard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, needsRole, navigate]);

  // --- validation helpers ---
  const validateEmail = (value: string): string | null => {
    if (value === "") return "Please Input Your Email";
    return null;
  };

  const go = () => (window.location.href = `${API_BASE}/api/auth/google/login`);
  const mi = () => (window.location.href = `${API_BASE}/api/auth/microsoft/login`);
  const li = () => (window.location.href = `${API_BASE}/api/auth/linkedin/login`);

  // If you want looser login rules, replace with: `return value ? null : "Enter your password.";`
  const validatePwdForLogin = (value: string): string | null => {
    if (value === "") return "Please Input Your Password";
    return null;
  };

  // const go = () =>
  //   (window.location.href = "http://localhost:5050/api/auth/google/login");
  // const mi = () =>
  //   (window.location.href = "http://localhost:5050/api/auth/microsoft/login");

  const onBlurEmail = () => setErrEmail(validateEmail(email));
  const onBlurPassword = () => setErrPassword(validatePwdForLogin(password));

  // --- role options for slider ---
  const roleOptions: { key: RoleOptionKey; title: string; description: string }[] =
    [
      {
        key: "job_seeker",
        title: "I'm a job seeker",
        description:
          "Track applications, organize interviews, and get tailored support for your job search.",
      },
      {
        key: "org_member",
        title: "I'm part of an organization",
        description:
          "Join an existing organization workspace and collaborate with your team.",
      },
      {
        key: "org_admin",
        title: "I represent my organization",
        description:
          "Set up and manage your organization’s presence, roles, and members.",
      },
      {
        key: "advisor",
        title: "I'm a freelance advisor/coach",
        description:
          "Offer guidance, track sessions, and support candidates or teams.",
      },
    ];

  // --- submit email/password login ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);

    const eMsg = validateEmail(email);
    if (eMsg) {
      setErrEmail(eMsg);
      return;
    }

    const pMsg = validatePwdForLogin(password);
    if (pMsg) {
      setErrPassword(pMsg);
      return;
    }

    setSubmitting(true);
    setErrEmail(null);
    setErrPassword(null);

    try {
      const user = await LoginUser({ email, password });
      console.log("Login with:", user.user.email);
      setAuth(user.token, user);

      if (user.token) {
        localStorage.setItem("authToken", user.token);
        localStorage.setItem("userId", user.userId);
        localStorage.setItem("authUser", JSON.stringify(user));
      }

      const backendRole = user.user?.role;
      const storedRole = localStorage.getItem("userRole");
      const effectiveRole = backendRole || storedRole;

      if (!effectiveRole) {
        // no role yet -> show slider instead of redirecting
        setAuthUser({
          token: user.token,
          userId: user.userId,
          user: {
            _id: user.user._id,
            email: user.user.email,
            firstName: user.user.firstName,
            lastName: user.user.lastName,
            role: user.user.role,
            organizationId: user.user.organizationId,
          },
        });
        setNeedsRole(true);
      } else {
        setSuccess("Welcome back! Redirecting…");
      }
    } catch (err: any) {
      setFormErr(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setEmail(""); // Clear Form
      setPassword(""); // Clear Form
    }
  };

  // --- save role from slider ---
const handleRoleSelect = async (role: RoleOptionKey) => {
  if (!authUser || savingRole) return;

  setSelectedRole(role);
  setSavingRole(true);
  setRoleErr(null);

  try {
    // 1) Save role locally for quick access
    localStorage.setItem("userRole", role);

    // 2) Figure out user id
    const userId = authUser.userId || authUser.user?._id;
    if (!userId) {
      throw new Error("No user id found while saving role.");
    }
    console.log("Saving role for user:", userId, "role:", role);

    // 3) Call backend to persist role
    const res = await UpdateRole({ userId, role });
    console.log("UpdateRole response:", res);

    // 4) Update auth user and auth store with new role
    const updated: StoredAuthUser = {
      ...authUser,
      user: authUser.user
        ? {
            ...authUser.user,
            role,
          }
        : authUser.user,
    };

    // re-save via your auth helper & localStorage
    if (authUser.token) {
      setAuth(authUser.token, updated as any);
    }
    localStorage.setItem("authUser", JSON.stringify(updated));

    // 5) We no longer need the slider in this component
    setNeedsRole(false);

    // 6) Finally redirect to dashboard
    navigate("/ProfileDashboard", { replace: true });
  } catch (e) {
    console.error(e);
    setRoleErr(
      e instanceof Error
        ? e.message
        : "We couldn't save your role. Please try again."
    );
  } finally {
    setSavingRole(false);
  }
};


  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img src={logo} alt="ontrac Logo" className="mx-auto h-14" />
        <h1>Welcome back — log in</h1>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="form-label">Email address</label>
            <div className="mt-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={onBlurEmail}
                placeholder="you@example.com"
                className={`form-input ${
                  errEmail
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-(--brand-navy) focus:border-(--brand-navy)"
                }`}
              />
            </div>
            {errEmail && (
              <p className="mt-1 text-sm text-red-600">{errEmail}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="form-label">Password</label>
            <div className="mt-2">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={onBlurPassword}
                className={`form-input ${
                  errPassword
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-(--brand-navy) focus:border-(--brand-navy)"
                }`}
              />
            </div>
            {errPassword && (
              <p className="mt-1 text-sm text-red-600">{errPassword}</p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="mt-2 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-(--brand-navy) hover:text-(--brand-navy) underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit */}
          <div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Checking…" : "Log in"}
            </Button>
          </div>
          {formErr && <p className="mt-1 text-sm text-red-600">{formErr}</p>}
          {success && (
            <p className="mt-1 text-sm text-green-600">{success}</p>
          )}
          <div className="mt-6">
            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-600">Or log in with</span>
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <button
                type="button"
                onClick={go}
                className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300"
              >
                <img
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                  alt="Google"
                  className="h-6 w-6"
                  loading="lazy"
                />
              </button>
              <button
                type="button"
                onClick={mi}
                className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                  alt="Microsoft"
                  className="h-6 w-6"
                  loading="lazy"
                />
              </button>
              <button type="button" onClick={li} className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300">
                <img 
                  src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg" 
                  alt="LinkedIn" 
                  className="h-6 w-6" 
                  loading="lazy"
                />
              </button>
            </div>
          </div>
          <div>
            Don't have an account?{" "}
            <Link to="/Registration" className="underline">
              Sign up
            </Link>
          </div>
        </form>
      </div>

      {/* Role selection slider overlay if user is logged in but missing role */}
      {needsRole && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-out translate-x-0">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              How will you use OnTrac?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose the option that best describes you. This helps us
              personalize your dashboard.
            </p>

            <div className="space-y-3">
              {roleOptions.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => handleRoleSelect(role.key)}
                  disabled={savingRole}
                  className={`w-full text-left border rounded-lg px-4 py-3 hover:shadow-md transition flex flex-col ${
                    selectedRole === role.key
                      ? "border-(--brand-navy)"
                      : "border-gray-200"
                  }`}
                >
                  <span className="font-medium text-gray-900">
                    {role.title}
                  </span>
                  <span className="text-sm text-gray-600">
                    {role.description}
                  </span>
                </button>
              ))}

              {/* Hidden-ish admin option */}
              <div className="pt-4 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("super_admin")}
                  disabled={savingRole}
                  className="text-xs text-gray-400 hover:text-gray-700 underline"
                >
                  I&apos;m an admin
                </button>
              </div>
            </div>

            {roleErr && (
              <p className="mt-3 text-sm text-red-600">{roleErr}</p>
            )}

            <div className="mt-6 flex justify-end">
              <span className="text-xs text-gray-400">
                You can update this later in your profile settings.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
