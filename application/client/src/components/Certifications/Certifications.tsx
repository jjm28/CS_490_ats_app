import { useState, useEffect } from "react";
import "../../styles/Certifications.css";
import CertificationForm from "./CertificationForm";
import {
    getCertifications,
    addCertificationApi,
    updateCertificationApi,
    deleteCertificationApi,
} from "../../api/certifications";

export interface Certification {
    _id?: string;
    name: string;
    organization: string;
    dateEarned: string;
    expirationDate?: string;
    doesNotExpire?: boolean;
    certificationId?: string;
    documentUrl?: string;
    verified?: boolean;
    renewalReminder?: string;
    category?: string;
}

export default function Certifications() {
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingCert, setEditingCert] = useState<Certification | null>(null);

    const fetchCertifications = async () => {
        try {
            const data = await getCertifications();
            data.sort((a: Certification, b: Certification) => {
                const dateA = a.dateEarned ? new Date(a.dateEarned).getTime() : 0;
                const dateB = b.dateEarned ? new Date(b.dateEarned).getTime() : 0;
                return dateB - dateA;
            });
            setCertifications(data);
        } catch (err) {
            console.error("Error fetching certifications:", err);
        }
    };

    useEffect(() => {
        fetchCertifications();
    }, []);

    const addCertification = async (newCert: Certification) => {
        try {
            const created = await addCertificationApi(newCert);
            setCertifications([...certifications, created]);
            setShowForm(false);
        } catch (err) {
            console.error("Error adding certification:", err);
        }
    };

    const editCertification = async (id: string, updatedCert: Certification) => {
        try {
            const updated = await updateCertificationApi(id, updatedCert);
            setCertifications((prev) =>
                prev.map((cert) => (cert._id === id ? updated : cert))
            );
        } catch (err) {
            console.error("Error updating certification:", err);
        }
    };

    const removeCertification = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this certification?"))
            return;
        try {
            await deleteCertificationApi(id);
            setCertifications((prev) => prev.filter((cert) => cert._id !== id));
            alert("Certification deleted successfully!");
        } catch (err) {
            console.error("Error deleting certification:", err);
            alert("Failed to delete certification. Please try again.");
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleString("default", { month: "long", year: "numeric" });
    };

    return (
        <div className="certifications-manager">
            <h2 className="certifications-title">
                Certifications
                {!showForm && (
                    <button
                        className="add-cert-inline-btn"
                        onClick={() => setShowForm(true)}
                    >
                        +
                    </button>
                )}
            </h2>

            {(showForm || editingCert) && (
                <CertificationForm
                    onSubmit={async (data) => {
                        if (editingCert) {
                            await editCertification(editingCert._id!, data);
                            await fetchCertifications();
                            setEditingCert(null);
                        } else {
                            await addCertification(data);
                            await fetchCertifications();
                        }
                        setShowForm(false);
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingCert(null);
                    }}
                    initialData={editingCert ?? undefined}
                />
            )}

            {!showForm && !editingCert && (
                <div className="certifications-list">
                    {certifications.map((cert, idx) => (
                        <div className="cert-item" key={cert._id || idx}>
                            <div className="cert-content">
                                <h3>{cert.name}</h3>
                                <p><strong>Organization:</strong> {cert.organization}</p>
                                <p><strong>Date Earned:</strong> {formatDate(cert.dateEarned)}</p>
                                {cert.doesNotExpire ? (
                                    <p>Does not expire</p>
                                ) : (
                                    <p><strong>Expires:</strong> {formatDate(cert.expirationDate)}</p>
                                )}
                                {cert.certificationId && (
                                    <p><strong>ID:</strong> {cert.certificationId}</p>
                                )}
                                {cert.category && <p><strong>Category:</strong> {cert.category}</p>}
                                {cert.verified ? (
                                    <p className="verified">Verified</p>
                                ) : (
                                    <p className="unverified">Not Verified</p>
                                )}
                                <div className="cert-actions">
                                    <button onClick={() => setEditingCert(cert)}>Edit</button>
                                    <button onClick={() => removeCertification(cert._id!)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}