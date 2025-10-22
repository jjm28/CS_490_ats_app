import { useState } from "react";
import { Link } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // for login errors

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // reset any previous error

    try {
      const response = await fetch("http://localhost:5050/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        // Invalid credentials or server error
        const data = await response.json();
        setError(data.message || "Invalid email or password.");
        return;
      }

      // If login is successful
      const data = await response.json();
      console.log("Login success:", data);
      // e.g., store token, redirect, etc.
      // localStorage.setItem("token", data.token);
      // navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div>
          <label className="text-sm font-medium text-gray-900 flex">
            Email address
          </label>
          <div className="mt-2">
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="flex text-sm font-medium text-gray-900">
            Password
          </label>
          <div className="mt-2">
            <input
              type="password"
              name="password"
              required
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Error Message (if login fails) */}
        {error && (
          <p className="mt-1 text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Forgot Password link */}
        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
