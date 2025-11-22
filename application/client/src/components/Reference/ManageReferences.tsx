import { Edit } from "lucide-react";
import Button from "../StyledComponents/Button"
import Card  from "../StyledComponents/Card"
import React, { useState, useEffect, useMemo } from "react";
import type { RefereeFormData,GetRefereeResponse} from "../../api/reference";
import { addnewReferee,getReferee,getAllReferee ,DeleteThisReferees} from "../../api/reference";
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
    const [referees, setReferees] = useState<GetRefereeResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
    const [EditRefId, setEditRefId] = useState("");

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
    if (EditRefId){
      payload.referenceid = EditRefId
    }
 try{
    const  response = await addnewReferee(payload)
    if (response){
      if (!Editing){
        addRefereetolist(response._id,user._id)
        resetForm()
      }
      else{ 
      setReferees((prev) =>
      prev.map((r) =>
        getRefId(r._id) === response._id // or response.referee_id depending on your API
          ? { ...r, ...payload }    // use updated data from backend
          : r
      )
    );
    resetForm();
        resetForm()
      }
    }
   
    } catch (error) {
      console.error("Error saving Referee:", error);
      setformerros({"Servererror": "Something went wrong"})
    }
   
  };

  const addRefereetolist = async (refrenceid: string,userid: string) =>{
    try {
    const referee = await getReferee({referee_id: refrenceid,user_id:userid})
  setReferees(prev => {
    const next = [...prev, referee];
    return next;
  });
    }
    catch(error){
      console.error("Error saving Referee:", error);
      setformerros({"Servererror": "Something went wrong"})
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setFetchError(null);

        const raw = localStorage.getItem("authUser");
        const user = raw ? JSON.parse(raw).user : null;
        if (!user?._id) throw new Error("Missing user session");

        const res = await getAllReferee({ user_id: user._id }); 
        if (!alive) return;
        setReferees(res.referees ?? []);
      } catch (e: any) {
        if (!alive) return;
        setFetchError(e?.message ?? "Failed to load references.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
      setEditRefId("")
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

  const filteredReferees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return referees;

    return referees.filter((r) => {
      const fields = [
        r._id,
        r.full_name,
        r.title,
        r.organization,
        r.relationship,
        r.email,
        Array.isArray(r.tags) ? r.tags.join(" ") : "",
      ];
      return fields.some((f) => f?.toLowerCase().includes(q));
    });
  }, [referees, searchTerm]);
const getRefId = (referee_id: string) =>   referee_id ;


  const handleDeleteOne = async (id: string) => {
  try {
    const response = await DeleteThisReferees({referee_ids: [id]})
    if (response.completed == true){
    setReferees((prev) => prev.filter((r) => getRefId(r._id) !== id));
    setSelectedRefIds((prev) => prev.filter((x) => x !== id));
    setEditRefId("")
    resetForm()
    }
    else {
    setformerros({ Servererror: "Failed to delete selected references. Please try again." });
    }

  } catch (err) {
    console.error("Failed to delete referee", err);
    setformerros({ Servererror: "Failed to delete reference. Please try again." });
  }
};



const handleDeleteSelected = async () => {
  if (selectedRefIds.length === 0) return;
  try {

    const response = await DeleteThisReferees({referee_ids: selectedRefIds})
    if (response.completed == true){
    setReferees((prev) => prev.filter((r) => !selectedRefIds.includes(getRefId(r._id))));
    setSelectedRefIds([]);
    }
    else {
    setformerros({ Servererror: "Failed to delete selected references. Please try again." });
    }
  } catch (err) {
    console.error("Failed to delete selected referees", err);
    setformerros({ Servererror: "Failed to delete selected references. Please try again." });
  }
};

const toggleSelectRef = (id: string) => {
  setSelectedRefIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );
};

