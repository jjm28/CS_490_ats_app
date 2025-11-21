import { Edit } from "lucide-react";
import Button from "../StyledComponents/Button"
import Card  from "../StyledComponents/Card"
import React, { useState, useEffect, useMemo } from "react";
import type { RefereeFormData} from "../../api/reference";
import { addnewReferee } from "../../api/reference";
import { validateFields } from "../../utils/helpers";
import type { ValidationErrors } from "../../utils/helpers";

export default function ManageReferences(){
    const [ShowFormRef, setShowAddrefForm] = useState(false);
    const [Editing,setEditing] = useState(false);
    const [formData, setFormData] = useState<RefereeFormData>({
        full_name: "",
        title: "",
        organization: "",
        relationship: "",
        email: "",
        phone: "",
        preferred_contact_method: "",
        availability_notes: "",
        tags: [],
        last_used_at: "",
        usage_count: 0,
      });
    const [formerros,setformerros] = useState<ValidationErrors>({});
    const [tagInput, setTagInput] = useState("");

    const handleSubmit =  async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formerros)
    const nameerror = validateFields("full_name", formData.full_name);
    if (nameerror) return  setformerros((prev) => ({ ...prev, ["full_name"]: nameerror }));
    const emailerror = validateFields("email", formData.email);
    if (emailerror) return  setformerros((prev) => ({ ...prev, ["email"]: emailerror }));
    const relationshiperror = validateFields("relationship", formData.relationship);
    if (relationshiperror) return  setformerros((prev) => ({ ...prev, ["relationship"]: relationshiperror }));
    if(formData.phone){
    const phoneerror = validateFields("phone", formData.phone);
    if (phoneerror) return  setformerros((prev) => ({ ...prev, ["phone"]: phoneerror }));}
    const preferreerror = validateFields("preferred_contact_method", formData.preferred_contact_method);
    if (preferreerror) return  setformerros((prev) => ({ ...prev, ["preferred_contact_method"]: preferreerror }));
    setformerros({})
    const payload: any = {...formData}
    const user = JSON.parse(localStorage.getItem("authUser") ?? "").user
    payload.user_id = user._id



 try{
       const item = await addnewReferee(payload)
   
    } catch (error) {
      console.error("Error saving job:", error);
      setformerros({"Servererror": "Something went wrong"})
    }
  };

    const resetForm = () => {
        setShowAddrefForm(false)
        setEditing(false)
        setFormData({
        full_name: "",
        title: "",
        organization: "",
        relationship: "",
        email: "",
        phone: "",
        preferred_contact_method: "",
        availability_notes: "",
        tags: [],
        last_used_at: "",
        usage_count: 0,
      })
    }
      const handleInputChange = (   e: React.ChangeEvent<     HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement    >   ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    
        const error = validateFields(name, value        );
    
        setformerros((prev) => {
          const newErrors = { ...prev };
          if (error) {
            newErrors[name] = error;
          } else {
            delete newErrors[name];
          }
          return newErrors;
        });
    
 
      };

      const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setTagInput(e.target.value);
};

const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const raw = tagInput.trim();
    if (!raw) return;

    const tag = raw.replace(/,$/, "").trim();

    // Avoid duplicates (case-insensitive)
    setFormData(prev => {
      const exists = prev.tags.some(t => t.toLowerCase() === tag.toLowerCase());
      if (exists) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });

    setTagInput("");
  }
};

const handleRemoveTag = (index: number) => {
  setFormData(prev => ({
    ...prev,
    tags: prev.tags.filter((_, i) => i !== index),
  }));
};

