import React, { useState } from "react";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch("http://localhost:5050/api/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    alert("If the email is valid, a reset link has been sent.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Forgot Password?</h1>
      <form onSubmit={handleSubmit} className="w-80">
        <input
          type="email"
          value={email}
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border px-3 py-2 mb-4 rounded"
        />
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500"
        >
          Send Reset Link
        </button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
