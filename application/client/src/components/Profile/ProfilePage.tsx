import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Edit, Trash2, Plus, MapPin, Briefcase, Mail } from "lucide-react";
import "../../App.css";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import API_BASE from "../../utils/apiBase";
import ProfileStrength from "./ProfileStrength";
import Education from "../Education/Education";
import Skills from "../Skills/Skills";
import Projects from "../Projects/Projects";

function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  useEffect(() => {
    const f = (location.state as any)?.flash;
    if (f) setFlash(f);
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const data = await listProfiles();
        if (!cancelled) setProfiles(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load profile.");
        if (e?.message?.includes("Account deleted") || e?.message?.includes("Unauthorized")) {
          localStorage.removeItem("token");
          navigate("/login", { state: { flash: "Your account has been deleted or your session expired." } });
        }
        if (!cancelled) setErr(e?.message || "Failed to load profiles.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (isLoggedIn) run();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Profile completeness
  const [completeness, setCompleteness] = useState<any | null>(null);
  const [completenessLoading, setCompletenessLoading] = useState(false);

  const refreshCompleteness = async () => {
    if (!profiles.length) return;
    const userId = profiles[0]?.userId;
    if (!userId) return;

    setCompletenessLoading(true);

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/api/profile/completeness/${userId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch completeness (${res.status})`);
      const data = await res.json();
      setCompleteness({ ...data, score: Number(data.score ?? 0) });
    } catch (err) {
      console.error("Error fetching completeness:", err);
      setCompleteness({
        score: 0,
        badge: "Unknown",
        suggestions: [],
        comparison: 0,
        industryAverage: 0,
      });
    } finally {
      setCompletenessLoading(false);
    }
  };

  useEffect(() => {
    if (profiles.length > 0) refreshCompleteness();
  }, [profiles, location.key]);

  const handleProfileUpdated = async () => {
    await refreshCompleteness();
  };

  const createOrEditProfile = () => navigate("/ProfileForm");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "⚠️ This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you sure you want to continue?"
    );
    if (!confirmed) return;

    const password = prompt("Enter your password to confirm deletion:");
    if (!password) return;

    try {
      const response = await fetch("http://localhost:5050/api/auth/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to delete account.");
        return;
      }

      alert("Account deleted successfully. Redirecting to login...");

      localStorage.removeItem("token");
      localStorage.removeItem("authToken");

      setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Something went wrong while deleting your account.");
    }
  };

  const createNew = () => navigate("/ProfileForm");
  const editProfile = (id: string) => navigate(`/ProfileForm/${id}`);

  const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>`
    );

  const resolvePhoto = (p: Profile) => {
    if (!p.photoUrl) return DEFAULT_AVATAR;
    if (p.photoUrl.startsWith("http")) return p.photoUrl;
    return API_BASE + p.photoUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-lg text-gray-600">
            Manage your professional information and track your profile strength
          </p>
        </div>

        {/* Flash Messages */}
        {flash && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{flash}</p>
          </div>
        )}
        {err && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{err}</p>
          </div>
        )}

        {!isLoggedIn ? (
          <div className="max-w-2xl mx-auto">
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Login Required
                </h2>
                <p className="text-gray-600 mb-6">
                  You need to be logged in to view and manage your profile
                </p>
                <Button onClick={() => navigate("/login")}>Go to Login</Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Side (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Card */}
              {profiles.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👤</div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      No Profile Yet
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Get started by creating your first professional profile
                    </p>
                    <Button onClick={createNew}>
                      <Plus size={20} className="inline mr-2" />
                      Create Your Profile
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {profiles.map((p) => (
                    <Card key={p._id}>
                      <div className="flex items-start gap-6">
                        {/* Profile Photo */}
                        <img
                          src={resolvePhoto(p)}
                          alt={p.fullName}
                          className="h-24 w-24 rounded-full object-cover border-4 border-gray-100 shadow-sm flex-shrink-0"
                        />

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                {p.fullName}
                              </h2>
                              {p.headline && (
                                <p className="text-lg text-gray-700 font-medium mb-2">
                                  {p.headline}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => editProfile(p._id!)}
                              variant="secondary"
                              className="flex items-center gap-2"
                            >
                              <Edit size={16} />
                              Edit
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {p.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail size={18} className="flex-shrink-0" />
                                <span>{p.email}</span>
                              </div>
                            )}
                            {(p.location?.city || p.location?.state) && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin size={18} className="flex-shrink-0" />
                                <span>
                                  {p.location?.city}
                                  {p.location?.city && p.location?.state && ", "}
                                  {p.location?.state}
                                </span>
                              </div>
                            )}
                            {(p.industry || p.experienceLevel) && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Briefcase size={18} className="flex-shrink-0" />
                                <span>
                                  {p.industry}
                                  {p.industry && p.experienceLevel && " • "}
                                  {p.experienceLevel}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Add Another Profile Button */}
                  <button
                    onClick={createNew}
                    className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900 font-medium"
                  >
                    <Plus size={24} className="inline mr-2" />
                    Add Another Profile
                  </button>
                </div>
              )}

              {/* Education, Skills, Projects Sections */}
              <Education onUpdate={handleProfileUpdated} />
              <Skills onUpdate={handleProfileUpdated} />
              <Projects onUpdate={handleProfileUpdated} />
            </div>

            {/* Sidebar - Right Side (1/3) */}
            <div className="lg:col-span-1">
              {/* Sticky container with proper scrolling */}
              <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto space-y-6 pr-2">
                {/* Profile Strength Card */}
                {completenessLoading ? (
                  <Card>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      Profile Strength
                    </h2>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                      <div className="bg-gray-400 h-3 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-sm text-gray-600">Loading...</p>
                  </Card>
                ) : completeness ? (
                  <ProfileStrength
                    score={completeness.score}
                    badge={completeness.badge}
                    suggestions={completeness.suggestions}
                    comparison={completeness.comparison}
                    industryAverage={completeness.industryAverage}
                  />
                ) : (
                  <ProfileStrength
                    score={0}
                    badge="No profile yet"
                    suggestions={[]}
                    comparison={0}
                    industryAverage={0}
                  />
                )}

                {/* Quick Actions */}
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate("/resumes/new")}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">Create Resume</div>
                      <div className="text-sm text-gray-600">
                        Build a new resume from your profile
                      </div>
                    </button>
                    <button
                      onClick={() => navigate("/Jobs")}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">Browse Jobs</div>
                      <div className="text-sm text-gray-600">
                        Find opportunities that match your skills
                      </div>
                    </button>
                    <button
                      onClick={() => navigate("/Applications")}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-gray-900">
                        View Applications
                      </div>
                      <div className="text-sm text-gray-600">
                        Track your job applications
                      </div>
                    </button>
                  </div>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-200">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all associated data
                  </p>
                  <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete Account
                  </button>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;