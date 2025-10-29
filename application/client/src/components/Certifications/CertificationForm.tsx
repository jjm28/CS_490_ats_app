import { useState } from "react";
import type { Certification } from "./Certifications";

interface CertificationFormProps {
    onSubmit: (cert: Certification) => void;
    onCancel: () => void;
    initialData?: Certification;
}

export default function CertificationForm({
    onSubmit,
    onCancel,
    initialData,
}: CertificationFormProps) {
    const [name, setName] = useState(initialData?.name || "");
    const [organization, setOrganization] = useState(initialData?.organization || "");
    const [dateEarned, setDateEarned] = useState(initialData?.dateEarned || "");
    const [expirationDate, setExpirationDate] = useState(initialData?.expirationDate || "");
    const [doesNotExpire, setDoesNotExpire] = useState(initialData?.doesNotExpire || false);
    const [certificationId, setCertificationId] = useState(initialData?.certificationId || "");
    const [category, setCategory] = useState(initialData?.category || "General");
    const [verified, setVerified] = useState(initialData?.verified || false);
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSubmit({
            name,
            organization,
            dateEarned,
            expirationDate: doesNotExpire ? undefined : expirationDate,
            doesNotExpire,
            certificationId,
            verified,
            category,
            documentUrl: file ? file.name : initialData?.documentUrl,
        });
    };

    return (
        <div className="certification-form-popup">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Certification Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Issuing Organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                />
                <input
                    type="date"
                    placeholder="Date Earned"
                    value={dateEarned}
                    onChange={(e) => setDateEarned(e.target.value)}
                    required
                />
                {!doesNotExpire && (
                    <input
                        type="date"
                        placeholder="Expiration Date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                    />
                )}
                <div className="checkbox-row">
                    <label>
                        <input
                            type="checkbox"
                            checked={doesNotExpire}
                            onChange={(e) => setDoesNotExpire(e.target.checked)}
                        />
                        Does Not Expire
                    </label>
                </div>
                <input
                    type="text"
                    placeholder="Certification ID"
                    value={certificationId}
                    onChange={(e) => setCertificationId(e.target.value)}
                />
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {["General", "Technical", "Management", "Industry", "Other"].map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <div className="checkbox-row">
                    <label>
                        <input
                            type="checkbox"
                            checked={verified}
                            onChange={(e) => setVerified(e.target.checked)}
                        />
                        Verified
                    </label>
                </div>
                <div className="form-buttons">
                    <button type="submit">Save</button>
                    <button type="button" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}