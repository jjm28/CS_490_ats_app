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

// Mock database connection
jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: mockGetDb,
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/record.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/record", router);

describe("Record Router", () => {
  const mockRecordId = new ObjectId();

  const mockRecord = {
    _id: mockRecordId,
    name: "John Doe",
    position: "Software Engineer",
    level: "Senior",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /record", () => {
    test("should return all records", async () => {
      const mockRecords = [mockRecord];
      mockToArray.mockResolvedValue(mockRecords);

      const res = await request(app).get("/record");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]._id).toBe(mockRecordId.toString());
      expect(res.body[0].name).toBe("John Doe");
      expect(res.body[0].position).toBe("Software Engineer");
      expect(res.body[0].level).toBe("Senior");
      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockDb.collection).toHaveBeenCalledWith("records");
    });

    test("should return empty array if no records exist", async () => {
      mockToArray.mockResolvedValue([]);

      const res = await request(app).get("/record");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 500 on database error", async () => {
      mockToArray.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/record");

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error retrieving records");
    });

    test("should return multiple records", async () => {
      const mockRecords = [
        mockRecord,
        {
          _id: new ObjectId(),
          name: "Jane Smith",
          position: "Product Manager",
          level: "Mid",
        },
        {
          _id: new ObjectId(),
          name: "Bob Johnson",
          position: "Designer",
          level: "Junior",
        },
      ];
      mockToArray.mockResolvedValue(mockRecords);

      const res = await request(app).get("/record");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });
  });

  describe("GET /record/:id", () => {
    test("should return a single record by ID", async () => {
      mockFindOne.mockResolvedValue(mockRecord);

      const res = await request(app).get(`/record/${mockRecordId}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(mockRecordId.toString());
      expect(res.body.name).toBe("John Doe");
      expect(res.body.position).toBe("Software Engineer");
      expect(res.body.level).toBe("Senior");
      expect(mockFindOne).toHaveBeenCalledWith({ _id: mockRecordId });
    });

    test("should return 404 if record not found", async () => {
      mockFindOne.mockResolvedValue(null);

      const res = await request(app).get(`/record/${mockRecordId}`);

      expect(res.status).toBe(404);
      expect(res.text).toBe("Record not found");
    });

    test("should return 500 on database error", async () => {
      mockFindOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get(`/record/${mockRecordId}`);

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error retrieving record");
    });

    test("should return 500 on invalid ObjectId", async () => {
      const res = await request(app).get("/record/invalid-id");

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error retrieving record");
    });
  });

  describe("POST /record", () => {
    const validRecordData = {
      name: "John Doe",
      position: "Software Engineer",
      level: "Senior",
    };

    test("should create a new record", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockRecordId,
        acknowledged: true,
      });

      const res = await request(app).post("/record").send(validRecordData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("insertedId");
      expect(mockInsertOne).toHaveBeenCalledWith(validRecordData);
    });

    test("should create record with all fields", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockRecordId,
        acknowledged: true,
      });

      const res = await request(app).post("/record").send(validRecordData);

      expect(res.status).toBe(201);
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validRecordData.name,
          position: validRecordData.position,
          level: validRecordData.level,
        })
      );
    });

    test("should handle missing fields gracefully", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockRecordId,
        acknowledged: true,
      });

      const partialData = {
        name: "John Doe",
      };

      const res = await request(app).post("/record").send(partialData);

      expect(res.status).toBe(201);
      expect(mockInsertOne).toHaveBeenCalledWith({
        name: "John Doe",
        position: undefined,
        level: undefined,
      });
    });

    test("should return 500 on database error", async () => {
      mockInsertOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app).post("/record").send(validRecordData);

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error adding record");
    });

    test("should handle empty request body", async () => {
      mockInsertOne.mockResolvedValue({
        insertedId: mockRecordId,
        acknowledged: true,
      });

      const res = await request(app).post("/record").send({});

      expect(res.status).toBe(201);
      expect(mockInsertOne).toHaveBeenCalledWith({
        name: undefined,
        position: undefined,
        level: undefined,
      });
    });
  });

  describe("PATCH /record/:id", () => {
    const updateData = {
      name: "Jane Doe",
      position: "Lead Engineer",
      level: "Principal",
    };

    test("should update an existing record", async () => {
      mockUpdateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      });

      const res = await request(app)
        .patch(`/record/${mockRecordId}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("matchedCount", 1);
      expect(res.body).toHaveProperty("modifiedCount", 1);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockRecordId },
        { $set: updateData }
      );
    });

    test("should update with partial data", async () => {
      mockUpdateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      });

      const partialUpdate = {
        position: "Staff Engineer",
      };

      const res = await request(app)
        .patch(`/record/${mockRecordId}`)
        .send(partialUpdate);

      expect(res.status).toBe(200);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockRecordId },
        {
          $set: {
            name: undefined,
            position: "Staff Engineer",
            level: undefined,
          },
        }
      );
    });

    test("should return 200 even if no document was modified", async () => {
      mockUpdateOne.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
      });

      const res = await request(app)
        .patch(`/record/${mockRecordId}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.matchedCount).toBe(0);
    });

    test("should return 500 on database error", async () => {
      mockUpdateOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .patch(`/record/${mockRecordId}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error updating record");
    });

    test("should return 500 on invalid ObjectId", async () => {
      const res = await request(app)
        .patch("/record/invalid-id")
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error updating record");
    });

    test("should handle empty update body", async () => {
      mockUpdateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      });

      const res = await request(app)
        .patch(`/record/${mockRecordId}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockRecordId },
        {
          $set: {
            name: undefined,
            position: undefined,
            level: undefined,
          },
        }
      );
    });
  });

  describe("DELETE /record/:id", () => {
    test("should delete an existing record", async () => {
      mockDeleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true,
      });

      const res = await request(app).delete(`/record/${mockRecordId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("deletedCount", 1);
      expect(mockDeleteOne).toHaveBeenCalledWith({ _id: mockRecordId });
    });

    test("should return 200 even if record does not exist", async () => {
      mockDeleteOne.mockResolvedValue({
        deletedCount: 0,
        acknowledged: true,
      });

      const res = await request(app).delete(`/record/${mockRecordId}`);

      expect(res.status).toBe(200);
      expect(res.body.deletedCount).toBe(0);
    });

    test("should return 500 on database error", async () => {
      mockDeleteOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app).delete(`/record/${mockRecordId}`);

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error deleting record");
    });

    test("should return 500 on invalid ObjectId", async () => {
      const res = await request(app).delete("/record/invalid-id");

      expect(res.status).toBe(500);
      expect(res.text).toBe("Error deleting record");
    });
  });

  describe("Database collection calls", () => {
    test("should use correct collection name for all operations", async () => {
      mockToArray.mockResolvedValue([]);

      await request(app).get("/record");

      expect(mockDb.collection).toHaveBeenCalledWith("records");
    });

    test("should call getDb for each request", async () => {
      mockToArray.mockResolvedValue([]);

      await request(app).get("/record");
      await request(app).get("/record");

      expect(mockGetDb).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error handling", () => {
    test("should log errors to console on GET all failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockToArray.mockRejectedValue(new Error("Test error"));

      await request(app).get("/record");

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should log errors to console on GET by ID failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockFindOne.mockRejectedValue(new Error("Test error"));

      await request(app).get(`/record/${mockRecordId}`);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should log errors to console on POST failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockInsertOne.mockRejectedValue(new Error("Test error"));

      await request(app).post("/record").send({ name: "Test" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should log errors to console on PATCH failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockUpdateOne.mockRejectedValue(new Error("Test error"));

      await request(app).patch(`/record/${mockRecordId}`).send({ name: "Test" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should log errors to console on DELETE failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockDeleteOne.mockRejectedValue(new Error("Test error"));

      await request(app).delete(`/record/${mockRecordId}`);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});