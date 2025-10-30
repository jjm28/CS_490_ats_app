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

  const iconForProficiency = (level: string) => {
    switch (level) {
      case "Beginner":
        return "💡";
      case "Intermediate":
        return "⚡";
      case "Advanced":
        return "💎";
      case "Expert":
        return "🏆";
      default:
        return "";
    }
  };

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
                {["All", "Beginner", "Intermediate", "Advanced", "Expert"].map(
                  (p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  )
                )}
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
                  className={`skill-badge ${skill.proficiency.toLowerCase()}`}
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <span>{iconForProficiency(skill.proficiency)}</span>
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
                  <Button className="ml-auto" onClick={() => removeSkill(idx)}>
                    Remove
                  </Button>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}

          {skills.length > 0 && (
            <div className="mt-3 text-sm text-gray-700 bg-gray-50 border-t border-gray-200 rounded-md p-2">
              <strong>Summary:</strong>{" "}
              {(() => {
                const counts = { Beginner: 0, Intermediate: 0, Advanced: 0, Expert: 0 };
                skills.forEach((s) => counts[s.proficiency]++);
                return Object.entries(counts)
                  .filter(([_, c]) => c > 0)
                  .map(([level, c]) => `${c} ${level}`)
                  .join(", ");
              })()}
            </div>
          )}
        </div>
      )}
    </Droppable>
  );
}