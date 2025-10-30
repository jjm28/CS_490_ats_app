import { useState, useEffect } from "react";
import "../../App.css";
import "../../styles/Projects.css";
import "../../styles/StyledComponents/FormInput.css";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import ProjectForm from "./ProjectForm";
import {
  getProjects,
  addProjectApi,
  updateProjectApi,
  deleteProjectApi,
} from "../../api/projects";

export interface Project {
  _id?: string;
  name: string;
  description: string;
  role: string;
  startDate: string;
  endDate?: string;
  technologies: string;
  url?: string;
  teamSize?: number;
  collaborationDetails?: string;
  outcomes?: string;
  industry?: string;
  status: "Completed" | "Ongoing" | "Planned";
  mediaUrl?: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      data.sort((a: Project, b: Project) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const addProject = async (newProj: Project) => {
    try {
      const created = await addProjectApi(newProj);
      setProjects([...projects, created]);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding project:", err);
    }
  };

  const editProject = async (id: string, updatedProj: Project) => {
    try {
      const updated = await updateProjectApi(id, updatedProj);
      setProjects((prev) =>
        prev.map((proj) => (proj._id === id ? updated : proj))
      );
    } catch (err) {
      console.error("Error updating project:", err);
    }
  };

  const removeProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProjectApi(id);
      setProjects((prev) => prev.filter((proj) => proj._id !== id));
      alert("Project deleted successfully!");
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("default", { month: "short", year: "numeric" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-2 px-6">
        <h1 className="mb-2">Projects</h1>
        {!showForm && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            +
          </Button>
        )}
      </div>

      {(showForm || editingProject) && (
        <ProjectForm
          onSubmit={async (data) => {
            if (editingProject) {
              await editProject(editingProject._id!, data);
              await fetchProjects();
              setEditingProject(null);
            } else {
              await addProject(data);
              await fetchProjects();
            }
            setShowForm(false);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
          initialData={editingProject ?? undefined}
        />
      )}

      {!showForm && !editingProject && (
        <div className="flex flex-col gap-4 mx-6 my-8">
          {projects.map((proj, idx) => (
            <Card key={proj._id || idx}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`status-dot ${proj.status.toLowerCase()}`}></div>
                <h3 className="text-lg font-semibold text-[var(--brand-olive)]">
                  {proj.name} — <span className="text-gray-700">Status: {proj.status}</span>
                </h3>
              </div>

              <p><strong>Role:</strong> {proj.role}</p>
              <p>
                <strong>Duration:</strong> {formatDate(proj.startDate)} –{" "}
                {proj.endDate ? formatDate(proj.endDate) : "Present"}
              </p>
              {proj.industry && <p><strong>Industry:</strong> {proj.industry}</p>}
              {proj.technologies && <p><strong>Technologies:</strong> {proj.technologies}</p>}
              {proj.teamSize && <p><strong>Team Size:</strong> {proj.teamSize}</p>}
              {proj.url && (
                <p>
                  <strong>Link:</strong>{" "}
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-teal)] hover:underline"
                  >
                    {proj.url}
                  </a>
                </p>
              )}
              {proj.outcomes && <p><strong>Outcomes:</strong> {proj.outcomes}</p>}
              {proj.collaborationDetails && (
                <p><strong>Collaboration:</strong> {proj.collaborationDetails}</p>
              )}
              {proj.mediaUrl && (
                <div className="mt-3">
                  <p className="font-medium text-gray-700 mb-1">Project Screenshot:</p>
                  <img
                    src={
                      proj.mediaUrl.startsWith("http")
                        ? proj.mediaUrl
                        : `${import.meta.env.VITE_API_BASE_URL}${proj.mediaUrl}`
                    }
                    alt={`${proj.name} media`}
                    className="rounded-lg border border-gray-200 shadow-sm max-h-60 object-contain bg-gray-50"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}


              <div className="flex justify-center space-x-2 p-2">
                <Button variant="secondary" onClick={() => setEditingProject(proj)}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => removeProject(proj._id!)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}

        </div>
      )}
    </div>
  );
}