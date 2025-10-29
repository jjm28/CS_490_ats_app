import React, { useMemo, useState, useEffect } from "react";
import Button from "./StyledComponents/Button";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  type Profile,
  createProfile,
  updateProfile,
  getProfile,
} from "../api/profiles";

const EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Executive"] as const;
const INDUSTRIES = [
  "Software",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Other",
] as const;

const LIMITS = {
  NAME_MAX: 100,
  CITY_MAX: 100,
  STATE_MAX: 100,
  BIO_MAX: 500,
  HEADLINE_MAX: 150,
};

const empty: Profile = {
  fullName: "",
  email: "",
  phone: "",
  headline: "",
  bio: "",
  industry: "Other",
  experienceLevel: "Entry",
  location: { city: "", state: "" },
};

const ProfileForm: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const profileId = params.id || null;

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [values, setValues] = useState<Profile>(empty);
  const isEdit = !!profileId;

  // Prefill if editing
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!profileId) return;
      try {
        const data = await getProfile(profileId);
        if (!cancelled) setValues({
          ...empty,
          ...data,
          location: { city: data.location?.city || "", state: data.location?.state || "" },
        });
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load profile.");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [profileId]);

  const onChange =
    (field: keyof Profile) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (field === "location") return; // handled separately
      setValues((v) => ({ ...v, [field]: e.target.value }));
    };

  const onChangeCity = (e: React.ChangeEvent<HTMLInputElement>) => {
    const city = e.target.value;
    setValues((v) => ({ ...v, location: { ...v.location, city } }));
  };
  const onChangeState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const state = e.target.value;
    setValues((v) => ({ ...v, location: { ...v.location, state } }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      if (values.fullName.length > LIMITS.NAME_MAX) throw new Error("Full name is too long.");
      if (values.headline.length > LIMITS.HEADLINE_MAX) throw new Error("Headline is too long.");
      if (values.bio.length > LIMITS.BIO_MAX) throw new Error("Bio is too long.");
      if (values.location.city && values.location.city.length > LIMITS.CITY_MAX) throw new Error("City is too long.");
      if (values.location.state && values.location.state.length > LIMITS.STATE_MAX) throw new Error("State is too long.");

      if (isEdit && profileId) {
        await updateProfile(profileId, values);
        navigate("/ProfilePage", { state: { flash: "Profile updated." } });
      } else {
        await createProfile(values);
        navigate("/ProfilePage", { state: { flash: "Profile created." } });
      }
    } catch (e: any) {
      setErr(e?.message || "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isEdit ? "Edit Profile" : "Profile"}
      </h1>
      <p className="text-gray-600 mb-6">
        Tell us about yourself. Fields marked * are required.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Full name *</label>
          <input
            required
            maxLength={LIMITS.NAME_MAX}
            value={values.fullName}
            onChange={onChange("fullName")}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="Alex Johnson"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Email *</label>
          <input
            type="email"
            required
            value={values.email}
            onChange={onChange("email")}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Phone</label>
          <input
            value={values.phone}
            onChange={onChange("phone")}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="+1 555-123-4567"
          />
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Headline</label>
          <input
            maxLength={LIMITS.HEADLINE_MAX}
            value={values.headline}
            onChange={onChange("headline")}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="Full-stack developer seeking new opportunities"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-900">Bio</label>
          <textarea
            rows={4}
            maxLength={LIMITS.BIO_MAX}
            value={values.bio}
            onChange={onChange("bio")}
            className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            placeholder="Tell us about your experience, interests, and goals…"
          />
        </div>

        {/* Industry & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">Industry</label>
            <select
              value={values.industry}
              onChange={onChange("industry")}
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            >
              {INDUSTRIES.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">Experience level</label>
            <select
              value={values.experienceLevel}
              onChange={onChange("experienceLevel")}
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
            >
              {EXPERIENCE_LEVELS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">City</label>
            <input
              value={values.location.city || ""}
              onChange={onChangeCity}
              maxLength={LIMITS.CITY_MAX}
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
              placeholder="Newark"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">State</label>
            <input
              value={values.location.state || ""}
              onChange={onChangeState}
              maxLength={LIMITS.STATE_MAX}
              className="mt-1 block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
              placeholder="NJ"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? (isEdit ? "Updating…" : "Saving…") : (isEdit ? "Save changes" : "Save profile")}
          </Button>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </div>
  );
};

export default ProfileForm;
