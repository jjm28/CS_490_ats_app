import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function ProfilePage() {
  const navigate = useNavigate();

  // Simple “logged in” check; replace with your real auth state if you have one
  const token = useMemo(
    () =>
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "",
    []
  );
  const isLoggedIn = !!token;

  const goToForm = () => {
    navigate("/profile/new"); // <- route we’ll add below
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Profile</h1>
      <p className="text-gray-600 mb-6">
        Set up your profile so employers can learn more about you.
      </p>

      <button
        onClick={goToForm}
        disabled={!isLoggedIn}
        className={`rounded-md px-4 py-2 text-white font-medium shadow
          ${!isLoggedIn ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"}`}
        title={!isLoggedIn ? "Log in first to create your profile" : "Open profile form"}
      >
        {isLoggedIn ? "Create / Edit Profile" : "Log in to continue"}
      </button>

      {!isLoggedIn && (
        <p className="mt-3 text-sm text-amber-700">
          You’re not logged in. Log in, then click the button to fill out your profile.
        </p>
      )}
    </div>
  );
}

export default ProfilePage;