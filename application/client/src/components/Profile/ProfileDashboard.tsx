import React, { useEffect, useMemo, useState } from "react";
import "../../App.css";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import type { Education } from "../Education/Education";
import { getEducation } from "../../api/education";
import type { Skill } from "../Skills/Skills";
import type { Certification } from "../Certifications/Certifications";
import type { Employment } from "../../api/employment";
import { getSkills } from "../../api/skills";
import { categories as SKILL_CATEGORIES } from "../../constants/skills";
import { getCertifications } from "../../api/certifications";
import { listEmployment } from "../../api/employment";
import { getProjects } from "../../api/projects";
import type { Project } from "../Projects/Projects";
import type { Job } from "../../types/jobs.types";
import DeadlinesDashboardWidget from "../Jobs/DeadlineDashboardWidget.tsx";
import API_BASE from "../../utils/apiBase";
import GitHubProjectsSection from "./GitHubProjectsSection";

// ---- Routes ----
const EDUCATION_ADD_ROUTE = "/education";
const SKILLS_ROUTE = "/skills";
const CERTIFICATIONS_ROUTE = "/certifications";
const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

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
    return bu - au;
  })[0];
}

function formatMonthYear(dateString?: string) {
  if (!dateString) return "";
  const t = Date.parse(dateString);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

const PROF_COLORS: Record<NonNullable<Skill["proficiency"]>, string> = {
  Beginner: "bg-stone-100 text-stone-700 ring-stone-300",
  Intermediate: "bg-teal-50 text-teal-800 ring-teal-300",
  Advanced: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  Expert: "bg-[#0E3B43] text-white ring-[#357266]",
};

function SkillChip({
  name,
  proficiency,
}: {
  name: string;
  proficiency: Skill["proficiency"];
}) {
  const color = PROF_COLORS[proficiency || "Beginner"];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-800 bg-white shadow-sm">
      <span className="font-medium">{name}</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${color}`}>
        {proficiency}
      </span>
    </span>
  );
}

function formatYMD(date?: string) {
  if (!date) return "";
  const t = Date.parse(date);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("default", {
    month: "short",
    year: "numeric",
  });
}

function roleDates(e: Employment) {
  const start = formatYMD(e.startDate ?? undefined);
  const end = e.currentPosition ? "Present" : formatYMD(e.endDate ?? undefined);
  return start && end ? `${start} – ${end}` : start || end || "";
}

function formatMonYear(date?: string | null) {
  if (!date) return "";
  const t = Date.parse(date);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("default", {
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<Project["status"], string> = {
  Completed: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  Ongoing: "bg-teal-50 text-teal-800 ring-teal-300",
  Planned: "bg-stone-100 text-stone-700 ring-stone-300",
};

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

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projLoading, setProjLoading] = useState(true);
  const [projErr, setProjErr] = useState<string | null>(null);

  // Jobs (for deadline widget)
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );

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
          const da = a.graduationDate
            ? new Date(a.graduationDate).getTime()
            : 0;
          const db = b.graduationDate
            ? new Date(b.graduationDate).getTime()
            : 0;
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
          return (
            SKILL_CATEGORIES.indexOf(a.category) -
            SKILL_CATEGORIES.indexOf(b.category)
          );
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
          return db - da;
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
        data.sort((a, b) => {
          if (a.currentPosition !== b.currentPosition) {
            return a.currentPosition ? -1 : 1;
          }
          const ta = a.endDate
            ? Date.parse(a.endDate)
            : Date.parse(a.startDate || "") || 0;
          const tb = b.endDate
            ? Date.parse(b.endDate)
            : Date.parse(b.startDate || "") || 0;
          return tb - ta;
        });
        setEmployment(data);
      } catch (e: any) {
        setEmpErr(e?.message || "Failed to load employment.");
      } finally {
        setEmpLoading(false);
      }
    })();
  }, []);

  // Fetch projects
  useEffect(() => {
    (async () => {
      setProjLoading(true);
      setProjErr(null);
      try {
        const data = await getProjects();
        data.sort((a, b) => {
          const ta = a.startDate ? Date.parse(a.startDate) : 0;
          const tb = b.startDate ? Date.parse(b.startDate) : 0;
          return tb - ta;
        });
        setProjects(data);
      } catch (e: any) {
        setProjErr(e?.message || "Failed to load projects.");
      } finally {
        setProjLoading(false);
      }
    })();
  }, []);

  // Fetch jobs for deadline widget
  useEffect(() => {
    (async () => {
      if (!token) return;
      setJobsLoading(true);
      try {
        const response = await fetch(JOBS_ENDPOINT, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setJobs(data);
        }
      } catch (e) {
        console.error("Failed to load jobs:", e);
      } finally {
        setJobsLoading(false);
      }
    })();
  }, [token]);

  const latest = useMemo(() => pickLatest(profiles || []), [profiles]);

  const groupedSkills: Record<string, Skill[]> = useMemo(() => {
    return SKILL_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = skills.filter((s) => s.category === cat);
      return acc;
    }, {} as Record<string, Skill[]>);
  }, [skills]);

  // Calculate quick stats
  const stats = useMemo(
    () => ({
      education: educationList.length,
      skills: skills.length,
      certifications: certs.length,
      employment: employment.length,
      projects: projects.length,
      activeCerts: certs.filter((c) => {
        if (c.doesNotExpire) return true;
        if (!c.expirationDate) return false;
        return new Date(c.expirationDate) > new Date();
      }).length,
    }),
    [educationList, skills, certs, employment, projects]
  );

  return (
    <div className="min-h-screen mx-6">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0E3B43]">
            Profile Dashboard
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Your complete professional profile at a glance
          </p>
          {location?.state?.flash && (
            <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
              {location.state.flash}
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            {loading && (
              <Card>
                <p className="text-stone-600">Loading profile…</p>
              </Card>
            )}
            {err && (
              <Card>
                <p className="text-sm text-red-700">{err}</p>
              </Card>
            )}
            {!loading && !err && !latest && (
              <Card>
                <p className="text-stone-700">No profiles found yet.</p>
              </Card>
            )}
            {!loading && !err && latest && (
              <Card className="overflow-hidden">
                <div className="h-24 w-full bg-gradient-to-r from-[#0E3B43] via-[#357266] to-[#6DA598]"></div>
                <div className="-mt-12 px-6 pb-6">
                  <div className="flex flex-col sm:flex-row items-start gap-4 pb-6">
                    {latest.photoUrl ? (
                      <img
                        src={
                          latest.photoUrl?.startsWith("http")
                            ? latest.photoUrl
                            : `${API_BASE || ""}${latest.photoUrl || ""}`
                        }
                        alt={`${latest.fullName} profile`}
                        className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg shrink-0"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#357266] to-[#6DA598] ring-4 ring-white shadow-lg flex items-center justify-center text-2xl font-bold text-white shrink-0">
                        {getInitials(latest.fullName || "U N")}
                      </div>
                    )}
                    <div className="flex-1 sm:pt-14">
                      <h2 className="text-2xl font-bold text-[#0E3B43]">
                        {latest.fullName || "—"}
                      </h2>
                      <p className="text-stone-600 mt-1">
                        {latest.headline?.trim() || "No headline provided"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {latest.industry && (
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-[#357266] ring-1 ring-teal-200">
                            {latest.industry}
                          </span>
                        )}
                        {latest.experienceLevel && (
                          <span className="inline-flex items-center rounded-full bg-[#A3BBAD]/20 px-3 py-1 text-xs font-medium text-[#357266] ring-1 ring-[#A3BBAD]">
                            {latest.experienceLevel}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
                          📍 {formatLocation(latest.location)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info - Now directly below without extra spacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Email
                      </div>
                      <div className="mt-1 text-[#0E3B43] break-all">
                        {latest.email ? (
                          <a
                            className="text-[#357266] hover:text-[#6DA598] hover:underline"
                            href={`mailto:${latest.email}`}
                          >
                            {latest.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Phone
                      </div>
                      <div className="mt-1 text-[#0E3B43]">
                        {latest.phone ? (
                          <a
                            className="text-[#357266] hover:text-[#6DA598] hover:underline"
                            href={`tel:${latest.phone}`}
                          >
                            {latest.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    {latest.bio?.trim() && (
                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Bio
                        </div>
                        <div className="mt-1 text-stone-700 whitespace-pre-wrap leading-relaxed">
                          {latest.bio}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Employment Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0E3B43]">
                  💼 Employment
                </h2>
                <Button
                  size="sm"
                  onClick={() => navigate("/EmploymentPage")}
                  aria-label="Manage employment"
                >
                  Manage
                </Button>
              </div>

              {empLoading && (
                <Card>
                  <p className="text-stone-600">Loading…</p>
                </Card>
              )}
              {empErr && (
                <Card>
                  <p className="text-sm text-red-700">{empErr}</p>
                </Card>
              )}

              {!empLoading && !empErr && employment.length === 0 && (
                <Card>
                  <p className="text-stone-600 text-center py-4">
                    No employment entries yet
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => navigate("/EmploymentPage")}
                  >
                    Add Employment
                  </Button>
                </Card>
              )}

              {!empLoading && !empErr && employment.length > 0 && (
                <div className="space-y-3">
                  {employment.slice(0, 3).map((e) => (
                    <Card
                      key={e._id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#357266] to-[#6DA598] flex items-center justify-center text-white font-bold text-lg">
                          {e.company?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#0E3B43] truncate">
                            {e.jobTitle || "—"}
                          </h3>
                          <p className="text-sm text-stone-600">
                            {e.company || "—"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                            <span>{roleDates(e)}</span>
                            {e.location && <span>• {e.location}</span>}
                            {e.currentPosition && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 ring-1 ring-emerald-200">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {employment.length > 3 && (
                    <button
                      onClick={() => navigate("/EmploymentPage")}
                      className="w-full text-center py-2 text-sm text-[#357266] hover:text-[#6DA598] font-medium"
                    >
                      View all {employment.length} positions →
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Education Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0E3B43]">
                  🎓 Education
                </h2>
                <Button
                  size="sm"
                  onClick={() => navigate(EDUCATION_ADD_ROUTE)}
                  aria-label="Add education"
                >
                  Add
                </Button>
              </div>

              {eduLoading && (
                <Card>
                  <p className="text-stone-600">Loading…</p>
                </Card>
              )}
              {eduErr && (
                <Card>
                  <p className="text-sm text-red-700">{eduErr}</p>
                </Card>
              )}

              {!eduLoading && !eduErr && educationList.length === 0 && (
                <Card>
                  <p className="text-stone-600 text-center py-4">
                    No education entries yet
                  </p>
                </Card>
              )}

              {!eduLoading && !eduErr && educationList.length > 0 && (
                <div className="space-y-3">
                  {educationList.map((edu) => (
                    <Card
                      key={edu._id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#98AB72] to-[#A3BBAD] flex items-center justify-center text-white font-bold text-lg">
                          🎓
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[#0E3B43]">
                            {edu.degree}
                          </h3>
                          <p className="text-sm text-stone-600">
                            {edu.institution}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                            <span>{edu.fieldOfStudy}</span>
                            {edu.graduationDate && (
                              <span>
                                • {formatMonthYear(edu.graduationDate)}
                              </span>
                            )}
                            {edu.currentlyEnrolled && (
                              <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[#357266] ring-1 ring-teal-200">
                                Enrolled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Projects Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0E3B43]">
                  🚀 Projects
                </h2>
                <Button
                  size="sm"
                  onClick={() => navigate("/projects")}
                  aria-label="Manage projects"
                >
                  Manage
                </Button>
              </div>

              {projLoading && (
                <Card>
                  <p className="text-stone-600">Loading…</p>
                </Card>
              )}
              {projErr && (
                <Card>
                  <p className="text-sm text-red-700">{projErr}</p>
                </Card>
              )}

              {!projLoading && !projErr && projects.length === 0 && (
                <Card>
                  <p className="text-stone-600 text-center py-4">
                    No projects yet
                  </p>
                </Card>
              )}

              {!projLoading && !projErr && projects.length > 0 && (
                <div className="space-y-3">
                  {projects.slice(0, 2).map((p) => {
                    const statusStyle = STATUS_STYLES[p.status];
                    return (
                      <Card
                        key={p._id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-[#0E3B43]">
                                {p.name}
                              </h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ring-1 ${statusStyle}`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <p className="text-sm text-stone-600">{p.role}</p>
                            {p.description && (
                              <p className="mt-2 text-sm text-stone-700 line-clamp-2">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {projects.length > 2 && (
                    <button
                      onClick={() => navigate("/projects")}
                      className="w-full text-center py-2 text-sm text-[#357266] hover:text-[#6DA598] font-medium"
                    >
                      View all {projects.length} projects →
                    </button>
                  )}
                </div>
              )}

                      <GitHubProjectsSection token={token} />

            </section>
          </div>

          {/* Right Column - Sidebar (1/3 width) */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <h3 className="text-lg font-semibold text-[#0E3B43] mb-4">
                📊 Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#357266]">
                    {stats.employment}
                  </div>
                  <div className="text-xs text-stone-600">Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#98AB72]">
                    {stats.education}
                  </div>
                  <div className="text-xs text-stone-600">Degrees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#6DA598]">
                    {stats.skills}
                  </div>
                  <div className="text-xs text-stone-600">Skills</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#BE6400]">
                    {stats.activeCerts}
                  </div>
                  <div className="text-xs text-stone-600">Certs</div>
                </div>
              </div>
            </Card>

            {/* Deadline Widget */}
            {!jobsLoading && jobs.length > 0 && (
              <DeadlinesDashboardWidget jobs={jobs} maxDisplay={5} />
            )}

            {/* Skills Preview */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0E3B43]">
                  🛠️ Skills
                </h3>
                <Button
                  size="sm"
                  onClick={() => navigate(SKILLS_ROUTE)}
                  aria-label="Manage skills"
                >
                  Manage
                </Button>
              </div>

              {skillsLoading && (
                <Card>
                  <p className="text-stone-600">Loading…</p>
                </Card>
              )}
              {skillsErr && (
                <Card>
                  <p className="text-sm text-red-700">{skillsErr}</p>
                </Card>
              )}

              {!skillsLoading && !skillsErr && skills.length === 0 && (
                <Card>
                  <p className="text-stone-600 text-center py-4">
                    No skills yet
                  </p>
                </Card>
              )}

              {!skillsLoading && !skillsErr && skills.length > 0 && (
                <Card>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 6).map((s) => (
                      <SkillChip
                        key={s._id}
                        name={s.name}
                        proficiency={s.proficiency}
                      />
                    ))}
                  </div>
                  {skills.length > 6 && (
                    <button
                      onClick={() => navigate(SKILLS_ROUTE)}
                      className="mt-3 w-full text-center text-sm text-[#357266] hover:text-[#6DA598] font-medium"
                    >
                      +{skills.length - 6} more skills →
                    </button>
                  )}
                </Card>
              )}
            </section>

            {/* Certifications Preview */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0E3B43]">
                  🏆 Certifications
                </h3>
                <Button
                  size="sm"
                  onClick={() => navigate(CERTIFICATIONS_ROUTE)}
                  aria-label="Manage certifications"
                >
                  Manage
                </Button>
              </div>

              {certsLoading && (
                <Card>
                  <p className="text-stone-600">Loading…</p>
                </Card>
              )}
              {certsErr && (
                <Card>
                  <p className="text-sm text-red-700">{certsErr}</p>
                </Card>
              )}

              {!certsLoading && !certsErr && certs.length === 0 && (
                <Card>
                  <p className="text-stone-600 text-center py-4">
                    No certifications yet
                  </p>
                </Card>
              )}

              {!certsLoading && !certsErr && certs.length > 0 && (
                <Card>
                  <div className="space-y-3">
                    {certs.slice(0, 3).map((cert) => {
                      const isExpired = cert.expirationDate
                        ? new Date(cert.expirationDate) <= new Date()
                        : false;
                      return (
                        <div key={cert._id} className="flex items-start gap-2">
                          <div className="text-lg">
                            {cert.verified ? "✅" : "📜"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-[#0E3B43] truncate">
                              {cert.name}
                            </h4>
                            <p className="text-xs text-stone-600">
                              {cert.organization}
                            </p>
                            {isExpired && (
                              <span className="text-xs text-red-700 font-medium">
                                ⚠️ Expired
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {certs.length > 3 && (
                    <button
                      onClick={() => navigate(CERTIFICATIONS_ROUTE)}
                      className="mt-3 w-full text-center text-sm text-[#357266] hover:text-[#6DA598] font-medium"
                    >
                      View all {certs.length} →
                    </button>
                  )}
                </Card>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;