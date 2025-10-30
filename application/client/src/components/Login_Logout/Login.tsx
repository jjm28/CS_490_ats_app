// src/components/Login.tsx
import logo from "../../assets/img/logos/ontrac-trans-1.png";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoginUser } from "../../api/user-auth";
import { setAuth } from "../../utils/auth";
import Button from "../StyledComponents/Button";
import "../../styles/StyledComponents/FormInput.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errPassword, setErrPassword] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, skip the form
  useEffect(() => {
    const existing = localStorage.getItem("authToken");
    if (existing) navigate("/ProfileDashboard");
  }, [navigate]);

  // After success, send to Dashboard
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/ProfileDashboard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  // --- validation helpers (same style as Registration.tsx) ---
  const validateEmail = (value: string): string | null => {
    if (value == "") return "Please Input Your Email";
    return null;
  };

  const go = () => (window.location.href = "http://localhost:5050/api/auth/google/login");
  const mi = () => (window.location.href = "http://localhost:5050/api/auth/microsoft/login");

  // If you want looser login rules, replace with: `return value ? null : "Enter your password.";`
  const validatePwdForLogin = (value: string): string | null => {
    if (value == "") return "Please Input Your Password";
    return null;
  };

  const onBlurEmail = () => setErrEmail(validateEmail(email));
  const onBlurPassword = () => setErrPassword(validatePwdForLogin(password));

  // --- submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);

    const eMsg = validateEmail(email);
    if (eMsg) return setErrEmail(eMsg);

    const pMsg = validatePwdForLogin(password);
    if (pMsg) return setErrPassword(pMsg);

    setSubmitting(true);
    setErrEmail(null);
    setErrPassword(null);

    try {
      const user = await LoginUser({ email, password });
      console.log("Register with:", user.user.email);
      setAuth(user.token, user);
      if (user.token) {
        localStorage.setItem("token", user.token);
        localStorage.setItem("userId", user.userId);
      }

      setSuccess("Welcome back! Redirecting…");
    } catch (err: any) {
      setFormErr(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setEmail(""); // Clear Form
      setPassword(""); // Clear Form
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img src={logo} alt="ontrac Logo" className="mx-auto h-14" />
        {/* <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
          Welcome back — log in
        </h2> */}
        <h1>Welcome back — log in</h1>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="form-label">
              Email address
            </label>
            <div className="mt-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={onBlurEmail}
                placeholder="you@example.com"
                className={`form-input ${errEmail
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
            <label className="form-label">
              Password
            </label>
            <div className="mt-2">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={onBlurPassword}
                className={`form-input ${errPassword
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
          {success && <p className="mt-1 text-sm text-green-600">{success}</p>}
          <div className="mt-6">
            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-600">Or log in with</span>
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <button type="button" onClick={go} className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="h-6 w-6" />
              </button>
              <button type="button" onClick={mi} className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-6 w-6" />
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
    </div>
  );
}
