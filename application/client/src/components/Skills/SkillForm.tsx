import type { Proficiency } from "./Skills";
import { categories, skillSuggestions } from "../../constants/skills";
import Button from "../StyledComponents/Button";

interface SkillFormProps {
  name: string;
  category: string;
  proficiency: Proficiency;
  setName: (value: string) => void;
  setCategory: (value: string) => void;
  setProficiency: (value: Proficiency) => void;
  addSkill: () => void;
  setIsAdding: (val: boolean) => void;
  onCancel: () => void;
}

export default function SkillForm({
  name,
  category,
  proficiency,
  setName,
  setCategory,
  setProficiency,
  addSkill,
  setIsAdding,
  onCancel,
}: SkillFormProps) {
  const handleAddSkill = () => {
    addSkill();
    setIsAdding(false);
  };

  return (
    <div>
      <div
        className="form"
        onFocus={() => setIsAdding(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsAdding(false);
          }
        }}
      >
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
      </div>

      <div className="flex gap-2 mt-4 justify-start">
        <Button variant="primary" onClick={handleAddSkill}>
          Add Skill
        </Button>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
