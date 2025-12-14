import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// ============================================================================
// MOCKS SETUP - Must be created before any imports
// ============================================================================

// Mock JWT verification
const mockJwtVerify = jest.fn();

// Mock Google Generative AI
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

// Mock Mongoose Models
const mockJobFindOne = jest.fn();
const mockInterviewQuestionsFindOne = jest.fn();
const mockInterviewQuestionsCreate = jest.fn();

// Mock modules using unstable_mockModule
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

jest.unstable_mockModule("../../models/jobs.js", () => ({
  default: {
    findOne: mockJobFindOne,
  },
}));

jest.unstable_mockModule("../../models/interviewQuestions.js", () => ({
  default: {
    findOne: mockInterviewQuestionsFindOne,
    create: mockInterviewQuestionsCreate,
  },
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  verifyJWT: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const token = authHeader.split(" ")[1];
      const decoded = mockJwtVerify(token);
      req.user = { _id: decoded.id };
      next();
    } catch (error) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  },
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/interview-questions.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/interview-questions", router);

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Interview Questions Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockJobId = new ObjectId();
  
  const mockJob = {
    _id: mockJobId,
    userId: mockUserId,
    jobTitle: "Senior Software Engineer",
    company: "TechCorp",
    jobDescription: "We are looking for a senior software engineer with experience in React, Node.js, and cloud technologies. Must have strong problem-solving skills and experience leading teams.",
    location: "San Francisco, CA",
  };

  const mockGeminiResponse = {
    questions: [
      {
        id: "tech_1",
        text: "Explain the difference between React hooks and class components",
        category: "technical",
        difficulty: "mid",
        skills: ["React", "JavaScript"],
        companySpecific: false,
      },
      {
        id: "tech_2",
        text: "How would you optimize a Node.js application for performance?",
        category: "technical",
        difficulty: "senior",
        skills: ["Node.js", "Performance"],
        companySpecific: false,
      },
      {
        id: "behavioral_1",
        text: "Tell me about a time you had to resolve a conflict within your team",
        category: "behavioral",
        difficulty: "mid",
        skills: [],
        companySpecific: false,
      },
      {
        id: "behavioral_2",
        text: "Describe a situation where you had to learn a new technology quickly",
        category: "behavioral",
        difficulty: "mid",
        skills: [],
        companySpecific: false,
      },
      {
        id: "situational_1",
        text: "How would you approach building a scalable microservices architecture at TechCorp?",
        category: "situational",
        difficulty: "senior",
        skills: ["Architecture", "Microservices"],
        companySpecific: true,
      },
    ],
  };

  const mockCachedQuestions = {
    _id: new ObjectId(),
    userId: mockUserId,
    jobId: mockJobId,
    jobTitle: "Senior Software Engineer",
    company: "TechCorp",
    technicalQuestions: [
      { question: "Explain the difference between React hooks and class components" },
      { question: "How would you optimize a Node.js application for performance?" },
    ],
    behavioralQuestions: [
      { question: "Tell me about a time you had to resolve a conflict within your team" },
      { question: "Describe a situation where you had to learn a new technology quickly" },
    ],
    generalQuestions: [
      { 
        question: "How would you approach building a scalable microservices architecture at TechCorp?",
        companySpecific: true 
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  // ============================================================================
  // GET /interview-questions/:jobId - SUCCESS CASES
  // ============================================================================

  describe("GET /interview-questions/:jobId - Success Cases", () => {
    test("should return cached questions if they exist", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(mockCachedQuestions);

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toBeDefined();
      expect(res.body.questions.length).toBe(5); // 2 tech + 2 behavioral + 1 situational
      
      // Verify technical questions
      expect(res.body.questions[0].category).toBe("technical");
      expect(res.body.questions[0].text).toBe("Explain the difference between React hooks and class components");
      
      // Verify behavioral questions
      expect(res.body.questions[2].category).toBe("behavioral");
      
      // Verify situational questions
      expect(res.body.questions[4].category).toBe("situational");
      expect(res.body.questions[4].companySpecific).toBe(true);

      // Verify cache was checked
      expect(mockInterviewQuestionsFindOne).toHaveBeenCalledWith({ 
        userId: mockUserId, 
        jobId: mockJobId.toString() 
      });
      
      // Verify Gemini was NOT called (cache hit)
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    test("should generate and cache new questions if cache miss", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null); // No cache
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockGeminiResponse),
        },
      });

      const mockSavedQuestions = {
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: [
          { question: "Explain the difference between React hooks and class components" },
          { question: "How would you optimize a Node.js application for performance?" },
        ],
        behavioralQuestions: [
          { question: "Tell me about a time you had to resolve a conflict within your team" },
          { question: "Describe a situation where you had to learn a new technology quickly" },
        ],
        generalQuestions: [
          { 
            question: "How would you approach building a scalable microservices architecture at TechCorp?",
            companySpecific: true 
          },
        ],
      };

      mockInterviewQuestionsCreate.mockResolvedValue(mockSavedQuestions);

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toBeDefined();
      expect(res.body.questions.length).toBe(5);

      // Verify Gemini was called
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      
      // Verify questions were saved to database
      expect(mockInterviewQuestionsCreate).toHaveBeenCalledWith({
        userId: mockUserId,
        jobId: mockJobId.toString(),
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: expect.any(Array),
        behavioralQuestions: expect.any(Array),
        generalQuestions: expect.any(Array),
      });
    });

    test("should handle Gemini response with markdown code blocks", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      
      // Gemini sometimes wraps JSON in markdown code blocks
      const wrappedResponse = "```json\n" + JSON.stringify(mockGeminiResponse) + "\n```";
      
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => wrappedResponse,
        },
      });

      mockInterviewQuestionsCreate.mockResolvedValue({
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: [{ question: "Test" }],
        behavioralQuestions: [],
        generalQuestions: [],
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toBeDefined();
    });

    test("should correctly categorize questions by type", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockGeminiResponse),
        },
      });

      mockInterviewQuestionsCreate.mockResolvedValue({
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: [
          { question: "Explain the difference between React hooks and class components" },
          { question: "How would you optimize a Node.js application for performance?" },
        ],
        behavioralQuestions: [
          { question: "Tell me about a time you had to resolve a conflict within your team" },
          { question: "Describe a situation where you had to learn a new technology quickly" },
        ],
        generalQuestions: [
          { 
            question: "How would you approach building a scalable microservices architecture at TechCorp?",
            companySpecific: true 
          },
        ],
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);

      // Count questions by category
      const technicalCount = res.body.questions.filter(q => q.category === 'technical').length;
      const behavioralCount = res.body.questions.filter(q => q.category === 'behavioral').length;
      const situationalCount = res.body.questions.filter(q => q.category === 'situational').length;

      expect(technicalCount).toBe(2);
      expect(behavioralCount).toBe(2);
      expect(situationalCount).toBe(1);
    });
  });

  // ============================================================================
  // GET /interview-questions/:jobId - ERROR CASES
  // ============================================================================

  describe("GET /interview-questions/:jobId - Error Cases", () => {
    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get(`/interview-questions/${mockJobId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockJobFindOne).not.toHaveBeenCalled();
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 404 if job not found", async () => {
      mockJobFindOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
      expect(mockJobFindOne).toHaveBeenCalledWith({ 
        _id: mockJobId.toString(), 
        userId: mockUserId 
      });
    });

    test("should return 404 if job belongs to different user", async () => {
      mockJobFindOne.mockResolvedValue(null); // Job not found for this user

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Job not found");
    });

    test("should return 500 if Gemini API fails", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockRejectedValue(new Error("API rate limit exceeded"));

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to generate questions");
      expect(res.body.details).toBe("API rate limit exceeded");
    });

    test("should return 500 if Gemini returns invalid JSON", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => "This is not valid JSON{malformed",
        },
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to parse AI response");
      expect(res.body.details).toBeDefined();
    });

    test("should return 500 if database save fails", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockGeminiResponse),
        },
      });
      mockInterviewQuestionsCreate.mockRejectedValue(new Error("Database connection lost"));

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to generate questions");
      expect(res.body.details).toBe("Database connection lost");
    });

    test("should handle database errors when fetching cached questions", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockRejectedValue(new Error("DB connection error"));

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to generate questions");
    });
  });

  // ============================================================================
  // EDGE CASES & DATA VALIDATION
  // ============================================================================

  describe("GET /interview-questions/:jobId - Edge Cases", () => {
    test("should handle empty questions array from Gemini", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ questions: [] }),
        },
      });

      mockInterviewQuestionsCreate.mockResolvedValue({
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: [],
        behavioralQuestions: [],
        generalQuestions: [],
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toEqual([]);
    });

    test("should handle missing questions array in Gemini response", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({}), // No questions field
        },
      });

      mockInterviewQuestionsCreate.mockResolvedValue({
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: [],
        behavioralQuestions: [],
        generalQuestions: [],
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toEqual([]);
    });

    test("should handle cached questions with missing _doc property", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      
      // Mock data without _doc wrapper
      const directCachedData = {
        userId: mockUserId,
        jobId: mockJobId,
        technicalQuestions: [{ question: "Test technical" }],
        behavioralQuestions: [{ question: "Test behavioral" }],
        generalQuestions: [],
      };
      
      mockInterviewQuestionsFindOne.mockResolvedValue(directCachedData);

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions.length).toBe(2);
    });

    test("should handle questions with missing companySpecific field", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue({
        userId: mockUserId,
        jobId: mockJobId,
        technicalQuestions: [],
        behavioralQuestions: [],
        generalQuestions: [
          { question: "Generic question without companySpecific field" }
        ],
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions[0].companySpecific).toBe(false); // Should default to false
    });

    test("should handle invalid ObjectId format", async () => {
      mockJobFindOne.mockRejectedValue(new Error("Cast to ObjectId failed"));

      const res = await request(app)
        .get(`/interview-questions/invalid-id`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ============================================================================
  // TRANSFORMATION LOGIC TESTS
  // ============================================================================

  describe("transformToFrontendFormat - Data Transformation", () => {
    test("should correctly transform all question types with proper IDs", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(mockCachedQuestions);

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);

      // Check technical question IDs
      const techQuestions = res.body.questions.filter(q => q.category === 'technical');
      expect(techQuestions[0].id).toBe('tech_0');
      expect(techQuestions[1].id).toBe('tech_1');

      // Check behavioral question IDs
      const behavioralQuestions = res.body.questions.filter(q => q.category === 'behavioral');
      expect(behavioralQuestions[0].id).toBe('behavioral_0');
      expect(behavioralQuestions[1].id).toBe('behavioral_1');

      // Check situational question IDs
      const situationalQuestions = res.body.questions.filter(q => q.category === 'situational');
      expect(situationalQuestions[0].id).toBe('situational_0');
    });

    test("should set default values for missing fields", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue({
        userId: mockUserId,
        jobId: mockJobId,
        technicalQuestions: [{ question: "Test question" }],
        behavioralQuestions: [],
        generalQuestions: [],
      });

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions[0].difficulty).toBe('mid');
      expect(res.body.questions[0].skills).toEqual([]);
      expect(res.body.questions[0].companySpecific).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe("Integration Scenarios", () => {
    test("should handle full flow: job lookup -> cache miss -> AI generation -> save -> return", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(null);
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockGeminiResponse),
        },
      });

      const savedData = {
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        jobTitle: mockJob.jobTitle,
        company: mockJob.company,
        technicalQuestions: [
          { question: "Explain the difference between React hooks and class components" },
        ],
        behavioralQuestions: [
          { question: "Tell me about a time you had to resolve a conflict within your team" },
        ],
        generalQuestions: [],
      };

      mockInterviewQuestionsCreate.mockResolvedValue(savedData);

      const res = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      
      // Verify entire flow
      expect(mockJobFindOne).toHaveBeenCalledTimes(1);
      expect(mockInterviewQuestionsFindOne).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockInterviewQuestionsCreate).toHaveBeenCalledTimes(1);
      
      expect(res.body.questions).toBeDefined();
      expect(res.body.questions.length).toBeGreaterThan(0);
    });

    test("should use cache on subsequent requests", async () => {
      mockJobFindOne.mockResolvedValue(mockJob);
      mockInterviewQuestionsFindOne.mockResolvedValue(mockCachedQuestions);

      // First request
      const res1 = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res1.status).toBe(200);

      // Second request
      const res2 = await request(app)
        .get(`/interview-questions/${mockJobId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res2.status).toBe(200);
      
      // Gemini should not be called on cached requests
      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(mockInterviewQuestionsFindOne).toHaveBeenCalledTimes(2);
    });
  });
});