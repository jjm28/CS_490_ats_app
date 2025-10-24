import type { Proficiency } from "./Skills";
import { categories, skillSuggestions } from "../../constants/skills";

interface SkillFormProps {
  name: string;
  category: string;
  proficiency: Proficiency;
  setName: (value: string) => void;
  setCategory: (value: string) => void;
  setProficiency: (value: Proficiency) => void;
  addSkill: () => void;
}

export default function SkillForm({
  name,
  category,
  proficiency,
  setName,
  setCategory,
  setProficiency,
  addSkill,
}: SkillFormProps) {
  return (
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

      <select
        value={proficiency}
        onChange={(e) => setProficiency(e.target.value as Proficiency)}
      >
        {["Beginner", "Intermediate", "Advanced", "Expert"].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <button onClick={addSkill}>Add Skill</button>
    </div>
  );
}