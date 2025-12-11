import { jest } from '@jest/globals';
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";

// ============================================================================
// MOCKS SETUP - Must be created before any imports
// ============================================================================

// Mock JWT verification
const mockJwtVerify = jest.fn();

// Mock Mongoose Model for Contact
const mockContactFind = jest.fn();
const mockContactFindOne = jest.fn();
const mockContactCreate = jest.fn();
const mockContactFindOneAndUpdate = jest.fn();
const mockContactDeleteOne = jest.fn();
const mockContactSave = jest.fn();

const MockContact = {
  find: mockContactFind,
  findOne: mockContactFindOne,
  create: mockContactCreate,
  findOneAndUpdate: mockContactFindOneAndUpdate,
  deleteOne: mockContactDeleteOne,
};

// Mock relationship maintenance services
const mockGetContactsNeedingAttention = jest.fn();
const mockGetUpcomingReminders = jest.fn();
const mockUpdateContactRelationshipHealth = jest.fn();
const mockUpdateAllContactsHealth = jest.fn();
const mockGenerateOutreachTemplates = jest.fn();
const mockGetRelationshipAnalytics = jest.fn();

// Mock campaign services
const mockGetCampaigns = jest.fn();
const mockGetCampaignById = jest.fn();
const mockCreateCampaign = jest.fn();
const mockUpdateCampaign = jest.fn();
const mockDeleteCampaign = jest.fn();
const mockAddOutreach = jest.fn();
const mockUpdateOutreach = jest.fn();
const mockDeleteOutreach = jest.fn();
const mockGetCampaignAnalytics = jest.fn();

// Mock OpenAI
const mockOpenAICreate = jest.fn();
const MockOpenAI = jest.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockOpenAICreate,
    },
  },
}));

// Mock modules using unstable_mockModule
jest.unstable_mockModule("openai", () => ({
  default: MockOpenAI,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: mockJwtVerify,
  },
}));

jest.unstable_mockModule("../../models/contacts.js", () => ({
  default: MockContact,
}));

jest.unstable_mockModule("../../middleware/auth.js", () => ({
  verifyJWT: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const token = authHeader.split(" ")[1];
      const decoded = mockJwtVerify(token);
      req.user = { _id: decoded.id };
      next();
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  },
}));

jest.unstable_mockModule("../../services/relationship_maintenance.service.js", () => ({
  updateContactRelationshipHealth: mockUpdateContactRelationshipHealth,
  updateAllContactsHealth: mockUpdateAllContactsHealth,
  getContactsNeedingAttention: mockGetContactsNeedingAttention,
  getUpcomingReminders: mockGetUpcomingReminders,
  generateOutreachTemplates: mockGenerateOutreachTemplates,
  getRelationshipAnalytics: mockGetRelationshipAnalytics,
}));

jest.unstable_mockModule("../../services/campaign.service.js", () => ({
  getCampaigns: mockGetCampaigns,
  getCampaignById: mockGetCampaignById,
  createCampaign: mockCreateCampaign,
  updateCampaign: mockUpdateCampaign,
  deleteCampaign: mockDeleteCampaign,
  addOutreach: mockAddOutreach,
  updateOutreach: mockUpdateOutreach,
  deleteOutreach: mockDeleteOutreach,
  getCampaignAnalytics: mockGetCampaignAnalytics,
}));

// Mock axios (for Google OAuth and imports)
const mockAxiosPost = jest.fn();
const mockAxiosGet = jest.fn();
jest.unstable_mockModule("axios", () => ({
  default: {
    post: mockAxiosPost,
    get: mockAxiosGet,
  },
}));

// Mock uuid
jest.unstable_mockModule("uuid", () => ({
  v4: jest.fn(() => "mock-uuid-123"),
}));

// Mock getDb
const mockGetDb = jest.fn();
jest.unstable_mockModule("../../db/connection.js", () => ({
  getDb: mockGetDb,
}));

// Dynamic import of the router after mocks are set up
const routerModule = await import("../../routes/networking.js");
const router = routerModule.default;

