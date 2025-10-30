import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// Create mocks before any imports
const mockToArray = jest.fn();
const mockFind = jest.fn(() => ({ toArray: mockToArray }));
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockDeleteOne = jest.fn();
const mockFindOne = jest.fn();

const mockCollection = {
  find: mockFind,
  insertOne: mockInsertOne,
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
  findOne: mockFindOne,
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
};

const mockGetDb = jest.fn(() => mockDb);
const mockJwtVerify = jest.fn();

// Mock modules using unstable_mockModule
jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: mockGetDb,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/education.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/education", router);

describe("Education Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockEducationId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  describe("GET /education", () => {
    const mockEducationEntries = [
      {
        _id: mockEducationId,
        institution: "MIT",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        graduationDate: "2024-05-15",
        gpa: 3.8,
        isPrivateGpa: false,
        currentlyEnrolled: false,
        educationLevel: "Bachelor's",
        achievements: ["Dean's List", "Honor Society"],
        userId: mockUserId,
      },
    ];

    test("should return all education entries for authenticated user", async () => {
      mockToArray.mockResolvedValue(mockEducationEntries);

      const res = await request(app)
        .get("/education")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(mockEducationId.toString());
      expect(res.body[0].institution).toBe("MIT");
      expect(res.body[0].userId).toBe(mockUserId);
      expect(mockFind).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/education");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/education")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockToArray.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .get("/education")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error fetching education");
    });
  });

  describe("POST /education", () => {
    const validEducationData = {
      institution: "MIT",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      graduationDate: "2024-05-15",
      gpa: 3.8,
      isPrivateGpa: false,
      currentlyEnrolled: false,
      educationLevel: "Bachelor's",
      achievements: ["Dean's List", "Honor Society"],
    };

    test("should create a new education entry", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockEducationId,
      });

      const res = await request(app)
        .post("/education")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validEducationData);

      expect(res.status).toBe(201);
      expect(res.body._id).toBe(mockEducationId.toString());
      expect(res.body.institution).toBe(validEducationData.institution);
      expect(res.body.userId).toBe(mockUserId);
      expect(mockInsertOne).toHaveBeenCalledWith({
        ...validEducationData,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post("/education")
        .send(validEducationData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 400 if institution is missing", async () => {
      const invalidData = { ...validEducationData };
      delete invalidData.institution;

      const res = await request(app)
        .post("/education")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if degree is missing", async () => {
      const invalidData = { ...validEducationData };
      delete invalidData.degree;

      const res = await request(app)
        .post("/education")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if fieldOfStudy is missing", async () => {
      const invalidData = { ...validEducationData };
      delete invalidData.fieldOfStudy;

      const res = await request(app)
        .post("/education")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if educationLevel is missing", async () => {
      const invalidData = { ...validEducationData };
      delete invalidData.educationLevel;

      const res = await request(app)
        .post("/education")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 500 on database error", async () => {
      mockInsertOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post("/education")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validEducationData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error adding education");
    });
  });

  describe("PUT /education/:id", () => {
    const updateData = {
      institution: "Stanford University",
      degree: "Master of Science",
      fieldOfStudy: "Artificial Intelligence",
    };

    const updatedDoc = {
      _id: mockEducationId,
      ...updateData,
      userId: mockUserId,
    };

    test("should update an existing education entry", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
      mockFindOne.mockResolvedValue(updatedDoc);

      const res = await request(app)
        .put(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(mockEducationId.toString());
      expect(res.body.institution).toBe(updateData.institution);
      expect(res.body.degree).toBe(updateData.degree);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockEducationId, userId: mockUserId },
        { $set: updateData }
      );
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .put(`/education/${mockEducationId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 404 if education entry not found", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Education entry not found");
    });

    test("should return 404 if user is not authorized for education entry", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Education entry not found");
    });

    test("should return 500 on database error", async () => {
      mockUpdateOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .put(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error updating education");
    });
  });

  describe("DELETE /education/:id", () => {
    test("should delete an existing education entry", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Education deleted successfully");
      expect(mockDeleteOne).toHaveBeenCalledWith({
        _id: mockEducationId,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).delete(`/education/${mockEducationId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 404 if education entry not found", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Education entry not found");
    });

    test("should return 500 on database error", async () => {
      mockDeleteOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .delete(`/education/${mockEducationId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error deleting education");
    });
  });

  describe("getUserIdFromToken helper", () => {
    test("should return null if authorization header is missing", async () => {
      const res = await request(app).get("/education");

      expect(res.status).toBe(401);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("should return null if JWT verification throws error", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/education")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
    });
  });
});