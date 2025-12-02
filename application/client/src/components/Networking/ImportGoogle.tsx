import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API_BASE from "../../utils/apiBase";

type GoogleContact = {
  name: string;
  email: string;
};

export default function ImportGoogle() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [contacts, setContacts] = useState<GoogleContact[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/api/networking/google/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      setContacts(data.contacts);
    }

    if (token) load();
  }, [token]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Google Contacts</h1>

      {contacts.map((c, i) => (
        <div key={i} className="border p-3 rounded mb-2">
          <div className="font-semibold">{c.name}</div>
          <div className="text-gray-600">{c.email}</div>
        </div>
      ))}
    </div>
  );
}
