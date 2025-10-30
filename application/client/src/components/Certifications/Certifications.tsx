import "../../App.css";
import "../../styles/Certifications.css";
import "../../styles/StyledComponents/FormInput.css";

import { useState, useEffect } from "react";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
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
        <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="flex items-center justify-between mb-2 px-6">
                <h1 className="mb-2">Certifications</h1>
                {!showForm && (
                    <Button variant="primary" onClick={() => setShowForm(true)}>
                        +
                    </Button>
                )}
            </div>

            <div>
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
            </div>

            {!showForm && !editingCert && (
                <div className="relative mx-6 my-8">
                    {certifications.map((cert, idx) => (
                        <Card key={cert._id || idx} className="max-w-lg">
                            <h3 className="text-lg font-semibold mb-1">{cert.name}</h3>
                            <p><strong>Organization:</strong> {cert.organization}</p>
                            <p><strong>Date Earned:</strong> {formatDate(cert.dateEarned)}</p>
                            {cert.doesNotExpire ? (
                                <p>Does not expire</p>
                            ) : (
                                (() => {
                                    const today = new Date();
                                    const isExpired =
                                        cert.expirationDate && new Date(cert.expirationDate) <= today;

                                    return (
                                        <p>
                                            <strong>Expires:</strong> {formatDate(cert.expirationDate)}
                                            {isExpired && <span className="renew-alert ml-2">⚠️ Renew Now</span>}
                                        </p>
                                    );
                                })()
                            )}

                            {cert.certificationId && <p><strong>ID:</strong> {cert.certificationId}</p>}
                            {cert.category && <p><strong>Category:</strong> {cert.category}</p>}
                            {cert.verified ? (
                                <p className="text-green-600 font-medium">Verified</p>
                            ) : (
                                <p className="text-gray-500 font-medium">Not Verified</p>
                            )}
                            <div className="flex justify-center space-x-2 p-2">
                                <Button variant="secondary" onClick={() => setEditingCert(cert)}>
                                    Edit
                                </Button>
                                <Button variant="secondary" onClick={() => removeCertification(cert._id!)}>
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );

}