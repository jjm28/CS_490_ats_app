// src/components/ForgotPassword.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Button from "./StyledComponents/Button";
import "../App.css"; // fixed path

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (value: string): string | null => {
    if (!value) return "Please input your email";
    return null;
  };

  const onBlurEmail = () => setErrEmail(validateEmail(email));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setResetLink(null);
    setError(null);

    const eMsg = validateEmail(email);
    if (eMsg) return setErrEmail(eMsg);

    setSubmitting(true);
    setErrEmail(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email }
      );

      // Show the reset link if backend returned it
      if (response.data.resetLink) {
        setResetLink(response.data.resetLink);
        setMessage("Password reset link generated:");
      } else {
        setMessage("If that email exists, a reset link has been sent.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setEmail(""); // Clear form
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
        <p className="text-center text-gray-600 mt-2">
          Enter your email to receive a password reset link
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-900 flex">
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
                className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm ${
                  errEmail
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                }`}
              />
            </div>
            {errEmail && <p className="mt-1 text-sm text-red-600">{errEmail}</p>}
          </div>

          <div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send Reset Link"}
            </Button>
          </div>

          {message && (
            <p className="mt-1 text-sm text-green-600">
              {message}{" "}
              {resetLink && (
                <a
                  href={resetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-600"
                >
                  {resetLink}
                </a>
              )}
            </p>
          )}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

          <div className="text-center mt-4">
            <Link
              to="/Login"
              className="text-sm text-indigo-600 hover:text-indigo-500 underline"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
