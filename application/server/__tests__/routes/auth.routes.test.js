import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// Create mocks before any imports
const mockCreateUser = jest.fn();
const mockVerifyUser = jest.fn();
const mockFindUserByEmailCaseSensitive = jest.fn();
const mockJwtSign = jest.fn();
const mockJwtVerify = jest.fn();
const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();
const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockGetDb = jest.fn();
const mockConnectDB = jest.fn();

const mockCollection = {
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
};

mockGetDb.mockReturnValue(mockDb);

// Mock all dependencies
jest.unstable_mockModule("../../services/user.service.js", () => ({
  createUser: mockCreateUser,
  verifyUser: mockVerifyUser,
  findUserByEmailCaseSensitve: mockFindUserByEmailCaseSensitive,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: mockJwtSign,
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}));

jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: mockGetDb,
  connectDB: mockConnectDB,
}));

jest.unstable_mockModule("mongodb", () => ({
  ObjectId: jest.fn().mockImplementation((id) => id || mockUserId),
}));

jest.unstable_mockModule("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn(() => "https://accounts.google.com/o/oauth2/auth"),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        verifyIdToken: jest.fn(),
      })),
    },
  },
  paymentsresellersubscription_v1: {},
}));

jest.unstable_mockModule("axios", () => ({
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.unstable_mockModule("crypto", () => ({
  default: {
    randomBytes: jest.fn(() => ({
      toString: jest.fn(() => "mock-token-123"),
    })),
  },
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/auth.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/auth", router);

describe("Auth Router", () => {
  const mockUserId = new ObjectId();
  const mockUser = {
    _id: mockUserId,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    isDeleted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  });

  describe("POST /auth/register", () => {
    const validRegistrationData = {
      email: "newuser@example.com",
      password: "SecurePass123!",
      firstName: "Jane",
      lastName: "Smith",
    };

    test("should register a new user successfully", async () => {
      const newUser = {
        _id: mockUserId,
        ...validRegistrationData,
      };
      mockCreateUser.mockResolvedValue(newUser);
      mockJwtSign.mockReturnValue("mock-jwt-token");

      const res = await request(app)
        .post("/auth/register")
        .send(validRegistrationData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("userId");
      expect(res.body).toHaveProperty("user");
      expect(mockCreateUser).toHaveBeenCalledWith(validRegistrationData);
      expect(mockJwtSign).toHaveBeenCalledWith(
        { id: mockUserId.toString(), email: validRegistrationData.email },
        "test-secret",
        { expiresIn: "10m" }
      );
    });

    test("should return 400 if email is missing", async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.email;

      const res = await request(app).post("/auth/register").send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    test("should return 400 if password is missing", async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.password;

      const res = await request(app).post("/auth/register").send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    test("should return 400 if firstName is missing", async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.firstName;

      const res = await request(app).post("/auth/register").send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    test("should return 400 if lastName is missing", async () => {
      const invalidData = { ...validRegistrationData };
      delete invalidData.lastName;

      const res = await request(app).post("/auth/register").send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    test("should return 409 if email already exists", async () => {
      const duplicateError = new Error("Duplicate key");
      duplicateError.code = 11000;
      mockCreateUser.mockRejectedValue(duplicateError);

      const res = await request(app)
        .post("/auth/register")
        .send(validRegistrationData);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Email already registered");
    });

    test("should return 500 on server error", async () => {
      mockCreateUser.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/auth/register")
        .send(validRegistrationData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Server error");
    });
  });

  describe("POST /auth/login", () => {
    const validLoginData = {
      email: "test@example.com",
      password: "SecurePass123!",
    };

    test("should login user successfully", async () => {
      mockVerifyUser.mockResolvedValue(mockUser);
      mockJwtSign.mockReturnValue("mock-jwt-token");

      const res = await request(app).post("/auth/login").send(validLoginData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("userId");
      expect(res.body).toHaveProperty("user");
      expect(mockVerifyUser).toHaveBeenCalledWith(validLoginData, false);
    });

    test("should return 400 if email is missing", async () => {
      const invalidData = { password: "SecurePass123!" };

      const res = await request(app).post("/auth/login").send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    test("should return 400 if password is missing", async () => {
      const invalidData = { email: "test@example.com" };

      const res = await request(app).post("/auth/login").send(invalidData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    test("should return 401 if user is deleted", async () => {
      mockVerifyUser.mockResolvedValue({ ...mockUser, isDeleted: true });

      const res = await request(app).post("/auth/login").send(validLoginData);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Account deleted or not found");
    });

    test("should return 401 if user not found", async () => {
      mockVerifyUser.mockResolvedValue(null);

      const res = await request(app).post("/auth/login").send(validLoginData);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Account deleted or not found");
    });

    test("should return 401 on invalid credentials", async () => {
      const error = new Error("Invalid credentials");
      error.statusCode = 400;
      mockVerifyUser.mockRejectedValue(error);

      const res = await request(app).post("/auth/login").send(validLoginData);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    test("should return 500 on server error", async () => {
      mockVerifyUser.mockRejectedValue(new Error("Database error"));

      const res = await request(app).post("/auth/login").send(validLoginData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Server error");
    });
  });

  describe("POST /auth/forgot-password", () => {
    test("should initiate password reset for existing user", async () => {
      mockConnectDB.mockResolvedValue();
      mockFindOne.mockResolvedValue(mockUser);
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Reset link sent");
      expect(mockFindOne).toHaveBeenCalled();
      expect(mockUpdateOne).toHaveBeenCalled();
    });

    test("should return 400 if email is missing", async () => {
      const res = await request(app).post("/auth/forgot-password").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email required");
    });

    test("should return 200 even if user not found (security)", async () => {
      mockConnectDB.mockResolvedValue();
      mockFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("If that email exists");
    });

    test("should return 500 on database error", async () => {
      mockConnectDB.mockRejectedValue(new Error("DB connection failed"));

      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "test@example.com" });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Something went wrong");
    });
  });

  describe("POST /auth/reset-password", () => {
    const validResetData = {
      token: "valid-reset-token",
      newPassword: "NewSecurePass123!",
    };

    test("should reset password successfully", async () => {
      const userWithToken = {
        ...mockUser,
        resetToken: "valid-reset-token",
        resetTokenExpiry: Date.now() + 3600000, // 1 hour from now
      };

      mockConnectDB.mockResolvedValue();
      mockFindOne.mockResolvedValue(userWithToken);
      mockBcryptHash.mockResolvedValue("hashed-new-password");
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
      mockJwtSign.mockReturnValue("new-jwt-token");

      const res = await request(app)
        .post("/auth/reset-password")
        .send(validResetData);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password reset successful");
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(mockBcryptHash).toHaveBeenCalledWith(validResetData.newPassword, 10);
      expect(mockUpdateOne).toHaveBeenCalled();
    });

    test("should return 400 if token is missing", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ newPassword: "NewPass123!" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing token or new password");
    });

    test("should return 400 if newPassword is missing", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ token: "valid-token" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing token or new password");
    });

    test("should return 400 if token is invalid", async () => {
      mockConnectDB.mockResolvedValue();
      mockFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/auth/reset-password")
        .send(validResetData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid or expired reset token");
    });

    test("should return 400 if token is expired", async () => {
      const userWithExpiredToken = {
        ...mockUser,
        resetToken: "expired-token",
        resetTokenExpiry: Date.now() - 1000, // Expired
      };

      mockConnectDB.mockResolvedValue();
      mockFindOne.mockResolvedValue(userWithExpiredToken);

      const res = await request(app)
        .post("/auth/reset-password")
        .send(validResetData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Reset token expired");
    });

    test("should return 500 on database error", async () => {
      mockConnectDB.mockRejectedValue(new Error("DB error"));

      const res = await request(app)
        .post("/auth/reset-password")
        .send(validResetData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Reset failed");
    });
  });

  describe("GET /auth/google/login", () => {
    test("should redirect to Google OAuth", async () => {
      const res = await request(app).get("/auth/google/login");

      // Should redirect (status 302 or similar)
      expect([301, 302]).toContain(res.status);
    });
  });

  describe("GET /auth/microsoft/login", () => {
    test("should redirect to Microsoft OAuth", async () => {
      process.env.MICROSOFT_CLIENT_ID = "test-client-id";
      process.env.MICROSOFT_REDIRECT_URI = "http://localhost:3000/callback";

      const res = await request(app).get("/auth/microsoft/login");

      // Should redirect
      expect([301, 302]).toContain(res.status);
      expect(res.headers.location).toContain("login.microsoftonline.com");
    });
  });

  describe("DELETE /auth/delete", () => {
    test("should return 400 if password is missing", async () => {
      const res = await request(app).delete("/auth/delete").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Password required");
    });

    // Note: Additional DELETE tests would require authentication middleware
    // which adds req.user to the request object. These tests are skipped
    // as they require a more complex test setup with middleware mocking.
  });
});