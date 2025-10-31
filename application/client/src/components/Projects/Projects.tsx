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

interface ProjectsProps {
  onUpdate?: () => void;
}

export default function Projects({ onUpdate }: ProjectsProps) { 
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  //added in UC032
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc">("date_desc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [techFilter, setTechFilter] = useState(""); // for "Filter by technology"
  const [industryFilter, setIndustryFilter] = useState(""); // for "Filter by industry"


  const fetchProjects = async () => { 
    try {
      //added in UC032
      const hasFilters =
        search.trim().length > 0 ||
        sort !== "date_desc" ||
        techFilter.trim().length > 0 ||
        industryFilter.trim().length > 0;

      //changed in UC032. old data intialize below in comment
      const data = await getProjects(
        hasFilters
          ? {
              search: search.trim() || undefined,
              sort,
              tech: techFilter.trim() || undefined,
              industry: industryFilter.trim() || undefined,
            }
          : undefined
      );
      
      //const data = await getProjects();
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

  //added in UC032
  useEffect(() => {
    fetchProjects();
  }, [search, sort, techFilter, industryFilter]);

  const addProject = async (newProj: Project) => {
    try {
      const created = await addProjectApi(newProj);
      setProjects([...projects, created]);
      setShowForm(false);//
      //await addProject(newProj);
      setShowForm(false);
      onUpdate?.();
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
      onUpdate?.();
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
      onUpdate?.();
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

      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="text-sm text-gray-500">
          {projects.length} project{projects.length === 1 ? "" : "s"} found
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "grid" ? "primary" : "secondary"}
            onClick={() => setView("grid")}
          >
            Grid
          </Button>
          <Button
            variant={view === "list" ? "primary" : "secondary"}
            onClick={() => setView("list")}
          >
            List
          </Button>
        </div>
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

      {/*added in UC032*/}
      {/*{!showForm && !editingProject && (
        <div className="flex flex-wrap gap-3 items-center mb-4 px-1 sm:px-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="form-input w-full sm:w-[220px]"
          />

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

          <input
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            placeholder="Filter by technology…"
            className="form-input w-full sm:w-[200px]"
          />

          <input
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            placeholder="Filter by industry…"
            className="form-input w-full sm:w-[200px]"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="form-select w-full sm:w-[160px]"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
          </select>

          <div className="flex gap-1 ml-auto">
            <Button
              variant={view === "list" ? "primary" : "secondary"}
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              variant={view === "grid" ? "primary" : "secondary"}
              onClick={() => setView("grid")}
            >
              Grid
            </Button>
          </div>
        </div>
      )} */}

      {!showForm && !editingProject && (
        <div className="flex flex-wrap gap-3 items-center mb-4 px-1 sm:px-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="form-input w-full sm:w-[220px]"
          />
          <input
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            placeholder="Filter by technology…"
            className="form-input w-full sm:w-[200px]"
          />
          <input
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            placeholder="Filter by industry…"
            className="form-input w-full sm:w-[200px]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="form-select w-full sm:w-[160px]"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
          </select>
          <div className="flex gap-1 ml-auto">
            <Button
              variant={view === "list" ? "primary" : "secondary"}
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              variant={view === "grid" ? "primary" : "secondary"}
              onClick={() => setView("grid")}
            >
              Grid
            </Button>
          </div>
        </div>
      )}

      {!showForm && !editingProject && (
        view === "list" ? (
          <div className="flex flex-col gap-4 mx-6 my-8">
            {projects.map((proj, idx) => (
              <Card key={proj._id || idx}>
                {/* ... list markup ... */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`status-dot ${proj.status.toLowerCase()}`}></div>
                  <h3 className="text-lg font-semibold text-[var(--brand-olive)]">
                    {proj.name} —{" "}
                    <span className="text-gray-700">Status: {proj.status}</span>
                  </h3>
                </div>
                {/* rest of fields */}
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
                {proj.mediaUrl && <p><strong>Media:</strong> {proj.mediaUrl}</p>}
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mx-1 sm:mx-6 my-8">
            {projects.map((proj, idx) => (
              <Card key={proj._id || idx} className="flex flex-col gap-2">
                {proj.mediaUrl ? (
                  <img
                    src={proj.mediaUrl}
                    alt={proj.name}
                    className="w-full h-36 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-36 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500">
                    No thumbnail
                  </div>
                )}
                <h3 className="text-base font-semibold text-[var(--brand-olive)]">
                  {proj.name}
                </h3>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {proj.description}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(proj.startDate)} –{" "}
                  {proj.endDate ? formatDate(proj.endDate) : "Present"}
                </p>
                <div className="flex gap-2 mt-auto pt-2">
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
        )
      )}
    </div>
  );
}