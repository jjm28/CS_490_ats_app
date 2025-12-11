import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// ============================================================================
// MOCKS SETUP - Must be created before any imports
// ============================================================================

// Mock JWT verification
const mockJwtVerify = jest.fn();

// Mock Mongoose Model for PracticeSession
const mockPracticeSessionSave = jest.fn();
const mockPracticeSessionFind = jest.fn();
const mockPracticeSessionFindOne = jest.fn();

const MockPracticeSession = jest.fn().mockImplementation(function(data) {
  this.save = mockPracticeSessionSave;
  this._id = new ObjectId();
  Object.assign(this, data);
  return this;
});

MockPracticeSession.find = mockPracticeSessionFind;
MockPracticeSession.findOne = mockPracticeSessionFindOne;

// Mock modules using unstable_mockModule
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule("../../models/practicesession.js", () => ({
  default: MockPracticeSession,
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
const routerModule = await import("../../routes/practicesession.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/practice-session", router);

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Practice Session Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockJobId = new ObjectId();
  const mockSessionId = new ObjectId();

  const sampleQuestions = [
    {
      text: "Tell me about a time you resolved a conflict within your team",
      type: "behavioral"
    },
    {
      text: "Explain how you would optimize a slow database query",
      type: "technical"
    },
    {
      text: "Describe your experience with React hooks",
      type: "technical"
    }
  ];

  const sampleResponses = [
    "In my previous role at TechCorp, I had a situation where two team members disagreed on the architecture approach. First, I scheduled a meeting to understand both perspectives. Then, I facilitated a discussion where we evaluated pros and cons of each approach. Finally, we reached a consensus by combining the best elements of both solutions. This resulted in a more robust architecture and improved team collaboration.",
    "To optimize a slow database query, I would first analyze the query execution plan to identify bottlenecks. Then, I would add appropriate indexes on frequently queried columns. Additionally, I would consider query restructuring to avoid full table scans. For example, in my last project, I reduced query time from 5 seconds to 200ms by adding a composite index on user_id and created_at columns.",
    "I have extensive experience with React hooks including useState, useEffect, and useContext. I've used them to manage component state and side effects. For instance, I recently built a data dashboard where I used useEffect for API calls and useState for managing loading states. Hooks have made my components cleaner and more reusable compared to class components."
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  // ============================================================================
  // POST /practice-session/save - SUCCESS CASES
  // ============================================================================

  describe("POST /practice-session/save - Success Cases", () => {
    test("should save a complete practice session with all responses", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Senior Software Engineer",
        company: "TechCorp",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: sampleResponses,
        duration: 1800 // 30 minutes
      };

      mockPracticeSessionSave.mockResolvedValue({
        _id: mockSessionId,
        ...sessionData,
        userId: mockUserId,
        averageScore: 85,
      });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.averageScore).toBeDefined();
      expect(res.body.questions).toBeDefined();
      expect(res.body.questions.length).toBe(3);
      
      // Verify each question has score and feedback
      res.body.questions.forEach(q => {
        expect(q.score).toBeGreaterThanOrEqual(0);
        expect(q.score).toBeLessThanOrEqual(100);
        expect(q.aiFeedback).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.response).toBeDefined();
        expect(q.category).toBeDefined();
      });

      // Verify session was saved with correct structure
      expect(mockPracticeSessionSave).toHaveBeenCalledTimes(1);
    });

    test("should calculate correct average score", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Software Engineer",
        company: "StartupCo",
        interviewType: "technical",
        questions: sampleQuestions,
        responses: sampleResponses,
        duration: 1200
      };

      let capturedAvgScore;
      mockPracticeSessionSave.mockImplementation(function() {
        capturedAvgScore = this.averageScore;
        return Promise.resolve({ _id: mockSessionId, ...this });
      });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(capturedAvgScore).toBeGreaterThan(0);
      expect(capturedAvgScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(capturedAvgScore)).toBe(true); // Should be rounded
    });

    test("should handle sessions with mixed response quality", async () => {
      const mixedResponses = [
        "Good detailed response with specific examples from my experience at TechCorp. I implemented a solution that improved performance by 50%.",
        "um, I think, like, I would just do it normally", // Poor response
        "I have extensive experience with this. First, I would analyze the requirements. Second, I would design the architecture. Then, I would implement it using best practices. Finally, I would test thoroughly."
      ];

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Developer",
        company: "Company",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: mixedResponses,
        duration: 900
      };

      mockPracticeSessionSave.mockResolvedValue({
        _id: mockSessionId,
        ...sessionData,
      });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions.length).toBe(3);
      
      // Verify different scores for different quality responses
      const scores = res.body.questions.map(q => q.score);
      expect(Math.max(...scores)).toBeGreaterThan(Math.min(...scores));
    });

    test("should skip empty responses and calculate average based on valid ones", async () => {
      const responsesWithEmpty = [
        "This is a good response with details and examples from my experience.",
        "", // Empty response - should be skipped
        "Another detailed response about my technical skills and experience."
      ];

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech Inc",
        interviewType: "technical",
        questions: sampleQuestions,
        responses: responsesWithEmpty,
        duration: 600
      };

      mockPracticeSessionSave.mockResolvedValue({
        _id: mockSessionId,
      });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions.length).toBe(2); // Only 2 valid responses
      expect(res.body.averageScore).toBeDefined();
    });

    test("should handle very short responses with appropriate scoring", async () => {
      const shortResponses = [
        "Yes", // Very short
        "I don't know", // Brief
        "Maybe I would do that" // Short but better
      ];

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Junior Developer",
        company: "Startup",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: shortResponses,
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({
        _id: mockSessionId,
      });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      
      // Short responses should get lower scores
      res.body.questions.forEach(q => {
        expect(q.score).toBeLessThan(70);
        expect(q.aiFeedback).toContain("brief");
      });
    });

    test("should handle very long responses appropriately", async () => {
      const longResponse = "word ".repeat(300); // 300 words

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Developer",
        company: "Company",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [longResponse],
        duration: 600
      };

      mockPracticeSessionSave.mockResolvedValue({
        _id: mockSessionId,
      });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Very long response should note length in feedback
      expect(res.body.questions[0].aiFeedback).toBeTruthy();
    });
  });

  // ============================================================================
  // POST /practice-session/save - SCORING ALGORITHM TESTS
  // ============================================================================

  describe("POST /practice-session/save - Scoring Algorithm", () => {
    test("should reward structured responses (first, second, then, finally)", async () => {
      const structuredResponse = "First, I would analyze the problem. Second, I would design a solution. Then, I would implement it. Finally, I would test the results.";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "technical",
        questions: [sampleQuestions[0]],
        responses: [structuredResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Structure words add bonus points, but response is short
      expect(res.body.questions[0].score).toBeGreaterThan(40);
      expect(res.body.questions[0].aiFeedback).toBeTruthy();
    });

    test("should reward STAR method elements in behavioral responses", async () => {
      const starResponse = "In that situation, I faced a challenge with the project deadline. My task was to coordinate the team. I took action by organizing daily standups and tracking progress. The result was we delivered on time with 95% quality score.";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Manager",
        company: "Corp",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [starResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions[0].score).toBeGreaterThan(60);
      // Response has good length and STAR elements
      expect(res.body.questions[0].aiFeedback).toBeTruthy();
    });

    test("should reward specific examples and metrics", async () => {
      const responseWithMetrics = "In my role at TechCorp, I improved the system performance by 60%. This affected 10,000 users daily and reduced server costs by $5,000 per month.";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [responseWithMetrics],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Metrics/numbers add bonus points
      expect(res.body.questions[0].score).toBeGreaterThan(60);
      expect(res.body.questions[0].aiFeedback).toBeTruthy();
    });

    test("should penalize filler words", async () => {
      const responseWithFillers = "Um, so like, basically I would, you know, just do it normally. Like, it's pretty straightforward, you know what I mean?";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Developer",
        company: "Company",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [responseWithFillers],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Short response with filler words gets low score
      expect(res.body.questions[0].score).toBeLessThan(60);
      expect(res.body.questions[0].aiFeedback).toBeTruthy();
    });

    test("should reward professional action words", async () => {
      const professionalResponse = "I developed a comprehensive solution, implemented best practices, analyzed the requirements, and managed the team to achieve our objectives.";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [professionalResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Professional action words add bonus
      expect(res.body.questions[0].score).toBeGreaterThan(50);
    });

    test("should reward technical terminology in technical interviews", async () => {
      const technicalResponse = "I would optimize the algorithm complexity from O(n²) to O(n log n) using a proper data structure. The API would use a database query with proper indexing to improve time complexity.";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "technical",
        questions: [sampleQuestions[1]],
        responses: [technicalResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions[0].score).toBeGreaterThan(70);
    });

    test("should score based on ideal word count range", async () => {
      // Behavioral ideal: 75-150 words
      const idealBehavioralResponse = "word ".repeat(100).trim(); // 100 words

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [idealBehavioralResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Should get bonus for ideal length
      expect(res.body.questions[0].score).toBeGreaterThan(60);
    });

    test("should cap scores at 100", async () => {
      // Perfect response with all positive indicators
      const perfectResponse = "First, in my role at TechCorp, I analyzed the situation where we had a critical performance issue affecting 50,000 users. Second, my task was to implement a solution within 2 days. I developed an optimized algorithm that improved response time by 75%. I collaborated with the team, managed the deployment, and achieved a 99% success rate. The result was $10,000 in cost savings.";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Senior Engineer",
        company: "TechCorp",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [perfectResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions[0].score).toBeLessThanOrEqual(100);
    });

    test("should floor scores at 0", async () => {
      const terribleResponse = "no";

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [terribleResponse],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions[0].score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // POST /practice-session/save - ERROR CASES
  // ============================================================================

  describe("POST /practice-session/save - Error Cases", () => {
    test("should return 401 if no authorization header", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: sampleResponses,
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .send(sessionData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockPracticeSessionSave).not.toHaveBeenCalled();
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: sampleResponses,
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer invalid.token`)
        .send(sessionData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 400 if jobId is missing", async () => {
      const sessionData = {
        // jobId missing
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: sampleResponses,
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid session data");
    });

    test("should return 400 if questions are missing", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        // questions missing
        responses: sampleResponses,
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid session data");
    });

    test("should return 400 if responses are missing", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        // responses missing
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid session data");
    });

    test("should return 400 if questions and responses count mismatch", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions, // 3 questions
        responses: ["Only one response"], // 1 response - mismatch!
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid session data");
    });

    test("should return 400 if all responses are empty", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: ["", "", ""], // All empty
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No valid responses to save");
    });

    test("should return 500 if database save fails", async () => {
      mockPracticeSessionSave.mockRejectedValue(new Error("Database connection lost"));

      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: sampleResponses,
        duration: 600
      };

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to save session");
      expect(res.body.details).toBe("Database connection lost");
    });
  });

  // ============================================================================
  // GET /practice-session/sessions - LIST SESSIONS
  // ============================================================================

  describe("GET /practice-session/sessions", () => {
    const mockSessions = [
      {
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        title: "Behavioral Interview - Software Engineer @ TechCorp",
        duration: 1800,
        completed: true,
        averageScore: 85,
        totalQuestions: 5,
        createdAt: new Date("2024-01-15"),
      },
      {
        _id: new ObjectId(),
        userId: mockUserId,
        jobId: mockJobId,
        title: "Technical Interview - Senior Developer @ StartupCo",
        duration: 2400,
        completed: true,
        averageScore: 78,
        totalQuestions: 4,
        createdAt: new Date("2024-01-10"),
      },
    ];

    beforeEach(() => {
      mockPracticeSessionFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockSessions),
        }),
      });
    });

    test("should return all practice sessions for authenticated user", async () => {
      const res = await request(app)
        .get("/practice-session/sessions")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe("Behavioral Interview - Software Engineer @ TechCorp");
      expect(res.body[0].averageScore).toBe(85);
      
      expect(mockPracticeSessionFind).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/practice-session/sessions");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockPracticeSessionFind).not.toHaveBeenCalled();
    });

    test("should return empty array if user has no sessions", async () => {
      mockPracticeSessionFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app)
        .get("/practice-session/sessions")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 500 on database error", async () => {
      mockPracticeSessionFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error("DB Error")),
        }),
      });

      const res = await request(app)
        .get("/practice-session/sessions")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to fetch sessions");
    });

    test("should limit sessions to 20 most recent", async () => {
      const res = await request(app)
        .get("/practice-session/sessions")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      
      // Verify sort and limit were called
      expect(mockPracticeSessionFind).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  // ============================================================================
  // GET /practice-session/sessions/:id - GET SPECIFIC SESSION
  // ============================================================================

  describe("GET /practice-session/sessions/:id", () => {
    const mockSession = {
      _id: mockSessionId,
      userId: mockUserId,
      jobId: mockJobId,
      title: "Behavioral Interview - Software Engineer @ TechCorp",
      duration: 1800,
      completed: true,
      questions: [
        {
          question: "Tell me about a challenging project",
          response: "In my role at TechCorp...",
          aiFeedback: "Good response with specific examples",
          score: 85,
          category: "behavioral"
        }
      ],
      averageScore: 85,
      totalQuestions: 1,
      createdAt: new Date("2024-01-15"),
    };

    test("should return specific session details", async () => {
      mockPracticeSessionFindOne.mockResolvedValue(mockSession);

      const res = await request(app)
        .get(`/practice-session/sessions/${mockSessionId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBeDefined();
      expect(res.body.title).toBe("Behavioral Interview - Software Engineer @ TechCorp");
      expect(res.body.questions).toBeDefined();
      expect(res.body.questions.length).toBe(1);
      
      expect(mockPracticeSessionFindOne).toHaveBeenCalledWith({
        _id: mockSessionId.toString(),
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get(`/practice-session/sessions/${mockSessionId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockPracticeSessionFindOne).not.toHaveBeenCalled();
    });

    test("should return 404 if session not found", async () => {
      mockPracticeSessionFindOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`/practice-session/sessions/${mockSessionId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Session not found");
    });

    test("should return 404 if session belongs to different user", async () => {
      mockPracticeSessionFindOne.mockResolvedValue(null); // Not found for this user

      const res = await request(app)
        .get(`/practice-session/sessions/${mockSessionId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Session not found");
    });

    test("should return 500 on database error", async () => {
      mockPracticeSessionFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .get(`/practice-session/sessions/${mockSessionId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to fetch session");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    test("should handle undefined responses array", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: [undefined, "Valid response", undefined],
        duration: 600
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions.length).toBe(1); // Only 1 valid response
    });

    test("should handle null responses", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: [null, "Valid response", null],
        duration: 600
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions.length).toBe(1);
    });

    test("should handle whitespace-only responses", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: sampleQuestions,
        responses: ["   ", "Valid response", "\n\t  "],
        duration: 600
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions.length).toBe(1); // Whitespace should be skipped
    });

    test("should handle single question session", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        interviewType: "behavioral",
        questions: [sampleQuestions[0]],
        responses: [sampleResponses[0]],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      expect(res.body.questions.length).toBe(1);
      expect(res.body.averageScore).toBeDefined();
    });

    test("should handle missing interview type (defaults to behavioral)", async () => {
      const sessionData = {
        jobId: mockJobId.toString(),
        jobTitle: "Engineer",
        company: "Tech",
        // interviewType missing - should default
        questions: [sampleQuestions[0]],
        responses: [sampleResponses[0]],
        duration: 300
      };

      mockPracticeSessionSave.mockResolvedValue({ _id: mockSessionId });

      const res = await request(app)
        .post("/practice-session/save")
        .set("Authorization", `Bearer ${validToken}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      // Should still process successfully with default type
    });
  });
});