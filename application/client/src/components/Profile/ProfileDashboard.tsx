import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import type { Education } from "../Education/Education";
import { getEducation } from "../../api/education";
import type { Skill } from "../Skills/Skills";
import type { Certification } from "../Certifications/Certifications";
import  type {Employment} from "../../api/employment" 
import { getSkills } from "../../api/skills";
import { categories as SKILL_CATEGORIES } from "../../constants/skills";
import { getCertifications } from "../../api/certifications";
import { listEmployment } from "../../api/employment";

import API_BASE from "../../utils/apiBase";

// ---- Routes ----
const EDUCATION_ADD_ROUTE = "/education";
const SKILLS_ROUTE = "/skills";
const CERTIFICATIONS_ROUTE = "/certifications";

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
  const ts = (d?: string) => (d ? Date.parse(d) || 0 : 0);
  return [...profiles].sort((a, b) => {
    const bu = ts(b.updatedAt) || ts(b.createdAt);
    const au = ts(a.updatedAt) || ts(a.createdAt);
    return bu - au; // newest → oldest
  })[0];
}
function formatMonthYear(dateString?: string) {
  if (!dateString) return "";
  const t = Date.parse(dateString);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("default", { month: "long", year: "numeric" });
}
const PROF_COLORS: Record<NonNullable<Skill["proficiency"]>, string> = {
  Beginner: "bg-gray-100 text-gray-700 ring-gray-200",
  Intermediate: "bg-blue-50 text-blue-700 ring-blue-200",
  Advanced: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Expert: "bg-purple-50 text-purple-700 ring-purple-200",
};
function SkillChip({ name, proficiency }: { name: string; proficiency: Skill["proficiency"] }) {
  const color = PROF_COLORS[proficiency || "Beginner"];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-800 bg-white shadow-sm">
      <span className="font-medium">{name}</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${color}`}>{proficiency}</span>
    </span>
  );
}

function formatYMD(date?: string) {
  if (!date) return "";
  const t = Date.parse(date);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("default", { month: "short", year: "numeric" });
}

function roleDates(e: Employment) {
  const start = formatYMD(e.startDate ?? undefined);
  const end = e.currentPosition ? "Present" : formatYMD(e.endDate ?? undefined);
  return start && end ? `${start} – ${end}` : start || end || "";
}


// ---------- component ----------
const ProfileDashboard: React.FC = () => {
  const location = useLocation() as { state?: { flash?: string } };
  const navigate = useNavigate();

  // Profile
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Education
  const [educationList, setEducationList] = useState<Education[]>([]);
  const [eduLoading, setEduLoading] = useState(true);
  const [eduErr, setEduErr] = useState<string | null>(null);

  // Skills
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsErr, setSkillsErr] = useState<string | null>(null);

  // Certifications
  const [certs, setCerts] = useState<Certification[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [certsErr, setCertsErr] = useState<string | null>(null);

  // Employment
  const [employment, setEmployment] = useState<Employment[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empErr, setEmpErr] = useState<string | null>(null);

  // Fetch profiles
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

  // Fetch education
  useEffect(() => {
    (async () => {
      setEduLoading(true);
      setEduErr(null);
      try {
        const data = await getEducation();
        data.sort((a, b) => {
          const da = a.graduationDate ? new Date(a.graduationDate).getTime() : 0;
          const db = b.graduationDate ? new Date(b.graduationDate).getTime() : 0;
          return db - da;
        });
        setEducationList(data);
      } catch (e: any) {
        setEduErr(e?.message || "Failed to load education.");
      } finally {
        setEduLoading(false);
      }
    })();
  }, []);

  // Fetch skills
  useEffect(() => {
    (async () => {
      setSkillsLoading(true);
      setSkillsErr(null);
      try {
        const data = await getSkills();
        data.sort((a, b) => {
          if (a.category === b.category) {
            return (a.order || 0) - (b.order || 0);
          }
          return SKILL_CATEGORIES.indexOf(a.category) - SKILL_CATEGORIES.indexOf(b.category);
        });
        setSkills(data);
      } catch (e: any) {
        setSkillsErr(e?.message || "Failed to load skills.");
      } finally {
        setSkillsLoading(false);
      }
    })();
  }, []);

  // Fetch certifications
  useEffect(() => {
    (async () => {
      setCertsLoading(true);
      setCertsErr(null);
      try {
        const data = await getCertifications();
        data.sort((a, b) => {
          const da = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
          const db = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
          return db - da; // newest first
        });
        setCerts(data);
      } catch (e: any) {
        setCertsErr(e?.message || "Failed to load certifications.");
      } finally {
        setCertsLoading(false);
      }
    })();
  }, []);

// Fetch employment
useEffect(() => {
  (async () => {
    setEmpLoading(true);
    setEmpErr(null);
    try {
      const data = await listEmployment();
      // Sort: current roles first, then by endDate desc (or startDate if no end)
      data.sort((a, b) => {
        if (a.currentPosition !== b.currentPosition) {
          return a.currentPosition ? -1 : 1; // current first
        }
        const ta = a.endDate ? Date.parse(a.endDate) : Date.parse(a.startDate || "") || 0;
        const tb = b.endDate ? Date.parse(b.endDate) : Date.parse(b.startDate || "") || 0;
        return tb - ta; // newest first
      });
      setEmployment(data);
    } catch (e: any) {
      setEmpErr(e?.message || "Failed to load employment.");
    } finally {
      setEmpLoading(false);
    }
  })();
}, []);

  const latest = useMemo(() => pickLatest(profiles || []), [profiles]);

  // Group skills by category
  const groupedSkills: Record<string, Skill[]> = useMemo(() => {
    return SKILL_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = skills.filter((s) => s.category === cat);
      return acc;
    }, {} as Record<string, Skill[]>);
  }, [skills]);

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
          <div className="h-20 w-full bg-gradient-to-r from-slate-50 to-slate-100"></div>
          <div className="-mt-10 flex items-center gap-5 px-6">
            {latest.photoUrl ? (
              <img
                src={
                  latest.photoUrl?.startsWith("http")
                    ? latest.photoUrl
                    : `${API_BASE || ""}${latest.photoUrl || ""}`
                }
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
          <div className="mt-6 border-t border-gray-100 px-6 pt-4 text-xs text-gray-500">
            <div>Updated: {latest.updatedAt ? new Date(latest.updatedAt).toLocaleString() : "—"}</div>
            <div>Created: {latest.createdAt ? new Date(latest.createdAt).toLocaleString() : "—"}</div>
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Education</h2>
          <Button
            variant="primary"
            aria-label="Add education"
            title="Add education"
            onClick={() => navigate(EDUCATION_ADD_ROUTE)}
          >
            +
          </Button>
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
            <div className="absolute left-0 top-0 h-full w-px bg-gray-200" aria-hidden />
            <div className="space-y-4">
              {educationList.map((edu) => (
                <div key={edu._id} className="relative">
                  <span className="absolute -left-[9px] top-3 inline-block h-4 w-4 rounded-full border-2 border-white bg-gray-300 ring-2 ring-gray-300" />
                  <Card>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold text-gray-900 break-words">
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
      </div>

      {/* Skills (read-only) */}
      <div className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Skills</h2>
          <Button
            variant="primary"
            aria-label="Manage skills"
            title="Manage skills"
            onClick={() => navigate(SKILLS_ROUTE)}
          >
            +
          </Button>
        </div>
        {skillsLoading && <p className="text-gray-600">Loading skills…</p>}
        {skillsErr && <p className="text-sm text-red-600">{skillsErr}</p>}
        {!skillsLoading && !skillsErr && skills.length === 0 && (
          <Card>
            <p className="text-gray-700">No skills added yet.</p>
          </Card>
        )}
        {!skillsLoading && !skillsErr && skills.length > 0 && (
          <div className="space-y-6">
            {SKILL_CATEGORIES.map((cat) => {
              const items = groupedSkills[cat] || [];
              if (items.length === 0) return null;
              const VISIBLE = 8;
              const shown = items.slice(0, VISIBLE);
              const remaining = items.length - shown.length;
              return (
                <Card key={cat}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{cat}</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700 ring-1 ring-gray-200">
                        {items.length}
                      </span>
                    </div>
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate(SKILLS_ROUTE)}
                        className="text-sm text-blue-700 hover:underline underline-offset-2"
                      >
                        +{remaining} more
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shown.map((s) => (
                      <SkillChip key={s._id || `${cat}-${s.name}`} name={s.name} proficiency={s.proficiency} />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Certifications (read-only) */}
<div className="mt-8">
  <div className="mb-3 flex items-center justify-between">
    <h2 className="text-xl font-bold text-gray-900">Certifications</h2>
    <Button
      variant="primary"
      aria-label="Manage certifications"
      title="Manage certifications"
      onClick={() => navigate(CERTIFICATIONS_ROUTE)}
    >
      +
    </Button>
  </div>

  {certsLoading && <p className="text-gray-600">Loading certifications…</p>}
  {certsErr && <p className="text-sm text-red-600">{certsErr}</p>}

  {!certsLoading && !certsErr && certs.length === 0 && (
    <Card className="p-4 sm:p-5">
      <p className="text-gray-700">No certifications added yet.</p>
    </Card>
  )}

  {!certsLoading && !certsErr && certs.length > 0 && (
    <div className="space-y-3">
      {certs.map((cert) => {
        const isExpired =
          cert.expirationDate ? new Date(cert.expirationDate) <= new Date() : false;
        return (
          <Card key={cert._id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-gray-900 break-words">
                  {cert.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Earned: {formatMonthYear(cert.dateEarned)}
                </p>
              </div>

              <p className="text-gray-700">
                <span className="font-medium">Organization:</span> {cert.organization}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                {cert.doesNotExpire ? (
                  <span>Does not expire</span>
                ) : (
                  <span>
                    Expires: {formatMonthYear(cert.expirationDate)}
                    {isExpired && (
                      <span className="ml-2 text-red-600 font-medium">⚠️ Expired</span>
                    )}
                  </span>
                )}
                {cert.certificationId && <span>ID: {cert.certificationId}</span>}
                {cert.category && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 ring-1 ring-gray-200">
                    {cert.category}
                  </span>
                )}
                {cert.verified !== undefined && (
                  <span
                    className={
                      cert.verified
                        ? "text-emerald-700 font-medium"
                        : "text-gray-500 font-medium"
                    }
                  >
                    {cert.verified ? "Verified" : "Not Verified"}
                  </span>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  )}
</div>
{/* Employment (read-only) */}
<div className="mt-10">
  <div className="mb-5 flex items-center justify-between">
    <h2 className="text-xl font-bold text-gray-900">Employment</h2>
    <Button
      variant="primary"
      aria-label="Manage employment"
      title="Manage employment"
      onClick={() => navigate("/EmploymentPage")}
    >
      +
    </Button>
  </div>

  {empLoading && <p className="text-gray-600">Loading employment…</p>}
  {empErr && <p className="text-sm text-red-600">{empErr}</p>}

  {!empLoading && !empErr && employment.length === 0 && (
    <Card className="p-4 sm:p-5">
      <p className="text-gray-700">No employment entries yet.</p>
    </Card>
  )}

  {!empLoading && !empErr && employment.length > 0 && (
    <div className="space-y-3">
      {employment.map((e) => (
        <Card key={e._id} className="p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900 break-words">
                {e.jobTitle || "—"}
              </h3>
              <p className="text-sm text-gray-600">{roleDates(e)}</p>
            </div>

            <p className="text-gray-700">
              <span className="font-medium">{e.company || "—"}</span>
              {e.location ? <span className="text-gray-600">{` — ${e.location}`}</span> : null}
            </p>

            {e.description && (
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                {e.description}
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  )}
</div>

    </div>
  );
};

export default ProfileDashboard;