return (
        <div className="p-6 bg-gray-50 min-h-screen">
             <div className="max-w-5xl mx-auto flex flex-col gap-4">

                <div>
                    <h1 className="text-2xl font-bold">Professional References</h1>
                    <p className="text-sm text-gray-600">Manage your referees and prepare them for job requests.</p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
                        <div className="relative flex-1 md:w-[380px]">
                            <input
                            type="text"
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="Search by name, company, or role…"
        
                            />
                        </div>
                            <Button
                            onClick={() => setShowAddrefForm(true)}
                            >
                            Add Reference
                            </Button>
        {ShowFormRef && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="bg-white rounded-lg p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                {Editing ? "Edit Referee" : "Add Referee"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">

                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="form-label">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.full_name ? "!border-red-500" : ""}`}
                        placeholder="e.g. Sarah Johnson"
                    />
                    {formerros.full_name && <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.full_name}</p>}
                    </div>

                    <div>
                    <label className="form-label">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.email ? "!border-red-500" : ""}`}
                        placeholder="e.g. sjohnson@company.com"
                    />
                    {formerros.email && <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.email}</p>}
                    </div>
                </div>

                {/* Title + Organization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label className="form-label">Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.title ? "!border-red-500" : ""}`}
                        placeholder="e.g. Senior Manager, Software Engineering"
                    />
                    {formerros.title && <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.title}</p>}
                    </div>

                    <div>
                    <label className="form-label">Organization</label>
                    <input
                        type="text"
                        name="organization"
                        value={formData.organization}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.organization ? "!border-red-500" : ""}`}
                        placeholder="e.g. Microsoft, Deloitte, NJIT"
                    />
                    {formerros.organization && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.organization}</p>
                    )}
                    </div>
                </div>

                {/* Relationship + Phone + Contact Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                    <label className="form-label">
                        Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.relationship ? "!border-red-500" : ""}`}
                    >
                        <option value="">Select relationship</option>
                        <option value="manager">Manager</option>
                        <option value="mentor">Mentor</option>
                        <option value="professor">Professor</option>
                        <option value="colleague">Colleague</option>
                        <option value="other">Other</option>
                    </select>
                    {formerros.relationship && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.relationship}</p>
                    )}
                    </div>

                    <div>
                    <label className="form-label">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.phone ? "!border-red-500" : ""}`}
                        placeholder="e.g. (555) 987-6543"
                    />
                    {formerros.phone && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.phone}</p>
                    )}
                    </div>

                    <div>
                    <label className="form-label">
                        Preferred Contact Method <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="preferred_contact_method"
                        value={formData.preferred_contact_method}
                        onChange={handleInputChange}
                        className={`form-input ${formerros.preferred_contact_method ? "!border-red-500" : ""}`}
                    >
                        <option value="">Select method</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                    </select>
                    {formerros.preferred_contact_method && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                        {formerros.preferred_contact_method}
                        </p>
                    )}
                    </div>
                </div>

                    {/* Tags */}
                    <div>
                    <label className="form-label">Tags</label>
                    <input
                        type="text"
                        name="tags"
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyDown={handleTagKeyDown}
                        className={`form-input ${formerros.tags ? "!border-red-500" : ""}`}
                        placeholder="Type a tag and press Enter (e.g. Engineering, Internship)"
                    />
                    {formerros.tags && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.tags}</p>
                    )}

                    {/* Render tag chips */}
                    {formData.tags && formData.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map((tag, idx) => (
                            <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800"
                            >
                            <span>{tag}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveTag(idx)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label={`Remove ${tag}`}
                            >
                                ×
                            </button>
                            </span>
                        ))}
                        </div>
                    )}
                    </div>

                {/* Availability Notes */}
                <div>
                    <label className="form-label">Availability <span className="text-red-500">*</span></label>
                    <textarea
                    name="availability_notes"
                    value={formData.availability_notes}
                    onChange={handleInputChange}
                    rows={4}
                    className={`form-input ${formerros.availability_notes ? "!border-red-500" : ""}`}
                    placeholder="e.g. Best reached Mon–Fri after 4 PM EST"
                    />
                    {formerros.availability_notes && (
                    <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.availability_notes}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel
                    </Button>
                    <Button type="submit">
                    {Editing ? "Update Referee" : "Save Referee"}
                    </Button>
                </div>
                </form>
         {formerros.Servererror && <p className="text-sm text-red-600 -mt-2 mb-2">{formerros.Servererror}</p>}

            </Card>
            </div>

          )}
                        </div>
                </div>
        </div>
);
}