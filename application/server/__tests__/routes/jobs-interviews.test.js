import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// ============================================================================
// MOCKS SETUP - Must be created before any imports  
// ============================================================================

// Mock JWT verification
const mockJwtVerify = jest.fn();

// Mock User Preferences Service Functions
const mockGetUserPreferences = jest.fn();
const mockSaveLastSearch = jest.fn();
const mockCreateSavedSearch = jest.fn();
const mockUpdateSavedSearch = jest.fn();
const mockDeleteSavedSearch = jest.fn();
const mockDeleteUserPreferences = jest.fn();

// Mock Validators
const mockValidateLastSearch = jest.fn();
const mockValidateSavedSearch = jest.fn();

// Mock Jobs Model for interview routes
const mockJobsFind = jest.fn();
const mockJobsFindOne = jest.fn();
const mockJobsFindById = jest.fn();
const mockJobsSave = jest.fn();

const MockJobs = {
  find: mockJobsFind,
  findOne: mockJobsFindOne,
  findById: mockJobsFindById,
};

// Mock interview service functions
const mockGenerateChecklistItems = jest.fn();
const mockCreateFollowUpTemplate = jest.fn();
const mockSaveFollowUp = jest.fn();
const mockUpdateFollowUpStatus = jest.fn();
const mockGenerateNegotiationPrep = jest.fn();

// Mock mongoose
const mockMongooseObjectId = jest.fn((id) => new ObjectId(id));

// Mock modules using unstable_mockModule
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  verifyJWT: (req, res, next) => {
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

jest.unstable_mockModule("../../services/userpreferences.service.js", () => ({
  getUserPreferences: mockGetUserPreferences,
  saveLastSearch: mockSaveLastSearch,
  createSavedSearch: mockCreateSavedSearch,
  updateSavedSearch: mockUpdateSavedSearch,
  deleteSavedSearch: mockDeleteSavedSearch,
  deleteUserPreferences: mockDeleteUserPreferences,
}));

jest.unstable_mockModule("../../validators/userpreferences.js", () => ({
  validateLastSearch: mockValidateLastSearch,
  validateSavedSearch: mockValidateSavedSearch,
}));

jest.unstable_mockModule("../../models/jobs.js", () => ({
  default: MockJobs,
}));

jest.unstable_mockModule("../../services/jobs.service.js", () => ({
  generateChecklistItems: mockGenerateChecklistItems,
  createFollowUpTemplate: mockCreateFollowUpTemplate,
  saveFollowUp: mockSaveFollowUp,
  updateFollowUpStatus: mockUpdateFollowUpStatus,
  generateNegotiationPrep: mockGenerateNegotiationPrep,
  // Mock other unused functions to prevent errors
  createJob: jest.fn(),
  getAllJobs: jest.fn(),
  getJob: jest.fn(),
  updateJob: jest.fn(),
  deleteJob: jest.fn(),
  updateJobStatus: jest.fn(),
  bulkUpdateJobStatus: jest.fn(),
  addApplicationHistory: jest.fn(),
  updateApplicationHistory: jest.fn(),
  deleteApplicationHistory: jest.fn(),
  getJobStats: jest.fn(),
}));

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: mockMongooseObjectId,
    },
  },
}));

// Mock other required modules to prevent errors
jest.unstable_mockModule("../../validators/jobs.js", () => ({
  validateJobCreate: jest.fn(),
  validateJobUpdate: jest.fn(),
  validateStatusUpdate: jest.fn(),
  validateBulkStatusUpdate: jest.fn(),
}));

jest.unstable_mockModule("../../validators/jobimport.js", () => ({
  validateJobImport: jest.fn(),
}));

jest.unstable_mockModule("../../services/jobscraper.service.js", () => ({
  scrapeJobFromUrl: jest.fn(),
}));

jest.unstable_mockModule("../../../__tests__/services/matchAnalysis.service.js", () => ({
  calculateJobMatch: jest.fn(),
}));

