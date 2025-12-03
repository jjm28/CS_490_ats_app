import React, { useState } from "react";
import {
  isValidEmailBasic,
  splitEmail,
  isAllowedDomain,
  isValidPassword,
} from "../utils/helpers";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../api/user-auth";
import { setAuth } from "../utils/auth";
import logo from "../assets/img/logos/ontrac-trans-1.png";
import Button from "./StyledComponents/Button";
import "../styles/StyledComponents/FormInput.css";

type RoleOptionKey =
  | "job_seeker"
  | "org_member"
  | "org_admin"
  | "advisor"
  | "super_admin";

function Registration() {
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const [firstName, setfirstName] = useState("");
  const [lastName, setlastName] = useState("");
  const [confirmpassword, setconfirmpassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errpassword, setErrpassword] = useState<string | null>(null);
  const [errconfirmpassword, setErrconfirmpassword] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // step: "form" = show base form, "role" = show slide-in role selector
  const [step, setStep] = useState<"form" | "role">("form");
  const [selectedRole, setSelectedRole] = useState<RoleOptionKey | null>(null);

  const navigate = useNavigate();

  const validateEmail = (value: string): string | null => {
    if (!isValidEmailBasic(value))
      return "Enter a valid email (e.g., name@example.com).";
    const { domain } = splitEmail(value);
    if (!isAllowedDomain(domain)) return "This email domain isn’t allowed.";
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!isValidPassword(value)) {
      return "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, and 1 number.";
    }
    return null;
  };

  const validateConfirm = (value: string): string | null => {
    if (password !== value) {
      return "Passwords do not match.";
    }
    return null;
  };

  const go = () =>
    (window.location.href = "http://localhost:5050/api/auth/google/login");
  const mi = () =>
    (window.location.href = "http://localhost:5050/api/auth/microsoft/login");

  const onBlurEmail = () => {
    setErrEmail(validateEmail(email));
  };
  const onBlurpassword = () => {
    setErrpassword(validatePassword(password));
  };
  const onBlurconfirmpassword = () => {
    setErrconfirmpassword(validateConfirm(confirmpassword));
  };

  /**
   * First click on "Register":
   * - Only validates the form.
   * - If valid, opens the role selector slide-in (does NOT create user yet).
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const emailMsg = validateEmail(email);
    const pwdMsg = validatePassword(password);
    const confirmMsg = validateConfirm(confirmpassword);

    setErrEmail(emailMsg);
    setErrpassword(pwdMsg);
    setErrconfirmpassword(confirmMsg);

    if (emailMsg || pwdMsg || confirmMsg) {
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setErr("Please fill in your first and last name.");
      return;
    }

    // If we got here, open the role selection step
    setStep("role");
  };


  const handleRoleSelect = async (role: RoleOptionKey) => {
    if (submitting) return;
    setSelectedRole(role);
    setErr(null);
    setSubmitting(true);

    try {

      const user = await createUser({ email, password, firstName, lastName,role });
      console.log("Registered with:", user);
      setAuth(user.token, user);

      if (user.token) {
        localStorage.setItem("token", user.token);
        localStorage.setItem("userId", user.userid);
      }

      navigate("/ProfileDashboard");
    } catch (error) {
      if (error instanceof Error) {
        setErr(error.message);
      } else {
        setErr("Something went wrong. Please try again.");
      }
      // If there's an error, send them back to form step so they can try again
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

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
        key: "super_admin",
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

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full">
        <img src={logo} alt="ontrac Logo" className="mx-auto h-14" />
        <h1 className="mt-4 text-center text-2xl font-semibold">
          Welcome! Create your account
        </h1>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Email address</label>
            <div className="mt-2">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setemail(e.target.value)}
                onBlur={onBlurEmail}
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

          <div>
            <label className="form-label">Password</label>
            <div className="mt-2">
              <input
                type="password"
                name="password"
                required
                value={password}
                onBlur={onBlurpassword}
                onChange={(e) => setpassword(e.target.value)}
                className={`form-input ${
                  errpassword
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-(--brand-navy) focus:border-(--brand-navy)"
                }`}
              />
            </div>
            {errpassword && (
              <p className="mt-1 text-sm text-red-600">{errpassword}</p>
            )}
          </div>

          <div>
            <label className="form-label">Confirm Password</label>
            <div className="mt-2">
              <input
                type="password"
                name="confirm-password"
                required
                value={confirmpassword}
                onBlur={onBlurconfirmpassword}
                onChange={(e) => setconfirmpassword(e.target.value)}
                autoComplete="current-password"
                className={`form-input ${
                  errconfirmpassword
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-(--brand-navy) focus:border-(--brand-navy)"
                }`}
              />
            </div>
            {errconfirmpassword && (
              <p className="mt-1 text-sm text-red-600">
                {errconfirmpassword}
              </p>
            )}
          </div>

          <div>
            <label className="form-label">First Name</label>
            <div className="mt-2">
              <input
                type="text"
                name="firstname"
                required
                value={firstName}
                onChange={(e) => setfirstName(e.target.value)}
                autoComplete="given-name"
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Last Name</label>
            <div className="mt-2">
              <input
                type="text"
                name="lastname"
                required
                value={lastName}
                onChange={(e) => setlastName(e.target.value)}
                autoComplete="family-name"
                className="form-input"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={submitting || step === "role"}
            >
              {submitting ? "Creating account..." : "Register"}
            </Button>

            <div className="mt-6">
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-600">Or register with</span>
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
                  />
                </button>
              </div>
            </div>
          </div>

          {err && <p className="mt-1 text-sm text-red-600">{err}</p>}

          <div className="pt-2">
            Already have an account?{" "}
            <Link to="/Login" className="underline">
              Log in
            </Link>
          </div>
        </form>
      </div>

      {/* Slide-in Role Selection Panel */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-transform duration-300 ease-out ${
          step === "role"
            ? "translate-x-0"
            : "translate-x-full pointer-events-none"
        } flex items-center justify-center px-4`}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
                className="text-xs text-gray-400 hover:text-gray-700 underline"
              >
                I&apos;m an admin
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-800"
              onClick={() => setStep("form")}
              disabled={submitting}
            >
              ← Back to registration
            </button>
            <span className="text-xs text-gray-400">
              You can update this later in your profile settings.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Registration;
