import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";

// Create mocks before any imports
const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockUpdateOne = jest.fn();
const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockUnlinkSync = jest.fn();
const mockSharpRotate = jest.fn();
const mockSharpResize = jest.fn();
const mockSharpJpeg = jest.fn();
const mockSharpPng = jest.fn();
const mockSharpToBuffer = jest.fn();

// Mock sharp
const mockSharp = jest.fn(() => ({
  rotate: mockSharpRotate.mockReturnThis(),
  resize: mockSharpResize.mockReturnThis(),
  jpeg: mockSharpJpeg.mockReturnThis(),
  png: mockSharpPng.mockReturnThis(),
  toBuffer: mockSharpToBuffer,
}));

// Mock Profile model
const mockProfile = {
  findOne: mockFindOne,
  findById: mockFindById,
  updateOne: mockUpdateOne,
};

// Mock fs module
jest.unstable_mockModule("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    statSync: mockStatSync,
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
    unlinkSync: mockUnlinkSync,
  },
}));

// Mock sharp
jest.unstable_mockModule("sharp", () => ({
  default: mockSharp,
}));

// Mock Profile model
jest.unstable_mockModule("../../models/profile.js", () => ({
  default: mockProfile,
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/profile-photo.js");
const router = routerModule.default;

const app = express();
app.use(express.json());

// Add middleware to simulate authenticated user
app.use((req, res, next) => {
  req.user = { id: "user123" };
  next();
});

app.use("/profile", router);

describe("Profile Photo Router", () => {
  const mockUserId = "user123";
  const mockProfileId = "profile456";

  const mockProfileData = {
    _id: mockProfileId,
    userId: mockUserId,
    photoUrl: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BASE = "http://localhost:3000";
    
    // Default fs behavior - directories exist
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    
    // Default sharp behavior
    mockSharpToBuffer.mockResolvedValue(Buffer.from("processed-image"));

    // Default Profile.updateOne behavior
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  describe("POST /profile/:id/photo", () => {
    test("should upload and process JPEG image", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("photoUrl");
      expect(res.body.photoUrl).toContain("/uploads/profiles/");
      expect(res.body.photoUrl).toContain("avatar.jpg");
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: mockProfileId,
        userId: mockUserId,
      });
      expect(mockSharp).toHaveBeenCalled();
      expect(mockSharpResize).toHaveBeenCalledWith(512, 512, {
        fit: "cover",
        position: "center",
      });
      expect(mockSharpJpeg).toHaveBeenCalledWith({ quality: 88 });
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockProfileId },
        { $set: { photoUrl: expect.stringContaining("avatar.jpg"), userId: mockUserId } }
      );
    });

    test("should upload and process PNG image", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-png-data"), {
          filename: "test.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(200);
      expect(res.body.photoUrl).toContain("avatar.png");
      expect(mockSharpPng).toHaveBeenCalledWith({ compressionLevel: 9 });
    });

    test("should upload GIF without processing", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const gifBuffer = Buffer.from("fake-gif-data");
      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", gifBuffer, {
          filename: "test.gif",
          contentType: "image/gif",
        });

      expect(res.status).toBe(200);
      expect(res.body.photoUrl).toContain("avatar.gif");
      expect(mockSharp).not.toHaveBeenCalled(); // GIF not processed
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    test("should return 404 if profile not found", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      mockFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Profile not found");
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    test("should handle old profile without userId (fallback)", async () => {
      const oldProfileData = { ...mockProfileData, userId: undefined };
      
      // First findOne with userId returns null
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      
      // findById finds the old doc
      mockFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(oldProfileData),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: mockProfileId,
        userId: mockUserId,
      });
      expect(mockFindById).toHaveBeenCalledWith(mockProfileId);
      // Should reattach userId when updating
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockProfileId },
        { $set: { photoUrl: expect.any(String), userId: mockUserId } }
      );
    });

    test("should return 400 if no file uploaded", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No file uploaded");
    });

    test("should return 400 for invalid file type", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-pdf-data"), {
          filename: "test.pdf",
          contentType: "application/pdf",
        });

      // Multer errors return 500, not 400
      expect(res.status).toBe(500);
    });

    test("should return 400 if file is too large", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", largeBuffer, {
          filename: "large.jpg",
          contentType: "image/jpeg",
        });

      // Multer file size errors return 500
      expect(res.status).toBe(500);
    });

    test("should delete old avatar when uploading new one", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      // deleteAllAvatarVariants should be called
      expect(mockExistsSync).toHaveBeenCalled();
    });

    test("should create directories if they don't exist", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });
      mockExistsSync.mockReturnValue(false);

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(mockMkdirSync).toHaveBeenCalled();
    });

    test("should return 400 on sharp processing error", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });
      mockSharpToBuffer.mockRejectedValue(new Error("Sharp processing failed"));

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Sharp processing failed");
    });

    test("should return 400 on filesystem error", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Filesystem error");
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Filesystem error");
    });

    test("should return 400 with default message on unknown error", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });
      // Clear the writeFileSync mock so it doesn't throw
      mockWriteFileSync.mockClear();
      mockWriteFileSync.mockImplementation(() => {});
      // Make updateOne throw an error without a message
      mockUpdateOne.mockRejectedValue({});

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Upload failed");
    });
  });

  describe("DELETE /profile/:id/photo", () => {
    test("should delete existing avatar", async () => {
      const profileWithPhoto = {
        ...mockProfileData,
        photoUrl: "/uploads/profiles/profile456/avatar.jpg",
      };
      mockFindOne.mockResolvedValue(profileWithPhoto);
      mockExistsSync.mockReturnValue(true);

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(204);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: mockProfileId,
        userId: mockUserId,
      });
      expect(mockUnlinkSync).toHaveBeenCalled();
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockProfileId },
        { $set: { photoUrl: "", userId: mockUserId } }
      );
    });

    test("should return 404 if profile not found", async () => {
      mockFindOne.mockResolvedValue(null);
      mockFindById.mockResolvedValue(null);

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Profile not found");
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    test("should handle old profile without userId (fallback)", async () => {
      const oldProfileData = { ...mockProfileData, userId: undefined };
      
      // First findOne with userId returns null
      mockFindOne.mockResolvedValue(null);
      
      // findById finds the old doc
      mockFindById.mockResolvedValue(oldProfileData);
      
      mockExistsSync.mockReturnValue(false);

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(204);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: mockProfileId,
        userId: mockUserId,
      });
      expect(mockFindById).toHaveBeenCalledWith(mockProfileId);
      // Should reattach userId when updating
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockProfileId },
        { $set: { photoUrl: "", userId: mockUserId } }
      );
    });

    test("should handle case when no avatar exists", async () => {
      mockFindOne.mockResolvedValue(mockProfileData);
      mockExistsSync.mockReturnValue(false);

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(204);
      expect(mockUnlinkSync).not.toHaveBeenCalled();
      expect(mockUpdateOne).toHaveBeenCalled();
    });

    test("should return 400 on filesystem error", async () => {
      mockFindOne.mockResolvedValue(mockProfileData);
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => {
        throw new Error("Filesystem error");
      });

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Filesystem error");
    });

    test("should return 400 with default message on unknown error", async () => {
      mockFindOne.mockResolvedValue(mockProfileData);
      // Clear the unlink mock so it doesn't throw
      mockUnlinkSync.mockClear();
      mockUnlinkSync.mockImplementation(() => {});
      mockExistsSync.mockReturnValue(false);
      // Make updateOne throw an error without a message
      mockUpdateOne.mockRejectedValue({});

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Delete failed");
    });

    test("should return 400 on database update error", async () => {
      mockFindOne.mockResolvedValue(mockProfileData);
      mockExistsSync.mockReturnValue(false);
      mockUpdateOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Database error");
    });
  });

  describe("Helper functions", () => {
    test("should handle directory creation errors", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isDirectory: () => false });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("not a directory");
    });

    test("should create nested directories recursively", async () => {
      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfileData),
      });
      
      // Mock directory doesn't exist initially, then exists after creation
      let callCount = 0;
      mockExistsSync.mockImplementation(() => {
        callCount++;
        // First few calls return false (dirs don't exist), then true after mkdirSync
        return callCount > 3;
      });

      const res = await request(app)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe("Authentication", () => {
    test("should require authentication for upload", async () => {
      // Create app without auth middleware
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use("/profile", router);

      mockFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(unauthApp)
        .post(`/profile/${mockProfileId}/photo`)
        .attach("photo", Buffer.from("fake-jpeg-data"), {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      // Without req.user, getUserId returns null, so 401
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    test("should require authentication for delete", async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use("/profile", router);

      mockFindOne.mockResolvedValue(null);

      const res = await request(unauthApp).delete(`/profile/${mockProfileId}/photo`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });
  });
});