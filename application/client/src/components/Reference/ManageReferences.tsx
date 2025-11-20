import { Edit } from "lucide-react";
import Button from "../StyledComponents/Button"
import Card  from "../StyledComponents/Card"
import React, { useState, useEffect, useMemo } from "react";
import type { RefereeFormData } from "../../api/reference";
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
        tags: [""],
        last_used_at: "",
        usage_count: 0,
      });
    const [formerros,setformerros] = useState<ValidationErrors>({});

    const handleSubmit =  async (e: React.FormEvent) => {
    e.preventDefault();
    setformerros({});

    }
    const resetForm = () => {
        setShowAddrefForm(false)
        setEditing(false)
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
                  {Editing ? "Edit Referees" : "Add Referee"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        name="FullName"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className={`form-input ${
                          formerros.jobTitle ? "!border-red-500" : ""
                        }`}
                        placeholder="e.g. Senior Software Engineer"
                      />
                      {formerros.jobTitle && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {formerros.jobTitle}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Preferred Contact Method *</label>
                      <select
                        name="type"
                        value={formData.preferred_contact_method}
                        onChange={handleInputChange}
                        className={`form-input ${
                          formerros.type ? "!border-red-500" : ""
                        }`}
                      >
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>

                      </select>
                      {formerros.preferred_contact_method && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {formerros.preferred_contact_method}
                        </p>
                      )}
                    </div>

              
               
                  </div>


    

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {Editing ? "Update Opportunity" : "Save Opportunity"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
                        </div>
                </div>
        </div>
);
}