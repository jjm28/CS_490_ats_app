import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API_BASE from "../../utils/apiBase";
import Button from "../StyledComponents/Button";
import Card from "../StyledComponents/Card";
import "../../App.css";
import "../../styles/StyledComponents/FormInput.css";
import JobDetails from "./JobDetails";
import {
  type Job,
  type JobStatus,
  type ValidationErrors,
  type JobFormData,
  formatSalary,
  formatDate,
  extractDecimal,
  STATUS_DISPLAY,
} from "../../types/jobs.types";

// Configuration
const JOBS_ENDPOINT = `${API_BASE}/api/jobs`;

// Sort options
type SortOption = "dateAdded" | "deadline" | "salary" | "company";
const SORT_OPTIONS: Record<SortOption, string> = {
  dateAdded: "Date Added",
  deadline: "Application Deadline",
  salary: "Salary (High to Low)",
  company: "Company Name",
};

// Search preferences interface
interface SearchPreferences {
  searchQuery: string;
  statusFilter: string;
  industryFilter: string;
  locationFilter: string;
  salaryMinFilter: string;
  salaryMaxFilter: string;
  deadlineStartFilter: string;
  deadlineEndFilter: string;
  sortBy: SortOption;
}

interface SavedSearch extends SearchPreferences {
  _id: string;
  name: string;
  createdAt: string;
}

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
  const [formData, setFormData] = useState<JobFormData>({
    jobTitle: "",
    company: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    jobPostingUrl: "",
    applicationDeadline: "",
    description: "",
    industry: "",
    type: "",
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // ========================================
  // SEARCH AND FILTER STATE
  // ========================================
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string | "All">("All");
  const [industryFilter, setIndustryFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [salaryMinFilter, setSalaryMinFilter] = useState<string>("");
  const [salaryMaxFilter, setSalaryMaxFilter] = useState<string>("");
  const [deadlineStartFilter, setDeadlineStartFilter] = useState<string>("");
  const [deadlineEndFilter, setDeadlineEndFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [showFilters, setShowFilters] = useState(false);

  // ========================================
  // SAVED SEARCHES STATE
  // ========================================
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);

  const token = useMemo(
    () =>
      localStorage.getItem("authToken") || localStorage.getItem("token") || "",
    []
  );
  const isLoggedIn = !!token;

  // ========================================
  // SEARCH AND FILTER LOGIC
  // ========================================
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // 1. TEXT SEARCH (job title, company, description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((job) => {
        const titleMatch = job.jobTitle.toLowerCase().includes(query);
        const companyMatch = job.company.toLowerCase().includes(query);
        const descMatch = job.description?.toLowerCase().includes(query);
        return titleMatch || companyMatch || descMatch;
      });
    }

    // 2. STATUS FILTER
    if (statusFilter !== "All") {
      result = result.filter((job) => job.status === statusFilter);
    }

    // 3. INDUSTRY FILTER
    if (industryFilter !== "All") {
      result = result.filter((job) => job.industry === industryFilter);
    }

    // 4. LOCATION FILTER
    if (locationFilter.trim()) {
      const locQuery = locationFilter.toLowerCase();
      result = result.filter((job) =>
        job.location?.toLowerCase().includes(locQuery)
      );
    }

    // 5. SALARY RANGE FILTER
    if (salaryMinFilter || salaryMaxFilter) {
      result = result.filter((job) => {
        const jobSalaryMin =
          typeof job.salaryMin === "object" && job.salaryMin?.$numberDecimal
            ? parseFloat(job.salaryMin.$numberDecimal)
            : job.salaryMin
            ? Number(job.salaryMin)
            : 0;

        const jobSalaryMax =
          typeof job.salaryMax === "object" && job.salaryMax?.$numberDecimal
            ? parseFloat(job.salaryMax.$numberDecimal)
            : job.salaryMax
            ? Number(job.salaryMax)
            : Infinity;

        const filterMin = salaryMinFilter ? parseFloat(salaryMinFilter) : 0;
        const filterMax = salaryMaxFilter
          ? parseFloat(salaryMaxFilter)
          : Infinity;

        return jobSalaryMax >= filterMin && jobSalaryMin <= filterMax;
      });
    }

    // 6. DEADLINE DATE RANGE FILTER
    if (deadlineStartFilter || deadlineEndFilter) {
      result = result.filter((job) => {
        if (!job.applicationDeadline) return false;

        const deadlineDate = new Date(job.applicationDeadline);
        const startDate = deadlineStartFilter
          ? new Date(deadlineStartFilter)
          : new Date(0);
        const endDate = deadlineEndFilter
          ? new Date(deadlineEndFilter)
          : new Date(8640000000000000);

        return deadlineDate >= startDate && deadlineDate <= endDate;
      });
    }

    // 7. SORTING
    result.sort((a, b) => {
      switch (sortBy) {
        case "dateAdded":
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );

        case "deadline":
          const aDeadline = a.applicationDeadline
            ? new Date(a.applicationDeadline).getTime()
            : Infinity;
          const bDeadline = b.applicationDeadline
            ? new Date(b.applicationDeadline).getTime()
            : Infinity;
          return aDeadline - bDeadline;

        case "salary":
          const aSalaryMax =
            typeof a.salaryMax === "object" && a.salaryMax?.$numberDecimal
              ? parseFloat(a.salaryMax.$numberDecimal)
              : a.salaryMax
              ? Number(a.salaryMax)
              : 0;
          const bSalaryMax =
            typeof b.salaryMax === "object" && b.salaryMax?.$numberDecimal
              ? parseFloat(b.salaryMax.$numberDecimal)
              : b.salaryMax
              ? Number(b.salaryMax)
              : 0;
          return bSalaryMax - aSalaryMax;

        case "company":
          return a.company.localeCompare(b.company);

        default:
          return 0;
      }
    });

    return result;
  }, [
    jobs,
    searchQuery,
    statusFilter,
    industryFilter,
    locationFilter,
    salaryMinFilter,
    salaryMaxFilter,
    deadlineStartFilter,
    deadlineEndFilter,
    sortBy,
  ]);

  const availableIndustries = useMemo(() => {
    const industries = new Set(jobs.map((job) => job.industry));
    return Array.from(industries).sort();
  }, [jobs]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      statusFilter !== "All" ||
      industryFilter !== "All" ||
      locationFilter.trim() !== "" ||
      salaryMinFilter !== "" ||
      salaryMaxFilter !== "" ||
      deadlineStartFilter !== "" ||
      deadlineEndFilter !== ""
    );
  }, [
    searchQuery,
    statusFilter,
    industryFilter,
    locationFilter,
    salaryMinFilter,
    salaryMaxFilter,
    deadlineStartFilter,
    deadlineEndFilter,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setIndustryFilter("All");
    setLocationFilter("");
    setSalaryMinFilter("");
    setSalaryMaxFilter("");
    setDeadlineStartFilter("");
    setDeadlineEndFilter("");
  };

  // ========================================
  // SAVED SEARCHES FUNCTIONS
  // ========================================
  const getCurrentSearch = (): SearchPreferences => ({
    searchQuery,
    statusFilter,
    industryFilter,
    locationFilter,
    salaryMinFilter,
    salaryMaxFilter,
    deadlineStartFilter,
    deadlineEndFilter,
    sortBy,
  });

  const applySearch = (search: SearchPreferences) => {
    setSearchQuery(search.searchQuery || "");
    setStatusFilter(search.statusFilter || "All");
    setIndustryFilter(search.industryFilter || "All");
    setLocationFilter(search.locationFilter || "");
    setSalaryMinFilter(search.salaryMinFilter || "");
    setSalaryMaxFilter(search.salaryMaxFilter || "");
    setDeadlineStartFilter(search.deadlineStartFilter || "");
    setDeadlineEndFilter(search.deadlineEndFilter || "");
    setSortBy(search.sortBy || "dateAdded");
  };

  const loadSavedSearches = async () => {
    try {
      const response = await fetch(`${JOBS_ENDPOINT}/preferences`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data.savedSearches || []);
        
        // Auto-apply last search if exists
        if (data.lastSearch && Object.keys(data.lastSearch).length > 0) {
          applySearch(data.lastSearch);
        }
      }
    } catch (error) {
      console.error("Error loading saved searches:", error);
    }
  };

  const saveCurrentSearch = async () => {
    if (!saveSearchName.trim()) {
      setErr("Please enter a name for this search");
      return;
    }

    try {
      const payload = {
        name: saveSearchName.trim(),
        ...getCurrentSearch(),
      };

      const url = editingSearchId
        ? `${JOBS_ENDPOINT}/preferences/saved/${editingSearchId}`
        : `${JOBS_ENDPOINT}/preferences/saved`;
      
      const method = editingSearchId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadSavedSearches();
        setFlash(editingSearchId ? "Search updated!" : "Search saved!");
        setTimeout(() => setFlash(null), 2000);
        setShowSaveModal(false);
        setSaveSearchName("");
        setEditingSearchId(null);
      } else {
        setErr("Failed to save search");
      }
    } catch (error) {
      console.error("Error saving search:", error);
      setErr("Failed to save search");
    }
  };

  const deleteSavedSearch = async (searchId: string) => {
    if (!confirm("Delete this saved search?")) return;

    try {
      const response = await fetch(
        `${JOBS_ENDPOINT}/preferences/saved/${searchId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await loadSavedSearches();
        setFlash("Search deleted!");
        setTimeout(() => setFlash(null), 2000);
      }
    } catch (error) {
      console.error("Error deleting search:", error);
      setErr("Failed to delete search");
    }
  };

  const saveLastSearch = async () => {
    try {
      await fetch(`${JOBS_ENDPOINT}/preferences/last`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(getCurrentSearch()),
      });
    } catch (error) {
      console.error("Error saving last search:", error);
    }
  };

  // Auto-save last search when filters change
  useEffect(() => {
    if (isLoggedIn && hasActiveFilters) {
      const timer = setTimeout(() => {
        saveLastSearch();
      }, 1000); // Debounce 1 second

      return () => clearTimeout(timer);
    }
  }, [
    searchQuery,
    statusFilter,
    industryFilter,
    locationFilter,
    salaryMinFilter,
    salaryMaxFilter,
    deadlineStartFilter,
    deadlineEndFilter,
    sortBy,
    isLoggedIn,
  ]);

  // Show flash message
  useEffect(() => {
    const f = (location.state as any)?.flash;
    if (f) setFlash(f);
  }, [location.state]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { flash: "Please log in to access job opportunities." },
      });
    }
  }, [isLoggedIn, navigate]);

  // Fetch all jobs and load saved searches
  useEffect(() => {
    if (isLoggedIn) {
      fetchJobs();
      loadSavedSearches();
    }
  }, [isLoggedIn]);

  const fetchJobs = async () => {
    setLoading(true);
    setErr(null);
    try {
      const response = await fetch(JOBS_ENDPOINT, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", {
          state: { flash: "Your session has expired. Please log in again." },
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      if (isLoggedIn) {
        setErr(error?.message || "Failed to load job opportunities.");
      }
    } finally {
      setLoading(false);
    }
  };

  const validateField = (
    name: string,
    value: string,
    otherSalaryValue?: string
  ) => {
    let error = "";

    switch (name) {
      case "jobTitle":
        if (!value.trim()) {
          error = "Job title is required";
        } else if (value.length > 150) {
          error = "Job title must be 150 characters or less";
        }
        break;

      case "company":
        if (!value.trim()) {
          error = "Company is required";
        } else if (value.length > 150) {
          error = "Company must be 150 characters or less";
        }
        break;

      case "industry":
        if (!value) {
          error = "Industry is required";
        }
        break;

      case "type":
        if (!value) {
          error = "Job type is required";
        }
        break;

      case "location":
        if (value.length > 150) {
          error = "Location must be 150 characters or less";
        }
        break;

      case "salaryMin":
        if (value && parseFloat(value) < 0) {
          error = "Salary min must be a positive number";
        } else if (
          value &&
          otherSalaryValue &&
          parseFloat(value) > parseFloat(otherSalaryValue)
        ) {
          error = "Salary min cannot exceed salary max";
        }
        break;

      case "salaryMax":
        if (value && parseFloat(value) < 0) {
          error = "Salary max must be a positive number";
        } else if (
          value &&
          otherSalaryValue &&
          parseFloat(value) < parseFloat(otherSalaryValue)
        ) {
          error = "Salary max cannot be less than salary min";
        }
        break;

      case "jobPostingUrl":
        if (value && !value.match(/^https?:\/\/.+/)) {
          error = "Please enter a valid URL (e.g., https://example.com)";
        }
        break;

      case "description":
        if (value.length > 2000) {
          error = "Description must be 2000 characters or less";
        }
        break;
    }

    return error;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const error = validateField(
      name,
      value,
      name === "salaryMin" ? formData.salaryMax : formData.salaryMin
    );

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });

    if (name === "salaryMin" && formData.salaryMax) {
      const maxError = validateField("salaryMax", formData.salaryMax, value);
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

    if (name === "salaryMax" && formData.salaryMin) {
      const minError = validateField("salaryMin", formData.salaryMin, value);
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
      jobTitle: "",
      company: "",
      location: "",
      salaryMin: "",
      salaryMax: "",
      jobPostingUrl: "",
      applicationDeadline: "",
      description: "",
      industry: "",
      type: "",
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
    if (formData.applicationDeadline)
      payload.applicationDeadline = formData.applicationDeadline;
    if (formData.salaryMin) payload.salaryMin = parseFloat(formData.salaryMin);
    if (formData.salaryMax) payload.salaryMax = parseFloat(formData.salaryMax);

    try {
      const url = editingJob
        ? `${JOBS_ENDPOINT}/${editingJob._id}`
        : JOBS_ENDPOINT;
      const method = editingJob ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", {
          state: { flash: "Your session has expired. Please log in again." },
        });
        return;
      }

      const data = await response.json();

      if (response.ok) {
        await fetchJobs();
        const message = editingJob
          ? "Job opportunity updated successfully!"
          : "Job opportunity added successfully!";
        setFlash(message);
        resetForm();
        setTimeout(() => setFlash(null), 3000);
      } else {
        if (data.fields) {
          setErrors(data.fields);
        } else if (data.error?.fields) {
          setErrors(data.error.fields);
        } else if (data.error) {
          setErr(
            typeof data.error === "string"
              ? data.error
              : JSON.stringify(data.error)
          );
        } else if (data.message) {
          setErr(data.message);
        } else {
          setErr("An error occurred");
        }
      }
    } catch (error) {
      console.error("Error saving job:", error);
      setErr("Failed to save job");
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);

    setFormData({
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location || "",
      salaryMin: extractDecimal(job.salaryMin),
      salaryMax: extractDecimal(job.salaryMax),
      jobPostingUrl: job.jobPostingUrl || "",
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().split("T")[0]
        : "",
      description: job.description || "",
      industry: job.industry,
      type: job.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const response = await fetch(`${JOBS_ENDPOINT}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        navigate("/login", {
          state: { flash: "Your session has expired. Please log in again." },
        });
        return;
      }

      if (response.ok) {
        await fetchJobs();
        setFlash("Job opportunity deleted successfully!");
        setTimeout(() => setFlash(null), 3000);
      } else {
        setErr("Failed to delete job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      setErr("Failed to delete job");
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Job Opportunities
      </h1>
      <p className="text-gray-600 mb-6">
        Track positions you're interested in applying for. Add job details to
        organize your search.
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
                  {editingJob ? "Edit Job Opportunity" : "Add Job Opportunity"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Job Title *</label>
                      <input
                        type="text"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.jobTitle ? "!border-red-500" : ""
                        }`}
                        placeholder="e.g. Senior Software Engineer"
                      />
                      {errors.jobTitle && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.jobTitle}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Company *</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.company ? "!border-red-500" : ""
                        }`}
                        placeholder="e.g. TechCorp"
                      />
                      {errors.company && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.company}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Industry *</label>
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.industry ? "!border-red-500" : ""
                        }`}
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
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.industry}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Job Type *</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.type ? "!border-red-500" : ""
                        }`}
                      >
                        <option value="">Select type</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                      {errors.type && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.type}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="e.g. San Francisco, CA or Remote"
                      />
                    </div>

                    <div>
                      <label className="form-label">Salary Min</label>
                      <input
                        type="number"
                        name="salaryMin"
                        value={formData.salaryMin}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.salaryMin ? "!border-red-500" : ""
                        }`}
                        placeholder="e.g. 100000"
                      />
                      {errors.salaryMin && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.salaryMin}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Salary Max</label>
                      <input
                        type="number"
                        name="salaryMax"
                        value={formData.salaryMax}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.salaryMax ? "!border-red-500" : ""
                        }`}
                        placeholder="e.g. 150000"
                      />
                      {errors.salaryMax && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.salaryMax}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Job Posting URL</label>
                      <input
                        type="url"
                        name="jobPostingUrl"
                        value={formData.jobPostingUrl}
                        onChange={handleInputChange}
                        className={`form-input ${
                          errors.jobPostingUrl ? "!border-red-500" : ""
                        }`}
                        placeholder="https://example.com/job/123"
                      />
                      {errors.jobPostingUrl && (
                        <p className="text-sm text-red-600 -mt-2 mb-2">
                          {errors.jobPostingUrl}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Application Deadline</label>
                      <input
                        type="date"
                        name="applicationDeadline"
                        value={formData.applicationDeadline}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className={`form-input ${
                        errors.description ? "!border-red-500" : ""
                      }`}
                      placeholder="Job description, notes, or requirements..."
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600 -mt-2 mb-2">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingJob ? "Update Opportunity" : "Save Opportunity"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* ========================================
              SEARCH AND FILTER UI
              ======================================== */}
          <div className="mb-6">
            <Card>
              {/* Search Bar & Saved Searches Toggle */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="🔍 Search by job title, company, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input flex-1 text-base"
                />
                <button
                  onClick={() => setShowSavedSearches(!showSavedSearches)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors whitespace-nowrap"
                >
                  📁 Saved ({savedSearches.length})
                </button>
              </div>

              {/* Saved Searches Dropdown */}
              {showSavedSearches && (
                <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Saved Searches
                  </h3>
                  {savedSearches.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No saved searches yet. Apply some filters and click "Save
                      This Search" to get started.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {savedSearches.map((search) => (
                        <li
                          key={search._id}
                          className="flex items-center justify-between p-3 bg-white rounded border hover:border-(--brand-sage) transition-colors"
                        >
                          <button
                            onClick={() => {
                              applySearch(search);
                              setShowSavedSearches(false);
                              setFlash(`Applied "${search.name}"`);
                              setTimeout(() => setFlash(null), 2000);
                            }}
                            className="flex-1 text-left"
                          >
                            <div className="font-medium text-gray-900">
                              {search.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Saved{" "}
                              {new Date(search.createdAt).toLocaleDateString()}
                            </div>
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                applySearch(search);
                                setEditingSearchId(search._id);
                                setSaveSearchName(search.name);
                                setShowSaveModal(true);
                              }}
                              className="text-sm text-green-700 hover:text-green-950"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSavedSearch(search._id)}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Sort and Filter Toggle */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <label className="text-gray-700 font-medium shrink-0">
                    Sort by:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="form-input w-48"
                  >
                    {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowSaveModal(true)}
                      title="Save current search and filter settings"
                    >
                      💾 Save This Search
                    </Button>
                  )}
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Filters</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="form-input"
                      >
                        <option value="All">All Statuses</option>
                        {Object.entries(STATUS_DISPLAY).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Industry</label>
                      <select
                        value={industryFilter}
                        onChange={(e) => setIndustryFilter(e.target.value)}
                        className="form-input"
                      >
                        <option value="All">All Industries</option>
                        {availableIndustries.map((industry) => (
                          <option key={industry} value={industry}>
                            {industry}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. San Francisco"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Min Salary</label>
                      <input
                        type="number"
                        placeholder="e.g. 80000"
                        value={salaryMinFilter}
                        onChange={(e) => setSalaryMinFilter(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Max Salary</label>
                      <input
                        type="number"
                        placeholder="e.g. 150000"
                        value={salaryMaxFilter}
                        onChange={(e) => setSalaryMaxFilter(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Deadline From</label>
                      <input
                        type="date"
                        value={deadlineStartFilter}
                        onChange={(e) =>
                          setDeadlineStartFilter(e.target.value)
                        }
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label">Deadline To</label>
                      <input
                        type="date"
                        value={deadlineEndFilter}
                        onChange={(e) => setDeadlineEndFilter(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex justify-end pt-2">
                      <Button variant="secondary" onClick={clearAllFilters}>
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Active filters:
                    </span>
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        Search: "{searchQuery}"
                        <button
                          onClick={() => setSearchQuery("")}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {statusFilter !== "All" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        Status: {STATUS_DISPLAY[statusFilter as JobStatus]}
                        <button
                          onClick={() => setStatusFilter("All")}
                          className="hover:text-green-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {industryFilter !== "All" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                        Industry: {industryFilter}
                        <button
                          onClick={() => setIndustryFilter("All")}
                          className="hover:text-purple-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {locationFilter && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                        Location: {locationFilter}
                        <button
                          onClick={() => setLocationFilter("")}
                          className="hover:text-yellow-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {(salaryMinFilter || salaryMaxFilter) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 rounded text-sm">
                        Salary: ${salaryMinFilter || "0"} - $
                        {salaryMaxFilter || "∞"}
                        <button
                          onClick={() => {
                            setSalaryMinFilter("");
                            setSalaryMaxFilter("");
                          }}
                          className="hover:text-pink-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {(deadlineStartFilter || deadlineEndFilter) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">
                        Deadline:{" "}
                        {deadlineStartFilter
                          ? new Date(deadlineStartFilter).toLocaleDateString()
                          : "Any"}{" "}
                        -{" "}
                        {deadlineEndFilter
                          ? new Date(deadlineEndFilter).toLocaleDateString()
                          : "Any"}
                        <button
                          onClick={() => {
                            setDeadlineStartFilter("");
                            setDeadlineEndFilter("");
                          }}
                          className="hover:text-orange-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Save Search Modal */}
          {showSaveModal && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {editingSearchId ? "Update Search" : "Save This Search"}
                </h3>
                <input
                  type="text"
                  placeholder="e.g. Remote Senior Roles"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  className="form-input w-full mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowSaveModal(false);
                      setSaveSearchName("");
                      setEditingSearchId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={saveCurrentSearch}>
                    {editingSearchId ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredAndSortedJobs.length} of {jobs.length} job
            {jobs.length !== 1 ? "s" : ""}
          </div>

          {/* Jobs List */}
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : jobs.length === 0 ? (
            <div className="mx-6">
              <Card>
                You don't have any job opportunities yet. Click "Add new
                opportunity" to get started.
              </Card>
            </div>
          ) : filteredAndSortedJobs.length === 0 ? (
            <Card>
              <p className="text-gray-600">
                No jobs match your current filters. Try adjusting your search
                criteria.
              </p>
            </Card>
          ) : (
            <ul className="space-y-3">
              {filteredAndSortedJobs.map((job) => (
                <li key={job._id}>
                  <Card>
                    <div
                      className="flex items-start justify-between gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedJobId(job._id)}
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg">
                          {highlightText(job.jobTitle, searchQuery)}
                        </div>
                        <div className="text-sm text-gray-700 font-medium mt-1">
                          {highlightText(job.company, searchQuery)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {job.type}
                          </span>
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {job.industry}
                          </span>
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            {STATUS_DISPLAY[job.status]}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {job.location && <div>📍 {job.location}</div>}
                          <div>
                            💰 {formatSalary(job.salaryMin, job.salaryMax)}
                          </div>
                          {job.applicationDeadline && (
                            <div>
                              📅 Deadline: {formatDate(job.applicationDeadline)}
                            </div>
                          )}
                        </div>
                        {job.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {searchQuery
                              ? highlightText(job.description, searchQuery)
                              : job.description}
                          </p>
                        )}
                        {job.matchScore != null && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm">
                            <span className="font-medium">Match Score:</span>{" "}
                            <span
                              className={
                                job.matchScore >= 80
                                  ? "text-green-700 font-bold"
                                  : job.matchScore >= 60
                                  ? "text-yellow-600 font-bold"
                                  : "text-red-600 font-bold"
                              }
                            >
                              {job.matchScore}%
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Skills {job.matchBreakdown?.skills ?? 0}% | Exp{" "}
                            {job.matchBreakdown?.experience ?? 0}% | Edu{" "}
                            {job.matchBreakdown?.education ?? 0}%
                          </p>
                        </div>
                      )}
                        {job.jobPostingUrl && (
                          <a
                            href={job.jobPostingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View posting →
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleEdit(job);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDelete(job._id);
                          }}
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

          <div className="flex gap-1 mt-6 justify-between">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Add new opportunity"}
            </Button>
            <Button onClick={() => navigate("/Jobs/Pipeline")}>
              View Pipeline
            </Button>
          </div>
        </>
      )}
      {selectedJobId && (
        <JobDetails
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onUpdate={fetchJobs}
        />
      )}
    </div>
  );
}

export default JobsEntry;