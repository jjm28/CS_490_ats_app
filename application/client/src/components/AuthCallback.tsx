import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setAuth } from "../utils/auth";


function base64UrlDecode(input: string) {
  // Polyfill for atob with base64url
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "====".slice(s.length % 4) : "";
  return atob(s + pad);
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const u = params.get("u");

    if (!token || !u) {
      // handle error state
      navigate("/login");
      return;
    }

    const user = JSON.parse(base64UrlDecode(u));

    setAuth(token,user)
    // optional: clean up the URL (no token in history)
    window.history.replaceState({}, "", "/ProfileDashboard");
    navigate("/ProfileDashboard");
  }, [navigate]);

  return <p>Signing you in…</p>;
}
