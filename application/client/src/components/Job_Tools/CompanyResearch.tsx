import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Building2, Newspaper, Users, Globe, TrendingUp } from 'lucide-react';
import NewsColumn from './NewsSection';
import '../../styles/CompanyResearch.css';

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
    headquarters?: string;
    mission?: string;
    values?: string; // New field
    culture?: string;
    searchResults: SearchResult[];
  };
  news: NewsArticle[];
  leadership: {
    searchResults: SearchResult[];
  };
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  competitors: SearchResult[];
  financialHealth: SearchResult[]; // Assuming this is an array now
  lastUpdated: string;
}

function CompanyResearch() {
  const [companyName, setCompanyName] = useState<string>('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [showRelevantOnly, setShowRelevantOnly] = useState(true);

  // Handle search
  const handleSearch = async (): Promise<void> => {
    if (!companyName.trim()) return;

    setLoading(true);
    setError('');
    setCompanyInfo(null); // Clear previous results

    try {
      const response = await fetch('http://localhost:5050/api/company/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ companyName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }

      const data: CompanyInfo = await response.json();
      console.log('Backend response:', data);
      setCompanyInfo(data);
    } catch (err) {
      setError('Failed to research company. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    setCompanyName('');
    setCompanyInfo(null);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filter and sort news
  let filteredNews: NewsArticle[] = [];
  if (companyInfo && companyInfo.news) {
    filteredNews = companyInfo.news
      .filter(article => {
        if (!showRelevantOnly) return true;
        return article.relevanceScore !== undefined && article.relevanceScore >= 3;
      })
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }

  return (
    <div className="company-research">
      <div className="company-research-container">
        <div className="header-section">
          <h1 className="main-title">Company Research</h1>
          <p className="subtitle">Research any company to learn more about potential employers</p>
        </div>

        <div className="search-section">
          <div className={`search-box ${isFocused ? 'search-box-focused' : ''}`}>
            <div className="search-icon-wrapper">
              <Search className="search-icon" />
            </div>

            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type in your company! (e.g., Google, Microsoft, Amazon)"
              className="search-input"
              disabled={loading}
            />

            {companyName && !loading && (
              <button
                onClick={handleClear}
                className="clear-button"
                aria-label="Clear search"
              >
                <X className="clear-icon" />
              </button>
            )}

            <button
              onClick={handleSearch}
              disabled={loading || !companyName.trim()}
              className={`search-button ${
                companyName.trim() && !loading ? 'search-button-active' : 'search-button-disabled'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="loader-icon" />
                  <span>Researching...</span>
                </>
              ) : (
                <span>Search</span>
              )}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {companyInfo && (
          <div className="results-wrapper">
            {/* Use a grid container */}
            <div className="results-grid">
              {/* Left Column: All other info */}
              <div className="info-column">
                {/* Basic Information */}
                <div className="section-card">
                  <h2 className="section-title">About</h2>
                  <div className="section-content">
                    <p className="section-text">{companyInfo.basicInfo.description || 'No description available.'}</p>

                    <ul className="about-details">
                      {companyInfo.basicInfo.size && companyInfo.basicInfo.size !== 'Not specified' && (
                        <li><strong>Size:</strong> {companyInfo.basicInfo.size}</li>
                      )}
                      {companyInfo.basicInfo.industry && companyInfo.basicInfo.industry !== 'Not specified' && (
                        <li><strong>Industry:</strong> {companyInfo.basicInfo.industry}</li>
                      )}
                      {companyInfo.basicInfo.headquarters && companyInfo.basicInfo.headquarters !== 'Not specified' && (
                        <li><strong>Headquarters:</strong> {companyInfo.basicInfo.headquarters}</li>
                      )}
                      {companyInfo.basicInfo.mission && companyInfo.basicInfo.mission !== 'Not specified' && (
                        <li><strong>Mission:</strong> {companyInfo.basicInfo.mission}</li>
                      )}
                      {companyInfo.basicInfo.values && companyInfo.basicInfo.values !== 'Not specified' && (
                        <li><strong>Values:</strong> {companyInfo.basicInfo.values}</li>
                      )}
                      {companyInfo.basicInfo.culture && companyInfo.basicInfo.culture !== 'Not specified' && (
                        <li><strong>Culture:</strong> {companyInfo.basicInfo.culture}</li>
                      )}
                    </ul>

                    {companyInfo.basicInfo.website && (
                      <a
                        href={companyInfo.basicInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="section-link"
                      >
                        <span>→ Company Website</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Leadership */}
                {companyInfo.leadership.searchResults.length > 0 && (
                  <div className="section-card">
                    <h2 className="section-title">Leadership</h2>
                    <div className="section-content">
                      {companyInfo.leadership.searchResults.slice(0, 5).map((result, index) => (
                        <a
                          key={index}
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="section-link"
                        >
                          <span>→ {result.title || 'Leadership Profile'}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Health */}
                {companyInfo.financialHealth && companyInfo.financialHealth.length > 0 && (
                  <div className="section-card">
                    <h2 className="section-title">Financial Health</h2>
                    <div className="section-content">
                      {companyInfo.financialHealth.map((item, index) => (
                        <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="section-link">
                          <span>→ {item.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {Object.keys(companyInfo.socialMedia).length > 0 && (
                  <div className="section-card">
                    <h2 className="section-title">Social Media</h2>
                    <div className="section-content">
                      {companyInfo.socialMedia.linkedin && (
                        <a
                          href={companyInfo.socialMedia.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="section-link"
                        >
                          <span>→ LinkedIn</span>
                        </a>
                      )}
                      {companyInfo.socialMedia.twitter && (
                        <a
                          href={companyInfo.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="section-link"
                        >
                          <span>→ Twitter / X</span>
                        </a>
                      )}
                      {companyInfo.socialMedia.facebook && (
                        <a
                          href={companyInfo.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="section-link"
                        >
                          <span>→ Facebook</span>
                        </a>
                      )}
                      {companyInfo.socialMedia.instagram && (
                        <a
                          href={companyInfo.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="section-link"
                        >
                          <span>→ Instagram</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {companyInfo.competitors.length > 0 && (
                  <div className="section-card">
                    <h2 className="section-title">Competitors</h2>
                    <div className="section-content">
                      {companyInfo.competitors.slice(0, 5).map((competitor, index) => (
                        <a
                          key={index}
                          href={competitor.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="section-link"
                        >
                          <span>→ {competitor.title || 'Competitor Profile'}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {/* Moved the empty state check here, within the left column if desired, or keep it outside the grid */}
                {!companyInfo.basicInfo.description &&
                  companyInfo.news.length === 0 &&
                  companyInfo.leadership.searchResults.length === 0 &&
                  Object.keys(companyInfo.socialMedia).length === 0 &&
                  companyInfo.competitors.length === 0 && (
                    <div className="section-card">
                      <h2 className="section-title">No Results</h2>
                      <div className="section-content">
                        <p className="section-text">
                          We couldn’t find detailed information about "{companyName}". Try a more specific or well-known company name.
                        </p>
                      </div>
                    </div>
                  )}
              </div> {/* End of .info-column */}

              {/* Right Column: News Column Component */}
              <NewsColumn
                news={companyInfo.news}
                showRelevantOnly={showRelevantOnly}
                setShowRelevantOnly={setShowRelevantOnly}
              />
            </div> {/* End of .results-grid */}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyResearch;