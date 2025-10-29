import { useState } from "react";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import Button from "../StyledComponents/Button";

interface EducationFormProps {
  onSubmit: (edu: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export default function EducationForm({
  onSubmit,
  onCancel,
  initialData,
}: EducationFormProps) {
  const [institution, setInstitution] = useState(
    initialData?.institution || ""
  );
  const [degree, setDegree] = useState(initialData?.degree || "");
  const [field, setField] = useState(initialData?.fieldOfStudy || "");
  const [graduationDate, setGraduationDate] = useState(
    initialData?.graduationDate || ""
  );
  const [gpa, setGpa] = useState(initialData?.gpa || "");
  const [privacy, setPrivacy] = useState(initialData?.isPrivateGpa || false);
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(
    initialData?.currentlyEnrolled || false
  );
  const [level, setLevel] = useState(
    initialData?.educationLevel || "Bachelor's"
  );
  const [honors, setHonors] = useState(initialData?.achievements || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      institution,
      degree,
      fieldOfStudy: field,
      graduationDate,
      gpa,
      isPrivateGpa: privacy,
      currentlyEnrolled,
      educationLevel: level,
      achievements: honors,
    });
  };

  return (
    <div className="education-form-popup">
      <Card>
        <form onSubmit={handleSubmit}>
          <label className="form-label">College/Institution</label>

          <input
            className="form-input"
            type="text"
            // placeholder="Institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            required
          />

          <label className="form-label">Degree</label>
          <input
            className="form-input"
            type="text"
            // placeholder="Degree"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            required
          />

          <label className="form-label">Field of Study</label>

          <input
            className="form-input"
            type="text"
            // placeholder="Field of Study"
            value={field}
            onChange={(e) => setField(e.target.value)}
            required
          />

          <label className="form-label">Graduation Date</label>
          <input
            className="form-input"
            type="date"
            // placeholder="Graduation Date"
            value={graduationDate}
            onChange={(e) => setGraduationDate(e.target.value)}
            required
          />

          <label className="form-label">GPA (optional)</label>

          <input
            className="form-input"
            type="text"
            // placeholder="GPA (optional)"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            // className="gpa-input"
          />

          <label className="form-label">Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>High School</option>
            <option>Associate</option>
            <option>Bachelor's</option>
            <option>Master's</option>
            <option>PhD</option>
          </select>

          <label className="form-label">Degree</label>
          <input
            className="form-input"
            type="text"
            // placeholder="Achievements / Honors"
            value={honors}
            onChange={(e) => setHonors(e.target.value)}
          />

          <div className="flex gap-8 mb-4">
            <div className="flex items-center">
              <input
              className=""
                type="checkbox"
                checked={privacy}
                onChange={(e) => setPrivacy(e.target.checked)}
              />
              <label className="ml-2 whitespace-nowrap">Hide GPA</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={currentlyEnrolled}
                onChange={(e) => setCurrentlyEnrolled(e.target.checked)}
              />
              <label className="ml-2 whitespace-nowrap">Currently Enrolled</label>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="primary" type="submit">Save</Button>
            <Button variant="secondary" type="button" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
