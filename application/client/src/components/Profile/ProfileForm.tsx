// application/client/src/components/ProfileForm.tsx
import React, { useState, useEffect } from "react";
import Button from "../StyledComponents/Button";
import { useNavigate, useParams } from "react-router-dom";
import {
  type Profile,
  createProfile,
  updateProfile,
  getProfile,
} from "../../api/profiles";
import Card from "../StyledComponents/Card";
import ProfilePhotoUploader from "./ProfilePhotoUploader";

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
  photoUrl: "",
};

const ProfileForm: React.FC = () => {
  const navigate = useNavigate();
  const { id: profileId } = useParams<{ id?: string }>();
  const [values, setValues] = useState<Profile>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = !!profileId;

  // Load profile if editing
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const data = await getProfile(profileId);
        setValues({
          ...empty,
          ...data,
          location: {
            city: data.location?.city || "",
            state: data.location?.state || "",
          },
          photoUrl: data.photoUrl || "",
        });
      } catch (e: any) {
        setErr(e?.message || "Failed to load profile.");
      }
    })();
  }, [profileId]);

  const onChange =
    (field: keyof Profile) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const onChangeCity = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, location: { ...v.location, city: e.target.value } }));
  };
  const onChangeState = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, location: { ...v.location, state: e.target.value } }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isEdit ? "Edit Profile" : "Create Profile"}
      </h1>
      <p className="text-gray-600 mb-6">Tell us about yourself. * fields are required.</p>

      <form onSubmit={onSubmit} className="space-y-5">
        <Card>
          {values._id && (
            <div className="mb-6">
              <ProfilePhotoUploader
                profileId={values._id}
                photoUrl={values.photoUrl}
                onChange={(url) => setValues((v) => ({ ...v, photoUrl: url }))}
              />
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="form-label">Full name *</label>
            <input
              required
              maxLength={LIMITS.NAME_MAX}
              value={values.fullName}
              onChange={onChange("fullName")}
              className="form-input"
              placeholder="Alex Johnson"
            />
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email *</label>
            <input
              type="email"
              required
              value={values.email}
              onChange={onChange("email")}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="form-label">Phone</label>
            <input
              value={values.phone}
              onChange={onChange("phone")}
              className="form-input"
              placeholder="+1 555-123-4567"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="form-label">Headline</label>
            <input
              value={values.headline}
              onChange={onChange("headline")}
              maxLength={LIMITS.HEADLINE_MAX}
              className="form-input"
              placeholder="Full-stack developer seeking new opportunities"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="form-label">Bio</label>
            <textarea
              rows={4}
              value={values.bio}
              onChange={onChange("bio")}
              maxLength={LIMITS.BIO_MAX}
              className="form-input"
              placeholder="Tell us about your experience, interests, and goals…"
            />
          </div>

          {/* Industry / Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Industry</label>
              <select
                value={values.industry}
                onChange={onChange("industry")}
                className="form-input"
              >
                {INDUSTRIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Experience Level</label>
              <select
                value={values.experienceLevel}
                onChange={onChange("experienceLevel")}
                className="form-input"
              >
                {EXPERIENCE_LEVELS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">City</label>
              <input
                value={values.location.city}
                onChange={onChangeCity}
                maxLength={LIMITS.CITY_MAX}
                className="form-input"
                placeholder="Newark"
              />
            </div>
            <div>
              <label className="form-label">State</label>
              <input
                value={values.location.state}
                onChange={onChangeState}
                maxLength={LIMITS.STATE_MAX}
                className="form-input"
                placeholder="NJ"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Save Profile"}
            </Button>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </Card>
      </form>
    </div>
  );
};

export default ProfileForm;