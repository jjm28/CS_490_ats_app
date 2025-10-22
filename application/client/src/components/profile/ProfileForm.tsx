import { useEffect, useState } from 'react';
import type { Profile } from '../../constants/profile';

type Props = {
  value: Profile;
  errors: Record<string, string>;
  limits: { NAME_MAX:number; CITY_MAX:number; STATE_MAX:number; HEADLINE_MAX:number; BIO_MAX:number };
  experienceLevels: readonly string[];
  industries: readonly string[];
  saving?: boolean;
  onSubmit: (p: Profile) => void;
};

export default function ProfileForm({ value, errors, limits, experienceLevels, industries, saving, onSubmit }: Props) {
  const [form, setForm] = useState<Profile>(value);
  useEffect(() => setForm(value), [value]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setForm(p => ({ ...p, [k]: v }));
  const setLoc = (k: 'city'|'state', v: string) => setForm(p => ({ ...p, location: { ...p.location, [k]: v } }));

  function submit(e: React.FormEvent) { e.preventDefault(); onSubmit(form); }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <label className="block text-sm font-medium">Full name</label>
        <input className="mt-1 w-full border p-2 rounded" value={form.fullName} maxLength={limits.NAME_MAX}
               onChange={e => set('fullName', e.target.value)} />
        {errors.fullName && <p className="text-sm text-red-600">{errors.fullName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input className="mt-1 w-full border p-2 rounded" value={form.email}
               onChange={e => set('email', e.target.value)} />
        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Phone</label>
        <input className="mt-1 w-full border p-2 rounded" value={form.phone}
               onChange={e => set('phone', e.target.value)} />
        {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">City</label>
          <input className="mt-1 w-full border p-2 rounded" value={form.location.city} maxLength={limits.CITY_MAX}
                 onChange={e => setLoc('city', e.target.value)} />
          {errors['location.city'] && <p className="text-sm text-red-600">{errors['location.city']}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">State</label>
          <input className="mt-1 w-full border p-2 rounded" value={form.location.state} maxLength={limits.STATE_MAX}
                 onChange={e => setLoc('state', e.target.value)} />
          {errors['location.state'] && <p className="text-sm text-red-600">{errors['location.state']}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Headline</label>
        <input className="mt-1 w-full border p-2 rounded" value={form.headline} maxLength={limits.HEADLINE_MAX}
               onChange={e => set('headline', e.target.value)} />
        {errors.headline && <p className="text-sm text-red-600">{errors.headline}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Bio</label>
        <textarea className="mt-1 w-full border p-2 rounded" rows={4} value={form.bio} maxLength={limits.BIO_MAX}
                  onChange={e => set('bio', e.target.value)} />
        <div className="text-xs text-gray-600">{form.bio.length}/{limits.BIO_MAX}</div>
        {errors.bio && <p className="text-sm text-red-600">{errors.bio}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Industry</label>
        <select className="mt-1 w-full border p-2 rounded" value={form.industry}
                onChange={e => set('industry', e.target.value as any)}>
          {industries.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {errors.industry && <p className="text-sm text-red-600">{errors.industry}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">Experience level</label>
        <select className="mt-1 w-full border p-2 rounded" value={form.experienceLevel}
                onChange={e => set('experienceLevel', e.target.value as any)}>
          {experienceLevels.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {errors.experienceLevel && <p className="text-sm text-red-600">{errors.experienceLevel}</p>}
      </div>
        {/* This is the Save and Cancel options on the submission */}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" disabled={saving} onClick={() => setForm(value)} className="px-4 py-2 rounded border">
          Cancel
        </button>
      </div>
    </form>
  );
}
