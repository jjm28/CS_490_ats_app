import type { Skill } from "./Skills";
import { Droppable, Draggable } from "@hello-pangea/dnd";

interface SkillsCategoryProps {
  category: string;
  skills: Skill[];
  editSkill: (index: number, field: keyof Skill, value: string) => void;
  removeSkill: (index: number) => void;
}

export default function SkillsCategory({
  category,
  skills,
  editSkill,
  removeSkill,
}: SkillsCategoryProps) {
  return (
    <Droppable droppableId={category}>
      {(provided) => (
        <div
          className="category-card"
          {...provided.droppableProps}
          ref={provided.innerRef}
        >
          <h3>{category}</h3>
          {skills.map((skill, idx) => (
            <Draggable
              key={skill._id || `${category}-${idx}`}
              draggableId={skill._id || `${category}-${idx}`}
              index={idx}
            >
              {(provided) => (
                <div
                  className="skill-badge"
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
                  <button onClick={() => removeSkill(idx)}>Remove</button>
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