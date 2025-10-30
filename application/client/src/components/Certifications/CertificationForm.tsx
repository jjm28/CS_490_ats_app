import { useState } from "react";
import type { Certification } from "./Certifications";
import "../../styles/StyledComponents/FormInput.css";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import { organizationSuggestions } from "../../constants/organizations";

interface CertificationFormProps {
  onSubmit: (cert: Certification) => void;
  onCancel: () => void;
  initialData?: Certification;
}

export default function CertificationForm({
  onSubmit,
  onCancel,
  initialData,
}: CertificationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [organization, setOrganization] = useState(initialData?.organization || "");
  const [dateEarned, setDateEarned] = useState(initialData?.dateEarned || "");
  const [expirationDate, setExpirationDate] = useState(initialData?.expirationDate || "");
  const [doesNotExpire, setDoesNotExpire] = useState(initialData?.doesNotExpire || false);
  const [certificationId, setCertificationId] = useState(initialData?.certificationId || "");
  const [category, setCategory] = useState(initialData?.category || "General");
  const [verified, setVerified] = useState(initialData?.verified || false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      organization,
      dateEarned,
      expirationDate: doesNotExpire ? undefined : expirationDate,
      doesNotExpire,
      certificationId,
      verified,
      category,
      documentUrl: file ? file.name : initialData?.documentUrl,
    });
  };

  return (
    <div>
      <Card>
        <form onSubmit={handleSubmit}>
          <label className="form-label">Certification Name</label>
          <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <label className="form-label">Issuing Organization</label>
          <input
            className="form-input"
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            list="organization-suggestions"
            placeholder="Start typing..."
            required
          />
          <datalist id="organization-suggestions">
            {organizationSuggestions.map((org) => (
              <option key={org} value={org} />
            ))}
          </datalist>


          <label className="form-label">Date Earned</label>
          <input className="form-input" type="date" value={dateEarned} onChange={(e) => setDateEarned(e.target.value)} required />

          {!doesNotExpire && (
            <>
              <label className="form-label">Expiration Date</label>
              <input className="form-input" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </>
          )}

          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={doesNotExpire} onChange={(e) => setDoesNotExpire(e.target.checked)} />
            <label>Does Not Expire</label>
          </div>

          <label className="form-label">Certification ID</label>
          <input className="form-input" type="text" value={certificationId} onChange={(e) => setCertificationId(e.target.value)} />

          <label className="form-label">Upload Supporting Document</label>
          <input className="form-input" id="fileUpload" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />

          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {["General", "Technical", "Management", "Industry", "Other"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            <label>Verified?</label>
          </div>

          <div className="flex gap-4">
            <Button variant="primary" type="submit">Save</Button>
            <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}