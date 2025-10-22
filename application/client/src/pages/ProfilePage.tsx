import { useEffect, useState } from 'react';
import { DEFAULT_PROFILE, LIMITS, EXPERIENCE_LEVELS, INDUSTRIES, type Profile } from '../constants/profile';
import { getMe, updateMe } from '../api/profile';
import ProfileForm from '../components/profile/ProfileForm';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await getMe();
        if (me) setProfile(me);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(p: Profile) {
    setSaving(true);
    setErrors({});
    try {
      const saved = await updateMe(p);
      setProfile(saved);
      // TODO: success toast
    } catch (e: any) {
      setErrors(e?.error?.fields ?? {}); // shows server field errors
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>
      <ProfileForm
        value={profile}
        errors={errors}
        limits={LIMITS}
        experienceLevels={EXPERIENCE_LEVELS}
        industries={INDUSTRIES}
        saving={saving}
        onSubmit={onSubmit}
      />
    </div>
  );
}
