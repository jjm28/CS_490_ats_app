// components/Profile/GitHubProjectsSection.tsx
import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import API_BASE from "../../utils/apiBase";
import "./ProfileDashboard.css"
const GITHUB_ENDPOINT_BASE = `${API_BASE}/api/github`;

interface GitHubStatusResponse {
  connected: boolean;
  githubLogin?: string;
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
        throw new Error(body.message || "Failed to sync GitHub data.");
      }

      const body: GitHubRepo[] = await res.json();
      setRepos(body);
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
      void handleSyncGithub();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      </div>

      <div className="github-actions">
        <Button
          variant="secondary"
          onClick={handleSyncGithub}
          disabled={githubSyncing}
        >
          {githubSyncing ? "Refreshing..." : "Refresh from GitHub"}
        </Button>
        <Button variant="ghost" disabled>
          Manage
        </Button>
      </div>
    </div>
  );

  const renderRepoList = () => {
    if (!repos.length) {
      return (
        <p className="github-empty-state">
          No repositories found yet. Try refreshing from GitHub.
        </p>
      );
    }

    return (
      <div className="github-repo-list">
        {repos.map((repo) => (
          <a
            key={repo.id}
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="github-repo-card"
          >
            <div className="github-repo-header">
              <h4 className="github-repo-name">{repo.name}</h4>
              <span className="github-repo-badge">Public</span>
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
          </a>
        ))}
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
