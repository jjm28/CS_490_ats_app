import React, { useEffect, useState } from "react";
import Card from "../StyledComponents/Card";
import { getCompanyInfo } from "../../api/company";

interface Props {
  company: string;
  industry?: string;
  location?: string;
  description?: string;
}

const CompanyInfoCard: React.FC<Props> = ({ company }) => {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCompanyInfo(company);
        setInfo(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [company]);

  if (loading) return <Card>Loading real company info...</Card>;
  if (!info) return <Card>No data found for {company}</Card>;

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-2">About {info.name}</h2>
      {info.logo && <img src={info.logo} alt={`${info.name} logo`} className="w-24 mb-3" />}
      <p className="text-gray-700">{info.description}</p>
      <div className="mt-2 text-sm text-gray-600 space-y-1">
        {info.location && <div>📍 {info.location}</div>}
        {info.domain && (
          <div>
            🌐 <a href={`https://${info.domain}`} target="_blank" className="text-blue-600 hover:underline">{info.domain}</a>
          </div>
        )}
        {info.employees && <div>👥 {info.employees} employees</div>}
        {info.industry && <div>🏭 {info.industry}</div>}
      </div>
    </Card>
  );
};

export default CompanyInfoCard;