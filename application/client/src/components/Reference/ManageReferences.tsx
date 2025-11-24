import { Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button"
import Card  from "../StyledComponents/Card"
import React, { useState, useEffect, useMemo } from "react";
import type { RefereeFormData,GetRefereeResponse,ReferenceImpact, ReferencePortfolioResponse, PortfolioReference } from "../../api/reference";
import { addnewReferee,getReferee,getAllReferee ,DeleteThisReferees ,logReferenceRelationship,  generateAppreciationMessage,getReferenceImpact,getReferencePortfolio } from "../../api/reference";
import { validateFields } from "../../utils/helpers";
import type { ValidationErrors } from "../../utils/helpers";
type OpportunityType =
  | "internship"
  | "full-time"
  | "co-op"
  | "research"
  | "grad-school";

export default function ManageReferences(){
  const navigate = useNavigate();

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
        availability_status: "",
        tags: [],
        last_used_at: "",
        usage_count: 0,
        preferred_opportunity_types: []
        

      });
    const [formerros,setformerros] = useState<ValidationErrors>({});
    const [tagInput, setTagInput] = useState("");
    const [referees, setReferees] = useState<GetRefereeResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
    const [EditRefId, setEditRefId] = useState("");
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const [activeRefForRelationship, setActiveRefForRelationship] =
      useState<GetRefereeResponse | null>(null);

    const [relationshipMode, setRelationshipMode] = useState<
      "log" | "generate"
    >("log");

    const [relationshipForm, setRelationshipForm] = useState({
      action: "sent_thank_you",
      message_content: "",
    });

    const [relSaving, setRelSaving] = useState(false);
    const [relError, setRelError] = useState<string | null>(null);
    const [impactByRefId, setImpactByRefId] = useState<
    Record<string, ReferenceImpact>
  >({});
  const [impactError, setImpactError] = useState<string | null>(null);

    // For AI-generated appreciation
    const [generatedMessage, setGeneratedMessage] = useState("");
    const [generatingMessage, setGeneratingMessage] = useState(false);
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
                  setImpactError(null);

                  const raw = localStorage.getItem("authUser");
                  const user = raw ? JSON.parse(raw).user : null;
                  if (!user?._id) throw new Error("Missing user session");

                  const [refRes, impactRes] = await Promise.all([
                    getAllReferee({ user_id: user._id }),
                    getReferenceImpact({ user_id: user._id }),
                  ]);

                  if (!alive) return;

                  setReferees(refRes.referees ?? []);

                  const map: Record<string, ReferenceImpact> = {};
                  (impactRes || []).forEach((item) => {
                    map[item.reference_id] = item;
                  });
                  setImpactByRefId(map);
                } catch (e: any) {
                  if (!alive) return;
                  setFetchError(e?.message ?? "Failed to load references.");
                  setImpactError(e?.message ?? "Failed to load reference impact.");
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
        availability_status: "",
        preferred_opportunity_types: [],
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

  const handleSaveRelationshipEntry = async () => {
    if (!activeRefForRelationship?._id) return;

    try {
      setRelSaving(true);
      setRelError(null);

      await logReferenceRelationship({
        referenceId: activeRefForRelationship._id,
        action: relationshipForm.action,
        message_content: relationshipForm.message_content || undefined,
      });

      // Optionally refresh list so relationship info is up to date
      const raw = localStorage.getItem("authUser");
      const user = raw ? JSON.parse(raw).user : null;
      if (user?._id) {
        const res = await getAllReferee({ user_id: user._id });
        setReferees(res.referees ?? []);
      }

      setShowRelationshipModal(false);
      setActiveRefForRelationship(null);
    } catch (err: any) {
      console.error("Failed to log relationship entry:", err);
      setRelError(
        err?.message || "Failed to log relationship entry. Please try again."
      );
    } finally {
      setRelSaving(false);
    }
  };

  const handleGenerateAppreciation = async () => {
    if (!activeRefForRelationship) return;

    try {
      setGeneratingMessage(true);
      setRelError(null);
      setGeneratedMessage("");

      // If you want to later pass job context, you can
      const resp = await generateAppreciationMessage({
        reference: activeRefForRelationship,
        job: null,
        type:
          relationshipForm.action === "sent_thank_you"
            ? "thank_you"
            : relationshipForm.action === "shared_update"
            ? "update"
            : "general",
      });

      setGeneratedMessage(resp.generated_message || "");
      // also copy into message_content for quick edit
      setRelationshipForm((prev) => ({
        ...prev,
        message_content: resp.generated_message || prev.message_content,
      }));
    } catch (err: any) {
      console.error("Failed to generate appreciation message:", err);
      setRelError(
        err?.message || "Failed to generate appreciation message."
      );
    } finally {
      setGeneratingMessage(false);
    }
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
                              <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate("/references/portfolio")}
                              >
                                View Portfolio
                              </Button>
                              <Button onClick={() => setShowAddrefForm(true)}>
                                Add Reference
                              </Button>
                            </div>
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
        const impact = impactByRefId[id]; 
        const lastRel =
          Array.isArray(ref.relationship_history) &&
          ref.relationship_history.length > 0
            ? ref.relationship_history[ref.relationship_history.length - 1]
            : null;
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
                      tags: ref.tags ?? [],
                      last_used_at: ref.last_used_at ?? "",
                      usage_count: ref.usage_count ?? 0,
                      availability_status: ref.availability_status ?? "",
                      preferred_opportunity_types:ref.preferred_opportunity_types ?? [],
                      preferred_number_of_uses: ref.preferred_number_of_uses ?? 0
                    });
                    setEditing(true);
                    setShowAddrefForm(true);
                    setEditRefId(ref._id);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </button>
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100"
                        onClick={() => {
                          setActiveRefForRelationship(ref);
                          setRelationshipMode("log");
                          setRelationshipForm({
                            action: "sent_thank_you",
                            message_content: "",
                          });
                          setGeneratedMessage("");
                          setRelError(null);
                          setShowRelationshipModal(true);
                        }}
                      >
                        Maintain
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

                    <div className="mt-3 flex flex-col gap-1 text-[11px] text-gray-500">
                      <div className="flex justify-between">
                        <span>
                          Used in {ref.usage_count ?? 0}{" "}
                          {ref.usage_count === 1 ? "application" : "applications"}
                        </span>
                        {ref.last_used_at && <span>Last used: {ref.last_used_at}</span>}
                      </div>

                      <div className="flex justify-between items-center">
                        <span>
                          Last contact:{" "}
                          {lastRel
                            ? new Date(lastRel.created_at).toLocaleDateString()
                            : "No contact logged yet"}
                        </span>

                        {/* simple “health” chip */}
                        {lastRel ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Relationship active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Needs check-in
                          </span>
                        )}

                                {impact ? (
                                <div className="flex justify-between">
                                  <span>
                                    Impact: {impact.applications} apps, {impact.interviews} interviews,{" "}
                                    {impact.offers} offers
                                  </span>
                                  <span>
                                    Offer rate: {Math.round((impact.success_rate || 0) * 100)}%
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-between">
                                  <span>No outcome data yet</span>
                                </div>
                              )}
                      </div>
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
                    {/* Preferred Opp */}
            <div>
              <label className="form-label">Best suited for</label>
              <select
                multiple
                name="preferred_opportunity_types"
                value={formData.preferred_opportunity_types ?? []}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setFormData(prev => ({ ...prev, preferred_opportunity_types: options }));
                }}
                className="form-input h-24"
              >
                        <option value=""></option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Freelance">Freelance</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                We’ll use this to recommend the best references for each job type.
              </p>
            </div>
                <div>
                  <label className="form-label">Max uses per year (optional)</label>
                  <input
                    type="number"
                    min={1}
                    name="preferred_number_of_uses"
                    value={formData.preferred_number_of_uses ?? ""}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        preferred_number_of_uses: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="form-input"
                    placeholder="e.g. 3 (leave blank for no limit)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We’ll warn you if you go over this number.
                  </p>
                </div>

                {/* Availability */}
            <div>
              <label className="form-label">
                Availability <span className="text-red-500">*</span>
              </label>
              <select
                name="availability_status"
                value={formData.availability_status}
                onChange={handleInputChange}
                className={`form-input ${formerros.availability_status ? "!border-red-500" : ""}`}
              >
                <option value="">Select availability</option>
                <option value="available">Available</option>
                <option value="limited">Limited / case-by-case</option>
                <option value="unavailable">Not available currently</option>
                <option value="other">Other (see note)</option>
              </select>
              {formerros.availability_status && (
                <p className="text-sm text-red-600 -mt-2 mb-2">
                  {formerros.availability_status}
                </p>
              )}
            </div>

            {formData.availability_status === "other" && (
              <div className="mt-3">
                <label className="form-label">Availability note</label>
                <textarea
                  name="availability_other_note"
                  value={formData.availability_other_note || ""}
                  onChange={handleInputChange}
                  rows={3}
                  className="form-input"
                  placeholder="e.g. Only for grad school or after May 2026"
                />
              </div>
            )}


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


                {showRelationshipModal && activeRefForRelationship && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="bg-white rounded-lg p-6 max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Maintain Relationship
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  {activeRefForRelationship.full_name} —{" "}
                  {activeRefForRelationship.title}{" "}
                  {activeRefForRelationship.organization &&
                    ` @ ${activeRefForRelationship.organization}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRelationshipModal(false);
                  setActiveRefForRelationship(null);
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex border-b mb-4 text-sm">
              <button
                type="button"
                className={`px-3 py-2 ${
                  relationshipMode === "log"
                    ? "border-b-2 border-indigo-600 text-indigo-700 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setRelationshipMode("log")}
              >
                Log Interaction
              </button>
              <button
                type="button"
                className={`px-3 py-2 ${
                  relationshipMode === "generate"
                    ? "border-b-2 border-indigo-600 text-indigo-700 font-medium"
                    : "text-gray-500"
                }`}
                onClick={() => setRelationshipMode("generate")}
              >
                Generate Message
              </button>
            </div>

            {relError && (
              <p className="text-sm text-red-600 mb-2">{relError}</p>
            )}

            {relationshipMode === "log" && (
              <div className="space-y-4 text-sm">
                <div>
                  <label className="form-label text-sm">
                    Interaction type
                  </label>
                  <select
                    className="form-input w-full"
                    value={relationshipForm.action}
                    onChange={(e) =>
                      setRelationshipForm((prev) => ({
                        ...prev,
                        action: e.target.value,
                      }))
                    }
                  >
                    <option value="sent_thank_you">Sent thank-you</option>
                    <option value="shared_update">
                      Shared job search update
                    </option>
                    <option value="check_in">Reconnected / check-in</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label text-sm">
                    Notes or message (optional)
                  </label>
                  <textarea
                    rows={4}
                    className="form-input w-full"
                    placeholder="What did you send or talk about?"
                    value={relationshipForm.message_content}
                    onChange={(e) =>
                      setRelationshipForm((prev) => ({
                        ...prev,
                        message_content: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowRelationshipModal(false);
                      setActiveRefForRelationship(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveRelationshipEntry}
                    disabled={relSaving}
                  >
                    {relSaving ? "Saving..." : "Save to history"}
                  </Button>
                </div>
              </div>
            )}

            {relationshipMode === "generate" && (
              <div className="space-y-4 text-sm">
                <div className="text-xs text-gray-600">
                  Choose the type of message you want and we’ll draft something
                  you can send, then optionally save it to your relationship
                  log.
                </div>

                <div>
                  <label className="form-label text-sm">
                    Message purpose
                  </label>
                  <select
                    className="form-input w-full"
                    value={relationshipForm.action}
                    onChange={(e) =>
                      setRelationshipForm((prev) => ({
                        ...prev,
                        action: e.target.value,
                      }))
                    }
                  >
                    <option value="sent_thank_you">Thank-you message</option>
                    <option value="shared_update">
                      Job update / progress
                    </option>
                    <option value="check_in">General check-in</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateAppreciation}
                    disabled={generatingMessage}
                  >
                    {generatingMessage ? "Generating..." : "Generate message"}
                  </Button>
                </div>

                <div>
                  <label className="form-label text-sm">
                    Message (editable)
                  </label>
                  <textarea
                    rows={6}
                    className="form-input w-full"
                    placeholder="Generated message will appear here..."
                    value={relationshipForm.message_content}
                    onChange={(e) =>
                      setRelationshipForm((prev) => ({
                        ...prev,
                        message_content: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        relationshipForm.message_content || ""
                      );
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveRelationshipEntry}
                    disabled={relSaving || !relationshipForm.message_content}
                  >
                    {relSaving ? "Saving..." : "Save to history"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

                </div>
                {/* <h1>{referees[0].full_name}</h1> */}
        </div>
);
}