const app = express();
app.use(express.json());
app.use("/networking", router);

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Networking Router - Contacts", () => {
  const mockUserId = "user123";
  const validToken = "valid.jwt.token";
  const mockContactId = new ObjectId();

  const mockContactData = {
    _id: mockContactId,
    userid: mockUserId,
    fullname: "John Doe",
    email: "john@example.com",
    company: "TechCorp",
    position: "Senior Engineer",
    phone: "555-1234",
    linkedin: "https://linkedin.com/in/johndoe",
    notes: "Met at conference",
    tags: ["engineering", "tech"],
    relationshipStrength: "strong",
    lastInteraction: "2024-01-15",
    interactions: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify.mockReturnValue({ id: mockUserId });
  });

  // ============================================================================
  // GET /networking/contacts - LIST ALL CONTACTS
  // ============================================================================

  describe("GET /networking/contacts", () => {
    test("should return all contacts for authenticated user", async () => {
      const mockContacts = [mockContactData];
      
      mockContactFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockContacts),
      });

      const res = await request(app)
        .get("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].fullname).toBe("John Doe");
      expect(res.body[0].email).toBe("john@example.com");
      
      expect(mockContactFind).toHaveBeenCalledWith({ userid: mockUserId });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/networking/contacts");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
      expect(mockContactFind).not.toHaveBeenCalled();
    });

    test("should return empty array if user has no contacts", async () => {
      mockContactFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .get("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 500 on database error", async () => {
      mockContactFind.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("DB Error")),
      });

      const res = await request(app)
        .get("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to load contacts");
    });

    test("should sort contacts by updatedAt descending", async () => {
      const mockContacts = [mockContactData];
      const mockSort = jest.fn().mockResolvedValue(mockContacts);
      
      mockContactFind.mockReturnValue({
        sort: mockSort,
      });

      await request(app)
        .get("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`);

      expect(mockSort).toHaveBeenCalledWith({ updatedAt: -1 });
    });
  });

  // ============================================================================
  // GET /networking/contacts/:id - GET SINGLE CONTACT
  // ============================================================================

  describe("GET /networking/contacts/:id", () => {
    test("should return specific contact", async () => {
      mockContactFindOne.mockResolvedValue(mockContactData);

      const res = await request(app)
        .get(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.fullname).toBe("John Doe");
      expect(res.body.email).toBe("john@example.com");
      
      expect(mockContactFindOne).toHaveBeenCalledWith({
        _id: mockContactId.toString(),
        userid: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get(`/networking/contacts/${mockContactId}`);

      expect(res.status).toBe(401);
      expect(mockContactFindOne).not.toHaveBeenCalled();
    });

    test("should return 404 if contact not found", async () => {
      mockContactFindOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Contact not found");
    });

    test("should return 404 if contact belongs to different user", async () => {
      mockContactFindOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Contact not found");
    });

    test("should return 500 on database error", async () => {
      mockContactFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .get(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to load contact");
    });
  });

  // ============================================================================
  // POST /networking/contacts - CREATE CONTACT
  // ============================================================================

  describe("POST /networking/contacts", () => {
    const newContactData = {
      fullname: "Jane Smith",
      email: "jane@example.com",
      company: "StartupCo",
      position: "Product Manager",
      phone: "555-5678",
      linkedin: "https://linkedin.com/in/janesmith",
      notes: "Potential mentor",
      tags: ["product", "mentor"],
    };

    test("should create a new contact", async () => {
      const createdContact = {
        _id: new ObjectId(),
        userid: mockUserId,
        ...newContactData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockContactCreate.mockResolvedValue(createdContact);

      const res = await request(app)
        .post("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`)
        .send(newContactData);

      expect(res.status).toBe(200);
      expect(res.body.fullname).toBe("Jane Smith");
      expect(res.body.email).toBe("jane@example.com");
      expect(res.body.userid).toBe(mockUserId);
      
      expect(mockContactCreate).toHaveBeenCalledWith({
        ...newContactData,
        userid: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post("/networking/contacts")
        .send(newContactData);

      expect(res.status).toBe(401);
      expect(mockContactCreate).not.toHaveBeenCalled();
    });

    test("should create contact with minimal required fields", async () => {
      const minimalData = {
        fullname: "Bob Johnson",
      };

      const createdContact = {
        _id: new ObjectId(),
        userid: mockUserId,
        ...minimalData,
      };

      mockContactCreate.mockResolvedValue(createdContact);

      const res = await request(app)
        .post("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`)
        .send(minimalData);

      expect(res.status).toBe(200);
      expect(res.body.fullname).toBe("Bob Johnson");
    });

    test("should return 500 on database error", async () => {
      mockContactCreate.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`)
        .send(newContactData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to create contact");
    });

    test("should handle all optional contact fields", async () => {
      const fullContactData = {
        ...newContactData,
        twitter: "@janesmith",
        website: "https://janesmith.com",
        birthday: "1990-05-15",
        relationshipStrength: "strong",
        engagementFrequency: "monthly",
      };

      const createdContact = {
        _id: new ObjectId(),
        userid: mockUserId,
        ...fullContactData,
      };

      mockContactCreate.mockResolvedValue(createdContact);

      const res = await request(app)
        .post("/networking/contacts")
        .set("Authorization", `Bearer ${validToken}`)
        .send(fullContactData);

      expect(res.status).toBe(200);
      expect(res.body.twitter).toBe("@janesmith");
      expect(res.body.birthday).toBe("1990-05-15");
    });
  });

  // ============================================================================
  // PUT /networking/contacts/:id - UPDATE CONTACT
  // ============================================================================

  describe("PUT /networking/contacts/:id", () => {
    const updateData = {
      fullname: "John Doe Updated",
      position: "Lead Engineer",
      notes: "Updated notes",
    };

    test("should update an existing contact", async () => {
      const updatedContact = {
        ...mockContactData,
        ...updateData,
        updatedAt: new Date(),
      };

      mockContactFindOneAndUpdate.mockResolvedValue(updatedContact);

      const res = await request(app)
        .put(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.fullname).toBe("John Doe Updated");
      expect(res.body.position).toBe("Lead Engineer");
      
      expect(mockContactFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockContactId.toString(), userid: mockUserId },
        updateData,
        { new: true }
      );
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .put(`/networking/contacts/${mockContactId}`)
        .send(updateData);

      expect(res.status).toBe(401);
      expect(mockContactFindOneAndUpdate).not.toHaveBeenCalled();
    });

    test("should return 404 if contact not found", async () => {
      mockContactFindOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .put(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Contact not found");
    });

    test("should return 404 if contact belongs to different user", async () => {
      mockContactFindOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .put(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
    });

    test("should return 500 on database error", async () => {
      mockContactFindOneAndUpdate.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .put(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updateData);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to update contact");
    });

    test("should update partial fields only", async () => {
      const partialUpdate = { notes: "Just updating notes" };

      const updatedContact = {
        ...mockContactData,
        notes: "Just updating notes",
      };

      mockContactFindOneAndUpdate.mockResolvedValue(updatedContact);

      const res = await request(app)
        .put(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.notes).toBe("Just updating notes");
      expect(res.body.fullname).toBe("John Doe"); // Other fields unchanged
    });
  });

  // ============================================================================
  // DELETE /networking/contacts/:id - DELETE CONTACT
  // ============================================================================

  describe("DELETE /networking/contacts/:id", () => {
    test("should delete an existing contact", async () => {
      mockContactDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const res = await request(app)
        .delete(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      expect(mockContactDeleteOne).toHaveBeenCalledWith({
        _id: mockContactId.toString(),
        userid: mockUserId,
      });
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).delete(`/networking/contacts/${mockContactId}`);

      expect(res.status).toBe(401);
      expect(mockContactDeleteOne).not.toHaveBeenCalled();
    });

    test("should return 500 on database error", async () => {
      mockContactDeleteOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .delete(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to delete contact");
    });

    test("should succeed even if contact doesn't exist", async () => {
      mockContactDeleteOne.mockResolvedValue({ deletedCount: 0 });

      const res = await request(app)
        .delete(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================================================
  // RELATIONSHIP MAINTENANCE - UC-093
  // ============================================================================

  describe("GET /networking/contacts/needing-attention", () => {
    test("should return contacts needing attention", async () => {
      const contactsNeedingAttention = [
        {
          ...mockContactData,
          relationshipHealth: "at-risk",
          lastInteraction: "2023-06-01", // Long time ago
        },
      ];

      mockGetContactsNeedingAttention.mockResolvedValue(contactsNeedingAttention);

      const res = await request(app)
        .get("/networking/contacts/needing-attention")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].relationshipHealth).toBe("at-risk");
      
      expect(mockGetContactsNeedingAttention).toHaveBeenCalledWith(mockUserId);
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/networking/contacts/needing-attention");

      expect(res.status).toBe(401);
      expect(mockGetContactsNeedingAttention).not.toHaveBeenCalled();
    });

    test("should return empty array if no contacts need attention", async () => {
      mockGetContactsNeedingAttention.mockResolvedValue([]);

      const res = await request(app)
        .get("/networking/contacts/needing-attention")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 500 on service error", async () => {
      mockGetContactsNeedingAttention.mockRejectedValue(new Error("Service Error"));

      const res = await request(app)
        .get("/networking/contacts/needing-attention")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to load contacts needing attention");
    });
  });

  describe("GET /networking/reminders/upcoming", () => {
    test("should return upcoming reminders", async () => {
      const upcomingReminders = [
        {
          ...mockContactData,
          reminderDate: new Date(Date.now() + 86400000), // Tomorrow
        },
      ];

      mockGetUpcomingReminders.mockResolvedValue(upcomingReminders);

      const res = await request(app)
        .get("/networking/reminders/upcoming")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].reminderDate).toBeDefined();
      
      expect(mockGetUpcomingReminders).toHaveBeenCalledWith(mockUserId);
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/networking/reminders/upcoming");

      expect(res.status).toBe(401);
      expect(mockGetUpcomingReminders).not.toHaveBeenCalled();
    });

    test("should return empty array if no upcoming reminders", async () => {
      mockGetUpcomingReminders.mockResolvedValue([]);

      const res = await request(app)
        .get("/networking/reminders/upcoming")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("should return 500 on service error", async () => {
      mockGetUpcomingReminders.mockRejectedValue(new Error("Service Error"));

      const res = await request(app)
        .get("/networking/reminders/upcoming")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to load upcoming reminders");
    });
  });

  // ============================================================================
  // POST /networking/reminders/:contactId - SET REMINDER
  // ============================================================================

  describe("POST /networking/reminders/:contactId", () => {
    test("should set reminder for contact", async () => {
      const reminderDate = new Date(Date.now() + 86400000 * 7); // 1 week from now
      
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const contactWithReminder = {
        ...mockContactData,
        reminderDate,
        save: mockSave,
      };

      mockContactFindOne.mockResolvedValue(contactWithReminder);

      const res = await request(app)
        .post(`/networking/reminders/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ date: reminderDate });

      expect(res.status).toBe(200);
      expect(res.body.reminderDate).toEqual(reminderDate.toISOString());
      expect(mockSave).toHaveBeenCalled();
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post(`/networking/reminders/${mockContactId}`)
        .send({ date: new Date() });

      expect(res.status).toBe(401);
    });

    test("should return 404 if contact not found", async () => {
      mockContactFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post(`/networking/reminders/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ date: new Date() });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Contact not found");
    });

    test("should return 500 on database error", async () => {
      mockContactFindOne.mockRejectedValue(new Error("DB Error"));

      const res = await request(app)
        .post(`/networking/reminders/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ date: new Date() });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to set reminder");
    });
  });

  // ============================================================================
  // POST /networking/contacts/:id/update-health
  // ============================================================================

  describe("POST /networking/contacts/:id/update-health", () => {
    test("should update contact relationship health", async () => {
      const updatedContact = {
        ...mockContactData,
        relationshipHealth: "healthy",
        healthScore: 85,
      };

      mockUpdateContactRelationshipHealth.mockResolvedValue(updatedContact);

      const res = await request(app)
        .post(`/networking/contacts/${mockContactId}/update-health`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.relationshipHealth).toBe("healthy");
      expect(res.body.healthScore).toBe(85);
      
      expect(mockUpdateContactRelationshipHealth).toHaveBeenCalledWith(
        mockContactId.toString(),
        mockUserId
      );
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post(`/networking/contacts/${mockContactId}/update-health`);

      expect(res.status).toBe(401);
      expect(mockUpdateContactRelationshipHealth).not.toHaveBeenCalled();
    });

    test("should return 500 on service error", async () => {
      mockUpdateContactRelationshipHealth.mockRejectedValue(new Error("Service Error"));

      const res = await request(app)
        .post(`/networking/contacts/${mockContactId}/update-health`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to update contact health");
    });
  });

  describe("POST /networking/contacts/update-all-health", () => {
    test("should update all contacts health", async () => {
      const result = {
        updated: 10,
        skipped: 2,
      };

      mockUpdateAllContactsHealth.mockResolvedValue(result);

      const res = await request(app)
        .post("/networking/contacts/update-all-health")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(10);
      expect(res.body.skipped).toBe(2);
      
      expect(mockUpdateAllContactsHealth).toHaveBeenCalledWith(mockUserId);
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app)
        .post("/networking/contacts/update-all-health");

      expect(res.status).toBe(401);
      expect(mockUpdateAllContactsHealth).not.toHaveBeenCalled();
    });

    test("should return 500 on service error", async () => {
      mockUpdateAllContactsHealth.mockRejectedValue(new Error("Service Error"));

      const res = await request(app)
        .post("/networking/contacts/update-all-health")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to update all contacts health");
    });
  });

  // ============================================================================
  // GET /networking/analytics/relationships
  // ============================================================================

  describe("GET /networking/analytics/relationships", () => {
    test("should return relationship analytics", async () => {
      const analytics = {
        totalContacts: 50,
        healthyContacts: 30,
        atRiskContacts: 15,
        dormantContacts: 5,
        averageHealthScore: 75,
        engagementTrends: {
          thisMonth: 20,
          lastMonth: 15,
          growth: 33,
        },
      };

      mockGetRelationshipAnalytics.mockResolvedValue(analytics);

      const res = await request(app)
        .get("/networking/analytics/relationships")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalContacts).toBe(50);
      expect(res.body.healthyContacts).toBe(30);
      expect(res.body.averageHealthScore).toBe(75);
      
      expect(mockGetRelationshipAnalytics).toHaveBeenCalledWith(mockUserId);
    });

    test("should return 401 if no authorization header", async () => {
      const res = await request(app).get("/networking/analytics/relationships");

      expect(res.status).toBe(401);
      expect(mockGetRelationshipAnalytics).not.toHaveBeenCalled();
    });

    test("should return 500 on service error", async () => {
      mockGetRelationshipAnalytics.mockRejectedValue(new Error("Service Error"));

      const res = await request(app)
        .get("/networking/analytics/relationships")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Failed to load relationship analytics");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("Edge Cases", () => {
    test("should handle contact with empty interactions array", async () => {
      const contactWithNoInteractions = {
        ...mockContactData,
        interactions: [],
      };

      mockContactFindOne.mockResolvedValue(contactWithNoInteractions);

      const res = await request(app)
        .get(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.interactions).toEqual([]);
    });

    test("should handle contact with missing optional fields", async () => {
      const minimalContact = {
        _id: mockContactId,
        userid: mockUserId,
        fullname: "Minimal Contact",
      };

      mockContactFindOne.mockResolvedValue(minimalContact);

      const res = await request(app)
        .get(`/networking/contacts/${mockContactId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.fullname).toBe("Minimal Contact");
      expect(res.body.email).toBeUndefined();
    });

    test("should handle invalid ObjectId format", async () => {
      mockContactFindOne.mockRejectedValue(new Error("Cast to ObjectId failed"));

      const res = await request(app)
        .get("/networking/contacts/invalid-id")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(500);
    });

    test("should handle JWT verification failure", async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const res = await request(app)
        .get("/networking/contacts")
        .set("Authorization", `Bearer invalid.token`);

      expect(res.status).toBe(401);
    });
  });
});