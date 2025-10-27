import { useState, useEffect } from "react";
import "../../styles/Skills.css";
import SkillsCategory from "./SkillsCategory";
import SkillForm from "./SkillForm";
import { getSkills, addSkillApi, updateSkillApi, deleteSkillApi } from "../../api/skills";
import { categories } from "../../constants/skills";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";

//Define type for proficiency levels
export type Proficiency = "Beginner" | "Intermediate" | "Advanced" | "Expert";

//Define type for skill object
export interface Skill {
  _id?: string;
  name: string;
  category: string;
  proficiency: Proficiency;
  order?: number;
}

//Define skills component
export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);//Array of skills displayed, start empty
  const [name, setName] = useState("");//State for input name
  const [category, setCategory] = useState(categories[0]);//State for input category
  const [proficiency, setProficiency] = useState<Proficiency>("Beginner");//State for input proficiency
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  //Fetch skills from thebackend
  useEffect(() => {
    fetchSkills();
  }, []);

  //Function that makes GET request to fetch all the skills
  const fetchSkills = async () => {
    try {
      const data = await getSkills();
      data.sort((a: Skill, b: Skill) => {
        if (a.category === b.category) {
          return (a.order || 0) - (b.order || 0);
        }
        return categories.indexOf(a.category) - categories.indexOf(b.category);
      });
      setSkills(data);
    } catch (err) {
      console.error("Error fetching skills:", err);
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

  const groupedSkills: Record<string, Skill[]> = categories.reduce((acc, category) => {
    acc[category] = skills
      .filter(skill => skill.category === category)
      .filter(skill => skill.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return acc;
  }, {} as Record<string, Skill[]>);


  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceCategory = source.droppableId;
    const destCategory = destination.droppableId;

    if (sourceCategory === destCategory) {
      const items = Array.from(groupedSkills[sourceCategory]);
      const [moved] = items.splice(source.index, 1);
      items.splice(destination.index, 0, moved);

      const updatedItems = items.map((skill, index) => ({ ...skill, order: index }));
      setSkills((prev) => [
        ...prev.filter((s) => s.category !== sourceCategory),
        ...updatedItems,
      ]);

      for (const skill of updatedItems) {
        await updateSkillApi(skill._id!, { order: skill.order });
      }
    } else {
      const sourceItems = Array.from(groupedSkills[sourceCategory]);
      const destItems = Array.from(groupedSkills[destCategory]);
      const [moved] = sourceItems.splice(source.index, 1);
      const updatedMoved = { ...moved, category: destCategory };
      destItems.splice(destination.index, 0, updatedMoved);

      const updatedSource = sourceItems.map((s, idx) => ({ ...s, order: idx }));
      const updatedDest = destItems.map((s, idx) => ({ ...s, order: idx }));

      setSkills((prev) => [
        ...prev.filter(
          (s) => s.category !== sourceCategory && s.category !== destCategory
        ),
        ...updatedSource,
        ...updatedDest,
      ]);

      for (const skill of [...updatedSource, ...updatedDest]) {
        await updateSkillApi(skill._id!, { category: skill.category, order: skill.order });
      }
    }
  };

  return (
    <div className="skills-manager">
      <h2 className="skills-title">
        Skills
        {!showForm && (
          <button
            className="add-skill-inline-btn"
            onClick={() => setShowForm(true)}
          >
            +
          </button>
        )}
      </h2>

      {!isAdding && !showForm && (
        <div className="skills-search">
          <input
            type="text"
            placeholder="Search skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}


      {showForm && (
        <div className="skill-form-popup">
          <SkillForm
            name={name}
            category={category}
            proficiency={proficiency}
            setName={setName}
            setCategory={setCategory}
            setProficiency={setProficiency}
            addSkill={() => {
              addSkill();
              setShowForm(false);
            }}
            setIsAdding={setIsAdding}
          />
          <div className="form-buttons">
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="skills-list">
            {Object.entries(groupedSkills).map(([cat, skillsInCategory]) => (
              <SkillsCategory
                key={cat}
                category={cat}
                skills={skillsInCategory}
                editSkill={editSkill}
                removeSkill={removeSkill}
                skillCount={skillsInCategory.length}
              />
            ))}
          </div>
        </DragDropContext>
      )}

    </div>
  );
}