// src/components/Login.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Reuse your existing helpers like in Registration.tsx
import {
  isValidEmailBasic,
  splitEmail,
  isAllowedDomain,
  isValidPassword,
} from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""; // e.g., http://localhost:3001
const LOGIN_ENDPOINT = "/api/auth/login";                  // adjust if your backend differs

type LoginResponse =
  | { token: string; user?: { id?: string; email?: string; fullName?: string } }
  | { message?: string; error?: string };

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
    if (existing) navigate("/Dashboard");
  }, [navigate]);

  // After success, send to Dashboard
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/Dashboard"), 1200);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  // --- validation helpers (same style as Registration.tsx) ---
  const validateEmail = (value: string): string | null => {
    if (!isValidEmailBasic(value)) return "Enter a valid email (e.g., name@example.com).";
    const { domain } = splitEmail(value);
    if (!isAllowedDomain(domain)) return "This email domain isn’t allowed.";
    return null;
  };

  // If you want looser login rules, replace with: `return value ? null : "Enter your password.";`
  const validatePwdForLogin = (value: string): string | null => {
    if (!isValidPassword(value)) {
      return "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, and 1 number.";
    }
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
      const res = await fetch(API_BASE + LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // if you also use cookies/session
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const j = (await res.json()) as LoginResponse;
          detail = ("error" in j && j.error) || ("message" in j && j.message) || "";
        } catch {
          /* ignore parse errors */
        }
        throw new Error(
          `Login failed (${res.status}) ${res.statusText}${detail ? ` – ${detail}` : ""}`
        );
      }

      const data = (await res.json()) as LoginResponse;
      const token = "token" in data ? data.token : null;
      if (!token) throw new Error("No token returned from server.");

      // Persist auth token (stay signed in until explicit logout)
      localStorage.setItem("authToken", token);
      if ("user" in data && data.user) {
        localStorage.setItem("authUser", JSON.stringify(data.user));
      }

      setSuccess("Welcome back! Redirecting…");
    } catch (err: any) {
      setFormErr(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
          alt="Your Company"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
          Welcome back — log in
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-900 flex">Email address</label>
            <div className="mt-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={onBlurEmail}
                placeholder="you@example.com"
                className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm ${
                  errEmail
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                }`}
              />
            </div>
            {errEmail && <p className="mt-1 text-sm text-red-600">{errEmail}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="flex text-sm font-medium text-gray-900">Password</label>
            <div className="mt-2">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={onBlurPassword}
                className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm ${
                  errPassword
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                }`}
              />
            </div>
            {errPassword && <p className="mt-1 text-sm text-red-600">{errPassword}</p>}
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {submitting ? "Checking…" : "Log in"}
            </button>
          </div>

          {formErr && <p className="mt-1 text-sm text-red-600">{formErr}</p>}
          {success && <p className="mt-1 text-sm text-green-600">{success}</p>}
        </form>
      </div>
    </div>
  );
}
