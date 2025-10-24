import { useState, useEffect } from "react";
import "../styles/Skills.css";

//Define type for proficiency levels
export type Proficiency = "Beginner" | "Intermediate" | "Advanced" | "Expert";

//Define type for skill object
export interface Skill {
  _id?: string;
  name: string;
  category: string;
  proficiency: Proficiency;
}

//List of autocomplete suggestions for common skills
const skillSuggestions = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "SQL",
  "Communication",
  "Leadership",
];

//List of skill categories
const categories = ["Technical", "Soft Skills", "Languages", "Industry-Specific"];

//API functions
const API_URL = "http://localhost:5050/api/skills";

const getSkills = async (): Promise<Skill[]> => {
  const res = await fetch(API_URL);
  return res.json();
};

const addSkillApi = async (skill: Skill): Promise<Skill> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skill),
  });
  return res.json();
};

const updateSkillApi = async (id: string, updatedFields: Partial<Skill>) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedFields),
  });
  return res.json();
};

const deleteSkillApi = async (id: string) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  return res.json();
};

//Define skills component
export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);//Array of skills displayed, start empty
  const [name, setName] = useState("");//State for input name
  const [category, setCategory] = useState(categories[0]);//State for input category
  const [proficiency, setProficiency] = useState<Proficiency>("Beginner");//State for input proficiency
  
  //Fetch skills from thebackend
  useEffect(() => {
    fetchSkills();
  }, []);

  //Function that makes GET request to fetch all the skills
  const fetchSkills = async () => {
    try {
      const data = await getSkills();//GET request to backend
      setSkills(data);//Updates skills
    } catch (err) {
      console.error("Error fetching skills:", err);//Error fetching skills
    }
  };

  //Function that makes POST request to add skill
  const addSkill = async () => {
    if (!name) return;
    if (skills.some((s) => s.name === name)) {//Duplicate skill prevention
      alert("Skill already added!");
      return;
    }
    try {
      const newSkill = await addSkillApi({ name, category, proficiency });
      //Frontend updates of Skill with name, category, and proficiency
      setSkills([...skills, newSkill]);
      setName("");
      setCategory(categories[0]);
      setProficiency("Beginner");
    } catch (err) {
      console.error("Error adding skill:", err);
    }
  };

  //Function that makes PUT request to update skill
  const editSkill = async (index: number, field: keyof Skill, value: string) => {
    const skillToUpdate = { ...skills[index], [field]: value as any };//Copy of skill
    try {
      if (!skillToUpdate._id) throw new Error("Missing skill ID");
      await updateSkillApi(skillToUpdate._id, { [field]: value });
      const newSkills = [...skills];
      newSkills[index] = skillToUpdate;
      setSkills(newSkills);
    } catch (err) {
      console.error("Error updating skill:", err);
    }
  };

  //Function that makes DELETE request to delete skill
  const removeSkill = async (index: number) => {
    const skillToDelete = skills[index];
    if (!window.confirm("Remove this skill?")) return;//Confirmation message
    try {
      if (!skillToDelete._id) throw new Error("Missing skill ID");
      await deleteSkillApi(skillToDelete._id);
      //Remove the skill from front end
      setSkills(skills.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error deleting skill:", err);
    }
  };

  return (
    <div className="skills-manager">
      <h2>Skills Manager</h2>
      <div className="form">
        <input
          type="text"
          placeholder="Skill name"
          value={name}
          list="skill-suggestions"
          onChange={(e) => setName(e.target.value)}
        />
        <datalist id="skill-suggestions">
          {skillSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={proficiency} onChange={(e) => setProficiency(e.target.value as Proficiency)}>
          {["Beginner", "Intermediate", "Advanced", "Expert"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <button onClick={addSkill}>Add Skill</button>
      </div>

      <div className="skills-list">
        {skills.map((skill, idx) => (
          <div key={skill._id || idx} className="skill-badge">
            <input
              type="text"
              value={skill.name}
              onChange={(e) => editSkill(idx, "name", e.target.value)}
            />
            <select
              value={skill.category}
              onChange={(e) => editSkill(idx, "category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={skill.proficiency}
              onChange={(e) => editSkill(idx, "proficiency", e.target.value)}
            >
              {["Beginner", "Intermediate", "Advanced", "Expert"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button onClick={() => removeSkill(idx)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}