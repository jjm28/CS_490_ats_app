import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API_BASE from '../../utils/apiBase';
import SalaryNegotiation from '../../components/Negotiations/SalaryNegotiation';

interface SalaryNegotiationPageProps {
  onBack: () => void;
}

const SalaryNegotiationPage = ({ onBack }: SalaryNegotiationPageProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';

  useEffect(() => {
    fetchJobsWithOffers();
  }, []);

  const fetchJobsWithOffers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/jobs?status=offer`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data);
        
        // Auto-select first job if only one
        if (data.length === 1) {
          setSelectedJob(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0E3B43',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (selectedJob) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f9fafb',
        overflowY: 'auto',
        padding: '2rem'
      }}>
        <button
          onClick={() => setSelectedJob(null)}
          style={{
            background: 'rgba(14,59,67,0.1)',
            border: '1px solid rgba(14,59,67,0.3)',
            color: '#0E3B43',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginBottom: '1rem'
          }}
        >
          ← Back to Jobs
        </button>
        
        <SalaryNegotiation
          jobId={selectedJob._id}
          jobTitle={selectedJob.jobTitle}
          company={selectedJob.company}
          currentOffer={selectedJob.finalSalary}
        />
      </div>
    );
  }

  // Job selection view
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0E3B43',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem',
      overflowY: 'auto'
    }}>
      <button
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          marginBottom: '2rem'
        }}
      >
        ← Back to Overview
      </button>

      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
          💰 Salary Negotiation
        </h1>
        
        {jobs.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              No jobs with offers found.
            </p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Once you receive an offer, come back here to get negotiation help!
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>
              Select a job to prepare your salary negotiation:
            </p>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {jobs.map((job) => (
                <div
                  key={job._id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {job.jobTitle}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                    {job.company}
                  </div>
                  {job.finalSalary && (
                    <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                      Offer: {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0
                      }).format(job.finalSalary)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SalaryNegotiationPage;