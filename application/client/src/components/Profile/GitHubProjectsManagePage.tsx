// components/Profile/GitHubProjectsManagePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import { getSkills } from "../../api/skills";
import type { Skill } from "../Skills/Skills";

const GITHUB_ENDPOINT_BASE = `${API_BASE}/api/github`;

interface ManageRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  isFeatured?: boolean;
  linkedSkillIds?: string[];
}

interface GitHubStatusResponse {
  connected: boolean;
  githubLogin?: string;
}

const GitHubProjectsManagePage: React.FC = () => {
  const navigate = useNavigate();

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      "",
    []
  );

  const [status, setStatus] = useState<GitHubStatusResponse | null>(null);
  const [repos, setRepos] = useState<ManageRepo[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [editingRepoId, setEditingRepoId] = useState<number | null>(null);
  const [savingSkillsRepoId, setSavingSkillsRepoId] = useState<number | null>(
    null
  );

  // Load status, repos, skills
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      setGithubError(null);
      try {
        // status
        const statusRes = await fetch(`${GITHUB_ENDPOINT_BASE}/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!statusRes.ok) {
          throw new Error("Failed to load GitHub status.");
        }

        const statusBody: GitHubStatusResponse = await statusRes.json();
        setStatus(statusBody);

        if (!statusBody.connected) {
          setRepos([]);
          return;
        }

        // repos for manage
        const reposRes = await fetch(`${GITHUB_ENDPOINT_BASE}/repos/manage`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!reposRes.ok) {
          const body = await reposRes.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load GitHub repos.");
        }

        const reposBody: ManageRepo[] = await reposRes.json();
        setRepos(reposBody);

        // skills
        const skillData = await getSkills();
        setSkills(skillData);
      } catch (err: any) {
        console.error(err);
        setGithubError(
          err?.message || "Something went wrong loading GitHub data."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token]);

  const handleToggleFeatured = (repoId: number) => {
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repoId ? { ...r, isFeatured: !r.isFeatured } : r
      )
    );
  };

  const handleSaveFeatured = async () => {
    if (!token) return;
    try {
      setSavingFeatured(true);
      setGithubError(null);

      const featuredRepoIds = repos
        .filter((r) => r.isFeatured)
        .map((r) => r.id);

      const res = await fetch(`${GITHUB_ENDPOINT_BASE}/repos/featured`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ featuredRepoIds }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save featured projects.");
      }

      const updatedFeatured: ManageRepo[] = await res.json();
      const featuredSet = new Set(updatedFeatured.map((r) => r.id));

      setRepos((prev) =>
        prev.map((r) => ({
          ...r,
          isFeatured: featuredSet.has(r.id),
        }))
      );
    } catch (err: any) {
      console.error(err);
      setGithubError(
        err?.message || "Something went wrong saving featured projects."
      );
    } finally {
      setSavingFeatured(false);
    }
  };

  const handleToggleSkillForRepo = (repoId: number, skillId: string) => {
    setRepos((prev) =>
      prev.map((r) => {
        if (r.id !== repoId) return r;
        const current = new Set((r.linkedSkillIds || []).map(String));
        if (current.has(skillId)) {
          current.delete(skillId);
        } else {
          current.add(skillId);
        }
        return { ...r, linkedSkillIds: Array.from(current) };
      })
    );
  };

  const handleSaveRepoSkills = async (repoId: number) => {
    if (!token) return;
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;

    try {
      setSavingSkillsRepoId(repoId);
      setGithubError(null);

      const res = await fetch(
        `${GITHUB_ENDPOINT_BASE}/repos/${repoId}/skills`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({ skillIds: repo.linkedSkillIds || [] }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save repo skills.");
      }
    } catch (err: any) {
      console.error(err);
      setGithubError(
        err?.message || "Something went wrong saving repo skills."
      );
    } finally {
      setSavingSkillsRepoId(null);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Card>
          <p className="text-sm text-stone-700">
            Please log in to manage your GitHub projects.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Card>
          <p className="text-sm text-stone-700">Loading GitHub projects…</p>
        </Card>
      </div>
    );
  }

  if (status && !status.connected) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Card>
          <h2 className="text-lg font-semibold text-[#0E3B43] mb-2">
            GitHub not connected
          </h2>
          <p className="text-sm text-stone-700 mb-4">
            Connect your GitHub account from your Profile Dashboard to manage
            and feature your projects.
          </p>
          <Button onClick={() => navigate("/ProfileDashboard")}>
            Go to Profile Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-[#0E3B43]">
            Manage GitHub Projects
          </h1>
          {status?.githubLogin && (
            <p className="mt-1 text-sm text-stone-600">
              Connected as{" "}
              <span className="font-semibold">@{status.githubLogin}</span>
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => navigate("/ProfileDashboard")}>
          Back to Profile
        </Button>
      </div>

      {githubError && (
        <Card>
          <p className="text-sm text-red-700">{githubError}</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0E3B43]">
              Featured projects
            </h2>
            <p className="text-xs text-stone-600">
              Choose which repositories appear on your Profile Dashboard (up to
              6).
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSaveFeatured}
            disabled={savingFeatured}
          >
            {savingFeatured ? "Saving…" : "Save featured"}
          </Button>
        </div>

        {repos.length === 0 && (
          <p className="text-sm text-stone-700">
            No repositories found. Try refreshing from GitHub on your Profile
            Dashboard.
          </p>
        )}

        <div className="space-y-3">
          {repos.map((repo) => {
            const repoSkills = skills.filter((s) =>
              (repo.linkedSkillIds || []).map(String).includes(String(s._id))
            );

            return (
              <div
                key={repo.id}
                className="border border-stone-200 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#0E3B43] hover:text-[#357266]"
                      >
                        {repo.name}
                      </a>
                      {repo.isFeatured && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 ring-1 ring-emerald-200">
                          Featured
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-stone-600 mt-1">
                        {repo.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                      {repo.language && <span>{repo.language}</span>}
                      <span>⭐ {repo.stargazers_count}</span>
                      <span>🍴 {repo.forks_count}</span>
                      <span>
                        Updated{" "}
                        {new Date(repo.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {repoSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {repoSkills.map((s) => (
                          <span
                            key={s._id}
                            className="inline-flex items-center rounded-full bg-stone-50 px-2 py-0.5 ring-1 ring-stone-200 text-stone-700"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-stone-700">
                      <input
                        type="checkbox"
                        checked={!!repo.isFeatured}
                        onChange={() => handleToggleFeatured(repo.id)}
                      />
                      <span>Featured</span>
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setEditingRepoId(
                          editingRepoId === repo.id ? null : repo.id
                        )
                      }
                    >
                      {editingRepoId === repo.id ? "Hide skills" : "Link skills"}
                    </Button>
                  </div>
                </div>

                {editingRepoId === repo.id && (
                  <div className="mt-3 border-t border-stone-200 pt-3">
                    <p className="text-xs text-stone-600 mb-2">
                      Select skills that this project demonstrates.
                    </p>
                    <div className="max-h-40 overflow-auto border border-stone-100 rounded-md p-2">
                      {skills.length === 0 && (
                        <p className="text-xs text-stone-500">
                          No skills found. Add skills from your Profile
                          Dashboard.
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {skills.map((skill) => (
                          <label
                            key={skill._id}
                            className="flex items-center gap-2 text-xs text-stone-700"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(
                                (repo.linkedSkillIds || [])
                                  .map(String)
                                  .includes(String(skill._id))
                              )}
                              onChange={() =>
                                handleToggleSkillForRepo(
                                  repo.id,
                                  String(skill._id)
                                )
                              }
                            />
                            <span>{skill.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleSaveRepoSkills(repo.id)}
                        disabled={savingSkillsRepoId === repo.id}
                      >
                        {savingSkillsRepoId === repo.id
                          ? "Saving…"
                          : "Save skills"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default GitHubProjectsManagePage;