jest.unstable_mockModule("../../routes/skills.js", () => ({
  getSkillsByUser: jest.fn(),
}));

jest.unstable_mockModule("../../services/jobSearchSharing.service.js", () => ({
  incrementApplicationGoalsForUser: jest.fn(),
}));

jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: jest.fn(),
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/jobs.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/jobs", router);

// ============================================================================
// TEST SUITE - USER PREFERENCES
// ============================================================================

describe("Jobs Router - User Preferences", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  // ============================================================================
  // GET /jobs/preferences
  // ============================================================================

  describe("GET /jobs/preferences", () => {
    test("should return user preferences", async () => {
      const mockPreferences = {
        savedSearches: [
          { id: "search1", name: "Software Engineer Jobs", query: "software engineer" },
          { id: "search2", name: "Remote Positions", query: "remote" },
        ],
        lastSearch: { query: "frontend developer", location: "San Francisco" },
      };

      mockGetUserPreferences.mockResolvedValue(mockPreferences);

      const res = await request(app)
        .get("/jobs/preferences")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.savedSearches).toHaveLength(2);
      expect(res.body.lastSearch).toBeDefined();
      
      expect(mockGetUserPreferences).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return empty structure if no preferences", async () => {
      mockGetUserPreferences.mockResolvedValue(null);

      const res = await request(app)
        .get("/jobs/preferences")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        savedSearches: [],
        lastSearch: null,
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).get("/jobs/preferences");

      expect(res.status).toBe(401);
      expect(mockGetUserPreferences).not.toHaveBeenCalled();
    });

    test("should return 500 on service error", async () => {
      mockGetUserPreferences.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .get("/jobs/preferences")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Service error");
    });
  });

  // ============================================================================
  // PUT /jobs/preferences/last
  // ============================================================================

  describe("PUT /jobs/preferences/last", () => {
    const lastSearch = {
      query: "frontend developer",
      location: "Remote",
      jobType: "Full-time",
    };

    test("should save last search", async () => {
      mockValidateLastSearch.mockResolvedValue({
        ok: true,
        value: lastSearch,
      });

      const savedPreferences = {
        userId: mockUserId,
        lastSearch,
      };

      mockSaveLastSearch.mockResolvedValue(savedPreferences);

      const res = await request(app)
        .put("/jobs/preferences/last")
        .set("Authorization", `Bearer ${validToken}`)
        .send(lastSearch);

      expect(res.status).toBe(200);
      expect(res.body.lastSearch).toEqual(lastSearch);
      
      expect(mockSaveLastSearch).toHaveBeenCalledWith({
        userId: mockUserId,
        search: lastSearch,
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .put("/jobs/preferences/last")
        .send(lastSearch);

      expect(res.status).toBe(401);
      expect(mockSaveLastSearch).not.toHaveBeenCalled();
    });

    test("should return 400 if validation fails", async () => {
      mockValidateLastSearch.mockResolvedValue({
        ok: false,
        status: 400,
        error: { error: "Invalid search data" },
      });

      const res = await request(app)
        .put("/jobs/preferences/last")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid search data");
    });

    test("should return 500 on service error", async () => {
      mockValidateLastSearch.mockResolvedValue({
        ok: true,
        value: lastSearch,
      });

      mockSaveLastSearch.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .put("/jobs/preferences/last")
        .set("Authorization", `Bearer ${validToken}`)
        .send(lastSearch);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to save last search");
    });
  });

  // ============================================================================
  // POST /jobs/preferences/saved
  // ============================================================================

  describe("POST /jobs/preferences/saved", () => {
    const savedSearch = {
      name: "Senior Frontend Jobs",
      query: "senior frontend developer",
      location: "NYC",
      salaryMin: 120000,
    };

    test("should create saved search", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: true,
        value: savedSearch,
      });

      const { name, ...search } = savedSearch;
      const created = {
        id: "search123",
        userId: mockUserId,
        name,
        search,
        createdAt: new Date(),
      };

      mockCreateSavedSearch.mockResolvedValue(created);

      const res = await request(app)
        .post("/jobs/preferences/saved")
        .set("Authorization", `Bearer ${validToken}`)
        .send(savedSearch);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Senior Frontend Jobs");
      
      expect(mockCreateSavedSearch).toHaveBeenCalledWith({
        userId: mockUserId,
        name: "Senior Frontend Jobs",
        search: {
          query: "senior frontend developer",
          location: "NYC",
          salaryMin: 120000,
        },
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .post("/jobs/preferences/saved")
        .send(savedSearch);

      expect(res.status).toBe(401);
      expect(mockCreateSavedSearch).not.toHaveBeenCalled();
    });

    test("should return 400 if validation fails", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: false,
        status: 400,
        error: { error: "Name is required" },
      });

      const res = await request(app)
        .post("/jobs/preferences/saved")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ query: "test" }); // Missing name

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Name is required");
    });

    test("should return 500 on service error", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: true,
        value: savedSearch,
      });

      mockCreateSavedSearch.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .post("/jobs/preferences/saved")
        .set("Authorization", `Bearer ${validToken}`)
        .send(savedSearch);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to create saved search");
    });
  });

  // ============================================================================
  // PUT /jobs/preferences/saved/:searchId
  // ============================================================================

  describe("PUT /jobs/preferences/saved/:searchId", () => {
    const searchId = "search123";
    const updateData = {
      name: "Updated Search Name",
      query: "updated query",
      location: "Updated Location",
    };

    test("should update saved search", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      const { name, ...search } = updateData;
      const updated = {
        id: searchId,
        userId: mockUserId,
        name,
        search,
        updatedAt: new Date(),
      };

      mockUpdateSavedSearch.mockResolvedValue(updated);

      const res = await request(app)
        .put(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Search Name");
      
      expect(mockUpdateSavedSearch).toHaveBeenCalledWith({
        userId: mockUserId,
        searchId,
        name: "Updated Search Name",
        search: {
          query: "updated query",
          location: "Updated Location",
        },
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .put(`/jobs/preferences/saved/${searchId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(mockUpdateSavedSearch).not.toHaveBeenCalled();
    });

    test("should return 404 if saved search not found", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      mockUpdateSavedSearch.mockResolvedValue(null);

      const res = await request(app)
        .put(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Saved search not found");
    });

    test("should return 400 if validation fails", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: false,
        status: 400,
        error: { error: "Invalid data" },
      });

      const res = await request(app)
        .put(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid data");
    });

    test("should return 500 on service error", async () => {
      mockValidateSavedSearch.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      mockUpdateSavedSearch.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .put(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to update saved search");
    });
  });

  // ============================================================================
  // DELETE /jobs/preferences/saved/:searchId
  // ============================================================================

  describe("DELETE /jobs/preferences/saved/:searchId", () => {
    const searchId = "search123";

    test("should delete saved search", async () => {
      mockDeleteSavedSearch.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      
      expect(mockDeleteSavedSearch).toHaveBeenCalledWith({
        userId: mockUserId,
        searchId,
      });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .delete(`/jobs/preferences/saved/${searchId}`);

      expect(res.status).toBe(401);
      expect(mockDeleteSavedSearch).not.toHaveBeenCalled();
    });

    test("should return 404 if saved search not found", async () => {
      mockDeleteSavedSearch.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Saved search not found");
    });

    test("should return 500 on service error", async () => {
      mockDeleteSavedSearch.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .delete(`/jobs/preferences/saved/${searchId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to delete saved search");
    });
  });

  // ============================================================================
  // DELETE /jobs/preferences
  // ============================================================================

  describe("DELETE /jobs/preferences", () => {
    test("should delete all user preferences", async () => {
      mockDeleteUserPreferences.mockResolvedValue(true);

      const res = await request(app)
        .delete("/jobs/preferences")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      
      expect(mockDeleteUserPreferences).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).delete("/jobs/preferences");

      expect(res.status).toBe(401);
      expect(mockDeleteUserPreferences).not.toHaveBeenCalled();
    });

    test("should return 404 if no preferences found", async () => {
      mockDeleteUserPreferences.mockResolvedValue(null);

      const res = await request(app)
        .delete("/jobs/preferences")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("No preferences found");
    });

    test("should return 500 on service error", async () => {
      mockDeleteUserPreferences.mockRejectedValue(new Error("Service error"));

      const res = await request(app)
        .delete("/jobs/preferences")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to delete preferences");
    });
  });
});

// ============================================================================
// TEST SUITE - INTERVIEW ROUTES
// ============================================================================

describe("Jobs Router - Interview Management", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockJobId = new ObjectId();
  const mockInterviewId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
    mockMongooseObjectId.mockImplementation((id) => new ObjectId(id));
  });

  // ============================================================================
  // POST /jobs/:id/interview - SCHEDULE INTERVIEW
  // ============================================================================

  describe("POST /jobs/:id/interview", () => {
    const interviewData = {
      type: "technical",
      date: "2024-02-15T10:00:00Z",
      locationOrLink: "https://zoom.us/meeting/123",
      notes: "Prepare coding challenges",
      interviewer: "Jane Smith",
      contactInfo: "jane@techcorp.com",
      confidenceLevel: 7,
      anxietyLevel: 4,
    };

    test("should schedule an interview", async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const job = {
        _id: mockJobId,
        userId: mockUserId,
        jobTitle: "Software Engineer",
        company: "TechCorp",
        interviews: [],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(job);

      const res = await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(interviewData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe("technical");
      expect(res.body[0].outcome).toBe("pending");
      expect(res.body[0].reminderSent).toBe(false);
      
      expect(job.interviews).toHaveLength(1);
      expect(mockSave).toHaveBeenCalled();
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .send(interviewData);

      expect(res.status).toBe(401);
    });

    test("should return 400 if type is missing", async () => {
      const invalidData = { ...interviewData };
      delete invalidData.type;

      const res = await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Type and date are required");
    });

    test("should return 400 if date is missing", async () => {
      const invalidData = { ...interviewData };
      delete invalidData.date;

      const res = await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Type and date are required");
    });

    test("should return 404 if job not found", async () => {
      mockJobsFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(interviewData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should return 500 on database error", async () => {
      mockJobsFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(interviewData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to schedule interview");
    });

    test("should add interview with all optional fields", async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const job = {
        _id: mockJobId,
        userId: mockUserId,
        interviews: [],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(job);

      await request(app)
        .post(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(interviewData);

      expect(job.interviews[0].interviewer).toBe("Jane Smith");
      expect(job.interviews[0].confidenceLevel).toBe(7);
      expect(job.interviews[0].anxietyLevel).toBe(4);
    });
  });

  // ============================================================================
  // GET /jobs/:id/interview - GET ALL INTERVIEWS FOR JOB
  // ============================================================================

  describe("GET /jobs/:id/interview", () => {
    test("should return all interviews for a job", async () => {
      const mockInterviews = [
        {
          _id: mockInterviewId,
          type: "technical",
          date: "2024-02-15T10:00:00Z",
          outcome: "pending",
        },
      ];

      mockJobsFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockJobId,
          userId: mockUserId,
          interviews: mockInterviews,
        }),
      });

      const res = await request(app)
        .get(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe("technical");
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app).get(`/jobs/${mockJobId}/interview`);

      expect(res.status).toBe(401);
    });

    test("should return 404 if job not found", async () => {
      mockJobsFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should return empty array if no interviews", async () => {
      mockJobsFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockJobId,
          userId: mockUserId,
          interviews: [],
        }),
      });

      const res = await request(app)
        .get(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 500 on database error", async () => {
      mockJobsFindOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error("DB Error")),
      });

      const res = await request(app)
        .get(`/jobs/${mockJobId}/interview`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to fetch interviews");
    });
  });

  // ============================================================================
  // PUT /jobs/:id/interview/:interviewId - UPDATE INTERVIEW
  // ============================================================================

  describe("PUT /jobs/:id/interview/:interviewId", () => {
    const updateData = {
      type: "behavioral",
      notes: "Updated notes",
      outcome: "completed",
      confidenceLevel: 9,
    };

    test("should update an existing interview", async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const interview = {
        _id: mockInterviewId,
        type: "technical",
        date: "2024-02-15T10:00:00Z",
        notes: "Original notes",
        outcome: "pending",
        confidenceLevel: 5,
      };

      const job = {
        _id: mockJobId,
        userId: mockUserId,
        interviews: [interview],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(job);

      const res = await request(app)
        .put(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.type).toBe("behavioral");
      expect(res.body.notes).toBe("Updated notes");
      expect(res.body.outcome).toBe("completed");
      expect(res.body.confidenceLevel).toBe(9);
      
      expect(mockSave).toHaveBeenCalled();
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .put(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .send(updateData);

      expect(res.status).toBe(401);
    });

    test("should return 404 if job not found", async () => {
      mockJobsFindOne.mockResolvedValue(null);

      const res = await request(app)
        .put(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should return 404 if interview not found", async () => {
      const job = {
        _id: mockJobId,
        userId: mockUserId,
        interviews: [],
      };

      mockJobsFindOne.mockResolvedValue(job);

      const res = await request(app)
        .put(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Interview not found");
    });

    test("should update only provided fields", async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const interview = {
        _id: mockInterviewId,
        type: "technical",
        date: "2024-02-15T10:00:00Z",
        notes: "Original notes",
        outcome: "pending",
      };

      const job = {
        _id: mockJobId,
        userId: mockUserId,
        interviews: [interview],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(job);

      const partialUpdate = { notes: "Just updating notes" };

      await request(app)
        .put(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(partialUpdate);

      expect(interview.notes).toBe("Just updating notes");
      expect(interview.type).toBe("technical"); // Unchanged
    });

    test("should return 500 on database error", async () => {
      mockJobsFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .put(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to update interview");
    });
  });

  // ============================================================================
  // DELETE /jobs/:id/interview/:interviewId - DELETE INTERVIEW
  // ============================================================================

  describe("DELETE /jobs/:id/interview/:interviewId", () => {
    test("should delete an interview", async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const interview1 = { _id: mockInterviewId, type: "technical" };
      const interview2 = { _id: new ObjectId(), type: "behavioral" };

      const job = {
        _id: mockJobId,
        userId: mockUserId,
        interviews: [interview1, interview2],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(job);

      const res = await request(app)
        .delete(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(job.interviews).toHaveLength(1);
      expect(job.interviews[0]._id).toEqual(interview2._id);
      expect(mockSave).toHaveBeenCalled();
    });

    test("should return 401 if no authorization", async () => {
      const res = await request(app)
        .delete(`/jobs/${mockJobId}/interview/${mockInterviewId}`);

      expect(res.status).toBe(401);
    });

    test("should return 404 if job not found", async () => {
      mockJobsFindOne.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should succeed even if interview not found", async () => {
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const job = {
        _id: mockJobId,
        userId: mockUserId,
        interviews: [],
        save: mockSave,
      };

      mockJobsFindOne.mockResolvedValue(job);

      const res = await request(app)
        .delete(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("should return 500 on database error", async () => {
      mockJobsFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .delete(`/jobs/${mockJobId}/interview/${mockInterviewId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to delete interview");
    });
  });
});