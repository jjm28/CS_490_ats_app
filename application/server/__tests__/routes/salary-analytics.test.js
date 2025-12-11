import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// ============================================================================
// MOCKS SETUP - Must be created before any imports
// ============================================================================

// Mock Mongoose Model for Jobs
const mockJobsFind = jest.fn();

const MockJobs = {
  find: mockJobsFind,
};

// Mock modules using unstable_mockModule
jest.unstable_mockModule("../../models/jobs.js", () => ({
  default: MockJobs,
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/salary-analytics.js");
const router = routerModule.default;

const app = express();
app.use(express.json());

// Middleware to simulate authenticated user
app.use((req, res, next) => {
  req.user = { _id: "user123" };
  next();
});

app.use("/salary-analytics", router);

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Salary Analytics Router", () => {
  const mockUserId = "user123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // HELPER: Create Mock Job Data
  // ============================================================================

  const createMockJob = (overrides = {}) => ({
    _id: new ObjectId(),
    userId: mockUserId,
    jobTitle: "Software Engineer",
    company: "TechCorp",
    location: "NYC",
    salaryMin: 100000,
    salaryMax: 150000,
    salaryHistory: [],
    compHistory: [],
    ...overrides,
  });

  // ============================================================================
  // GET / - NO JOBS CASE
  // ============================================================================

  describe("GET / - No Jobs", () => {
    test("should return empty analytics when user has no jobs", async () => {
      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        summary: { avgSalary: 0, medianSalary: 0, minSalary: 0, maxSalary: 0 },
        progression: [],
        negotiationStats: { attempts: 0, successes: 0, successRate: 0 },
        marketPositioning: [],
        recommendations: [],
      });
    });

    test("should return 400 if userId is missing", async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use("/salary-analytics", router);

      const res = await request(appNoAuth).get("/salary-analytics");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing user id");
    });

    test("should handle null jobs array", async () => {
      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.avgSalary).toBe(0);
    });
  });

  // ============================================================================
  // SALARY SUMMARY CALCULATIONS
  // ============================================================================

  describe("GET / - Salary Summary Calculations", () => {
    test("should calculate average salary from min/max range", async () => {
      const jobs = [
        createMockJob({ salaryMin: 80000, salaryMax: 100000 }), // avg: 90k
        createMockJob({ salaryMin: 120000, salaryMax: 140000 }), // avg: 130k
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.avgSalary).toBe(110000); // (90k + 130k) / 2
      expect(res.body.summary.minSalary).toBe(90000);
      expect(res.body.summary.maxSalary).toBe(130000);
    });

    test("should calculate median salary correctly for odd count", async () => {
      const jobs = [
        createMockJob({ salaryMin: 60000, salaryMax: 60000 }), // 60k
        createMockJob({ salaryMin: 80000, salaryMax: 80000 }), // 80k
        createMockJob({ salaryMin: 100000, salaryMax: 100000 }), // 100k
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.medianSalary).toBe(80000); // Middle value
    });

    test("should calculate median salary correctly for even count", async () => {
      const jobs = [
        createMockJob({ salaryMin: 60000, salaryMax: 60000 }),
        createMockJob({ salaryMin: 80000, salaryMax: 80000 }),
        createMockJob({ salaryMin: 100000, salaryMax: 100000 }),
        createMockJob({ salaryMin: 120000, salaryMax: 120000 }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // For even count, takes the middle-right value (index 2)
      expect(res.body.summary.medianSalary).toBe(100000);
    });

    test("should prefer finalSalary from salaryHistory over min/max", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 100000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 95000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.avgSalary).toBe(95000); // Uses finalSalary, not average of min/max
    });

    test("should handle jobs with only salaryMin", async () => {
      const jobs = [
        createMockJob({ salaryMin: 85000, salaryMax: null }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.avgSalary).toBe(85000);
    });

    test("should handle jobs with only salaryMax", async () => {
      const jobs = [
        createMockJob({ salaryMin: null, salaryMax: 120000 }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.avgSalary).toBe(120000);
    });

    test("should skip jobs with no salary data", async () => {
      const jobs = [
        createMockJob({ salaryMin: 100000, salaryMax: 120000 }), // avg = 110k
        createMockJob({ salaryMin: null, salaryMax: null, salaryHistory: [] }), // no salary
        createMockJob({ salaryMin: 80000, salaryMax: 90000 }), // avg = 85k
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // Should only include the 2 jobs with valid salary data
      // (110k + 85k) / 2 = 97500 (average of the midpoints)
      expect(res.body.summary.avgSalary).toBe(97500);
    });
  });

  // ============================================================================
  // SALARY PROGRESSION
  // ============================================================================

  describe("GET / - Salary Progression", () => {
    test("should build progression timeline from salaryHistory", async () => {
      const jobs = [
        createMockJob({
          company: "CompanyA",
          jobTitle: "Junior Dev",
          salaryHistory: [
            { date: "2023-01-15", finalSalary: 75000, negotiationOutcome: "Not attempted" },
            { date: "2023-06-01", finalSalary: 80000, negotiationOutcome: "Improved" },
          ],
        }),
        createMockJob({
          company: "CompanyB",
          jobTitle: "Mid Dev",
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 95000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.progression).toHaveLength(3);
      
      // Should be sorted by date
      expect(res.body.progression[0].date).toBe("2023-01-15");
      expect(res.body.progression[0].salary).toBe(75000);
      expect(res.body.progression[0].company).toBe("CompanyA");
      
      expect(res.body.progression[2].date).toBe("2024-01-01");
      expect(res.body.progression[2].salary).toBe(95000);
    });

    test("should handle empty salaryHistory", async () => {
      const jobs = [
        createMockJob({ salaryHistory: [] }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.progression).toEqual([]);
    });

    test("should sort progression by date chronologically", async () => {
      const jobs = [
        createMockJob({
          salaryHistory: [
            { date: "2024-06-01", finalSalary: 100000, negotiationOutcome: "Improved" },
            { date: "2024-01-01", finalSalary: 90000, negotiationOutcome: "Not attempted" },
            { date: "2024-09-01", finalSalary: 110000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.progression[0].date).toBe("2024-01-01");
      expect(res.body.progression[1].date).toBe("2024-06-01");
      expect(res.body.progression[2].date).toBe("2024-09-01");
    });
  });

  // ============================================================================
  // NEGOTIATION ANALYTICS
  // ============================================================================

  describe("GET / - Negotiation Analytics", () => {
    test("should calculate negotiation success rate", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 100000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 95000, negotiationOutcome: "Improved" },
            { date: "2024-02-01", finalSalary: 97000, negotiationOutcome: "Improved" },
            { date: "2024-03-01", finalSalary: 85000, negotiationOutcome: "No change" },
            { date: "2024-04-01", finalSalary: 83000, negotiationOutcome: "Worse" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // 2 successes out of 4 attempts = 50%
      expect(res.body.negotiationStats.successRate).toBe(50);
    });

    test("should exclude 'Not attempted' from negotiation attempts", async () => {
      const jobs = [
        createMockJob({
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 90000, negotiationOutcome: "Not attempted" },
            { date: "2024-02-01", finalSalary: 95000, negotiationOutcome: "Improved" },
            { date: "2024-03-01", finalSalary: 90000, negotiationOutcome: "No change" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // Only 2 attempts (excluding "Not attempted"), 1 success = 50%
      expect(res.body.negotiationStats.successRate).toBe(50);
    });

    test("should calculate negotiation strength based on salary range", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000, // Range: 80k - 120k
          salaryMax: 120000,
          salaryHistory: [
            // finalSalary 110k = (110-80)/(120-80) = 30/40 = 75%
            { date: "2024-01-01", finalSalary: 110000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.negotiationStats.negotiationStrength).toBe(75);
    });

    test("should calculate average negotiation strength across multiple jobs", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 100000, negotiationOutcome: "Improved" }, // 50%
          ],
        }),
        createMockJob({
          salaryMin: 90000,
          salaryMax: 110000,
          salaryHistory: [
            { date: "2024-02-01", finalSalary: 105000, negotiationOutcome: "Improved" }, // 75%
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // Average: (50% + 75%) / 2 = 62.5% → rounds to 63%
      expect(res.body.negotiationStats.negotiationStrength).toBe(63);
    });

    test("should only count 'Improved' outcomes for negotiation strength", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 110000, negotiationOutcome: "Improved" },
            { date: "2024-02-01", finalSalary: 85000, negotiationOutcome: "No change" },
            { date: "2024-03-01", finalSalary: 82000, negotiationOutcome: "Worse" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // Only the "Improved" entry counts for strength calculation
      expect(res.body.negotiationStats.negotiationStrength).toBe(75);
    });

    test("should handle zero negotiation attempts", async () => {
      const jobs = [
        createMockJob({
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 90000, negotiationOutcome: "Not attempted" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.negotiationStats.successRate).toBe(0);
      expect(res.body.negotiationStats.negotiationStrength).toBe(0);
    });

    test("should clamp negotiation strength ratio between 0 and 1", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 100000,
          salaryHistory: [
            // Edge case: finalSalary exceeds max
            { date: "2024-01-01", finalSalary: 110000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // Should clamp to 100%
      expect(res.body.negotiationStats.negotiationStrength).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // MARKET POSITIONING
  // ============================================================================

  describe("GET / - Market Positioning", () => {
    test("should compare salary to benchmark for known title and location", async () => {
      const jobs = [
        createMockJob({
          jobTitle: "Software Engineer",
          location: "NYC",
          salaryMin: 110000,
          salaryMax: 120000,
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.marketPositioning).toHaveLength(1);
      expect(res.body.marketPositioning[0].estimatedSalary).toBe(115000);
      expect(res.body.marketPositioning[0].benchmarkMedian).toBe(115000);
      expect(res.body.marketPositioning[0].benchmarkTop).toBe(160000);
      expect(res.body.marketPositioning[0].belowMedian).toBe(false);
      expect(res.body.marketPositioning[0].nearTop).toBe(false);
    });

    test("should use Any|Any benchmark for unknown title/location", async () => {
      const jobs = [
        createMockJob({
          jobTitle: "Product Manager",
          location: "Austin",
          salaryMin: 90000,
          salaryMax: 100000,
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.marketPositioning[0].benchmarkMedian).toBe(85000); // Any|Any median
      expect(res.body.marketPositioning[0].benchmarkTop).toBe(130000); // Any|Any top
    });

    test("should mark salary as belowMedian when appropriate", async () => {
      const jobs = [
        createMockJob({
          jobTitle: "Software Engineer",
          location: "NYC",
          salaryMin: 80000,
          salaryMax: 90000, // avg: 85k, below 115k median
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.marketPositioning[0].belowMedian).toBe(true);
    });

    test("should mark salary as nearTop when within 90% of top", async () => {
      const jobs = [
        createMockJob({
          jobTitle: "Software Engineer",
          location: "NYC",
          salaryMin: 150000,
          salaryMax: 160000, // avg: 155k, top is 160k, 90% = 144k
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.marketPositioning[0].nearTop).toBe(true);
    });

    test("should prefer finalSalary over min/max for market positioning", async () => {
      const jobs = [
        createMockJob({
          jobTitle: "Data Analyst",
          location: "NYC",
          salaryMin: 80000,
          salaryMax: 100000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 95000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.marketPositioning[0].estimatedSalary).toBe(95000);
    });
  });

  // ============================================================================
  // RECOMMENDATIONS ENGINE
  // ============================================================================

  describe("GET / - Recommendations Engine", () => {
    test("should recommend higher-paying roles if average salary is low", async () => {
      const jobs = [
        createMockJob({ salaryMin: 50000, salaryMax: 60000 }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toContain(
        "Your average salary is below typical industry thresholds. Consider targeting higher-paying roles or negotiating more aggressively."
      );
    });

    test("should recommend improving negotiation if success rate is low", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 100000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 105000, negotiationOutcome: "No change" },
            { date: "2024-02-01", finalSalary: 110000, negotiationOutcome: "No change" },
            { date: "2024-03-01", finalSalary: 108000, negotiationOutcome: "Worse" },
            { date: "2024-04-01", finalSalary: 115000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // 1 success out of 4 = 25% < 30%
      expect(res.body.recommendations).toContain(
        "Your negotiation success rate is low. Practice negotiation scripts or negotiate more often."
      );
    });

    test("should praise excellent negotiation strength", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 115000, negotiationOutcome: "Improved" }, // 87.5%
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.recommendations.some(r => r.includes("excellent"))).toBe(true);
    });

    test("should note moderate negotiation strength", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 100000, negotiationOutcome: "Improved" }, // 50%
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.recommendations.some(r => r.includes("moderate"))).toBe(true);
    });

    test("should recommend enhancing approach if negotiation strength is low", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 80000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 85000, negotiationOutcome: "Improved" }, // 12.5%
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.recommendations.some(r => r.includes("lower end"))).toBe(true);
    });

    test("should praise strong salary progression", async () => {
      const jobs = [
        createMockJob({
          salaryHistory: [
            { date: "2023-01-01", finalSalary: 80000, negotiationOutcome: "Not attempted" },
            { date: "2024-01-01", finalSalary: 100000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // 25% growth ((100-80)/80 * 100)
      expect(res.body.recommendations.some(r => r.includes("Strong salary progression"))).toBe(true);
    });

    test("should provide default recommendation if no specific ones apply", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 120000,
          salaryMax: 140000,
          salaryHistory: [],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toContain(
        "Your salary profile looks strong. Continue targeting high-compensation roles."
      );
    });
  });

  // ============================================================================
  // TOTAL COMPENSATION ANALYTICS
  // ============================================================================

  describe("GET / - Total Compensation Analytics", () => {
    test("should calculate total compensation summary", async () => {
      const jobs = [
        createMockJob({
          compHistory: [
            { date: "2024-01-01", totalComp: 120000 },
            { date: "2024-06-01", totalComp: 130000 },
          ],
        }),
        createMockJob({
          compHistory: [
            { date: "2024-02-01", totalComp: 150000 },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.compSummary.avgTotalComp).toBe(133333); // (120+130+150)/3
      expect(res.body.compSummary.minTotalComp).toBe(120000);
      expect(res.body.compSummary.maxTotalComp).toBe(150000);
    });

    test("should build total compensation progression timeline", async () => {
      const jobs = [
        createMockJob({
          company: "CompanyA",
          jobTitle: "Engineer",
          compHistory: [
            { date: "2023-01-01", totalComp: 110000 },
            { date: "2023-06-01", totalComp: 115000 },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.compProgression).toHaveLength(2);
      expect(res.body.compProgression[0].totalComp).toBe(110000);
      expect(res.body.compProgression[1].totalComp).toBe(115000);
    });

    test("should handle empty compHistory", async () => {
      const jobs = [
        createMockJob({ compHistory: [] }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.compSummary.avgTotalComp).toBe(0);
      expect(res.body.compProgression).toEqual([]);
    });

    test("should sort compensation progression by date", async () => {
      const jobs = [
        createMockJob({
          compHistory: [
            { date: "2024-06-01", totalComp: 140000 },
            { date: "2024-01-01", totalComp: 120000 },
            { date: "2024-09-01", totalComp: 160000 },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.compProgression[0].date).toBe("2024-01-01");
      expect(res.body.compProgression[1].date).toBe("2024-06-01");
      expect(res.body.compProgression[2].date).toBe("2024-09-01");
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("GET / - Error Handling", () => {
    test("should return 500 on database error", async () => {
      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error("Database connection failed")),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to load salary analytics");
    });

    test("should handle x-dev-user-id header for userId", async () => {
      const appWithHeader = express();
      appWithHeader.use(express.json());
      appWithHeader.use("/salary-analytics", router);

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const res = await request(appWithHeader)
        .get("/salary-analytics")
        .set("x-dev-user-id", "dev-user-456");

      expect(res.status).toBe(200);
      expect(mockJobsFind).toHaveBeenCalledWith({ userId: "dev-user-456" });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("GET / - Edge Cases", () => {
    test("should handle jobs with missing salaryHistory field", async () => {
      const jobs = [
        createMockJob({ salaryMin: 100000, salaryMax: 120000 }),
        { ...createMockJob(), salaryHistory: undefined },
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.progression).toBeDefined();
    });

    test("should handle string salaryMin/salaryMax values", async () => {
      const jobs = [
        createMockJob({ salaryMin: "100000", salaryMax: "120000" }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary.avgSalary).toBe(110000);
    });

    test("should handle zero salary values", async () => {
      const jobs = [
        createMockJob({ salaryMin: 0, salaryMax: 0 }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      // Zero values should be treated as valid salary data
      expect(res.body.summary.avgSalary).toBe(0);
    });

    test("should handle single job scenario", async () => {
      const jobs = [
        createMockJob({
          salaryMin: 100000,
          salaryMax: 120000,
          salaryHistory: [
            { date: "2024-01-01", finalSalary: 110000, negotiationOutcome: "Improved" },
          ],
        }),
      ];

      mockJobsFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(jobs),
      });

      const res = await request(app).get("/salary-analytics");

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.negotiationStats).toBeDefined();
      expect(res.body.marketPositioning).toHaveLength(1);
    });
  });
});