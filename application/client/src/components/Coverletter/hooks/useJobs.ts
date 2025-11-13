// src/hooks/useJobs.ts
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../utils/apiBase";

export interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  location?: string;
  salaryMin?: any;
  salaryMax?: any;
  jobPostingUrl?: string;
  applicationDeadline?: string;
  description?: string;
  industry: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const navigate = useNavigate();
  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    async function fetchJobs() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(JOBS_ENDPOINT, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          navigate("/login", {
            state: { flash: "Your session has expired. Please log in again." },
          });
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        if (!cancelled) setJobs(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load job opportunities.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, navigate, token]);

  return { jobs, loading, err, isLoggedIn };
}
