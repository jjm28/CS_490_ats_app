import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API_BASE from "../../utils/apiBase"; 
import Button from '../StyledComponents/Button';
import Card from '../StyledComponents/Card';
import "../../App.css";
import "../../styles/StyledComponents/FormInput.css";

// Types
interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobPostingUrl?: string;
  applicationDeadline?: string;
  description?: string;
  industry: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface ValidationErrors {
  [key: string]: string;
}

// Configuration
const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

function JobsEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    salaryMin: '',
    salaryMax: '',
    jobPostingUrl: '',
    applicationDeadline: '',
    description: '',
    industry: '',
    type: '',
  });

  const token = useMemo(
    () => localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  // Show flash message
  useEffect(() => {
    const f = (location.state as any)?.flash;
    if (f) setFlash(f);
  }, [location.state]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", { 
        state: { flash: "Please log in to access job opportunities." } 
      });
    }
  }, [isLoggedIn, navigate]);

  // Fetch all jobs
  useEffect(() => {
    if (isLoggedIn) {
      fetchJobs();
    }
  }, [isLoggedIn]);

  const fetchJobs = async () => {
    setLoading(true);
    setErr(null);
    try {
      const response = await fetch(JOBS_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", { 
          state: { flash: "Your session has expired. Please log in again." } 
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      if (isLoggedIn) {
        setErr(error?.message || 'Failed to load job opportunities.');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name: string, value: string, otherSalaryValue?: string) => {
    let error = '';
    
    switch (name) {
      case 'jobTitle':
        if (!value.trim()) {
          error = 'Job title is required';
        } else if (value.length > 150) {
          error = 'Job title must be 150 characters or less';
        }
        break;
      
      case 'company':
        if (!value.trim()) {
          error = 'Company is required';
        } else if (value.length > 150) {
          error = 'Company must be 150 characters or less';
        }
        break;
      
      case 'industry':
        if (!value) {
          error = 'Industry is required';
        }
        break;
      
      case 'type':
        if (!value) {
          error = 'Job type is required';
        }
        break;
      
      case 'location':
        if (value.length > 150) {
          error = 'Location must be 150 characters or less';
        }
        break;
      
      case 'salaryMin':
        if (value && parseFloat(value) < 0) {
          error = 'Salary min must be a positive number';
        } else if (value && otherSalaryValue && parseFloat(value) > parseFloat(otherSalaryValue)) {
          error = 'Salary min cannot exceed salary max';
        }
        break;
      
      case 'salaryMax':
        if (value && parseFloat(value) < 0) {
          error = 'Salary max must be a positive number';
        } else if (value && otherSalaryValue && parseFloat(value) < parseFloat(otherSalaryValue)) {
          error = 'Salary max cannot be less than salary min';
        }
        break;
      
      case 'jobPostingUrl':
        if (value && !value.match(/^https?:\/\/.+/)) {
          error = 'Please enter a valid URL (e.g., https://example.com)';
        }
        break;
      
      case 'description':
        if (value.length > 2000) {
          error = 'Description must be 2000 characters or less';
        }
        break;
    }
    
    return error;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Validate on change
    const error = validateField(name, value, name === 'salaryMin' ? formData.salaryMax : formData.salaryMin);
    
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
    
    // Re-validate related salary fields with the NEW value
    if (name === 'salaryMin' && formData.salaryMax) {
      const maxError = validateField('salaryMax', formData.salaryMax, value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (maxError) {
          newErrors.salaryMax = maxError;
        } else {
          delete newErrors.salaryMax;
        }
        return newErrors;
      });
    }
    
    if (name === 'salaryMax' && formData.salaryMin) {
      const minError = validateField('salaryMin', formData.salaryMin, value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (minError) {
          newErrors.salaryMin = minError;
        } else {
          delete newErrors.salaryMin;
        }
        return newErrors;
      });
    }
  };

  const resetForm = () => {
    setFormData({
      jobTitle: '',
      company: '',
      location: '',
      salaryMin: '',
      salaryMax: '',
      jobPostingUrl: '',
      applicationDeadline: '',
      description: '',
      industry: '',
      type: '',
    });
    setErrors({});
    setEditingJob(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload: any = {
      jobTitle: formData.jobTitle,
      company: formData.company,
      industry: formData.industry,
      type: formData.type,
    };

    if (formData.location) payload.location = formData.location;
    if (formData.description) payload.description = formData.description;
    if (formData.jobPostingUrl) payload.jobPostingUrl = formData.jobPostingUrl;
    if (formData.applicationDeadline) payload.applicationDeadline = formData.applicationDeadline;
    if (formData.salaryMin) payload.salaryMin = parseFloat(formData.salaryMin);
    if (formData.salaryMax) payload.salaryMax = parseFloat(formData.salaryMax);

    try {
      const url = editingJob ? `${JOBS_ENDPOINT}/${editingJob._id}` : JOBS_ENDPOINT;
      const method = editingJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", { 
          state: { flash: "Your session has expired. Please log in again." } 
        });
        return;
      }

      const data = await response.json();

      if (response.ok) {
        await fetchJobs();
        const message = editingJob 
          ? 'Job opportunity updated successfully!' 
          : 'Job opportunity added successfully!';
        setFlash(message);
        resetForm();
        // Clear flash after 3 seconds
        setTimeout(() => setFlash(null), 3000);
      } else {
        // Handle validation errors
        console.log('Data:', data); // Debug log
        
        if (data.fields) {
          // Backend returns { code: 'VALIDATION_FAILED', fields: {...} }
          setErrors(data.fields);
        } else if (data.error?.fields) {
          setErrors(data.error.fields);
        } else if (data.error) {
          setErr(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        } else if (data.message) {
          setErr(data.message);
        } else {
          setErr('An error occurred');
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
      setErr('Failed to save job');
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    
    // Handle MongoDB Decimal128 type for salary fields
    const extractDecimal = (value: any) => {
      if (!value) return '';
      if (value.$numberDecimal) return value.$numberDecimal;
      return value.toString();
    };
    
    setFormData({
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location || '',
      salaryMin: extractDecimal(job.salaryMin),
      salaryMax: extractDecimal(job.salaryMax),
      jobPostingUrl: job.jobPostingUrl || '',
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().split('T')[0]
        : '',
      description: job.description || '',
      industry: job.industry,
      type: job.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`${JOBS_ENDPOINT}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", { 
          state: { flash: "Your session has expired. Please log in again." } 
        });
        return;
      }

      if (response.ok) {
        await fetchJobs();
        setFlash('Job opportunity deleted successfully!');
        setTimeout(() => setFlash(null), 3000);
      } else {
        setErr('Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      setErr('Failed to delete job');
    }
  };

  const formatSalary = (min?: number | any, max?: number | any) => {
    if (!min && !max) return 'Not specified';
    
    // Handle MongoDB Decimal128 type - convert to number
    const minNum = min?.$numberDecimal ? parseFloat(min.$numberDecimal) : (min ? Number(min) : null);
    const maxNum = max?.$numberDecimal ? parseFloat(max.$numberDecimal) : (max ? Number(max) : null);
    
    if (minNum && maxNum) return `$${minNum.toLocaleString()} - $${maxNum.toLocaleString()}`;
    if (minNum) return `$${minNum.toLocaleString()}+`;
    if (maxNum) return `Up to $${maxNum.toLocaleString()}`;
    return 'Not specified';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Opportunities</h1>
      <p className="text-gray-600 mb-6">
        Track positions you're interested in applying for. Add job details to organize your search.
      </p>

      {flash && <p className="mb-4 text-sm text-green-700">{flash}</p>}
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {!isLoggedIn && (
        <Card>
          <Button disabled>Log in to continue</Button>
          <p className="mt-3 text-sm text-amber-700">
            You're not logged in. Log in to track job opportunities.
          </p>
        </Card>
      )}

      {isLoggedIn && (
        <>
          {/* Add/Edit Form */}
          {showForm && (
            <div className="mb-6">
              <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                  {editingJob ? 'Edit Job Opportunity' : 'Add Job Opportunity'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Job Title */}
                    <div>
                      <label className="form-label">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleInputChange}
                        className={`form-input ${errors.jobTitle ? '!border-red-500' : ''}`}
                        placeholder="e.g. Senior Software Engineer"
                      />
                      {errors.jobTitle && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.jobTitle}</p>
                      )}
                    </div>

                    {/* Company */}
                    <div>
                      <label className="form-label">
                        Company *
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className={`form-input ${errors.company ? '!border-red-500' : ''}`}
                        placeholder="e.g. TechCorp"
                      />
                      {errors.company && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.company}</p>
                      )}
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="form-label">
                        Industry *
                      </label>
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleInputChange}
                        className={`form-input ${errors.industry ? '!border-red-500' : ''}`}
                      >
                        <option value="">Select industry</option>
                        <option value="Technology">Technology</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Retail">Retail</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Design">Design</option>
                        <option value="Sales">Sales</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.industry && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.industry}</p>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <label className="form-label">
                        Job Type *
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className={`form-input ${errors.type ? '!border-red-500' : ''}`}
                      >
                        <option value="">Select type</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                      {errors.type && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.type}</p>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <label className="form-label">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="e.g. San Francisco, CA or Remote"
                      />
                    </div>

                    {/* Salary Min */}
                    <div>
                      <label className="form-label">
                        Salary Min
                      </label>
                      <input
                        type="number"
                        name="salaryMin"
                        value={formData.salaryMin}
                        onChange={handleInputChange}
                        className={`form-input ${errors.salaryMin ? '!border-red-500' : ''}`}
                        placeholder="e.g. 100000"
                      />
                      {errors.salaryMin && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.salaryMin}</p>
                      )}
                    </div>

                    {/* Salary Max */}
                    <div>
                      <label className="form-label">
                        Salary Max
                      </label>
                      <input
                        type="number"
                        name="salaryMax"
                        value={formData.salaryMax}
                        onChange={handleInputChange}
                        className={`form-input ${errors.salaryMax ? '!border-red-500' : ''}`}
                        placeholder="e.g. 150000"
                      />
                      {errors.salaryMax && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.salaryMax}</p>
                      )}
                    </div>

                    {/* Job Posting URL */}
                    <div>
                      <label className="form-label">
                        Job Posting URL
                      </label>
                      <input
                        type="url"
                        name="jobPostingUrl"
                        value={formData.jobPostingUrl}
                        onChange={handleInputChange}
                        className={`form-input ${errors.jobPostingUrl ? '!border-red-500' : ''}`}
                        placeholder="https://example.com/job/123"
                      />
                      {errors.jobPostingUrl && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">{errors.jobPostingUrl}</p>
                      )}
                    </div>

                    {/* Application Deadline */}
                    <div>
                      <label className="form-label">
                        Application Deadline
                      </label>
                      <input
                        type="date"
                        name="applicationDeadline"
                        value={formData.applicationDeadline}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="form-label">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className={`form-input ${errors.description ? '!border-red-500' : ''}`}
                      placeholder="Job description, notes, or requirements..."
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600 -mt-2 mb-2">{errors.description}</p>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingJob ? 'Update Opportunity' : 'Save Opportunity'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* Jobs List */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : jobs.length === 0 ? (
            <div className="mx-6">
              <Card>
                You don't have any job opportunities yet. Click "Add new opportunity" to get started.
              </Card>
            </div>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job._id}>
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg">{job.jobTitle}</div>
                        <div className="text-sm text-gray-700 font-medium mt-1">{job.company}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {job.type}
                          </span>
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {job.industry}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {job.location && (
                            <div>📍 {job.location}</div>
                          )}
                          <div>💰 {formatSalary(job.salaryMin, job.salaryMax)}</div>
                          {job.applicationDeadline && (
                            <div>📅 Deadline: {formatDate(job.applicationDeadline)}</div>
                          )}
                        </div>
                        {job.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{job.description}</p>
                        )}
                        {job.jobPostingUrl && (
                          <a
                            href={job.jobPostingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View posting →
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleEdit(job)}>
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDelete(job._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add new opportunity'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default JobsEntry;