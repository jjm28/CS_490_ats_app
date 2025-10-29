import type { Skill } from "./Skills";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import Button from "../StyledComponents/Button";

interface SkillsCategoryProps {
  category: string;
  skills: Skill[];
  skillCount: number;
  editSkill: (index: number, field: keyof Skill, value: string) => void;
  removeSkill: (index: number) => void;
}

export default function SkillsCategory({
  category,
  skills,
  editSkill,
  removeSkill,
}: SkillsCategoryProps) {
  const [filter, setFilter] = useState<string>("All");

  const filteredSkills =
    filter === "All" ? skills : skills.filter((s) => s.proficiency === filter);

  return (
    <Droppable droppableId={category}>
      {(provided) => (
        <div
          className="card category-card"
          {...provided.droppableProps}
          ref={provided.innerRef}
        >
          <div className="category-header">
            <div className="category-title">
              <h3>
                {category} ({skills.length})
              </h3>
            </div>
            <div className="category-filter">
              <label>Filter:</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                {["All", "Beginner", "Intermediate", "Advanced", "Expert"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>


          {filteredSkills.map((skill, idx) => (
            <Draggable
              key={skill._id || `${category}-${idx}`}
              draggableId={skill._id || `${category}-${idx}`}
              index={idx}
            >
              {(provided) => (
                <div
                  className="skill-badge mt-2"
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => editSkill(idx, "name", e.target.value)}
                  />
                  <select
                    value={skill.proficiency}
                    onChange={(e) =>
                      editSkill(idx, "proficiency", e.target.value)
                    }
                  >
                    {["Beginner", "Intermediate", "Advanced", "Expert"].map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      )
                    )}
                  </select>
                  <Button className="ml-auto" onClick={() => removeSkill(idx)}>Remove</Button>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}