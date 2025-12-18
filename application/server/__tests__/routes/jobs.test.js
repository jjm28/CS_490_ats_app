import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// ============================================================================
// MOCKS SETUP - Must be created before any imports
// ============================================================================

// Mock JWT verification
const mockJwtVerify = jest.fn();

// Mock Job Service Functions
const mockCreateJob = jest.fn();
const mockGetAllJobs = jest.fn();
const mockGetJob = jest.fn();
const mockUpdateJob = jest.fn();
const mockDeleteJob = jest.fn();
const mockUpdateJobStatus = jest.fn();
const mockBulkUpdateJobStatus = jest.fn();
const mockAddApplicationHistory = jest.fn();
const mockUpdateApplicationHistory = jest.fn();
const mockDeleteApplicationHistory = jest.fn();
const mockGetJobStats = jest.fn();
const mockGenerateChecklistItems = jest.fn();
const mockCreateFollowUpTemplate = jest.fn();
const mockSaveFollowUp = jest.fn();
const mockUpdateFollowUpStatus = jest.fn();
const mockGenerateNegotiationPrep = jest.fn();

// Mock User Preferences Service Functions
const mockGetUserPreferences = jest.fn();
const mockSaveLastSearch = jest.fn();
const mockCreateSavedSearch = jest.fn();
const mockUpdateSavedSearch = jest.fn();
const mockDeleteSavedSearch = jest.fn();
const mockDeleteUserPreferences = jest.fn();

// Mock Validators
const mockValidateJobCreate = jest.fn();
const mockValidateJobUpdate = jest.fn();
const mockValidateStatusUpdate = jest.fn();
const mockValidateBulkStatusUpdate = jest.fn();
const mockValidateLastSearch = jest.fn();
const mockValidateSavedSearch = jest.fn();
const mockValidateJobImport = jest.fn();

// Mock Jobs Model
const mockJobsFind = jest.fn();
const mockJobsFindOne = jest.fn();
const mockJobsFindById = jest.fn();
const mockJobsFindOneAndUpdate = jest.fn();
const mockJobsSave = jest.fn();

const MockJobs = {
  find: mockJobsFind,
  findOne: mockJobsFindOne,
  findById: mockJobsFindById,
  findOneAndUpdate: mockJobsFindOneAndUpdate,
};

// Mock other services
const mockScrapeJobFromUrl = jest.fn();
const mockGetJobsByStatus = jest.fn();
const mockUpdateApplicationPackage = jest.fn();
const mockCalculateJobMatch = jest.fn();
const mockGetSkillsByUser = jest.fn();
const mockIncrementApplicationGoals = jest.fn();
const mockGetDb = jest.fn();

// Mock modules using unstable_mockModule
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  verifyJWT: (req, res, next) => {
    // Check for x-dev-user-id first (for testing)
    if (req.headers["x-dev-user-id"]) {
      req.user = { _id: req.headers["x-dev-user-id"] };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const token = authHeader.split(" ")[1];
      const decoded = mockJwtVerify(token);
      req.user = { _id: decoded.id };
      next();
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  },
}));

jest.unstable_mockModule("../../services/jobs.service.js", () => ({
  createJob: mockCreateJob,
  getAllJobs: mockGetAllJobs,
  getJob: mockGetJob,
  updateJob: mockUpdateJob,
  deleteJob: mockDeleteJob,
  updateJobStatus: mockUpdateJobStatus,
  bulkUpdateJobStatus: mockBulkUpdateJobStatus,
  addApplicationHistory: mockAddApplicationHistory,
  updateApplicationHistory: mockUpdateApplicationHistory,
  deleteApplicationHistory: mockDeleteApplicationHistory,
  getJobStats: mockGetJobStats,
  generateChecklistItems: mockGenerateChecklistItems,
  createFollowUpTemplate: mockCreateFollowUpTemplate,
  saveFollowUp: mockSaveFollowUp,
  updateFollowUpStatus: mockUpdateFollowUpStatus,
  generateNegotiationPrep: mockGenerateNegotiationPrep,
  getJobsByStatus: mockGetJobsByStatus,
  updateApplicationPackage: mockUpdateApplicationPackage,
}));

jest.unstable_mockModule("../../services/userpreferences.service.js", () => ({
  getUserPreferences: mockGetUserPreferences,
  saveLastSearch: mockSaveLastSearch,
  createSavedSearch: mockCreateSavedSearch,
  updateSavedSearch: mockUpdateSavedSearch,
  deleteSavedSearch: mockDeleteSavedSearch,
  deleteUserPreferences: mockDeleteUserPreferences,
}));

