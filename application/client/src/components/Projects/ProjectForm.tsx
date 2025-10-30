import { useState } from "react";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";
import "../../styles/StyledComponents/FormInput.css";
import type { Project } from "./Projects";
import axios from "axios";

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
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialData?._id) {
      alert("You must save the project first before uploading media.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/projects/${initialData._id}/media`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setMediaUrl(res.data.url);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };


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

          <label className="form-label">Upload Screenshot / Media</label>
          <input
            className="form-input"
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading || !initialData?._id}
          />
          {!initialData?._id && (
            <p className="text-sm text-gray-500 mt-1">Save the project first to enable uploads.</p>
          )}
          {uploading && <p>Uploading...</p>}
          {mediaUrl && (
            <div className="mt-3 flex flex-col items-start gap-2">
              <img
                src={mediaUrl}
                alt="Project Media"
                className="rounded-md max-h-48 border"
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    if (!initialData?._id) return;
                    if (!window.confirm("Delete this image?")) return;

                    try {
                      await axios.delete(
                        `${import.meta.env.VITE_API_BASE_URL}/api/projects/${initialData._id}/media`
                      );
                      setMediaUrl("");
                      alert("Image deleted successfully!");
                    } catch (err) {
                      console.error("Delete failed", err);
                      alert("Failed to delete image.");
                    }
                  }}
                >
                  Delete Image
                </Button>
              </div>
            </div>
          )}


          <div className="flex gap-4 mt-4">
            <Button variant="primary" type="submit" disabled={uploading}>
              Save
            </Button>
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}