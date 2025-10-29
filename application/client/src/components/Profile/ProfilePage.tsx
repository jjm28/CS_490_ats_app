import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../StyledComponents/Button";
import { listProfiles, type Profile } from "../../api/profiles";
import Card from "../StyledComponents/Card";
import "../../styles/StyledComponents/FormInput.css";
import API_BASE from "../../utils/apiBase"; 


function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  // Flash messages after redirect
  useEffect(() => {
    const f = (location.state as any)?.flash;
    if (f) setFlash(f);
  }, [location.state]);

  // Fetch single profile
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        if (!isLoggedIn) return;

        const res = await fetch(`http://localhost:5050/api/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error || "Failed to load profile.");
        }

        const data = await res.json();
        if (!cancelled) setProfile(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (isLoggedIn) run();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Navigate to create/edit form
  const createOrEditProfile = () => navigate("/ProfileForm");

  // Helper to join fields only if they exist
  const joinFields = (fields: (string | undefined)[], separator = " - ") =>
    fields.filter(Boolean).join(separator);

  // DELETE account handler
  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch("http://localhost:5050/api/profile/delete", {
  method: "DELETE",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ password: deletePassword }),
});

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete account");
        setDeleteLoading(false);
        return;
      }

      // Success: logout immediately
      localStorage.removeItem("authToken");
      navigate("/Login", {
        state: { flash: "Your account is scheduled for deletion. You have been logged out." },
      });
    } catch (err: any) {
      console.error(err);
      setDeleteError("Failed to delete account");
      setDeleteLoading(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  // Default avatar (inline SVG) for when no photoUrl is present
  const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>`
    );

  const resolvePhoto = (p: Profile) => {
    if (!p.photoUrl) return DEFAULT_AVATAR;
    if (p.photoUrl.startsWith("http")) return p.photoUrl;
    return API_BASE + p.photoUrl;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Profile</h1>

      {flash && <p className="mb-4 text-sm text-green-700">{flash}</p>}
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}


      {!isLoggedIn && (
        <Card>
          <Button disabled>Log in to continue</Button>
          <p className="mt-3 text-sm text-amber-700">
            You’re not logged in. Log in, then create your profile.
          </p>
          <div className="mt-10" />
        </Card>
      )}

  
          {profile ? (
            <div className="border rounded-lg p-4 bg-gray-50 mb-6">
              <h2 className="text-lg font-semibold mb-2">{profile.fullName || "No Name"}</h2>
              {profile.email && <p className="text-sm text-gray-700 mb-1">{profile.email}</p>}
              {profile.headline && <p className="text-sm text-gray-700 mb-1">{profile.headline}</p>}
              {joinFields([profile.location?.city, profile.location?.state], ", ") && (
                <p className="text-sm text-gray-700 mb-1">
                  {joinFields([profile.location?.city, profile.location?.state], ", ")}
                </p>
              )}
              {joinFields([profile.experienceLevel, profile.industry]) && (
                <p className="text-sm text-gray-700 mb-1">
                  {joinFields([profile.experienceLevel, profile.industry])}
                </p>
              )}
              {profile.bio && <p className="text-gray-600 mt-3">{profile.bio}</p>}
            </div>
          ) : (
            <div className="rounded-md border p-4 text-sm text-gray-700 bg-white mb-6">
              You don’t have a profile yet. Click below to create one.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={createOrEditProfile} variant="primary">
              {profile ? "Edit Profile" : "Create Profile"}
            </Button>
            <Button onClick={() => setShowDeleteModal(true)} variant="secondary">
              Delete Account
            </Button>
          </div>

          {/* Delete Account Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <h3 className="text-lg font-bold mb-2">Confirm Account Deletion</h3>
                <p className="text-gray-700 mb-4">
                  Warning: Deleting your account will permanently remove all data after 30 days.
                  Please enter your password to confirm.
                </p>

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full border rounded p-2 mb-4"
                />

                {deleteError && <p className="text-red-600 mb-2">{deleteError}</p>}

                <div className="flex justify-end gap-2">
                  <Button onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleDelete}
                    disabled={deleteLoading || !deletePassword}
                  >
                    {deleteLoading ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        
      
    </div>
  );
}

export default ProfilePage;
