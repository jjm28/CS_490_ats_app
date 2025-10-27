import { useState, useEffect } from "react";
import "../../styles/Education.css";
import EducationForm from "./EducationForm";
import { getEducation, addEducationApi } from "../../api/education";

export interface Education {
  _id?: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  gpa?: string;
  isPrivateGpa?: boolean;
  currentlyEnrolled?: boolean;
  educationLevel: string;
  achievements?: string;
}

export default function Education() {
  const [educationList, setEducationList] = useState<Education[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchEducation = async () => {
    try {
      const data = await getEducation();
      setEducationList(data);
    } catch (err) {
      console.error("Error fetching education:", err);
    }
  };

  useEffect(() => {
    fetchEducation();
  }, []);

  const addEducation = async (newEdu: Education) => {
    try {
      const created = await addEducationApi(newEdu);
      setEducationList([...educationList, created]);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding education:", err);
    }
  };

  return (
    <div className="education-manager">
      <h2 className="education-title">
        Education
        {!showForm && (
          <button
            className="add-education-inline-btn"
            onClick={() => setShowForm(true)}
          >
            +
          </button>
        )}
      </h2>

      {showForm && (
        <EducationForm
          onSubmit={addEducation}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!showForm && (
        <div className="education-list">
          {educationList.map((edu, idx) => (
            <div className="education-item" key={edu._id || idx}>
              <p>{edu.institution} — {edu.degree}</p>
              <p>Field of Study: {edu.fieldOfStudy}</p>
              <p>Level: {edu.educationLevel}</p>
              {edu.gpa && <p>GPA: {edu.gpa} {edu.isPrivateGpa ? "(Private)" : ""}</p>}
              {edu.achievements && <p>Achievements: {edu.achievements}</p>}
              {edu.currentlyEnrolled && <p>Currently Enrolled</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}