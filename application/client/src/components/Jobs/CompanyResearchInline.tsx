// src/components/CompanyResearch/CompanyResearchInline.tsx
import React, { useEffect, useState } from "react";
import NewsColumn from "../Job_Tools/NewsSection";
import "../../styles/CompanyResearch.css";
import API_BASE from "../../utils/apiBase";

interface NewsArticle {
  title: string;
  snippet: string;
  link: string;
  date?: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  relevanceScore?: number;
  summary?: string;
  keyPoints?: string[];
}

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

interface CompanyInfo {
  name: string;

  basicInfo: {
    description: string;
    website: string;
    size?: string;
    industry?: string;
    headquarters?: string;       // used as "location"
    mission?: string;
    logoUrl?: string;

    // contact info (optional fields from backend)
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
    glassdoorRating?: number;
    glassdoorReviewsCount?: number;
    glassdoorUrl?: string
  };

  news: NewsArticle[];

  lastUpdated: string;
}

interface CompanyResearchInlineProps {
  companyName: string;
}

const CompanyResearchInline: React.FC<CompanyResearchInlineProps> = ({
  companyName,
}) => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showRelevantOnly, setShowRelevantOnly] = useState(true);

  useEffect(() => {
    if (!companyName.trim()) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      setCompanyInfo(null);

      try {
        const response = await fetch(`${API_BASE}/api/company/research`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ companyName }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch company data");
        }

        const data: CompanyInfo = await response.json();
        setCompanyInfo(data);
      } catch (err) {
        console.error(err);
        setError("Failed to research company. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyName]);

  if (!companyName.trim()) {
    return (
      <div className="company-research">
        <p className="text-sm text-gray-500">
          No company name found for this job.
        </p>
      </div>
    );
  }

  return (
    <div className="company-research">
      <div className="company-research-container">
        {/* Small header */}
        <div className="header-section">
          <h2 className="main-title text-lg">
            Company Information for{" "}
            <span className="font-semibold">{companyName}</span>
          </h2>
          <p className="subtitle text-xs text-gray-500">
            View key details to research this employer.
          </p>
        </div>

        {loading && <p>Researching {companyName}...</p>}
        {error && <div className="error-message">{error}</div>}

        {companyInfo && (
          <div className="results-wrapper">
            <div className="results-grid">
              {/* LEFT COLUMN – Company Profile */}
              <div className="info-column">
                {/* Company profile section */}
                <div className="section-card">
                  <h3 className="section-title">Company Profile</h3>
                  <div className="section-content space-y-4">
                    {/* Logo + name + website */}
                    <div className="flex items-center gap-4">
                      {companyInfo.basicInfo.logoUrl && (
                        <img
                          src={companyInfo.basicInfo.logoUrl}
                          alt={`${companyInfo.name} logo`}
                          className="h-10 w-10 object-contain rounded bg-white border"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">
                          {companyInfo.name}
                        </span>
                        {companyInfo.basicInfo.website && (
                          <a
                            href={companyInfo.basicInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="section-link text-sm"
                          >
                            → Company Website
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Description & mission */}
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        Description
                      </h4>
                      <p className="section-text text-sm">
                        {companyInfo.basicInfo.description ||
                          "No description available."}
                      </p>
                    </div>

                    {companyInfo.basicInfo.mission && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          Mission Statement
                        </h4>
                        <p className="section-text text-sm">
                          {companyInfo.basicInfo.mission}
                        </p>
                      </div>
                    )}

                    {/* Size, industry, location */}
                    <ul className="about-details text-sm">
                      {companyInfo.basicInfo.size && (
                        <li>
                          <strong>Size:</strong> {companyInfo.basicInfo.size}
                        </li>
                      )}
                      {companyInfo.basicInfo.industry && (
                        <li>
                          <strong>Industry:</strong>{" "}
                          {companyInfo.basicInfo.industry}
                        </li>
                      )}
                      {companyInfo.basicInfo.headquarters && (
                        <li>
                          <strong>Location:</strong>{" "}
                          {companyInfo.basicInfo.headquarters}
                        </li>
                      )}
                    </ul>

                    {/* Glassdoor rating (if available) */}
                    {companyInfo.basicInfo.glassdoorRating && (
                      <div className="mt-2 text-sm">
                        <h4 className="font-medium mb-1">Glassdoor Rating</h4>
                        <p>
                          {companyInfo.basicInfo.glassdoorRating !== undefined ? (
                            <>
                              <span className="font-semibold">
                                {companyInfo.basicInfo.glassdoorRating.toFixed(1)}
                              </span>{" "}
                              / 5.0
                            </>
                          ) : (
                            "Rating not available."
                          )}
                          {companyInfo.basicInfo.glassdoorReviewsCount  !== undefined && (
                            <span className="text-gray-600">
                              {" "}
                              · {companyInfo.basicInfo.glassdoorReviewsCount } reviews
                            </span>
                          )}
                        </p>
                        {companyInfo.basicInfo.glassdoorUrl && (
                          <a
                            href={companyInfo.basicInfo.glassdoorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="section-link text-sm"
                          >
                            → View on Glassdoor
                          </a>
                        )}
                      </div>
                    )}

                    {/* Contact information */}
                    {(companyInfo.basicInfo.contactEmail ||
                      companyInfo.basicInfo.contactPhone ||
                      companyInfo.basicInfo.contactAddress) && (
                      <div className="mt-3 text-sm">
                        <h4 className="font-medium mb-1">
                          Contact Information
                        </h4>
                        <ul className="space-y-1">
                          {companyInfo.basicInfo.contactEmail && (
                            <li>
                              <strong>Email:</strong>{" "}
                              <a
                                href={`mailto:${companyInfo.basicInfo.contactEmail}`}
                                className="text-blue-600 hover:underline"
                              >
                                {companyInfo.basicInfo.contactEmail}
                              </a>
                            </li>
                          )}
                          {companyInfo.basicInfo.contactPhone && (
                            <li>
                              <strong>Phone:</strong>{" "}
                              <a
                                href={`tel:${companyInfo.basicInfo.contactPhone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {companyInfo.basicInfo.contactPhone}
                              </a>
                            </li>
                          )}
                          {companyInfo.basicInfo.contactAddress && (
                            <li>
                              <strong>Address:</strong>{" "}
                              {companyInfo.basicInfo.contactAddress}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Empty state if literally nothing useful */}
                {!companyInfo.basicInfo.description &&
                  !companyInfo.basicInfo.mission &&
                  !companyInfo.basicInfo.size &&
                  !companyInfo.basicInfo.industry &&
                  !companyInfo.basicInfo.headquarters &&
                  !companyInfo.basicInfo.website &&
                  companyInfo.news.length === 0 && (
                    <div className="section-card mt-4">
                      <h3 className="section-title">No Company Info Found</h3>
                      <div className="section-content">
                        <p className="section-text text-sm">
                          We couldn’t find detailed information about "
                          {companyName}". Try a more specific or well-known
                          company name.
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* RIGHT COLUMN – Recent news & updates */}
              <NewsColumn
                news={companyInfo.news}
                showRelevantOnly={showRelevantOnly}
                setShowRelevantOnly={setShowRelevantOnly}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyResearchInline;
