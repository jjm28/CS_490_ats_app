/**
 * @file employment.test.js
 * Fully working ESM Jest test suite for Employment routes
 */

import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";

const mockListEmployment = jest.fn();
const mockCreateEmployment = jest.fn();
const mockGetEmployment = jest.fn();
const mockUpdateEmployment = jest.fn();
const mockRemoveEmployment = jest.fn();
const mockVerifyJWT = jest.fn();
const mockValidateEmploymentCreate = jest.fn();
const mockValidateEmploymentUpdate = jest.fn();

const mockUserId = "user123";
const mockDevId = "legacyUser456";

// ✅ Mock database/service modules BEFORE importing router
jest.unstable_mockModule("../../services/employment.service.js", () => ({
  listEmployment: mockListEmployment,
  createEmployment: mockCreateEmployment,
  getEmployment: mockGetEmployment,
  updateEmployment: mockUpdateEmployment,
  removeEmployment: mockRemoveEmployment,
}));

// Mock verifyJWT as named export to match the route's import
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  verifyJWT: mockVerifyJWT,
}));

// Mock validators
jest.unstable_mockModule("../../validators/employment.js", () => ({
  validateEmploymentCreate: mockValidateEmploymentCreate,
  validateEmploymentUpdate: mockValidateEmploymentUpdate,
}));

// ✅ Now import router dynamically after mocks
const { default: employmentRouter } = await import("../../routes/employment.js");

// ✅ Express app setup
const app = express();
app.use(express.json());
app.use("/employment", employmentRouter);