return (
        <div className="p-6 min-h-screen">
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
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                            <Button
                            onClick={() => setShowAddrefForm(true)}
                            >
                            Add Reference
                            </Button>
                </div> 
            {fetchError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Something went wrong.</p>
            <p>{fetchError}</p>
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-500 mt-4">Loading references…</p>
        )}

         {!loading && !fetchError && referees.length === 0 && (
          <Card className="mt-4 p-6 flex flex-col items-start gap-2">
            <h2 className="text-lg font-semibold">No references yet</h2>
            <p className="text-sm text-gray-600">
              Add your first professional reference so you can quickly attach
              them to job applications.
            </p>
            <Button
              className="mt-3"
              onClick={() => setShowAddrefForm(true)}
            >
              Add your first reference
            </Button>
          </Card>
        )}
        {!loading &&
          !fetchError &&
          referees.length > 0 &&
          filteredReferees.length === 0 && (
            <Card className="mt-4 p-4">
              <p className="text-sm text-gray-600">
                No references match “{searchTerm}”. Try a different name,
                company, or role.
              </p>
            </Card>
          )}


{!loading && filteredReferees.length > 0 && (
  <>
    {/* Bulk delete toolbar when something is selected */}
    {selectedRefIds.length > 0 && (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-600">
          {selectedRefIds.length} reference
          {selectedRefIds.length > 1 ? "s" : ""} selected
        </p>
        <Button
          variant="secondary"
          className="!bg-red-50 !text-red-700 hover:!bg-red-100 border border-red-200"
          type="button"
          onClick={handleDeleteSelected}
        >
          Delete selected
        </Button>
      </div>
    )}

    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {filteredReferees.map((ref) => {
        const id = ref._id;
        const isSelected = selectedRefIds.includes(id);

        return (
          <Card
            key={id}
            className={`p-4 flex flex-col justify-between rounded-lg border transition
              ${
                isSelected
                  ? "border-red-500 bg-red-50 ring-1 ring-red-200"
                  : "border-gray-200 hover:border-gray-300"
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              {/* custom selection dot + info */}
              <div className="flex items-start gap-2">
                {/* custom red selector instead of native checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelectRef(id)}
                  className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center transition
                    ${
                      isSelected
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300 bg-white hover:border-red-300"
                    }
                  `}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <span className="block h-2 w-2 rounded-full bg-white" />
                  )}
                </button>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {ref.full_name || "Unnamed reference"}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {ref.title || "Title not set"}
                    {ref.organization && ` • ${ref.organization}`}
                  </p>
                  {ref.relationship && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                      {ref.relationship}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit + delete actions */}
              <div className="flex flex-col gap-1 items-end">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setFormData({
                      full_name: ref.full_name ?? "",
                      title: ref.title ?? "",
                      organization: ref.organization ?? "",
                      relationship: ref.relationship ?? "",
                      email: ref.email ?? "",
                      phone: ref.phone ?? "",
                      preferred_contact_method:
                        ref.preferred_contact_method ?? "",
                      availability_notes: ref.availability_notes ?? "",
                      tags: ref.tags ?? [],
                      last_used_at: ref.last_used_at ?? "",
                      usage_count: ref.usage_count ?? 0,
                    });
                    setEditing(true);
                    setShowAddrefForm(true);
                    setEditRefId(ref._id);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </button>


              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs text-gray-600">
              {ref.email && <p>Email: {ref.email}</p>}
              {ref.phone && <p>Phone: {ref.phone}</p>}
              {ref.preferred_contact_method && (
                <p>
                  Preferred:{" "}
                  {ref.preferred_contact_method === "email"
                    ? "Email"
                    : ref.preferred_contact_method === "phone"
                    ? "Phone"
                    : ref.preferred_contact_method}
                </p>
              )}
            </div>

            {Array.isArray(ref.tags) && ref.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {ref.tags.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                Used in {ref.usage_count ?? 0}{" "}
                {ref.usage_count === 1 ? "application" : "applications"}
              </span>
              {ref.last_used_at && <span>Last used: {ref.last_used_at}</span>}
            </div>
          </Card>
        );
      })}
    </div>
  </>
)}


        {ShowFormRef && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="bg-white rounded-lg p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {Editing ? "Edit Referee" : "Add Referee"}
              </h2>

              {Editing && (
                <button
                  type="button"
                  onClick={() => handleDeleteOne(EditRefId)}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 
                            text-sm font-medium text-red-700 hover:bg-red-100 shadow-sm"
                >
                  Delete
                </button>
              )}
            </div>
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
                {/* <h1>{referees[0].full_name}</h1> */}
        </div>
);
}