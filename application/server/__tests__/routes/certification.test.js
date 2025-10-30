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
const routerModule = await import("../../routes/certifications.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/certifications", router);

describe("Certifications Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockCertId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  describe("GET /certifications", () => {
    const mockCertifications = [
      {
        _id: mockCertId,
        name: "AWS Certified Developer",
        organization: "Amazon",
        dateEarned: "2024-01-01",
        userId: mockUserId,
      },
    ];

    test("should return all certifications for authenticated user", async () => {
      mockToArray.mockResolvedValue(mockCertifications);

      const res = await request(app)
        .get("/certifications")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(mockCertId.toString());
      expect(res.body[0].name).toBe("AWS Certified Developer");
      expect(res.body[0].userId).toBe(mockUserId);
      expect(mockFind).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/certifications");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/certifications")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockToArray.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .get("/certifications")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error fetching certifications");
    });
  });

  describe("POST /certifications", () => {
    const validCertData = {
      name: "AWS Certified Developer",
      organization: "Amazon",
      dateEarned: "2024-01-01",
      expirationDate: "2027-01-01",
      doesNotExpire: false,
      certificationId: "AWS-123",
      documentUrl: "https://example.com/cert.pdf",
      verified: true,
      renewalReminder: true,
      category: "Cloud",
    };

    test("should create a new certification", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockCertId,
      });

      const res = await request(app)
        .post("/certifications")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validCertData);

      expect(res.status).toBe(201);
      expect(res.body._id).toBe(mockCertId.toString());
      expect(res.body.name).toBe(validCertData.name);
      expect(res.body.userId).toBe(mockUserId);
      expect(mockInsertOne).toHaveBeenCalledWith({
        ...validCertData,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post("/certifications")
        .send(validCertData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 400 if name is missing", async () => {
      const invalidData = { ...validCertData };
      delete invalidData.name;

      const res = await request(app)
        .post("/certifications")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if organization is missing", async () => {
      const invalidData = { ...validCertData };
      delete invalidData.organization;

      const res = await request(app)
        .post("/certifications")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if dateEarned is missing", async () => {
      const invalidData = { ...validCertData };
      delete invalidData.dateEarned;

      const res = await request(app)
        .post("/certifications")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 500 on database error", async () => {
      mockInsertOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post("/certifications")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validCertData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error adding certification");
    });
  });

  describe("PUT /certifications/:id", () => {
    const updateData = {
      name: "Updated Certification",
      organization: "Updated Org",
    };

    const updatedDoc = {
      _id: mockCertId,
      ...updateData,
      userId: mockUserId,
    };

    test("should update an existing certification", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
      mockFindOne.mockResolvedValue(updatedDoc);

      const res = await request(app)
        .put(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(mockCertId.toString());
      expect(res.body.name).toBe(updateData.name);
      expect(res.body.organization).toBe(updateData.organization);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockCertId, userId: mockUserId },
        { $set: updateData }
      );
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .put(`/certifications/${mockCertId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 404 if certification not found", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Certification not found or unauthorized");
    });

    test("should return 404 if user is not authorized for certification", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Certification not found or unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockUpdateOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .put(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error updating certification");
    });
  });

  describe("DELETE /certifications/:id", () => {
    test("should delete an existing certification", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Certification deleted successfully");
      expect(mockDeleteOne).toHaveBeenCalledWith({
        _id: mockCertId,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).delete(`/certifications/${mockCertId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 404 if certification not found", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Certification not found or unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockDeleteOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .delete(`/certifications/${mockCertId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error deleting certification");
    });
  });

  describe("getUserIdFromToken helper", () => {
    test("should return null if authorization header is missing", async () => {
      const res = await request(app).get("/certifications");

      expect(res.status).toBe(401);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("should return null if JWT verification throws error", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/certifications")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
    });
  });
});