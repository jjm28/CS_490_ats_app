// application/client/src/components/Profile/ProfilePhotoUploader.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../utils/apiBase";

// ===== START: new helper to get auth token =====
function getAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
  );
}
// ===== END: new helper to get auth token =====

// same dev helper you were using before
function getDevUserId() {
  let id = localStorage.getItem("devUserId");
  if (!id) {
    id = "dev-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("devUserId", id);
  }
  return id;
}

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`
  );

type Props = {
  profileId: string;
  photoUrl?: string;
  onChange?: (newUrl: string | "") => void;
};

const ProfilePhotoUploader: React.FC<Props> = ({
  profileId,
  photoUrl,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  const absoluteCurrent = useMemo(() => {
    if (!photoUrl) return "";
    if (photoUrl.startsWith("http")) return photoUrl;
    return API_BASE + photoUrl;
  }, [photoUrl]);

  // cleanup preview URL
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const chooseFile = () => fileInputRef.current?.click();

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // check type
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setError("Invalid file type. Use JPG, PNG, or GIF.");
      return;
    }
    // check size
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max size: 5MB.");
      return;
    }

    // local preview
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const upload = async () => {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("photo", file);

    // ===== START: add auth + dev headers to upload =====
    const token = getAuthToken();
    const devId = getDevUserId();
    // ===== END: add auth + dev headers to upload =====

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/profile/${profileId}/photo`);

      // send bearer if we have one
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      // keep dev header for local testing
      xhr.setRequestHeader("x-dev-user-id", devId);

      xhr.withCredentials = true;

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            // bust cache
            const freshUrl =
              res.photoUrl +
              (res.photoUrl.includes("?") ? "&" : "?") +
              "v=" +
              Date.now();
            onChange?.(freshUrl);
            setPreview("");
            setProgress(100);
            resolve();
          } catch (_e) {
            reject(new Error("Invalid server response"));
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res?.error || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(form);
    }).catch((e) => {
      setError(e.message);
    });

    setBusy(false);
  };

  const removePhoto = async () => {
    if (!confirm("Remove your profile picture?")) return;
    setBusy(true);
    setError(null);
    try {
      // ===== START: send auth + dev on delete too =====
      const token = getAuthToken();
      const devId = getDevUserId();
      // ===== END: send auth + dev on delete too =====

      const res = await fetch(`${API_BASE}/api/profile/${profileId}/photo`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-dev-user-id": devId,
        },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      onChange?.("");
      setPreview("");
      setProgress(0);
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <img
          src={preview || absoluteCurrent || DEFAULT_AVATAR}
          alt="Avatar"
          className="h-24 w-24 rounded-full object-cover border"
        />
        <div className="space-x-2">
          <button
            type="button"
            onClick={chooseFile}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-2 text-white text-sm"
          >
            {absoluteCurrent || preview ? "Replace photo" : "Upload photo"}
          </button>
          {(absoluteCurrent || preview) && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={busy}
              className="rounded-md border px-3 py-2 text-sm"
            >
              Remove
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>
      </div>

      {preview && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={upload}
            disabled={busy}
            className="rounded-md bg-green-600 px-3 py-1.5 text-white text-sm"
          >
            Confirm upload
          </button>
          <div className="h-2 flex-1 bg-gray-200 rounded">
            <div
              className="h-2 bg-green-600 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{progress}%</span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        JPG, PNG, or GIF. Max 5MB. This picture will be resized
      </p>
    </div>
  );
};

export default ProfilePhotoUploader;
