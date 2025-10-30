import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import type { Education } from "../Education/Education";
import { getEducation } from "../../api/education";
import API_BASE from "../../utils/apiBase";

// ---- Config: set the destination for the "+" button here ----
const EDUCATION_ADD_ROUTE = "/education"; // change later if needed

// ---------- helpers ----------
function formatLocation(loc?: Profile["location"]) {
  const city = loc?.city?.trim();
  const state = loc?.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "—";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function pickLatest(profiles: Profile[]): Profile | null {
  if (!profiles?.length) return null;
  const parse = (d?: string) => (d ? new Date(d).getTime() : 0);
  return [...profiles].sort((a, b) => {
    const bu = parse(b.updatedAt) || parse(b.createdAt);
    const au = parse(a.updatedAt) || parse(a.createdAt);
    return bu - au; // newest → oldest
  })[0];
}

function formatMonthYear(dateString?: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

// ---------- component ----------
const ProfileDashboard: React.FC = () => {
  const location = useLocation() as { state?: { flash?: string } };
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [educationList, setEducationList] = useState<Education[]>([]);
  const [eduLoading, setEduLoading] = useState(true);
  const [eduErr, setEduErr] = useState<string | null>(null);

  // Profiles
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await listProfiles();
        setProfiles(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load profiles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Education
  useEffect(() => {
    (async () => {
      setEduLoading(true);
      setEduErr(null);
      try {
        const data = await getEducation();
        data.sort((a, b) => {
          const da = a.graduationDate ? new Date(a.graduationDate).getTime() : 0;
          const db = b.graduationDate ? new Date(b.graduationDate).getTime() : 0;
          return db - da; // newest first
        });
        setEducationList(data);
      } catch (e: any) {
        setEduErr(e?.message || "Failed to load education.");
      } finally {
        setEduLoading(false);
      }
    })();
  }, []);

  const latest = useMemo(() => pickLatest(profiles || []), [profiles]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="!text-left text-2xl font-bold text-gray-900">Profile Dashboard</h1>
        {location?.state?.flash && (
          <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-100">
            {location.state.flash}
          </div>
        )}
      </div>

      {/* Profile */}
      {loading && <p className="text-gray-600">Loading profile…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && !latest && (
        <Card>
          <p className="text-gray-700">No profiles found yet.</p>
        </Card>
      )}

      {!loading && !err && latest && (
        <Card className="overflow-hidden">
          {/* Banner */}
          <div className="h-20 w-full bg-gradient-to-r from-slate-50 to-slate-100"></div>

          {/* Header: avatar + name/summary */}
          <div className="-mt-10 flex items-center gap-5 px-6">
            {latest.photoUrl ? (
              <img
                src={API_BASE + latest.photoUrl}
                alt={`${latest.fullName} profile`}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 ring-2 ring-white shadow-sm flex items-center justify-center text-xl font-semibold text-gray-700">
                {getInitials(latest.fullName || "U N")}
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{latest.fullName || "—"}</h2>
              <p className="text-gray-600">{latest.headline?.trim() || "No headline provided"}</p>

              {/* Quick tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                {latest.industry && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">
                    {latest.industry}
                  </span>
                )}
                {latest.experienceLevel && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">
                    {latest.experienceLevel}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700">
                  {formatLocation(latest.location)}
                </span>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 px-6 pt-6 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Email</div>
              <div className="text-gray-900 break-all">
                {latest.email ? (
                  <a className="underline-offset-2 hover:underline" href={`mailto:${latest.email}`}>
                    {latest.email}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Phone</div>
              <div className="text-gray-900">
                {latest.phone ? (
                  <a className="underline-offset-2 hover:underline" href={`tel:${latest.phone}`}>
                    {latest.phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-gray-500">Bio</div>
              <div className="text-gray-900 whitespace-pre-wrap">
                {latest.bio?.trim() || "No bio yet."}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="mt-6 border-t border-gray-100 px-6 pt-4 text-xs text-gray-500">
            <div>
              Updated: {latest.updatedAt ? new Date(latest.updatedAt).toLocaleString() : "—"}
            </div>
            <div>
              Created: {latest.createdAt ? new Date(latest.createdAt).toLocaleString() : "—"}
            </div>
          </div>
        </Card>
      )}

      {!loading && profiles && profiles.length > 1 && (
        <p className="mt-3 text-sm text-gray-500">
          Showing your most recent profile. ({profiles.length} total)
        </p>
      )}

      {/* Education */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Education</h2>
        </div>

        {eduLoading && <p className="text-gray-600">Loading education…</p>}
        {eduErr && <p className="text-sm text-red-600">{eduErr}</p>}

        {!eduLoading && !eduErr && educationList.length === 0 && (
          <Card>
            <p className="text-gray-700">No education entries yet.</p>
          </Card>
        )}

        {!eduLoading && !eduErr && educationList.length > 0 && (
          <div className="relative ml-4 pl-6">
            {/* timeline line */}
            <div className="absolute left-0 top-0 h-full w-px bg-gray-200" aria-hidden />

            <div className="space-y-4">
              {educationList.map((edu) => (
                <div key={edu._id} className="relative">
                  {/* timeline dot */}
                  <span className="absolute -left-[9px] top-3 inline-block h-4 w-4 rounded-full border-2 border-white bg-gray-300 ring-2 ring-gray-300" />

                  <Card>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold text-gray-900">
                          {edu.institution} — {edu.degree}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatMonthYear(edu.graduationDate)}
                          {edu.currentlyEnrolled && " • Currently Enrolled"}
                        </p>
                      </div>

                      <p className="text-gray-700">
                     {edu.educationLevel ? `${edu.educationLevel} in ` : ""}
                        {edu.fieldOfStudy}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-700">
                        {edu.gpa && !edu.isPrivateGpa && <span>GPA: {edu.gpa}</span>}
                        {edu.achievements && <span>Achievements: {edu.achievements}</span>}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
<div className="mb-5 flex items-center justify-between">
  <Button
    variant="primary"
    className="ml-auto"
    onClick={() => navigate(EDUCATION_ADD_ROUTE)}
  >
    +
  </Button>
</div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
