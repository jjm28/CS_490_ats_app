import { useState } from "react";
import type { Certification } from "./Certifications";
import "../../styles/StyledComponents/FormInput.css";
import Card from "../StyledComponents/Card";
import Button from "../StyledComponents/Button";

interface SkillCertificationFormSubmit {
  cert: Certification;
  badgeFile: File | null;
}

interface SkillCertificationFormProps {
  onSubmit: (payload: SkillCertificationFormSubmit) => void;
  onCancel: () => void;
  initialData?: Certification;
}

const SHOWCASE_CATEGORIES = [
  "Coding",
  "Cloud",
  "Data",
  "Business",
  "Design",
  "Other",
];

export default function SkillCertificationForm({
  onSubmit,
  onCancel,
  initialData,
}: SkillCertificationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [organization, setOrganization] = useState(
    initialData?.organization || ""
  );
  const [dateEarned, setDateEarned] = useState(
    initialData?.dateEarned || ""
  );
  const [showcaseCategory, setShowcaseCategory] = useState(
    initialData?.showcaseCategory || "Coding"
  );
  const [verificationUrl, setVerificationUrl] = useState(
    initialData?.verificationUrl || ""
  );
  const [scoreLabel, setScoreLabel] = useState(
    initialData?.scoreLabel || ""
  );
  const [descriptionRich, setDescriptionRich] = useState(
    initialData?.descriptionRich || ""
  );
  const [badgeImageFile, setBadgeImageFile] = useState<File | null>(null);
  const [badgeImageUrl, setBadgeImageUrl] = useState(
    initialData?.badgeImageUrl || ""
  );
  const [showInShowcase, setShowInShowcase] = useState(
    initialData?.showInShowcase ?? true
  );

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const payload: Certification = {
    ...(initialData || {}),
    name,
    organization,
    dateEarned,
    category: initialData?.category,
    showcaseCategory,
    verificationUrl,
    scoreLabel,
    descriptionRich,
    showInShowcase,
    type: "badge",
  };

 if (payload._id) delete payload._id
  onSubmit({
    cert: payload,
    badgeFile: badgeImageFile,
  });
};

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold mb-4">
          {initialData ? "Edit Skill Badge" : "Add Skill Badge"}
        </h2>

        <label className="form-label">Badge / Certification Name</label>
        <input
          className="form-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="form-label">Platform / Issuing Organization</label>
        <input
          className="form-input"
          type="text"
          placeholder="HackerRank, LeetCode, Coursera..."
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          required
        />

        <label className="form-label">Date Earned</label>
        <input
          className="form-input"
          type="date"
          value={dateEarned}
          onChange={(e) => setDateEarned(e.target.value)}
          required
        />

        <label className="form-label">Showcase Category</label>
        <select
          className="form-select"
          value={showcaseCategory}
          onChange={(e) => setShowcaseCategory(e.target.value)}
        >
          {SHOWCASE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="form-label">Verification URL</label>
        <input
          className="form-input"
          type="url"
          placeholder="https://..."
          value={verificationUrl}
          onChange={(e) => setVerificationUrl(e.target.value)}
        />

        <label className="form-label">Score / Achievement</label>
        <input
          className="form-input"
          type="text"
          placeholder="Top 5%, Score 90/100, Gold badge..."
          value={scoreLabel}
          onChange={(e) => setScoreLabel(e.target.value)}
        />

        <label className="form-label">Badge or Screenshot</label>
        <input
          className="form-input"
          type="file"
          accept="image/*"
          onChange={(e) =>
            setBadgeImageFile(e.target.files?.[0] || null)
          }
        />
        {badgeImageUrl && (
          <p className="text-xs text-stone-500 mt-1">
            Current image: {badgeImageUrl}
          </p>
        )}

        <label className="form-label">Description</label>
        <textarea
          className="form-input"
          rows={4}
          placeholder="What did you prove with this assessment? Key topics, difficulty, score context..."
          value={descriptionRich}
          onChange={(e) => setDescriptionRich(e.target.value)}
        />

        <div className="flex items-center gap-2 mt-3 mb-4">
          <input
            type="checkbox"
            checked={showInShowcase}
            onChange={(e) => setShowInShowcase(e.target.checked)}
          />
          <span>Show in profile Skills & Certifications Showcase</span>
        </div>

        <div className="flex gap-4">
          <Button variant="primary" type="submit">
            Save
          </Button>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
