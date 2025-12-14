import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// Create mocks before any imports
const mockProfileCreate = jest.fn();
const mockProfileFind = jest.fn();
const mockProfileFindOne = jest.fn();
const mockProfileFindOneAndUpdate = jest.fn();
const mockProfileFindById = jest.fn();
const mockProfileUpdateOne = jest.fn();
const mockVerifyJWT = jest.fn((req, res, next) => next());

// Mock database connection
const mockCountDocuments = jest.fn();
const mockDbFindOne = jest.fn();
const mockDbCollection = jest.fn(() => ({
  findOne: mockDbFindOne,
  countDocuments: mockCountDocuments,
}));

const mockGetDb = jest.fn(() => ({
  collection: mockDbCollection,
}));

// Mock Profile model
const mockProfile = {
  create: mockProfileCreate,
  find: mockProfileFind,
  findOne: mockProfileFindOne,
  findOneAndUpdate: mockProfileFindOneAndUpdate,
  findById: mockProfileFindById,
  updateOne: mockProfileUpdateOne,
};

// Mock dependencies
jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: mockGetDb,
}));

jest.unstable_mockModule("../../models/profile.js", () => ({
  default: mockProfile,
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  verifyJWT: mockVerifyJWT,
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/profile.js");
const router = routerModule.default;

describe("Profile Router", () => {
  const mockUserId = "user123";
  const mockProfileId = new ObjectId("507f1f77bcf86cd799439012");

  // Mock profile data with string _id (as returned by lean())
  const mockProfileData = {
    _id: mockProfileId.toString(),
    userId: mockUserId,
    fullName: "John Doe",
    email: "john@example.com",
    phone: "555-0123",
    headline: "Software Engineer",
    bio: "Experienced developer",
    industry: "Technology",
    experienceLevel: "Senior",
    location: {
      city: "San Francisco",
      state: "CA",
    },
    photoUrl: "https://example.com/photo.jpg",
  };

  // Helper to create authenticated app
  function createAuthApp() {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: mockUserId };
      next();
    });
    app.use("/profile", router);
    return app;
  }

  // Helper to create unauthenticated app
  function createUnauthApp() {
    const app = express();
    app.use(express.json());
    app.use("/profile", router);
    return app;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserId helper", () => {
    test("should extract userId from req.user._id", async () => {
      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { _id: new ObjectId("507f1f77bcf86cd799439099") };
        next();
      });
      app.use("/profile", router);

      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app).get("/profile");

      expect(res.status).toBe(200);
      expect(mockProfileFindOne).toHaveBeenCalledWith({
        userId: "507f1f77bcf86cd799439099",
      });
    });

    test("should extract userId from req.user.id", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app).get("/profile");

      expect(res.status).toBe(200);
      expect(mockProfileFindOne).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should extract userId from x-dev-user-id header", async () => {
      const app = express();
      app.use(express.json());
      app.use("/profile", router);

      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .get("/profile")
        .set("x-dev-user-id", "header-user-123");

      expect(res.status).toBe(200);
      expect(mockProfileFindOne).toHaveBeenCalledWith({
        userId: "header-user-123",
      });
    });

    test("should return 401 when no userId is available", async () => {
      const app = express();
      app.use(express.json());
      app.use("/profile", router);

      const res = await request(app).get("/profile");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });
  });

  describe("POST /profile", () => {
    test("should create a new profile when none exists", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          email: "john@example.com",
          headline: "Software Engineer",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("fullName", "John Doe");
      expect(mockProfileFindOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "John Doe",
          email: "john@example.com",
          userId: mockUserId,
        })
      );
    });

    test("should update existing profile instead of creating duplicate", async () => {
      const app = createAuthApp();
      const existingProfile = { ...mockProfileData, _id: mockProfileId };
      mockProfileFindOne.mockResolvedValue(existingProfile);
      const updatedProfile = { ...existingProfile, headline: "Senior Engineer" };
      mockProfileFindOneAndUpdate.mockResolvedValue(updatedProfile);

      const res = await request(app)
        .post("/profile")
        .send({
          headline: "Senior Engineer",
        });

      expect(res.status).toBe(200);
      expect(res.body.headline).toBe("Senior Engineer");
      expect(mockProfileFindOne).toHaveBeenCalledWith({ userId: mockUserId });
      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: existingProfile._id, userId: mockUserId },
        { $set: expect.objectContaining({ headline: "Senior Engineer" }) },
        { new: true, runValidators: true, omitUndefined: true }
      );
      expect(mockProfileCreate).not.toHaveBeenCalled();
    });

    test("should return 401 if no authentication", async () => {
      const app = createUnauthApp();

      const res = await request(app).post("/profile").send({
        fullName: "John Doe",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    test("should filter out unknown fields", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          email: "john@example.com",
          unknownField: "should be filtered",
          maliciousField: "hacker",
        });

      expect(res.status).toBe(201);
      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          unknownField: expect.anything(),
          maliciousField: expect.anything(),
        })
      );
    });

    test("should handle location data", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          location: {
            city: "New York",
            state: "NY",
          },
        });

      expect(res.status).toBe(201);
      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            city: "New York",
            state: "NY",
          },
        })
      );
    });

    test("should exclude location if empty", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          location: {},
        });

      expect(res.status).toBe(201);
      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          location: expect.anything(),
        })
      );
    });

    test("should handle photoUrl", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          photoUrl: "https://example.com/new-photo.jpg",
        });

      expect(res.status).toBe(201);
    });

    test("should trim photoUrl when updating existing profile", async () => {
      const app = createAuthApp();
      const existingProfile = { ...mockProfileData, _id: mockProfileId };
      mockProfileFindOne.mockResolvedValue(existingProfile);
      mockProfileFindOneAndUpdate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          photoUrl: "  https://example.com/photo.jpg  ",
        });

      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            photoUrl: "https://example.com/photo.jpg",
          }),
        }),
        expect.anything()
      );
    });

    test("should exclude empty photoUrl when updating existing profile", async () => {
      const app = createAuthApp();
      const existingProfile = { ...mockProfileData, _id: mockProfileId };
      mockProfileFindOne.mockResolvedValue(existingProfile);
      mockProfileFindOneAndUpdate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          photoUrl: "   ",
        });

      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            photoUrl: undefined,
          }),
        }),
        expect.anything()
      );
    });

    test("should return 400 on database error during create", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });

    test("should return 400 on database error during update", async () => {
      const app = createAuthApp();
      const existingProfile = { ...mockProfileData, _id: mockProfileId };
      mockProfileFindOne.mockResolvedValue(existingProfile);
      mockProfileFindOneAndUpdate.mockRejectedValue(new Error("Update error"));

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Update error");
    });

    test("should return 400 with default message on unknown error", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockRejectedValue({});

      const res = await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Create failed");
    });
  });

  describe("GET /profile", () => {
    test("should return array with single profile when it exists", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .get("/profile");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([mockProfileData]);
      expect(mockProfileFindOne).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return empty array when no profile exists", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get("/profile");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 401 if no authentication", async () => {
      const app = createUnauthApp();

      const res = await request(app).get("/profile");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    test("should return 400 on database error", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error("Database error")),
      });

      const res = await request(app)
        .get("/profile");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });

    test("should return 400 with Fetch failed message on error without message", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue({}),
      });

      const res = await request(app)
        .get("/profile");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Fetch failed");
    });
  });

  describe("GET /profile/:id", () => {
    test("should return a single profile with matching userId", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .get(`/profile/${mockProfileId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockProfileData);
      expect(mockProfileFindOne).toHaveBeenCalledWith({
        _id: mockProfileId.toString(),
        userId: mockUserId,
      });
    });

    test("should handle old profile without userId (fallback)", async () => {
      const app = createAuthApp();
      const oldProfileData = { ...mockProfileData, userId: undefined };
      
      // First findOne with userId returns null
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      
      // findById finds the old doc
      mockProfileFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(oldProfileData),
      });
      
      mockProfileUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      const res = await request(app)
        .get(`/profile/${mockProfileId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(oldProfileData);
      expect(mockProfileFindOne).toHaveBeenCalledWith({
        _id: mockProfileId.toString(),
        userId: mockUserId,
      });
      expect(mockProfileFindById).toHaveBeenCalledWith(mockProfileId.toString());
      expect(mockProfileUpdateOne).toHaveBeenCalledWith(
        { _id: mockProfileId.toString() },
        { $set: { userId: mockUserId } }
      );
    });

    test("should return 404 if profile not found anywhere", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockProfileFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get(`/profile/${mockProfileId}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    test("should return 401 if no authentication", async () => {
      const app = createUnauthApp();

      const res = await request(app).get(`/profile/${mockProfileId}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    test("should return 400 on database error", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error("Database error")),
      });

      const res = await request(app)
        .get(`/profile/${mockProfileId}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });

    test("should return 400 with Fetch failed message on error without message", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue({}),
      });

      const res = await request(app)
        .get(`/profile/${mockProfileId}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Fetch failed");
    });
  });

  describe("PUT /profile/:id", () => {
    test("should update a profile with matching userId", async () => {
      const app = createAuthApp();
      const updatedProfile = { ...mockProfileData, fullName: "Jane Doe" };
      mockProfileFindOneAndUpdate.mockResolvedValue(updatedProfile);

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({
          fullName: "Jane Doe",
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedProfile);
      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockProfileId.toString(), userId: mockUserId },
        { $set: expect.objectContaining({ fullName: "Jane Doe" }) },
        { new: true, runValidators: true, omitUndefined: true }
      );
    });

    test("should handle old profile without userId (fallback)", async () => {
      const app = createAuthApp();
      const oldProfileData = { ...mockProfileData, userId: undefined };
      const updatedProfile = { ...mockProfileData, fullName: "Jane Doe" };

      // First update attempt returns null
      mockProfileFindOneAndUpdate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedProfile);

      // findById confirms it exists
      mockProfileFindById.mockResolvedValue(oldProfileData);

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({
          fullName: "Jane Doe",
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedProfile);
      
      // First attempt with userId
      expect(mockProfileFindOneAndUpdate).toHaveBeenNthCalledWith(
        1,
        { _id: mockProfileId.toString(), userId: mockUserId },
        { $set: expect.objectContaining({ fullName: "Jane Doe" }) },
        { new: true, runValidators: true, omitUndefined: true }
      );

      // Check if exists
      expect(mockProfileFindById).toHaveBeenCalledWith(mockProfileId.toString());

      // Second attempt with userId attached
      expect(mockProfileFindOneAndUpdate).toHaveBeenNthCalledWith(
        2,
        { _id: mockProfileId.toString() },
        { $set: expect.objectContaining({ fullName: "Jane Doe", userId: mockUserId }) },
        { new: true, runValidators: true, omitUndefined: true }
      );
    });

    test("should return 404 if profile not found anywhere", async () => {
      const app = createAuthApp();
      mockProfileFindOneAndUpdate.mockResolvedValue(null);
      mockProfileFindById.mockResolvedValue(null);

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({
          fullName: "Jane Doe",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    test("should return 401 if no authentication", async () => {
      const app = createUnauthApp();

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({ fullName: "Jane Doe" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    test("should filter unknown fields on update", async () => {
      const app = createAuthApp();
      mockProfileFindOneAndUpdate.mockResolvedValue(mockProfileData);

      await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({
          fullName: "Jane Doe",
          maliciousField: "hacker",
        });

      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.not.objectContaining({
            maliciousField: expect.anything(),
          }),
        }),
        expect.anything()
      );
    });

    test("should update location", async () => {
      const app = createAuthApp();
      mockProfileFindOneAndUpdate.mockResolvedValue(mockProfileData);

      await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({
          location: {
            city: "Boston",
            state: "MA",
          },
        });

      expect(mockProfileFindOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            location: {
              city: "Boston",
              state: "MA",
            },
          }),
        }),
        expect.anything()
      );
    });

    test("should return 400 on database error", async () => {
      const app = createAuthApp();
      mockProfileFindOneAndUpdate.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({ fullName: "Jane Doe" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });

    test("should return 400 with default message on unknown error", async () => {
      const app = createAuthApp();
      mockProfileFindOneAndUpdate.mockRejectedValue({});

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({ fullName: "Jane Doe" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Update failed");
    });

    test("should handle validation error on update", async () => {
      const app = createAuthApp();
      mockProfileFindOneAndUpdate.mockRejectedValue(
        new Error("Validation failed: phone format is invalid")
      );

      const res = await request(app)
        .put(`/profile/${mockProfileId}`)
        .send({
          phone: "invalid-phone",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Validation failed");
    });
  });

  describe("pickProfileFields helper", () => {
    test("should only pick known fields", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          email: "john@example.com",
          phone: "555-0123",
          headline: "Engineer",
          bio: "Developer",
          industry: "Tech",
          experienceLevel: "Senior",
          randomField: "should not appear",
        });

      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "John Doe",
          email: "john@example.com",
          phone: "555-0123",
          headline: "Engineer",
          bio: "Developer",
          industry: "Tech",
          experienceLevel: "Senior",
        })
      );
    });

    test("should handle partial location (city only)", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          location: {
            city: "New York",
          },
        });

      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            city: "New York",
            state: undefined,
          },
        })
      );
    });

    test("should handle partial location (state only)", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          location: {
            state: "CA",
          },
        });

      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            city: undefined,
            state: "CA",
          },
        })
      );
    });

    test("should handle missing location object", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
        });

      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          location: expect.anything(),
        })
      );
    });

    test("should handle empty string photoUrl", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          photoUrl: "",
        });

      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: undefined,
        })
      );
    });

    test("should handle non-string photoUrl", async () => {
      const app = createAuthApp();
      mockProfileFindOne.mockResolvedValue(null);
      mockProfileCreate.mockResolvedValue(mockProfileData);

      await request(app)
        .post("/profile")
        .send({
          fullName: "John Doe",
          photoUrl: 123, // number instead of string
        });

      expect(mockProfileCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: undefined,
        })
      );
    });
  });
});