// src/components/Logout.tsx
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


type Props = {
  asButton?: boolean;     // if true, shows a button instead of auto-logout on mount
  redirectTo?: string;    // override redirect (default "/")
  className?: string;     // styling for the button
  label?: string;         // button label
};

export default function Logout({
  asButton = false,
  redirectTo,
  className = "rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500",
  label = "Log out",
}: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const doLogout = () => {
    // Clear persisted auth so the user is fully logged out.
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");

    // Nudge other tabs/components listening to "storage" to refresh auth state.
    localStorage.setItem("auth:changed", String(Date.now()));
    localStorage.removeItem("auth:changed");

    // Decide where to go next
    const to = redirectTo || params.get("to") || "/";
    navigate(to);
  };

  // Auto-logout when mounted if used as a route (no button)
  useEffect(() => {
    if (!asButton) doLogout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asButton]);

  if (asButton) {
    return (
      <button onClick={doLogout} className={className} title="Log out">
        {label}
      </button>
    );
  }

  // Brief fallback UI during the auto-logout flow
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-gray-600">Signing you out…</p>
    </div>
  );
}
