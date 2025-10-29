import { useState } from "react";
import type { Project } from "./Projects";

interface ProjectFormProps {
  onSubmit: (project: Project) => void;
  onCancel: () => void;
  initialData?: Project;
}

export default function ProjectForm({ onSubmit, onCancel, initialData }: ProjectFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [role, setRole] = useState(initialData?.role || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [technologies, setTechnologies] = useState(initialData?.technologies || "");
  const [url, setUrl] = useState(initialData?.url || "");
  const [teamSize, setTeamSize] = useState(initialData?.teamSize?.toString() || "");
  const [collaborationDetails, setCollaborationDetails] = useState(initialData?.collaborationDetails || "");
  const [outcomes, setOutcomes] = useState(initialData?.outcomes || "");
  const [industry, setIndustry] = useState(initialData?.industry || "");
  const [status, setStatus] = useState(initialData?.status || "Planned");
  const [mediaUrl, setMediaUrl] = useState(initialData?.mediaUrl || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      role,
      startDate,
      endDate,
      technologies,
      url,
      teamSize: teamSize ? Number(teamSize) : undefined,
      collaborationDetails,
      outcomes,
      industry,
      status: status as Project["status"],
      mediaUrl,
    });
  };

  return (
    <div className="project-form-popup">
      <form onSubmit={handleSubmit}>
        <label>Project Name</label>
        <input
          type="text"
          placeholder="Enter project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label>Description</label>
        <textarea
          placeholder="Briefly describe the project"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
        />

        <label>Role</label>
        <input
          type="text"
          placeholder="Your role in the project"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />

        <label>Start Date</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />

        <label>End Date</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <label>Technologies / Skills Used</label>
        <input
          type="text"
          placeholder="e.g., React, Node.js, SQL"
          value={technologies}
          onChange={(e) => setTechnologies(e.target.value)}
        />

        <label>Project URL or Repository</label>
        <input
          type="url"
          placeholder="https://github.com/yourproject"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <label>Team Size</label>
        <input
          type="number"
          placeholder="e.g., 4"
          value={teamSize}
          onChange={(e) => setTeamSize(e.target.value)}
        />

        <label>Collaboration Details</label>
        <input
          type="text"
          placeholder="Describe how the team worked together"
          value={collaborationDetails}
          onChange={(e) => setCollaborationDetails(e.target.value)}
        />

        <label>Outcomes / Achievements</label>
        <textarea
          placeholder="Key results or achievements"
          value={outcomes}
          onChange={(e) => setOutcomes(e.target.value)}
          rows={2}
        />

        <label>Industry or Project Type</label>
        <input
          type="text"
          placeholder="e.g., Education, Healthcare, FinTech"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />

        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
          <option value="Completed">Completed</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Planned">Planned</option>
        </select>

        <label>Media / Screenshot Link</label>
        <input
          type="text"
          placeholder="Paste image or media URL"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />

        <div className="form-buttons">
          <button type="submit">Save</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}