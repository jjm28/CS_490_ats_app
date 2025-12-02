import { useState, useEffect } from "react";
import {
  createReferralRequest,
  generateReferralTemplate,
} from "../../api/referrals";

import ReferralInsights from "./ReferralInsights";
import ReferralSourceGenerator from "./ReferralSourceGenerator";

interface ReferralRequestForm {
  jobId: string;
  referrerName: string;
  referrerEmail: string;
  relationship: string;
  requestMessage: string;
}

export default function ReferralRequestModal({
  contact,
  job,
  tone,
  onClose,
  reload,
}: {
  contact: any;
  job: any;
  tone: string;
  onClose: () => void;
  reload: () => void;
}) {
  /* ======================================================
     INITIAL FORM POPULATION
  ====================================================== */
  const [form, setForm] = useState<ReferralRequestForm>({
    jobId: job?._id || "",
    referrerName: contact?.name || "",
    referrerEmail: contact?.email || "",
    relationship: "",
    requestMessage: "",
  });

  const [loading, setLoading] = useState(false);

  /* Handle field updates */
  const updateField = (field: keyof ReferralRequestForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ======================================================
     AI TEMPLATE GENERATION
  ====================================================== */
  const generateTemplate = async () => {
    setLoading(true);

    try {
      const resp = await generateReferralTemplate({
        userName: contact?.name,
        jobTitle: job?.jobTitle,
        relationship: form.relationship,
        tone,
      });

      updateField("requestMessage", resp?.data?.template || "");
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  /* ======================================================
     SUBMIT REFERRAL REQUEST
  ====================================================== */
  const handleSubmit = async () => {
    setLoading(true);

    try {
      await createReferralRequest(form);
      reload();
      onClose();
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Request a Referral</h2>

        {/* Job Title Display */}
        <label className="block text-sm font-medium">Job Title</label>
        <input
          className="w-full border rounded p-2 mb-3 bg-gray-100"
          value={job?.jobTitle || ""}
          disabled
        />

        {/* Contact Name */}
        <label className="block text-sm font-medium">Referrer's Name</label>
        <input
          className="w-full border rounded p-2 mb-3"
          value={form.referrerName}
          onChange={(e) => updateField("referrerName", e.target.value)}
        />

        {/* Contact Email */}
        <label className="block text-sm font-medium">Referrer's Email</label>
        <input
          className="w-full border rounded p-2 mb-3"
          value={form.referrerEmail}
          onChange={(e) => updateField("referrerEmail", e.target.value)}
        />

        {/* Relationship */}
        <label className="block text-sm font-medium">Relationship</label>
        <input
          className="w-full border rounded p-2 mb-4"
          value={form.relationship}
          onChange={(e) => updateField("relationship", e.target.value)}
          placeholder="Former manager, colleague, mentor..."
        />

        {/* Message */}
        <label className="block text-sm font-medium">
          Referral Request Message
        </label>
        <textarea
          className="w-full border rounded p-2 h-28"
          value={form.requestMessage}
          onChange={(e) => updateField("requestMessage", e.target.value)}
          placeholder="Write your referral request..."
        />

        {/* AI Template Button */}
        <button
          onClick={generateTemplate}
          disabled={loading}
          className="mt-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded w-full"
        >
          {loading ? "Generating..." : "Generate AI Message"}
        </button>

        {/* Insights */}
        <ReferralInsights
          jobTitle={job?.jobTitle}
          relationship={form.relationship}
        />

        {/* AI Referral Source Generator */}
        <ReferralSourceGenerator
          onSelect={(c) => {
            updateField("referrerName", c.name);
            updateField("referrerEmail", c.email || "");
            updateField(
              "relationship",
              c.relationshipStrength || "Professional contact"
            );
          }}
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Submitting..." : "Submit Referral Request"}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          disabled={loading}
          className="mt-2 text-sm underline text-gray-500 w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
