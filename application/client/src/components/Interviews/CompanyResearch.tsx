import React, { useState, useEffect } from 'react';
import { Calendar, Briefcase, Loader2, ChevronDown, ArrowLeft } from 'lucide-react';
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
    values?: string;
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
  financialHealth: SearchResult[];
  lastUpdated: string;
}

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  interviews?: Array<{
    _id: string;
    type?: string;
    date: string; // Changed from scheduledTime to date
    locationOrLink?: string;
    notes?: string;
    interviewer?: string;
    contactInfo?: string;
    outcome?: string;
    reminderSent?: boolean;
  }>;
}

interface InterviewPrepResearchProps {
  onBack?: () => void;
}

function CompanyResearch({ onBack }: InterviewPrepResearchProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showRelevantOnly, setShowRelevantOnly] = useState(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch jobs with scheduled interviews
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch jobs');

        const allJobs: Job[] = await response.json();
        
        // Filter jobs that have scheduled interviews
        const jobsWithInterviews = allJobs.filter(
          job => job.interviews && job.interviews.length > 0
        );

        setJobs(jobsWithInterviews);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load your interviews');
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, []);

  // Auto-research when job is selected
  const handleJobSelect = async (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(j => j._id === jobId);
    if (!job) return;

    setLoading(true);
    setError('');
    setCompanyInfo(null);
    setIsSaved(false);

    try {
      const token = localStorage.getItem('token');
      
      // First, check if we have cached research
      const cachedResponse = await fetch(`http://localhost:5050/api/company/saved-research/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (cachedResponse.ok) {
        const cachedData = await cachedResponse.json();
        setCompanyInfo(cachedData);
        setIsSaved(true); // Mark as already saved
        setLoading(false);
        return; // Use cached data
      }

      // If no cache, fetch fresh data
      const response = await fetch('http://localhost:5050/api/company/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName: job.company }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }

      const data: CompanyInfo = await response.json();
      setCompanyInfo(data);
      setIsSaved(false); // New data, not saved yet

    } catch (err) {
      setError('Failed to research company. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual save function
  const handleSaveResearch = async () => {
    
    if (!selectedJobId || !companyInfo || isSaved) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/company/research/save-research', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId: selectedJobId, companyInfo })
      });

      if (response.ok) {
        setIsSaved(true);
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save research. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedJob = jobs.find(j => j._id === selectedJobId);
  const upcomingInterview = selectedJob?.interviews?.[0];
  console.log("selectedJob:", selectedJob);
console.log("companyInfo:", companyInfo);

  return (
    <div className="company-research">
      <div className="company-research-container">
        {onBack && (
          <button
            onClick={onBack}
            className="back-button"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            Back to Overview
          </button>
        )}
        
        <div className="header-section">
          <h1 className="main-title">Interview Preparation Research</h1>
          <p className="subtitle">Research companies for your upcoming interviews</p>
        </div>

        {loadingJobs ? (
          <div className="loading-state">
            <Loader2 className="loader-icon" />
            <span>Loading your interviews...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <Calendar className="empty-icon" />
            <h3>No Scheduled Interviews</h3>
            <p>You don't have any interviews scheduled yet. Schedule an interview to research the company.</p>
          </div>
        ) : (
          <>
            <div className="search-section">
              <div className="job-selector">
             {/* 🔹 FLEX CONTAINER */}
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  {/* Dropdown */}
                  <select
                    value={selectedJobId}
                    onChange={(e) => handleJobSelect(e.target.value)}
                    disabled={loading}
                    style={{
                      height: '44px', // 👈 Explicit height (adjust as needed)
                      width: '100%',
                      padding: '0 1.5rem 0 1rem', // 👈 Reduced vertical padding
                      fontSize: '1rem',
                      backgroundColor: 'white',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '16px', // 👈 Slightly smaller icon
                      paddingRight: '2.5rem', // 👈 Adjusted to avoid overlap
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0E3B43';
                      e.target.style.boxShadow = '0 4px 12px rgba(14,59,67,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,0,0,0.1)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                    }}
                  >
                    <option value="">Choose an upcoming interview...</option>
                    {jobs.map(job => (
                      <option key={job._id} value={job._id}>
                        {job.jobTitle} @ {job.company}
                        {job.interviews?.[0]?.date && ` - ${new Date(job.interviews[0].date).toLocaleDateString()}`}
                      </option>
                    ))}
                  </select>

                  {/* Conditional Save Button or Saved Feedback */}
                  {companyInfo && selectedJob && !isSaved ? (
                    <button
                      onClick={handleSaveResearch}
                      disabled={saving}
                      style={{
                        height: '44px', // 👈 Match dropdown height
                        padding: '0 1.2rem',
                        background: saving ? '#aaa' : '#0E3B43',
                        color: 'white',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: 'none',
                        fontWeight: 'bold',
                        transition: '0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Info'}
                    </button>
                  ) : isSaved ? (
                    <span style={{ color: 'green', fontWeight: 'bold', height: '44px', display: 'flex', alignItems: 'center' }}>
                      ✔️ Saved
                    </span>
                  ) : null}
                </div>
              </div>

              {loading && (
                <div className="loading-state">
                  <Loader2 className="loader-icon" />
                  <span>Researching {selectedJob?.company}...</span>
                </div>
              )}

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>

            {companyInfo && selectedJob && (
              <div className="results-wrapper">
                <div className="results-grid">
                  {/* Left Column: Company Info */}
                  <div className="info-column">
                    {/* Basic Information */}
                    <div className="section-card">
                      <h2 className="section-title">About {selectedJob.company}</h2>
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
                  </div>

                  {/* Right Column: News */}
                  <NewsColumn
                    news={companyInfo.news}
                    showRelevantOnly={showRelevantOnly}
                    setShowRelevantOnly={setShowRelevantOnly}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CompanyResearch;