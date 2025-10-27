import { useState } from "react";

interface EducationFormProps {
  onSubmit: (edu: any) => void;
  onCancel: () => void;
}

export default function EducationForm({ onSubmit, onCancel }: EducationFormProps) {
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [gpa, setGpa] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [currentlyEnrolled, setCurrentlyEnrolled] = useState(false);
  const [level, setLevel] = useState("Bachelor's");
  const [honors, setHonors] = useState("");

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
      achievements: honors
    });
  };

  return (
    <div className="education-form-popup">
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Institution" value={institution} onChange={e => setInstitution(e.target.value)} required />
        <input type="text" placeholder="Degree" value={degree} onChange={e => setDegree(e.target.value)} required />
        <input type="text" placeholder="Field of Study" value={field} onChange={e => setField(e.target.value)} required />
        <input type="date" placeholder="Graduation Date" value={graduationDate} onChange={e => setGraduationDate(e.target.value)} required />
        <input type="text" placeholder="GPA (optional)" value={gpa} onChange={e => setGpa(e.target.value)} className="gpa-input" />
        <select value={level} onChange={e => setLevel(e.target.value)}>
          <option>High School</option>
          <option>Associate</option>
          <option>Bachelor's</option>
          <option>Master's</option>
          <option>PhD</option>
        </select>
        <input type="text" placeholder="Achievements / Honors" value={honors} onChange={e => setHonors(e.target.value)} />
        <div className="bottom-checkboxes">
          <div className="gpa-toggle">
            <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} />
            <label>Hide GPA</label>
          </div>
          <div className="currently-enrolled">
            <input type="checkbox" checked={currentlyEnrolled} onChange={e => setCurrentlyEnrolled(e.target.checked)} />
            <label>Currently Enrolled</label>
          </div>
        </div>
        <div className="form-buttons">
          <button type="submit">Save</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}