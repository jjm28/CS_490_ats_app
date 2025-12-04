import React, { useState, useEffect } from "react";
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

function Registration() {
  // const [user, setUser] = useState(null);
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
  const [Success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (Success) {
      const timer = setTimeout(() => {
        navigate("/ProfileDashboard");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [Success, navigate]);

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
    if (password != value) {
      return "Passwords do not match.";
    }
    return null;
  };
  const go = () => (window.location.href = "http://localhost:5050/api/auth/google/login");
  const mi = () => (window.location.href = "http://localhost:5050/api/auth/microsoft/login");
  const li = () => (window.location.href = "http://localhost:5050/api/auth/linkedin/login");

  const onBlurEmail = () => {
    setErrEmail(validateEmail(email));
  };
  const onBlurpassword = () => {
    setErrpassword(validatePassword(password));
  };
  const onBlurconfirmpassword = () => {
    setErrconfirmpassword(validateConfirm(confirmpassword));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validateEmail(email);
    if (msg) return setErrEmail(msg);
    const msg1 = validatePassword(email);
    if (msg) return setErrEmail(msg);
    const msg2 = validateConfirm(email);
    if (msg) return setErrEmail(msg);
    setSubmitting(true);
    try {
      const user = await createUser({ email, password, firstName, lastName });
      console.log("Register with:", user.user.email);
      setAuth(user.token, user);
      if (user.token) {
        localStorage.setItem("token", user.token);
        localStorage.setItem("userId", user.userid);
      }

      setErrEmail(null);
      setErrpassword(null);
      setErrconfirmpassword(null);
      setErr(null);
      setSuccess("Success! Your account has been created. Welcome aboard!");
    } catch (err) {
      if (err instanceof Error) {
        setErr(err.message);
      } else {
        setErr("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full">
        <img src={logo} alt="ontrac Logo" className="mx-auto h-14" />
        <h1>Welcome! Create your account</h1>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action="#" method="POST" className="space-y-6">
          <div>
            <label className="form-label">
              Email address
            </label>
            <div className="mt-2">
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                onChange={(e) => setemail(e.target.value)}
                onBlur={onBlurEmail}
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
          <div>
            <label className="form-label">
              Password{" "}
            </label>
            <div className="mt-2">
              <input
                type="password"
                name="password"
                required
                onBlur={onBlurpassword}
                onChange={(e) => setpassword(e.target.value)}
                className={`form-input ${errpassword
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
            <label className="form-label">
              {" "}
              Confirm Password{" "}
            </label>
            <div className="mt-2">
              <input
                type="password"
                name="confirm-password"
                required
                onBlur={onBlurconfirmpassword}
                onChange={(e) => setconfirmpassword(e.target.value)}
                autoComplete="current-password"
                className={`form-input ${errconfirmpassword
                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-(--brand-navy) focus:border-(--brand-navy)"
                  }`}
              />
            </div>
            {errconfirmpassword && (
              <p className="mt-1 text-sm text-red-600">{errconfirmpassword}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              {" "}
              First Name{" "}
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="firstname"
                required
                onChange={(e) => setfirstName(e.target.value)}
                autoComplete="firstname"
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">
              {" "}
              Last Name{" "}
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="lastname"
                required
                onChange={(e) => setlastName(e.target.value)}
                autoComplete="lastname"
                className="form-input"
              />
            </div>
          </div>
          <div>
            <Button type="submit" onClick={handleSubmit}>
              {submitting ? "Checking..." : "Register"}
            </Button>
            <div className="mt-6">
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-600">Or register with</span>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                <button type="button" onClick={go} className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="h-6 w-6" />
                </button>
                <button type="button" onClick={mi} className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="h-6 w-6" />
                </button>
                <button type="button" onClick={li} className="p-2 rounded-md shadow hover:shadow-lg border border-gray-300">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg" alt="LinkedIn" className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
          {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
          {Success != null ? (
            <p className="mt-1 text-sm text-green-600">{Success}</p>
          ) : (
            <span></span>
          )}
          <div>
            Already have an account?{" "}
            <Link to="/Login" className="underline">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
export default Registration;