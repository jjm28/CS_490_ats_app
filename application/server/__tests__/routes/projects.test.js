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
const routerModule = await import("../../routes/projects.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/projects", router);

describe("Projects Router", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockProjectId = new ObjectId();

  const mockProjectData = {
    _id: mockProjectId,
    name: "E-commerce Platform",
    description: "Built a full-stack e-commerce platform",
    role: "Full Stack Developer",
    startDate: "2023-01-01",
    endDate: "2023-12-31",
    technologies: ["React", "Node.js", "MongoDB"],
    url: "https://example.com",
    teamSize: 5,
    collaborationDetails: "Worked with design and backend teams",
    outcomes: "Increased sales by 50%",
    industry: "E-commerce",
    status: "Completed",
    mediaUrl: "https://example.com/screenshot.png",
    userId: mockUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  describe("GET /projects", () => {
    test("should return all projects for authenticated user", async () => {
      const mockProjects = [mockProjectData];
      mockToArray.mockResolvedValue(mockProjects);

      const res = await request(app)
        .get("/projects")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(mockProjectId.toString());
      expect(res.body[0].name).toBe("E-commerce Platform");
      expect(mockFind).toHaveBeenCalledWith({ userId: mockUserId });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/projects");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockFind).not.toHaveBeenCalled();
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/projects")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockToArray.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .get("/projects")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error fetching projects");
    });

    test("should return empty array if user has no projects", async () => {
      mockToArray.mockResolvedValue([]);

      const res = await request(app)
        .get("/projects")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /projects", () => {
    const validProjectData = {
      name: "E-commerce Platform",
      description: "Built a full-stack e-commerce platform",
      role: "Full Stack Developer",
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      technologies: ["React", "Node.js", "MongoDB"],
      url: "https://example.com",
      teamSize: 5,
      collaborationDetails: "Worked with design and backend teams",
      outcomes: "Increased sales by 50%",
      industry: "E-commerce",
      status: "Completed",
      mediaUrl: "https://example.com/screenshot.png",
    };

    test("should create a new project", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockProjectId,
      });

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validProjectData);

      expect(res.status).toBe(201);
      expect(res.body._id).toBe(mockProjectId.toString());
      expect(res.body.name).toBe(validProjectData.name);
      expect(res.body.userId).toBe(mockUserId);
      expect(mockInsertOne).toHaveBeenCalledWith({
        ...validProjectData,
        userId: mockUserId,
        thumbnailUrl: "",
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post("/projects")
        .send(validProjectData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    test("should return 400 if name is missing", async () => {
      const invalidData = { ...validProjectData };
      delete invalidData.name;

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
      expect(mockInsertOne).not.toHaveBeenCalled();
    });

    test("should return 400 if description is missing", async () => {
      const invalidData = { ...validProjectData };
      delete invalidData.description;

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if role is missing", async () => {
      const invalidData = { ...validProjectData };
      delete invalidData.role;

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should return 400 if startDate is missing", async () => {
      const invalidData = { ...validProjectData };
      delete invalidData.startDate;

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields");
    });

    test("should create project with only required fields", async () => {
      const minimalData = {
        name: "Minimal Project",
        description: "Just the basics",
        role: "Developer",
        startDate: "2023-01-01",
      };

      mockInsertOne.mockResolvedValue({
        insertedId: mockProjectId,
      });

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(minimalData);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(minimalData.name);
    });

    test("should return 500 on database error", async () => {
      mockInsertOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validProjectData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error adding project");
    });

    test("should handle all optional fields", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockProjectId,
      });

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(validProjectData);

      expect(res.status).toBe(201);
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          technologies: validProjectData.technologies,
          url: validProjectData.url,
          teamSize: validProjectData.teamSize,
          collaborationDetails: validProjectData.collaborationDetails,
          outcomes: validProjectData.outcomes,
          industry: validProjectData.industry,
          status: validProjectData.status,
          mediaUrl: validProjectData.mediaUrl,
          thumbnailUrl: "",
        })
      );
    });

    test("should use provided thumbnailUrl when present", async () => {
      const dataWithThumbnail = {
        ...validProjectData,
        thumbnailUrl: "https://example.com/thumb.png",
      };

      mockInsertOne.mockResolvedValue({
        insertedId: mockProjectId,
      });

      const res = await request(app)
        .post("/projects")
        .set("Authorization", `Bearer ${validToken}`)
        .send(dataWithThumbnail);

      expect(res.status).toBe(201);
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: "https://example.com/thumb.png",
        })
      );
    });
  });

  describe("PUT /projects/:id", () => {
    const updateData = {
      name: "Updated Project Name",
      description: "Updated description",
      status: "In Progress",
    };

    const updatedDoc = {
      _id: mockProjectId,
      ...mockProjectData,
      ...updateData,
    };

    test("should update an existing project", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
      mockFindOne.mockResolvedValue(updatedDoc);

      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(mockProjectId.toString());
      expect(res.body.name).toBe(updateData.name);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockProjectId, userId: mockUserId },
        { $set: updateData }
      );
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    test("should return 404 if project not found", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Project not found or unauthorized");
    });

    test("should return 404 if user is not authorized for project", async () => {
      mockUpdateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Project not found or unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockUpdateOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error updating project");
    });

    test("should update partial fields", async () => {
      const partialUpdate = { status: "Completed" };
      mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
      mockFindOne.mockResolvedValue({
        ...mockProjectData,
        status: "Completed",
      });

      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Completed");
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .put(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer invalid.token`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe("DELETE /projects/:id", () => {
    test("should delete an existing project", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Project deleted successfully");
      expect(mockDeleteOne).toHaveBeenCalledWith({
        _id: mockProjectId,
        userId: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).delete(`/projects/${mockProjectId}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(mockDeleteOne).not.toHaveBeenCalled();
    });

    test("should return 404 if project not found", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Project not found or unauthorized");
    });

    test("should return 404 if user is not authorized for project", async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Project not found or unauthorized");
    });

    test("should return 500 on database error", async () => {
      mockDeleteOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .delete(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Error deleting project");
    });

    test("should return 401 if JWT verification fails", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .delete(`/projects/${mockProjectId}`)
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe("getUserIdFromToken helper", () => {
    test("should return null if authorization header is missing", async () => {
      const res = await request(app).get("/projects");

      expect(res.status).toBe(401);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    test("should return null if JWT verification throws error", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/projects")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
    });

    test("should extract userId from valid token", async () => {
      mockToArray.mockResolvedValue([]);
      mockJwtVerify.mockReturnValue({ id: "extracted-user-id" });

      const res = await request(app)
        .get("/projects")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(mockFind).toHaveBeenCalledWith({ userId: "extracted-user-id" });
    });
  });
});