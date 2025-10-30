import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// Create mocks before any imports
const mockToArray = jest.fn();
const mockFind = jest.fn(() => ({ toArray: mockToArray }));
const mockFindOne = jest.fn();
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockDeleteOne = jest.fn();

const mockCollection = {
  find: mockFind,
  findOne: mockFindOne,
  insertOne: mockInsertOne,
  updateOne: mockUpdateOne,
  deleteOne: mockDeleteOne,
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
const routerModule = await import("../../routes/skills.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/skills", router);

describe("Skills Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockSkillId = new ObjectId();

  const mockSkillData = {
    _id: mockSkillId,
    name: "JavaScript",
    category: "Programming Languages",
    proficiency: "Expert",
    userId: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  describe("GET /skills", () => {
    test("should return all skills for authenticated user", async () => {
      const mockSkills = [mockSkillData];
      mockToArray.mockResolvedValue(mockSkills);

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(mockSkillId.toString());
      expect(res.body[0].name).toBe("JavaScript");
      expect(res.body[0].category).toBe("Programming Languages");
      expect(res.body[0].proficiency).toBe("Expert");
      expect(mockFind).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return empty array if user has no skills", async () => {
      mockToArray.mockResolvedValue([]);

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/skills");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockFind).not.toHaveBeenCalled();
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockToArray.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error fetching skills");
    });

    test("should return multiple skills", async () => {
      const mockSkills = [
        mockSkillData,
        {
          _id: new ObjectId(),
          name: "React",
          category: "Frameworks",
          proficiency: "Advanced",
          userId: mockUserId,
        },
      ];
      mockToArray.mockResolvedValue(mockSkills);

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("POST /skills", () => {
    const validSkillData = {
      name: "Python",
      category: "Programming Languages",
      proficiency: "Intermediate",
    };

    test("should create a new skill", async () => {
      mockFindOne.mockResolvedValue(null); // No existing skill
      mockInsertOne.mockResolvedValue({
        insertedId: mockSkillId,
      });

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validSkillData);

      expect(res.status).toBe(201);
      expect(res.body._id).toBe(mockSkillId.toString());
      expect(res.body.name).toBe(validSkillData.name);
      expect(res.body.userId).toBe(mockUserId);
      expect(mockInsertOne).toHaveBeenCalledWith({
        ...validSkillData,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).post("/skills").send(validSkillData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    test("should return 400 if name is missing", async () => {
      const invalidData = { ...validSkillData };
      delete invalidData.name;

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    test("should return 400 if category is missing", async () => {
      const invalidData = { ...validSkillData };
      delete invalidData.category;

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if proficiency is missing", async () => {
      const invalidData = { ...validSkillData };
      delete invalidData.proficiency;

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 409 if skill already exists for user", async () => {
      mockFindOne.mockResolvedValue({
        _id: mockSkillId,
        name: "Python",
        userId: mockUserId,
      });

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validSkillData);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Skill already exists for this user");
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    test("should check for duplicate with correct parameters", async () => {
      mockFindOne.mockResolvedValue(null);
      mockInsertOne.mockResolvedValue({
        insertedId: mockSkillId,
      });

      await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validSkillData);

      expect(mockFindOne).toHaveBeenCalledWith({
        name: validSkillData.name,
        userId: mockUserId,
      });
    });

    test("should return 500 on database error during duplicate check", async () => {
      mockFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validSkillData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error adding skill");
    });

    test("should return 500 on database error during insert", async () => {
      mockFindOne.mockResolvedValue(null);
      mockInsertOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validSkillData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error adding skill");
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .post("/skills")
        .set("Authorization", `Bearer invalid.token`)
        .send(validSkillData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe("PUT /skills/:id", () => {
    const updateData = {
      name: "JavaScript",
      proficiency: "Master",
    };

    test("should update an existing skill", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1 });

      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Skill updated successfully");
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockSkillId, userId: mockUserId },
        { $set: updateData }
      );
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    test("should return 404 if skill not found", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Skill not found or unauthorized");
    });

    test("should return 404 if user is not authorized for skill", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Skill not found or unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockUpdateOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error updating skill");
    });

    test("should update with partial data", async () => {
      const partialUpdate = { proficiency: "Advanced" };
      mockUpdateOne.mockResolvedValue({ matchedCount: 1 });

      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(partialUpdate);

      expect(res.status).toBe(200);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockSkillId, userId: mockUserId },
        { $set: partialUpdate }
      );
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .put(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer invalid.token`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe("DELETE /skills/:id", () => {
    test("should delete an existing skill", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Skill deleted successfully");
      expect(mockDeleteOne).toHaveBeenCalledWith({
        _id: mockSkillId,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).delete(`/skills/${mockSkillId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    test("should return 404 if skill not found", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Skill not found or unauthorized");
    });

    test("should return 404 if user is not authorized for skill", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Skill not found or unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockDeleteOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .delete(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error deleting skill");
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .delete(`/skills/${mockSkillId}`)
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe("getUserIdFromToken helper", () => {
    test("should return null if authorization header is missing", async () => {
      const res = await request(app).get("/skills");

      expect(res.status).toBe(401);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("should return null if JWT verification throws error", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
    });

    test("should extract userId from valid token", async () => {
      mockToArray.mockResolvedValue([]);
      mockJwtVerify.mockReturnValue({ id: "extracted-user-id" });

      const res = await request(app)
        .get("/skills")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(mockFind).toHaveBeenCalledWith({ userId: "extracted-user-id" });
    });
  });
});