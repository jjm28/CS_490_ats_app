import type { Certification } from "../components/Certifications/Certifications";

const API_URL = "http://localhost:5050/api/certifications";

export const getCertifications = async (): Promise<Certification[]> => {
    const res = await fetch(API_URL);
    return res.json();
};

export const addCertificationApi = async (cert: Certification): Promise<Certification> => {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cert),
    });
    return res.json();
};

export const updateCertificationApi = async (id: string, updatedFields: Partial<Certification>) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
    });
    return res.json();
};

export const deleteCertificationApi = async (id: string) => {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    return res.json();
};