import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import type { Contact } from "../../api/contact";

// ----------------------
// Validation Helpers
// ----------------------
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return /^[\d\-\+\(\) ]{7,20}$/.test(phone);
}

// ----------------------
// Reusable Field Component
// ----------------------
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  type?: string;
}

function Field({ label, value, onChange, required = false, error = "", type = "text" }: FieldProps) {
  return (
    <label className="block mb-4">
      <span className="font-medium">{label}{required && "*"}</span>
      <input
        type={type}
        className={`w-full border p-3 rounded mt-1 transition 
          ${error ? "border-red-500 bg-red-50" : "border-gray-300"}
        `}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </label>
  );
}

export default function ContactEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Contact>({
    _id: "",
    userid: "",
    name: "",
    jobTitle: "",
    company: "",
    email: "",
    phone: "",
    industry: "",
    relationshipType: "",
    tags: [],
    relationshipStrength: 50,
    lastInteraction: null,
    interactions: [],
    personalNotes: "",
    professionalNotes: "",
    linkedJobs: [],
    reminderDate: null,
    aiSummary: "",
    aiNextSteps: "",
    aiInterests: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // -------------------------------
  // Auth Header
  // -------------------------------
  function authHeaders() {
    const auth = localStorage.getItem("authUser");
    const token = auth ? JSON.parse(auth).token : null;

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  // -------------------------------
  // Load Contact if editing
  // -------------------------------
  useEffect(() => {
    async function load() {
      if (!isEdit) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/networking/contacts/${id}`, {
          headers: authHeaders(),
        });

        if (!res.ok) throw new Error("Failed to load contact");
        const data: Contact = await res.json();
        setForm(data);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // -------------------------------
  // Field Updater
  // -------------------------------
  function updateField(field: keyof Contact, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  }

  // -------------------------------
  // Validation Logic
  // -------------------------------
  function validateField(field: keyof Contact, value: any) {
    let message = "";

    if (field === "name" && !value.trim()) {
      message = "Name is required.";
    }

    if (field === "email" && value && !validateEmail(value)) {
      message = "Invalid email format.";
    }

    if (field === "phone" && value && !validatePhone(value)) {
      message = "Invalid phone number.";
    }

    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Name is required.";
    if (form.email && !validateEmail(form.email))
      newErrors.email = "Email format is invalid.";
    if (form.phone && !validatePhone(form.phone))
      newErrors.phone = "Phone format is invalid.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // -------------------------------
  // Save Contact
  // -------------------------------
  async function save() {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const raw = localStorage.getItem("authUser");
    if (!raw) return alert("Not logged in.");

    const user = JSON.parse(raw).user;

    const payload = {
      name: form.name,
      jobTitle: form.jobTitle,
      company: form.company,
      email: form.email,
      phone: form.phone,
      industry: form.industry,
      relationshipType: form.relationshipType,
      tags: form.tags,
      personalNotes: form.personalNotes,
      professionalNotes: form.professionalNotes,
      reminderDate: form.reminderDate,
      userid: user._id,
    };

    const res = await fetch(
      isEdit
        ? `${API_BASE}/api/networking/contacts/${id}`
        : `${API_BASE}/api/networking/contacts`,
      {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) navigate("/networking/contacts");
    else alert(await res.text());
  }

  if (loading) return <div>Loading contact editor…</div>;

return (
  <div className="max-w-3xl mx-auto p-6">
    
    {/* Back Button */}
    <button
      onClick={() => navigate(-1)}
      className="text-sm mb-6 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 transition"
    >
      ← Back
    </button>

    {/* Page Title */}
    <h1 className="text-4xl font-bold mb-8 text-center tracking-tight">
      {isEdit ? "Edit Contact" : "Add New Contact"}
    </h1>

    {/* Outer Card */}
    <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100 space-y-10">
      
      {/* SECTION: General Info */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">General Information</h2>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Name */}
          <Field
            label="Full Name"
            required
            value={form.name}
            onChange={(v) => updateField("name", v)}
            error={errors.name}
          />

          {/* Job Title */}
          <Field
            label="Job Title"
            value={form.jobTitle ?? ""}
            onChange={(v) => updateField("jobTitle", v)}
          />

          {/* Company */}
          <Field
            label="Company"
            value={form.company ?? ""}
            onChange={(v) => updateField("company", v)}
          />

          {/* Industry */}
          <Field
            label="Industry"
            value={form.industry ?? ""}
            onChange={(v) => updateField("industry", v)}
          />
        </div>
      </div>

      {/* SECTION: Contact */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Contact Details</h2>

        <div className="grid md:grid-cols-2 gap-6">

          <Field
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(v) => updateField("email", v)}
            error={errors.email}
          />

          <Field
            label="Phone"
            value={form.phone ?? ""}
            onChange={(v) => updateField("phone", v)}
            error={errors.phone}
          />
        </div>
      </div>

      {/* SECTION: Notes */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Notes</h2>

        <label className="block mb-4">
          <span className="font-medium">Personal Notes</span>
          <textarea
            className="w-full border p-3 rounded-lg mt-1 bg-gray-50"
            rows={3}
            value={form.personalNotes ?? ""}
            onChange={(e) => updateField("personalNotes", e.target.value)}
          />
        </label>

        <label className="block mb-4">
          <span className="font-medium">Professional Notes</span>
          <textarea
            className="w-full border p-3 rounded-lg mt-1 bg-gray-50"
            rows={3}
            value={form.professionalNotes ?? ""}
            onChange={(e) => updateField("professionalNotes", e.target.value)}
          />
        </label>
      </div>

      {/* SECTION: Reminder */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Reminder</h2>

        <label className="block mb-6">
          <span className="font-medium">Reminder Date</span>
          <input
            type="date"
            className="w-full border p-3 rounded-lg mt-1 bg-gray-50"
            value={
              form.reminderDate
                ? new Date(form.reminderDate).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => updateField("reminderDate", e.target.value)}
          />
        </label>
      </div>

      {/* SAVE BUTTON */}
      <div className="pt-4">
        <button
          onClick={save}
          disabled={Object.values(errors).some((e) => e)}
          className={`w-full py-3 text-lg font-semibold rounded-lg text-white transition 
            ${Object.values(errors).some((e) => e)
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 shadow-md"
            }`}
        >
          {isEdit ? "Save Changes" : "Create Contact"}
        </button>
      </div>

    </div>
  </div>
);

}
