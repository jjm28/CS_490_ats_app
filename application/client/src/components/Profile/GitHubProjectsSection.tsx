// components/Profile/GitHubProjectsSection.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import "./ProfileDashboard.css"
import { getSkills } from "../../api/skills";              // NEW
import type { Skill } from "../Skills/Skills"; 
import GitHubProjectsManagePage from "./GitHubProjectsManagePage";
import { GitHubCalendar } from "react-github-calendar";

const GITHUB_ENDPOINT_BASE = `${API_BASE}/api/github`;

interface GitHubActivity {
  hasData: boolean;
  totalCommitsLast90Days: number;
  featuredRepoCount: number;
  activeWeeksLast12: number;
  weeklyBuckets: { weekStart: string; commitCount: number }[];
  lastActivitySyncedAt?: string | null;
}

interface GitHubStatusResponse {
  connected: boolean;
  githubLogin?: string;
  lastReposSyncedAt?: string | null;
}
function formatLastSynced(dateString?: string | null): string {
  if (!dateString) return "Not yet synced";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Not yet synced";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


interface GitHubRepo {
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

interface GitHubProjectsSectionProps {
  token: string | null;
}

const GitHubProjectsSection: React.FC<GitHubProjectsSectionProps> = ({
  token,
}) => {
  const [githubStatus, setGithubStatus] = useState<GitHubStatusResponse | null>(
    null
  );
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  const [githubSyncing, setGithubSyncing] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
const navigate = useNavigate();

const [skills, setSkills] = useState<Skill[]>([]);
const [skillsLoading, setSkillsLoading] = useState(false);
const [activity, setActivity] = useState<GitHubActivity | null>(null);
const [activityLoading, setActivityLoading] = useState(false);
const [activityError, setActivityError] = useState<string | null>(null);


  // ───────────────────────────────────────────────
  // Fetch GitHub status
  // ───────────────────────────────────────────────
  useEffect(() => {
    const fetchGitHubStatus = async () => {
      if (!token) return;
      setGithubLoading(true);
      setGithubError(null);
      try {
        const res = await fetch(`${GITHUB_ENDPOINT_BASE}/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load GitHub status.");
        }

        const data: GitHubStatusResponse = await res.json();
        setGithubStatus(data);
      } catch (err: any) {
        console.error(err);
        setGithubError(
          err?.message || "Unable to check GitHub connection right now."
        );
      } finally {
        setGithubLoading(false);
      }
    };

    fetchGitHubStatus();
  }, [token]);

  // ───────────────────────────────────────────────
  // Start OAuth login → get redirect URL → window.location.href
  // ───────────────────────────────────────────────

  const loadActivity = async () => {
  if (!token) return;
  try {
    setActivityLoading(true);
    setActivityError(null);

    const res = await fetch(`${GITHUB_ENDPOINT_BASE}/activity`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to load GitHub activity.");
    }

    const body = await res.json();
    console.log("GITHUB ACTIVITY RESPONSE", body); 
    setActivity(body);
  } catch (err: any) {
    console.error(err);
    setActivityError(
      err?.message || "Something went wrong loading GitHub activity."
    );
  } finally {
    setActivityLoading(false);
  }
};

  const loadFeaturedRepos = async () => {
  if (!token) return;
  try {
    setGithubError(null);

    const res = await fetch(`${GITHUB_ENDPOINT_BASE}/repos/featured`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to load GitHub repos.");
    }

    const body: GitHubRepo[] = await res.json();
    setRepos(body);
  } catch (err: any) {
    console.log(err?.message || "Something went wrong loading GitHub.");
    setGithubError(
      err?.message || "Something went wrong loading GitHub data."
    );
  }
};

  const loadReposFromSnapshot = async () => {
  if (!token) return;
  try {
    setGithubError(null);

    const res = await fetch(`${GITHUB_ENDPOINT_BASE}/repos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to load GitHub repos.");
    }

    const body: GitHubRepo[] = await res.json();
    setRepos(body);
  } catch (err: any) {
    console.log(err?.message || "Something went wrong loading GitHub repos.");
    setGithubError(
      err?.message || "Something went wrong loading GitHub data."
    );
  }
};

const getRepoSkills = (repo: GitHubRepo): Skill[] => {
  if (!repo.linkedSkillIds || !repo.linkedSkillIds.length) return [];
  const idSet = new Set(repo.linkedSkillIds.map(String));
  return skills.filter((s) => idSet.has(String(s._id)));
};


  const handleConnectGitHub = async () => {
    if (!token) return;

    try {
      setGithubError(null);
      const res = await fetch(`${GITHUB_ENDPOINT_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(body.message || "Failed to start GitHub login.");
        setGithubError(body.message || "Failed to start GitHub login.");
        return;
      }

      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setGithubError("Missing redirect URL from server.");
      }
    } catch (err: any) {
      console.error(err);
      setGithubError(
        err?.message || "Something went wrong starting GitHub login."
      );
    }
  };

  // ───────────────────────────────────────────────
  // Sync / load repos for the authenticated user
  // ───────────────────────────────────────────────
const handleSyncGithub = async () => {
  if (!token) return;
  try {
    setGithubSyncing(true);
    setGithubError(null);

    const res = await fetch(`${GITHUB_ENDPOINT_BASE}/repos/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to sync GitHub data.");
    }

    // after sync, reload featured snapshot and activity
    await loadFeaturedRepos();
    await loadActivity();
  } catch (err: any) {
    console.log(err?.message || "Something went wrong syncing GitHub.");
    setGithubError(
      err?.message || "Something went wrong syncing GitHub data."
    );
  } finally {
    setGithubSyncing(false);
  }
};



  // Auto-load repos once we know we’re connected
useEffect(() => {
  if (githubStatus?.connected && repos.length === 0 && !githubSyncing) {
    void loadFeaturedRepos();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [githubStatus?.connected]);
useEffect(() => {
  if (githubStatus?.connected) {
    void loadActivity();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [githubStatus?.connected]);


useEffect(() => {
  const loadSkills = async () => {
    try {
      setSkillsLoading(true);
      const data = await getSkills();
      setSkills(data);
    } catch (err) {
      console.error("Failed to load skills for GitHub section:", err);
    } finally {
      setSkillsLoading(false);
    }
  };

  if (githubStatus?.connected) {
    void loadSkills();
  }
}, [githubStatus?.connected]);

  // ───────────────────────────────────────────────
  // Render helpers
  // ───────────────────────────────────────────────
  const renderDisconnectedState = () => (
    <div className="github-card-body">
      <p className="github-card-description">
        Connect your GitHub account to automatically import your public
        repositories and showcase them to employers.
      </p>

      <div className="github-preview-card github-preview-card--blurred">
        <div className="github-preview-card-inner">
          <div className="github-preview-header">
            <div className="github-preview-title-skeleton" />
            <div className="github-preview-meta-skeleton" />
          </div>
          <div className="github-preview-body-skeleton" />
        </div>
      </div>

      <Button
        onClick={handleConnectGitHub}
        disabled={githubLoading || !token}
      >
        {githubLoading ? "Checking GitHub..." : "Connect GitHub"}
      </Button>
    </div>
  );

const renderConnectedHeader = () => (
  <div className="github-card-header-row">
    <div>
      <div className="github-status-pill github-status-pill--connected">
        Connected
      </div>
      {githubStatus?.githubLogin && (
        <p className="github-connected-text">
          Connected as{" "}
          <span className="github-username">
            @{githubStatus.githubLogin}
          </span>
        </p>
      )}
      <p className="github-connected-text github-connected-subtext">
        Auto-updated daily · Last synced{" "}
        {formatLastSynced(githubStatus?.lastReposSyncedAt)}
      </p>
    </div>

    <div className="github-actions">
      <Button
        variant="secondary"
        onClick={handleSyncGithub}
        disabled={githubSyncing}
      >
        {githubSyncing ? "Refreshing..." : "Refresh from GitHub"}
      </Button>
      <Button
        variant="ghost"
        onClick={() => navigate("/github-projects")}
      >
        Manage
      </Button>
    </div>
  </div>
);

const renderActivitySection = () => {
  if (!githubStatus?.connected) return null;

  return (
    <div className="github-activity-section">
      <h4 className="github-activity-title">GitHub Activity</h4>

      {activityLoading && (
        <div className="github-activity-skeleton">
          <div className="github-activity-line-skeleton" />
          <div className="github-activity-bars-skeleton" />
        </div>
      )}

      {!activityLoading && activityError && (
        <p className="github-error-text">{activityError}</p>
      )}

      {!activityLoading && !activityError && activity && !activity.hasData && (
        <p className="github-empty-state">
          GitHub activity summary will appear here after you refresh from
          GitHub.
        </p>
      )}

      {!activityLoading && !activityError && activity && activity.hasData && (
        <>
          {/* Your 90-day featured-repos summary */}
          <p className="github-activity-summary">
            {activity.totalCommitsLast90Days} commits across{" "}
            {activity.featuredRepoCount} featured{" "}
            {activity.featuredRepoCount === 1 ? "project" : "projects"} · Active{" "}
            {activity.activeWeeksLast12} of last 12 weeks
          </p>
        </>
      )}

      {/* Full-year public contributions heatmap */}
      {githubStatus?.githubLogin && (
        <div className="github-calendar-wrapper">
          <GitHubCalendar
            username={githubStatus.githubLogin}
            colorScheme="light"
            blockSize={10}
            blockMargin={3}
            fontSize={10}
          />
        </div>
      )}

      {/* Footer line (12 weeks ago / Now / last updated) – optional to keep */}
      {activity?.hasData && activity.lastActivitySyncedAt && (
        <div className="github-activity-footer">
          <span className="github-activity-caption">12 weeks ago</span>
          <span className="github-activity-caption">Now</span>
          <span className="github-activity-updated">
            Last updated{" "}
            {new Date(
              activity.lastActivitySyncedAt
            ).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
};


const renderRepoList = () => {
  if (!repos.length) {
    return (
      <p className="github-empty-state">
        No featured repositories yet. Click “Manage” to choose projects to highlight.
      </p>
    );
  }

  return (
    <div className="github-repo-list">
      {repos.map((repo) => {
        const repoSkills = getRepoSkills(repo);

        return (
          <a
            key={repo.id}
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="github-repo-card"
          >
            <div className="github-repo-header">
              <h4 className="github-repo-name">{repo.name}</h4>
              <span className="github-repo-badge">
                {repo.isFeatured ? "Featured" : "Public"}
              </span>
            </div>
            {repo.description && (
              <p className="github-repo-description">{repo.description}</p>
            )}
            <div className="github-repo-meta">
              {repo.language && (
                <span className="github-repo-language">{repo.language}</span>
              )}
              <span className="github-repo-stat">
                ⭐ {repo.stargazers_count}
              </span>
              <span className="github-repo-stat">
                🍴 {repo.forks_count}
              </span>
              <span className="github-repo-updated">
                Updated {new Date(repo.updated_at).toLocaleDateString()}
              </span>
            </div>
            {repoSkills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-stone-700">
                {repoSkills.map((s) => (
                  <span
                    key={s._id}
                    className="inline-flex items-center rounded-full bg-stone-50 px-2 py-0.5 ring-1 ring-stone-200"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
};


  return (
    <Card>
      <div className="github-card">
        <div className="github-card-header">
          <div>
            <h3 className="github-card-title">GitHub Projects</h3>
            <p className="github-card-subtitle">
              Automatically pull in your public repositories to show off your
              work.
            </p>
          </div>
        </div>

        {githubError && (
          <p className="github-error-text">
            {githubError}
          </p>
        )}

        {githubStatus?.connected
          ? (
            <>
              {renderConnectedHeader()}
              {renderRepoList()}
              {renderActivitySection()}
            </>
            )
          : (
            renderDisconnectedState()
            )}
      </div>
    </Card>
  );
};

export default GitHubProjectsSection;
