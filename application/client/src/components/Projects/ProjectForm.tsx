import { useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import "../../styles/StyledComponents/FormInput.css";
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
      <Card>
        <form onSubmit={handleSubmit}>
          <label className="form-label">Project Name</label>
          <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <label className="form-label">Description</label>
          <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />

          <label className="form-label">Role</label>
          <input className="form-input" type="text" value={role} onChange={(e) => setRole(e.target.value)} required />

          <label className="form-label">Start Date</label>
          <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />

          <label className="form-label">End Date</label>
          <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

          <label className="form-label">Technologies / Skills Used</label>
          <input className="form-input" type="text" value={technologies} onChange={(e) => setTechnologies(e.target.value)} />

          <label className="form-label">Project URL or Repository</label>
          <input className="form-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />

          <label className="form-label">Team Size</label>
          <input className="form-input" type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />

          <label className="form-label">Collaboration Details</label>
          <input className="form-input" type="text" value={collaborationDetails} onChange={(e) => setCollaborationDetails(e.target.value)} />

          <label className="form-label">Outcomes / Achievements</label>
          <textarea className="form-input" value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={2} />

          <label className="form-label">Industry or Project Type</label>
          <input className="form-input" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />

          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
            <option value="Completed">Completed</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Planned">Planned</option>
          </select>

          <label className="form-label">Media / Screenshot Link</label>
          <input className="form-input" type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />

          <div className="flex gap-4">
            <Button variant="primary" type="submit">Save</Button>
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}