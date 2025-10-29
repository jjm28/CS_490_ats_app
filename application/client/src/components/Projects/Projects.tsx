import { useState, useEffect } from "react";
import "../../styles/Projects.css";
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
    <div className="projects-manager">
      <h2 className="projects-title">
        Special Projects
        {!showForm && (
          <button
            className="add-project-inline-btn"
            onClick={() => setShowForm(true)}
          >
            +
          </button>
        )}
      </h2>

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
        <div className="projects-list">
          {projects.map((proj, idx) => (
            <div className="project-item" key={proj._id || idx}>
              <div className="project-content">
                <h3>{proj.name}</h3>
                <p><strong>Role:</strong> {proj.role}</p>
                <p><strong>Duration:</strong> {formatDate(proj.startDate)} – {proj.endDate ? formatDate(proj.endDate) : "Present"}</p>
                <p><strong>Status:</strong> {proj.status}</p>
                {proj.industry && <p><strong>Industry:</strong> {proj.industry}</p>}
                {proj.technologies && <p><strong>Technologies:</strong> {proj.technologies}</p>}
                {proj.teamSize && <p><strong>Team Size:</strong> {proj.teamSize}</p>}
                {proj.url && (
                  <p>
                    <strong>Link:</strong>{" "}
                    <a href={proj.url} target="_blank" rel="noopener noreferrer">
                      {proj.url}
                    </a>
                  </p>
                )}
                {proj.outcomes && <p><strong>Outcomes:</strong> {proj.outcomes}</p>}
                {proj.collaborationDetails && (
                  <p><strong>Collaboration:</strong> {proj.collaborationDetails}</p>
                )}
                {proj.mediaUrl && (
                  <p><strong>Media:</strong> {proj.mediaUrl}</p>
                )}

                <div className="project-actions">
                  <button onClick={() => setEditingProject(proj)}>Edit</button>
                  <button onClick={() => removeProject(proj._id!)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}