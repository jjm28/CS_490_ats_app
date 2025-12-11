import "../../App.css";
import "../../styles/Certifications.css";
import "../../styles/StyledComponents/FormInput.css";

import { useState, useEffect } from "react";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import {
  getCertifications,
  addCertificationApi,
  updateCertificationApi,
  deleteCertificationApi,
  uploadCertificationBadge,
} from "../../api/certifications";
import type { Certification } from "./Certifications";
import SkillCertificationForm from "./SkillCertificationForm";
import API_BASE from "../../utils/apiBase";

export default function SkillCertifications() {
  const [badges, setBadges] = useState<Certification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Certification | null>(null);

  const fetchBadges = async () => {
    try {
      const data = await getCertifications();
      const filtered = data.filter(
        (c: Certification) => c.type === "badge"
      );
      filtered.sort((a: Certification, b: Certification) => {
        const dateA = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
        const dateB = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
        return dateB - dateA;
      });
      setBadges(filtered);
    } catch (err) {
      console.error("Error fetching skill badges:", err);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const addBadge = async (newBadge: Certification) => {
    try {
      const created = await addCertificationApi({
        ...newBadge,
        type: "badge",
        showInShowcase:
          typeof newBadge.showInShowcase === "boolean"
            ? newBadge.showInShowcase
            : true,
      });
      setBadges((prev) => [...prev, created]);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding skill badge:", err);
    }
  };

  const editBadge = async (id: string, updated: Certification) => {
    try {
      const saved = await updateCertificationApi(id, {
        ...updated,
        type: "badge",
      });
      setBadges((prev) =>
        prev.map((b) => (b._id === id ? saved : b))
      );
      setEditingBadge(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error updating skill badge:", err);
    }
  };

  const removeBadge = async (id: string) => {
    if (!window.confirm("Delete this skill badge?")) return;
    try {
      await deleteCertificationApi(id);
      setBadges((prev) => prev.filter((b) => b._id !== id));
      alert("Skill badge deleted.");
    } catch (err) {
      console.error("Error deleting skill badge:", err);
      alert("Failed to delete skill badge. Please try again.");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-2 px-6">
        <h1 className="mb-2">Skill Badges & Certifications</h1>
        {!showForm && !editingBadge && (
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Add Badge
          </Button>
        )}
      </div>

      {(showForm || editingBadge) && (
<SkillCertificationForm
  initialData={editingBadge ?? undefined}
  onCancel={() => {
    setShowForm(false);
    setEditingBadge(null);
  }}
  onSubmit={async ({ cert, badgeFile }) => {
    if (editingBadge?._id) {
      // UPDATE FLOW
      const updated = await updateCertificationApi(editingBadge._id, cert);

      if (badgeFile) {
        const badgeUrl = await uploadCertificationBadge(
          editingBadge._id,
          badgeFile
        );
        updated.badgeImageUrl = badgeUrl;
      }

      await fetchBadges();
      setEditingBadge(null);
      setShowForm(false);
    } else {
      // CREATE FLOW
      const created = await addCertificationApi(cert);

      if (badgeFile && created._id) {
        const badgeUrl = await uploadCertificationBadge(
          created._id,
          badgeFile
        );
        created.badgeImageUrl = badgeUrl;
      }

      await fetchBadges();
      setShowForm(false);
    }
  }}
/>

      )}

      {!showForm && !editingBadge && (
        <div className="relative mx-6 my-8 space-y-4">
          {badges.length === 0 && (
            <Card className="max-w-lg">
              <p className="text-stone-600 text-center py-4">
                No skill badges yet. Add your coding assessments, challenge
                badges, and course completions.
              </p>
            </Card>
          )}

          {badges.map((badge) => (
            <Card key={badge._id} className="max-w-lg">
              <div className="flex gap-3">
                
                {badge.badgeImageUrl ? (
                            <img
                                src={
                                badge.badgeImageUrl.startsWith("http")
                                    ? badge.badgeImageUrl
                                    : `${API_BASE || ""}${badge.badgeImageUrl}`
                                }
                                alt={badge.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />

                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#357266] to-[#6DA598] flex items-center justify-center text-white text-xl flex-shrink-0">
                    🏅
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1 truncate">
                    {badge.name}
                  </h3>
                  <p className="text-sm text-stone-600">
                    {badge.organization}
                    {badge.dateEarned && (
                      <> • {formatDate(badge.dateEarned)}</>
                    )}
                  </p>
                  {badge.scoreLabel && (
                    <p className="text-xs text-[#357266] font-medium mt-1">
                      {badge.scoreLabel}
                    </p>
                  )}
                  {badge.showcaseCategory && (
                    <p className="text-xs text-stone-500 mt-1">
                      Category: {badge.showcaseCategory}
                    </p>
                  )}
                  {badge.verificationUrl && (
                    <a
                      href={badge.verificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#357266] hover:text-[#6DA598] hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      Verify
                      <span aria-hidden>↗</span>
                    </a>
                  )}
                  {badge.descriptionRich && (
                    <p className="text-sm text-stone-700 mt-2 line-clamp-3">
                      {badge.descriptionRich}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingBadge(badge);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => removeBadge(badge._id!)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