jest.unstable_mockModule("../../validators/jobs.js", () => ({
  validateJobCreate: mockValidateJobCreate,
  validateJobUpdate: mockValidateJobUpdate,
  validateStatusUpdate: mockValidateStatusUpdate,
  validateBulkStatusUpdate: mockValidateBulkStatusUpdate,
}));

jest.unstable_mockModule("../../validators/userpreferences.js", () => ({
  validateLastSearch: mockValidateLastSearch,
  validateSavedSearch: mockValidateSavedSearch,
}));

jest.unstable_mockModule("../../validators/jobimport.js", () => ({
  validateJobImport: mockValidateJobImport,
}));

jest.unstable_mockModule("../../models/jobs.js", () => ({
  default: MockJobs,
}));

jest.unstable_mockModule("../../services/jobscraper.service.js", () => ({
  scrapeJobFromUrl: mockScrapeJobFromUrl,
}));

jest.unstable_mockModule("../../services/matchAnalysis.service.js", () => ({
  calculateJobMatch: mockCalculateJobMatch,
}));

jest.unstable_mockModule("../../routes/skills.js", () => ({
  getSkillsByUser: mockGetSkillsByUser,
}));

jest.unstable_mockModule("../../services/jobSearchSharing.service.js", () => ({
  incrementApplicationGoalsForUser: mockIncrementApplicationGoals,
}));

jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: mockGetDb,
}));

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: jest.fn((id) => new ObjectId(id)),
    },
  },
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/jobs.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/jobs", router);

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Jobs Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockJobId = new ObjectId();

  const mockJobData = {
    _id: mockJobId,
    userId: mockUserId,
    jobTitle: "Senior Software Engineer",
    company: "TechCorp",
    location: "San Francisco, CA",
    jobDescription: "Looking for an experienced engineer...",
    status: "applied",
    salaryMin: 120000,
    salaryMax: 180000,
    jobType: "Full-time",
    requiredSkills: ["React", "Node.js", "TypeScript"],
    applicationDate: "2024-01-15",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  // ============================================================================
  // POST /jobs - CREATE JOB
  // ============================================================================

  describe("POST /jobs", () => {
    const newJobData = {
      jobTitle: "Frontend Developer",
      company: "StartupCo",
      location: "Remote",
      jobDescription: "We're looking for a talented frontend developer",
      status: "interested",
      salaryMin: 90000,
      salaryMax: 130000,
      jobType: "Full-time",
      requiredSkills: ["React", "JavaScript", "CSS"],
    };

    test("should create a new job", async () => {
      mockValidateJobCreate.mockResolvedValue({
        ok: true,
        value: newJobData,
      });

      const createdJob = {
        _id: new ObjectId(),
        userId: mockUserId,
        ...newJobData,
        createdAt: new Date(),
      };

      mockCreateJob.mockResolvedValue(createdJob);
      mockIncrementApplicationGoals.mockResolvedValue(undefined);

      const res = await request(app)
        .post("/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send(newJobData);

      expect(res.status).toBe(201);
      expect(res.body.jobTitle).toBe("Frontend Developer");
      expect(res.body.company).toBe("StartupCo");
      expect(res.body.userId).toBe(mockUserId);

      expect(mockCreateJob).toHaveBeenCalledWith({
        userId: mockUserId,
        payload: newJobData,
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .post("/jobs")
        .send(newJobData);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
      expect(mockCreateJob).not.toHaveBeenCalled();
    });

    test("should return 400 if validation fails", async () => {
      mockValidateJobCreate.mockResolvedValue({
        ok: false,
        status: 400,
        error: { error: "Job title is required" },
      });

      const res = await request(app)
        .post("/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ company: "Test" }); // Missing required fields

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Job title is required");
      expect(mockCreateJob).not.toHaveBeenCalled();
    });

    test("should work with x-dev-user-id header", async () => {
      mockValidateJobCreate.mockResolvedValue({
        ok: true,
        value: newJobData,
      });

      const createdJob = {
        _id: new ObjectId(),
        userId: "dev-user-456",
        ...newJobData,
      };

      mockCreateJob.mockResolvedValue(createdJob);
      mockIncrementApplicationGoals.mockResolvedValue(undefined);

      const res = await request(app)
        .post("/jobs")
        .set("x-dev-user-id", "dev-user-456")
        .send(newJobData);

      expect(res.status).toBe(201);
      expect(mockCreateJob).toHaveBeenCalledWith({
        userId: "dev-user-456",
        payload: newJobData,
      });
    });

    test("should increment application goals after job creation", async () => {
      mockValidateJobCreate.mockResolvedValue({
        ok: true,
        value: newJobData,
      });

      const createdJob = {
        _id: new ObjectId(),
        userId: mockUserId,
        ...newJobData,
      };

      mockCreateJob.mockResolvedValue(createdJob);
      mockIncrementApplicationGoals.mockResolvedValue(undefined);

      await request(app)
        .post("/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send(newJobData);

      expect(mockIncrementApplicationGoals).toHaveBeenCalledWith(
        mockUserId,
        expect.stringContaining("New job added")
      );
    });

    test("should succeed even if incrementing goals fails", async () => {
      mockValidateJobCreate.mockResolvedValue({
        ok: true,
        value: newJobData,
      });

      const createdJob = {
        _id: new ObjectId(),
        userId: mockUserId,
        ...newJobData,
      };

      mockCreateJob.mockResolvedValue(createdJob);
      mockIncrementApplicationGoals.mockRejectedValue(new Error("Goal service down"));

      const res = await request(app)
        .post("/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send(newJobData);

      expect(res.status).toBe(201); // Should still succeed
      expect(res.body.jobTitle).toBe("Frontend Developer");
    });

    test("should return 400 on service error", async () => {
      mockValidateJobCreate.mockResolvedValue({
        ok: true,
        value: newJobData,
      });

      mockCreateJob.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send(newJobData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });
  });

  // ============================================================================
  // GET /jobs - GET ALL JOBS
  // ============================================================================

  describe("GET /jobs", () => {
    test("should return all non-archived jobs for user", async () => {
      const mockJobs = [mockJobData];
      
      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockJobs),
        }),
      });

      mockGetSkillsByUser.mockResolvedValue([
        { name: "React" },
        { name: "Node.js" },
      ]);

      const res = await request(app)
        .get("/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].jobTitle).toBe("Senior Software Engineer");
      expect(res.body[0].matchScore).toBeDefined();
      expect(res.body[0].skillsMatched).toBeDefined();
      expect(res.body[0].skillsMissing).toBeDefined();

      expect(mockJobsFind).toHaveBeenCalledWith({
        userId: mockUserId,
        archived: { $ne: true },
      });
    });

    test("should filter by status if provided", async () => {
      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockJobData]),
        }),
      });

      mockGetSkillsByUser.mockResolvedValue([]);

      const res = await request(app)
        .get("/jobs?status=applied")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(mockJobsFind).toHaveBeenCalledWith({
        userId: mockUserId,
        archived: { $ne: true },
        status: "applied",
      });
    });

    test("should return 400 for invalid status", async () => {
      const res = await request(app)
        .get("/jobs?status=invalid_status")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid status value");
      expect(res.body.validStatuses).toEqual([
        "interested",
        "applied",
        "phone_screen",
        "interview",
        "offer",
        "rejected",
      ]);
    });

    test("should calculate match scores based on user skills", async () => {
      const jobWithSkills = {
        ...mockJobData,
        requiredSkills: ["React", "Node.js", "Python", "AWS"],
      };

      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([jobWithSkills]),
        }),
      });

      mockGetSkillsByUser.mockResolvedValue([
        { name: "React" },
        { name: "Node.js" },
      ]);

      const res = await request(app)
        .get("/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].matchScore).toBe(50); // 2 out of 4 skills = 50%
      expect(res.body[0].skillsMatched).toEqual(["react", "node.js"]);
      expect(res.body[0].skillsMissing).toEqual(["python", "aws"]);
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).get("/jobs");

      expect(res.status).toBe(401);
      expect(mockJobsFind).not.toHaveBeenCalled();
    });

    test("should return empty array if no jobs found", async () => {
      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      mockGetSkillsByUser.mockResolvedValue([]);

      const res = await request(app)
        .get("/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should handle jobs with no required skills", async () => {
      const jobWithoutSkills = {
        ...mockJobData,
        requiredSkills: null,
      };

      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([jobWithoutSkills]),
        }),
      });

      mockGetSkillsByUser.mockResolvedValue([{ name: "React" }]);

      const res = await request(app)
        .get("/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body[0].matchScore).toBe(0);
      expect(res.body[0].skillsMatched).toEqual([]);
      expect(res.body[0].skillsMissing).toEqual([]);
    });

    test("should return 500 on database error", async () => {
      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error("DB Error")),
        }),
      });

      const res = await request(app)
        .get("/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("DB Error");
    });
  });

  // ============================================================================
  // GET /jobs/archived - GET ARCHIVED JOBS
  // ============================================================================

  describe("GET /jobs/archived", () => {
    test("should return archived jobs for user", async () => {
      const archivedJob = {
        ...mockJobData,
        archived: true,
        archivedAt: new Date(),
      };

      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([archivedJob]),
      });

      const res = await request(app)
        .get("/jobs/archived")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].archived).toBe(true);

      expect(mockJobsFind).toHaveBeenCalledWith({
        userId: mockUserId,
        archived: true,
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).get("/jobs/archived");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    test("should sort by archivedAt descending", async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      mockJobsFind.mockReturnValue({
        sort: mockSort,
      });

      await request(app)
        .get("/jobs/archived")
        .set("Authorization", `Bearer ${validToken}`);

      expect(mockSort).toHaveBeenCalledWith({ archivedAt: -1 });
    });

    test("should return 500 on database error", async () => {
      mockJobsFind.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("DB Error")),
      });

      const res = await request(app)
        .get("/jobs/archived")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to get archived jobs");
    });
  });

  // ============================================================================
  // GET /jobs/stats - GET JOB STATS
  // ============================================================================

  describe("GET /jobs/stats", () => {
    test("should return job statistics", async () => {
      const mockStats = {
        total: 25,
        byStatus: {
          interested: 5,
          applied: 10,
          phone_screen: 4,
          interview: 3,
          offer: 2,
          rejected: 1,
        },
        recentActivity: 7,
        averageResponseTime: 5,
      };

      mockGetJobStats.mockResolvedValue(mockStats);

      const res = await request(app)
        .get("/jobs/stats")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(25);
      expect(res.body.byStatus).toBeDefined();
      expect(mockGetJobStats).toHaveBeenCalledWith(mockUserId);
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).get("/jobs/stats");

      expect(res.status).toBe(401);
      expect(mockGetJobStats).not.toHaveBeenCalled();
    });

    test("should return 500 on service error", async () => {
      mockGetJobStats.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .get("/jobs/stats")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to get job stats");
    });
  });

  // ============================================================================
  // GET /jobs/:id - GET SINGLE JOB
  // ============================================================================

  describe("GET /jobs/:id", () => {
    test("should return specific job", async () => {
      mockGetJob.mockResolvedValue(mockJobData);

      const res = await request(app)
        .get(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.jobTitle).toBe("Senior Software Engineer");
      expect(res.body.company).toBe("TechCorp");

      expect(mockGetJob).toHaveBeenCalledWith({
        userId: mockUserId,
        id: mockJobId.toString(),
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).get(`/jobs/${mockJobId}`);

      expect(res.status).toBe(401);
      expect(mockGetJob).not.toHaveBeenCalled();
    });

    test("should return 404 if job not found", async () => {
      mockGetJob.mockResolvedValue(null);

      const res = await request(app)
        .get(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    test("should return 500 on service error", async () => {
      mockGetJob.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .get(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Service error");
    });
  });

  // ============================================================================
  // PUT /jobs/:id - UPDATE JOB
  // ============================================================================

  describe("PUT /jobs/:id", () => {
    const updateData = {
      jobTitle: "Senior Software Engineer (Updated)",
      status: "interview",
      notes: "Great opportunity",
    };

    test("should update an existing job", async () => {
      mockValidateJobUpdate.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      mockJobsFindOne.mockResolvedValue({
        ...mockJobData,
        salaryHistory: [],
        compHistory: [],
        save: jest.fn().mockResolvedValue(undefined),
      });

      const updatedJob = {
        ...mockJobData,
        ...updateData,
        updatedAt: new Date(),
      };

      mockUpdateJob.mockResolvedValue(updatedJob);

      const res = await request(app)
        .put(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.jobTitle).toBe("Senior Software Engineer (Updated)");
      expect(res.body.status).toBe("interview");
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .put(`/jobs/${mockJobId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(mockUpdateJob).not.toHaveBeenCalled();
    });

    test("should return 400 if validation fails", async () => {
      mockValidateJobUpdate.mockResolvedValue({
        ok: false,
        status: 400,
        error: { error: "Invalid data" },
      });

      const res = await request(app)
        .put(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid data");
      expect(mockUpdateJob).not.toHaveBeenCalled();
    });

    test("should return 404 if job not found", async () => {
      mockValidateJobUpdate.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      mockJobsFindOne.mockResolvedValue(null);
      mockUpdateJob.mockResolvedValue(null);

      const res = await request(app)
        .put(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    test("should track salary history when finalSalary changes", async () => {
      const salaryUpdate = {
        finalSalary: 150000,
        negotiationOutcome: "Improved",
      };

      mockValidateJobUpdate.mockResolvedValue({
        ok: true,
        value: salaryUpdate,
      });

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const jobDoc = {
        ...mockJobData,
        salaryHistory: [
          { finalSalary: 140000, negotiationOutcome: "Not attempted", date: new Date("2024-01-01") },
        ],
        compHistory: [],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(jobDoc);
      mockUpdateJob.mockResolvedValue({ ...jobDoc, ...salaryUpdate });

      await request(app)
        .put(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(salaryUpdate);

      expect(mockSave).toHaveBeenCalled();
      expect(jobDoc.salaryHistory.length).toBe(2);
      expect(jobDoc.salaryHistory[1].finalSalary).toBe(150000);
      expect(jobDoc.salaryHistory[1].negotiationOutcome).toBe("Improved");
    });

    test("should return 500 on service error", async () => {
      mockValidateJobUpdate.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      mockJobsFindOne.mockResolvedValue(null);
      mockUpdateJob.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .put(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Service error");
    });
  });

  // ============================================================================
  // DELETE /jobs/:id - DELETE JOB
  // ============================================================================

  describe("DELETE /jobs/:id", () => {
    test("should delete an existing job", async () => {
      mockDeleteJob.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      expect(mockDeleteJob).toHaveBeenCalledWith({
        userId: mockUserId,
        id: mockJobId.toString(),
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).delete(`/jobs/${mockJobId}`);

      expect(res.status).toBe(401);
      expect(mockDeleteJob).not.toHaveBeenCalled();
    });

    test("should return 404 if job not found", async () => {
      mockDeleteJob.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    test("should return 500 on service error", async () => {
      mockDeleteJob.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .delete(`/jobs/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Service error");
    });
  });

  // ============================================================================
  // PATCH /jobs/:id/status - UPDATE JOB STATUS
  // ============================================================================

  describe("PATCH /jobs/:id/status", () => {
    const statusUpdate = {
      status: "interview",
      note: "Scheduled for next week",
    };

    test("should update job status", async () => {
      mockValidateStatusUpdate.mockResolvedValue({
        ok: true,
        value: statusUpdate,
      });

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const jobDoc = {
        ...mockJobData,
        statusHistory: [],
        interviews: [],
        save: mockSave,
      };

      mockJobsFindById.mockResolvedValue(jobDoc);

      const updatedJob = {
        ...mockJobData,
        status: "interview",
        statusHistory: [
          { status: "interview", timestamp: new Date() },
        ],
      };

      mockUpdateJobStatus.mockResolvedValue(updatedJob);

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(statusUpdate);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("interview");
      
      expect(mockUpdateJobStatus).toHaveBeenCalledWith({
        userId: mockUserId,
        id: mockJobId.toString(),
        status: "interview",
        note: "Scheduled for next week",
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .patch(`/jobs/${mockJobId}/status`)
        .send(statusUpdate);

      expect(res.status).toBe(401);
      expect(mockUpdateJobStatus).not.toHaveBeenCalled();
    });

    test("should return 400 if validation fails", async () => {
      mockValidateStatusUpdate.mockResolvedValue({
        ok: false,
        status: 400,
        error: { error: "Invalid status" },
      });

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid status");
    });

    test("should return 404 if job not found", async () => {
      mockValidateStatusUpdate.mockResolvedValue({
        ok: true,
        value: statusUpdate,
      });

      mockUpdateJobStatus.mockResolvedValue(null);
      mockJobsFindById.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(statusUpdate);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should update last interview outcome when status is offer", async () => {
      const offerUpdate = { status: "offer" };

      mockValidateStatusUpdate.mockResolvedValue({
        ok: true,
        value: offerUpdate,
      });

      const mockSave = jest.fn().mockResolvedValue(undefined);
      const jobDoc = {
        ...mockJobData,
        statusHistory: [],
        interviews: [
          {
            _id: new ObjectId(),
            type: "technical",
            outcome: "pending",
          },
        ],
        save: mockSave,
      };

      mockJobsFindById.mockResolvedValue(jobDoc);
      mockUpdateJobStatus.mockResolvedValue({ ...jobDoc, status: "offer" });

      await request(app)
        .patch(`/jobs/${mockJobId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(offerUpdate);

      expect(jobDoc.interviews[0].outcome).toBe("offer");
      expect(mockSave).toHaveBeenCalled();
    });

    test("should return 500 on service error", async () => {
      mockValidateStatusUpdate.mockResolvedValue({
        ok: true,
        value: statusUpdate,
      });

      mockUpdateJobStatus.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(statusUpdate);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Service error");
    });
  });

  // ============================================================================
  // POST /jobs/:id/history - ADD APPLICATION HISTORY
  // ============================================================================

  describe("POST /jobs/:id/history", () => {
    test("should add application history entry", async () => {
      const historyEntry = {
        action: "Submitted application through company website",
      };

      const updatedJob = {
        ...mockJobData,
        applicationHistory: [
          {
            action: historyEntry.action,
            timestamp: new Date(),
          },
        ],
      };

      mockAddApplicationHistory.mockResolvedValue(updatedJob);

      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(historyEntry);

      expect(res.status).toBe(200);
      expect(res.body.applicationHistory).toHaveLength(1);
      expect(res.body.applicationHistory[0].action).toBe(historyEntry.action);

      expect(mockAddApplicationHistory).toHaveBeenCalledWith({
        userId: mockUserId,
        id: mockJobId.toString(),
        action: historyEntry.action,
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .send({ action: "Test" });

      expect(res.status).toBe(401);
      expect(mockAddApplicationHistory).not.toHaveBeenCalled();
    });

    test("should return 400 if action is missing", async () => {
      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Action is required");
    });

    test("should return 400 if action is empty string", async () => {
      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ action: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Action is required");
    });

    test("should return 400 if action exceeds 200 characters", async () => {
      const longAction = "a".repeat(201);

      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ action: longAction });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Action must be 200 characters or less");
    });

    test("should return 404 if job not found", async () => {
      mockAddApplicationHistory.mockResolvedValue(null);

      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ action: "Test action" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should return 500 on service error", async () => {
      mockAddApplicationHistory.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .post(`/jobs/${mockJobId}/history`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ action: "Test action" });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to add history entry");
    });
  });

  // ============================================================================
  // PATCH /jobs/:id/archive - ARCHIVE/RESTORE JOB
  // ============================================================================

  describe("PATCH /jobs/:id/archive", () => {
    test("should archive a job", async () => {
      const archivedJob = {
        ...mockJobData,
        archived: true,
        archiveReason: "No response",
        archivedAt: new Date(),
      };

      mockJobsFindOneAndUpdate.mockResolvedValue(archivedJob);

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/archive`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          archive: true,
          reason: "No response",
        });

      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(true);
      expect(res.body.archiveReason).toBe("No response");
      
      expect(mockJobsFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockJobId.toString(), userId: mockUserId },
        {
          archived: true,
          archiveReason: "No response",
          archivedAt: expect.any(Date),
        },
        { new: true }
      );
    });

    test("should restore an archived job", async () => {
      const restoredJob = {
        ...mockJobData,
        archived: false,
        archiveReason: null,
        archivedAt: null,
      };

      mockJobsFindOneAndUpdate.mockResolvedValue(restoredJob);

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/archive`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ archive: false });

      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(false);
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .patch(`/jobs/${mockJobId}/archive`)
        .send({ archive: true });

      expect(res.status).toBe(401);
    });

    test("should return 404 if job not found", async () => {
      mockJobsFindOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/archive`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ archive: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should use default reason if not provided", async () => {
      const archivedJob = {
        ...mockJobData,
        archived: true,
        archiveReason: "User action",
        archivedAt: new Date(),
      };

      mockJobsFindOneAndUpdate.mockResolvedValue(archivedJob);

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/archive`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ archive: true });

      expect(res.status).toBe(200);
      expect(res.body.archiveReason).toBe("User action");
    });

    test("should return 500 on database error", async () => {
      mockJobsFindOneAndUpdate.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .patch(`/jobs/${mockJobId}/archive`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ archive: true });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Server error");
    });
  });
});