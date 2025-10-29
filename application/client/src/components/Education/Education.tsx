import { useState, useEffect } from "react";
import "../../App.css";
import "../../styles/Education.css";
import EducationForm from "./EducationForm";
import { getEducation, addEducationApi, updateEducationApi, deleteEducationApi } from "../../api/education";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";

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
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);

  const fetchEducation = async () => {
    try {
      const data = await getEducation();
      data.sort((a: Education, b: Education) => {
        const dateA = a.graduationDate ? new Date(a.graduationDate).getTime() : 0;
        const dateB = b.graduationDate ? new Date(b.graduationDate).getTime() : 0;
        return dateB - dateA;
      });
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

  const editEducation = async (id: string, updatedEdu: Education) => {
    try {
      const updated = await updateEducationApi(id, updatedEdu);
      setEducationList((prev) =>
        prev.map((edu) => (edu._id === id ? updated : edu))
      );
    } catch (err) {
      console.error("Error updating education:", err);
    }
  };

  const removeEducation = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await deleteEducationApi(id);
      setEducationList((prev) => prev.filter((edu) => edu._id !== id));
      alert("Education entry deleted successfully!");
    } catch (err) {
      console.error("Error deleting education:", err);
      alert("Failed to delete education entry. Please try again.");
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between mb-2 px-6">
        <h1 className="mb-2">
          Education
        </h1>
        {!showForm && (
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              +
            </Button>
          )}
      </div>
      
      <div>
      {(showForm || editingEdu) && (
        <EducationForm
          onSubmit={async (data) => {
            if (editingEdu) {
              await editEducation(editingEdu._id!, data);
              await fetchEducation();
              setEditingEdu(null);
            } else {
              await addEducation(data);
              await fetchEducation();
            }
            setShowForm(false);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingEdu(null);
          }}
          initialData={editingEdu}
        />
      )}
      </div>

      {!showForm && !editingEdu && (
        <div className="relative mx-6 my-8 border-l-2 border-gray-700">
          {educationList.map((edu, idx) => (
            <Card 
              className="max-w-lg"
              key={edu._id || idx}
            >
              <div className="timeline-dot"></div>

              <p className="education-date">
                {formatDate(edu.graduationDate)}
                {edu.currentlyEnrolled && " - Currently Enrolled"}
              </p>
              <p className="education-title">
                {edu.institution} — {edu.degree}
              </p>

              <p>Field of Study: {edu.fieldOfStudy}</p>
              <p>Level: {edu.educationLevel}</p>
              {edu.gpa && !edu.isPrivateGpa && <p>GPA: {edu.gpa}</p>}
              {edu.achievements && <p>Achievements: {edu.achievements}</p>}
              <div className="flex justify-center space-x-2 p-2">
                <Button variant="secondary" onClick={() => setEditingEdu(edu)}>Edit</Button>
                <Button variant="secondary" onClick={() => removeEducation(edu._id!)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}