describe("Employment Router", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default middleware mock: user authenticated
    mockVerifyJWT.mockImplementation((req, res, next) => {
      req.user = { _id: mockUserId };
      next();
    });
    // Default validator mocks: always pass
    mockValidateEmploymentCreate.mockResolvedValue({
      ok: true,
      value: {},
    });
    mockValidateEmploymentUpdate.mockResolvedValue({
      ok: true,
      value: {},
    });
  });

  describe("GET /employment", () => {
    it("should return employment entries for a logged-in user", async () => {
      const mockData = [{ _id: "1", position: "Developer", userId: mockUserId }];
      mockListEmployment.mockResolvedValue(mockData);

      const res = await request(app)
        .get("/employment")
        .set("Authorization", "Bearer faketoken");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockData);
      expect(mockListEmployment).toHaveBeenCalledWith({ orUserIds: [mockUserId] });
    });

    it("should return 400 on service error", async () => {
      mockListEmployment.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .get("/employment")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", mockUserId);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });

    it("should migrate legacy entries when devId differs from userId", async () => {
      const legacyEntry = { _id: "legacy1", position: "Intern", userId: mockDevId };
      const currentEntry = { _id: "current1", position: "Developer", userId: mockUserId };
      
      // First call returns both legacy and current entries
      mockListEmployment
        .mockResolvedValueOnce([legacyEntry, currentEntry])
        .mockResolvedValueOnce([currentEntry, { ...legacyEntry, userId: mockUserId }]);
      
      mockUpdateEmployment.mockResolvedValue({ ...legacyEntry, userId: mockUserId });

      const res = await request(app)
        .get("/employment")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", mockDevId);

      expect(res.status).toBe(200);
      expect(mockUpdateEmployment).toHaveBeenCalledWith(
        mockUserId,
        "legacy1",
        { userId: mockUserId }
      );
      // Should re-fetch after migration
      expect(mockListEmployment).toHaveBeenCalledTimes(2);
    });
  });

  describe("GET /employment/:id", () => {
    it("should return employment entry for logged-in user", async () => {
      const mockEntry = { _id: "abc123", position: "Developer", userId: mockUserId };
      mockGetEmployment.mockResolvedValue(mockEntry);

      const res = await request(app)
        .get("/employment/abc123")
        .set("Authorization", "Bearer faketoken");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockEntry);
      expect(mockGetEmployment).toHaveBeenCalledWith(mockUserId, "abc123");
    });

    it("should handle legacy employment entry with devId fallback", async () => {
      const legacyEntry = { _id: "legacy1", position: "Intern", userId: mockDevId };
      const devId = "devUser789";

      // First call (with real user) returns null, second call (with devId) returns the entry
      mockGetEmployment
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(legacyEntry);
      
      mockUpdateEmployment.mockResolvedValue({ ...legacyEntry, userId: mockUserId });

      const res = await request(app)
        .get("/employment/legacy1")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", devId);

      expect(res.status).toBe(200);
      expect(mockGetEmployment).toHaveBeenCalledWith(mockUserId, "legacy1");
      expect(mockGetEmployment).toHaveBeenCalledWith(devId, "legacy1");
      expect(mockUpdateEmployment).toHaveBeenCalledWith(mockUserId, "legacy1", { userId: mockUserId });
      // Note: The route modifies doc.userId in place, so response will have the migrated userId
    });

    it("should return 404 if employment entry not found", async () => {
      mockGetEmployment.mockResolvedValue(null);

      const res = await request(app)
        .get("/employment/nonexistent")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", mockUserId);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    it("should return 400 on service error", async () => {
      mockGetEmployment.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .get("/employment/abc123")
        .set("Authorization", "Bearer faketoken");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });
  });

  describe("POST /employment", () => {
    it("should add new employment entry", async () => {
      const newEntry = { position: "Engineer", company: "Tech Corp" };
      const savedEntry = { _id: "abc123", ...newEntry, userId: mockUserId };
      
      mockValidateEmploymentCreate.mockResolvedValue({
        ok: true,
        value: newEntry,
      });
      mockCreateEmployment.mockResolvedValue(savedEntry);

      const res = await request(app)
        .post("/employment")
        .set("Authorization", "Bearer faketoken")
        .send(newEntry);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(savedEntry);
      expect(mockCreateEmployment).toHaveBeenCalledWith(mockUserId, newEntry);
    });

    it("should return 400 on validation error", async () => {
      mockValidateEmploymentCreate.mockResolvedValue({
        ok: false,
        status: 400,
        error: { message: "Invalid data" },
      });

      const res = await request(app)
        .post("/employment")
        .set("Authorization", "Bearer faketoken")
        .send({ position: "" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Invalid data" });
    });

    it("should return 400 on service error", async () => {
      mockValidateEmploymentCreate.mockResolvedValue({
        ok: true,
        value: { position: "Engineer" },
      });
      mockCreateEmployment.mockRejectedValue(new Error("Create failed"));

      const res = await request(app)
        .post("/employment")
        .set("Authorization", "Bearer faketoken")
        .send({ position: "Engineer" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Create failed");
    });
  });

  describe("PUT /employment/:id", () => {
    it("should update employment entry for the user", async () => {
      const updateData = { position: "Senior Engineer" };
      const updated = { _id: "abc123", ...updateData, userId: mockUserId };
      
      mockValidateEmploymentUpdate.mockResolvedValue({
        ok: true,
        value: updateData,
      });
      mockUpdateEmployment.mockResolvedValue(updated);

      const res = await request(app)
        .put("/employment/abc123")
        .set("Authorization", "Bearer faketoken")
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
      expect(mockUpdateEmployment).toHaveBeenCalledWith(mockUserId, "abc123", updateData);
    });

    it("should handle legacy employment entry with devId fallback on update", async () => {
      const updateData = { position: "Manager" };
      const updatedEntry = { _id: "legacy1", ...updateData, userId: mockUserId };
      const devId = "devUser789";

      mockValidateEmploymentUpdate.mockResolvedValue({
        ok: true,
        value: updateData,
      });

      // First update attempt (with real user) returns null
      mockUpdateEmployment
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedEntry);

      const res = await request(app)
        .put("/employment/legacy1")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", devId)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedEntry);
      expect(mockUpdateEmployment).toHaveBeenCalledWith(mockUserId, "legacy1", updateData);
      expect(mockUpdateEmployment).toHaveBeenCalledWith(devId, "legacy1", {
        ...updateData,
        userId: mockUserId,
      });
    });

    it("should return 400 on validation error", async () => {
      mockValidateEmploymentUpdate.mockResolvedValue({
        ok: false,
        status: 400,
        error: { message: "Invalid update data" },
      });

      const res = await request(app)
        .put("/employment/abc123")
        .set("Authorization", "Bearer faketoken")
        .send({ position: "" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: "Invalid update data" });
    });

    it("should return 404 if employment entry not found", async () => {
      mockValidateEmploymentUpdate.mockResolvedValue({
        ok: true,
        value: { position: "Manager" },
      });
      mockUpdateEmployment.mockResolvedValue(null);

      const updateData = { position: "Manager" };
      const res = await request(app)
        .put("/employment/nonexistent")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", mockUserId)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    it("should return 400 on service error", async () => {
      mockValidateEmploymentUpdate.mockResolvedValue({
        ok: true,
        value: { position: "Manager" },
      });
      mockUpdateEmployment.mockRejectedValue(new Error("Update failed"));

      const res = await request(app)
        .put("/employment/abc123")
        .set("Authorization", "Bearer faketoken")
        .send({ position: "Manager" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Update failed");
    });
  });

  describe("DELETE /employment/:id", () => {
    it("should delete employment entry", async () => {
      mockRemoveEmployment.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

      const res = await request(app)
        .delete("/employment/abc123")
        .set("Authorization", "Bearer faketoken");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockRemoveEmployment).toHaveBeenCalledWith(mockUserId, "abc123");
    });

    it("should handle legacy employment entry with devId fallback on delete", async () => {
      const devId = "devUser789";
      
      // First delete attempt (with real user) returns null, second (with devId) succeeds
      mockRemoveEmployment
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ acknowledged: true, deletedCount: 1 });

      const res = await request(app)
        .delete("/employment/legacy1")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", devId);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockRemoveEmployment).toHaveBeenCalledWith(mockUserId, "legacy1");
      expect(mockRemoveEmployment).toHaveBeenCalledWith(devId, "legacy1");
    });

    it("should return 404 if employment entry not found", async () => {
      mockRemoveEmployment.mockResolvedValue(null);

      const res = await request(app)
        .delete("/employment/nonexistent")
        .set("Authorization", "Bearer faketoken")
        .set("x-dev-user-id", mockUserId);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    it("should return 400 on service error", async () => {
      mockRemoveEmployment.mockRejectedValue(new Error("Delete failed"));

      const res = await request(app)
        .delete("/employment/abc123")
        .set("Authorization", "Bearer faketoken");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Delete failed");
    });
  });

  describe("Authorization", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockVerifyJWT.mockImplementation((req, res, next) => {
        // No user set
        next();
      });

      const res = await request(app).get("/employment");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });
  });
});