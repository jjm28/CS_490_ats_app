import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../StyledComponents/Button";
import {
  type Employment,
  createEmployment,
  updateEmployment,
  getEmployment,
} from "../../api/employment";

const LIMITS = {
  TITLE_MAX: 150,
  COMPANY_MAX: 150,
  LOCATION_MAX: 150,
  DESC_MAX: 1000,
};

// build yyyy-mm-dd
const toYMD = (d: Date) => d.toISOString().slice(0, 10);
const TODAY = toYMD(new Date());
const YESTERDAY = toYMD(new Date(Date.now() - 24 * 60 * 60 * 1000));

const empty: Employment = {
  jobTitle: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  currentPosition: false,
  description: "",
};

const EmploymentForm: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const employmentId = params.id || null;
  const isEdit = !!employmentId;

  const [values, setValues] = useState<Employment>(empty);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!employmentId) return;
      try {
        const data = await getEmployment(employmentId);
        if (!cancelled) {
          setValues({
            ...empty,
            ...data,
            startDate: data.startDate ? data.startDate.slice(0, 10) : "",
            endDate: data.endDate ? data.endDate.slice(0, 10) : "",
          });
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load entry.");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [employmentId]);

  const onChange =
    (field: keyof Employment) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;

      setValues((prev) => {
        const next = { ...prev, [field]: v } as Employment;
        // clear end when current = true
        if (field === "currentPosition" && v === true) next.endDate = "";
        return next;
      });
    };

  const validate = () => {
    if (!values.jobTitle.trim()) return "Job title is required.";
    if (!values.company.trim()) return "Company name is required.";
    if (!values.startDate) return "Start date is required.";

    // start ≤ today
    if (new Date(values.startDate) > new Date(TODAY)) {
      return "Start date cannot be in the future.";
    }

    if (!values.currentPosition) {
      if (!values.endDate) return "End date is required.";
      // end ≤ yesterday
      if (new Date(values.endDate) > new Date(YESTERDAY)) {
        return "End date must be on or before yesterday.";
      }
      // start ≤ end
      if (new Date(values.startDate) > new Date(values.endDate)) {
        return "Start date must be before end date.";
      }
    }

    if (values.jobTitle.length > LIMITS.TITLE_MAX) return "Job title too long.";
    if (values.company.length > LIMITS.COMPANY_MAX) return "Company too long.";
    if ((values.location || "").length > LIMITS.LOCATION_MAX) return "Location too long.";
    if ((values.description || "").length > LIMITS.DESC_MAX) return "Description too long.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const v = validate();
    if (v) return setErr(v);

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        endDate: values.currentPosition ? null : values.endDate || null,
      };

      if (isEdit && employmentId) {
        await updateEmployment(employmentId, payload);
        setSuccess("Entry updated.");
      } else {
        await createEmployment(payload as Employment);
        setSuccess("Entry saved.");
        setValues(empty); // clear after create
      }

      navigate("/EmploymentPage");

      //setTimeout(() => navigate("/Employment"), 800);
    } catch (e: any) {
      setErr(e?.message || "Could not save.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = () => navigate("/EmploymentPage");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isEdit ? "Edit Employment" : "Add Employment"}
      </h1>
      <p className="text-gray-600 mb-6">
        Add your work experience. Fields marked * are required.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-900">Job title *</label>
          <input
            value={values.jobTitle}
            onChange={onChange("jobTitle")}
            required
            maxLength={LIMITS.TITLE_MAX}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="Software Engineer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900">Company *</label>
          <input
            value={values.company}
            onChange={onChange("company")}
            required
            maxLength={LIMITS.COMPANY_MAX}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="Acme Corp"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900">Location</label>
          <input
            value={values.location || ""}
            onChange={onChange("location")}
            maxLength={LIMITS.LOCATION_MAX}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="Newark, NJ"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">Start date *</label>
            <input
              type="date"
              value={values.startDate}
              onChange={onChange("startDate")}
              required
              max={TODAY} // start ≤ today
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">
              End date{values.currentPosition ? " (disabled)" : ""}
            </label>
            <input
              type="date"
              value={values.endDate || ""}
              onChange={onChange("endDate")}
              disabled={values.currentPosition}
              required={!values.currentPosition}
              max={YESTERDAY} // end ≤ yesterday
              className={`mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm ${
                values.currentPosition ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="currentPosition"
            type="checkbox"
            checked={values.currentPosition}
            onChange={onChange("currentPosition")}
          />
          <label htmlFor="currentPosition" className="text-sm text-gray-900">
            Current position
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900">
            Job description
          </label>
          <textarea
            value={values.description || ""}
            onChange={onChange("description")}
            rows={5}
            maxLength={LIMITS.DESC_MAX}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="What did you do in this role?"
          />
          <div className="text-xs text-gray-500 mt-1">
            {`${(values.description || "").length}/${LIMITS.DESC_MAX}`}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
              ? "Save changes"
              : "Save entry"}
          </Button>
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </form>
    </div>
  );
};

export default EmploymentForm;
