// server/routes/networking.js
import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import Contact from "../models/contacts.js";
import axios from "axios";
import querystring from "querystring";
import { v4 as uuidv4 } from "uuid";
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addOutreach,
  updateOutreach,
  deleteOutreach,
  getCampaignAnalytics
} from "../services/campaign.service.js";
import {
  updateContactRelationshipHealth,
  updateAllContactsHealth,
  getContactsNeedingAttention,
  getUpcomingReminders,
  generateOutreachTemplates,
  getRelationshipAnalytics,
} from "../services/relationship_maintenance.service.js";

const router = express.Router();

/* ===========================================================
   GET ALL CONTACTS  ->  GET /api/networking/contacts
=========================================================== */
router.get("/contacts", verifyJWT, async (req, res) => {
  try {
    console.log("GET /api/networking/contacts for user", req.user);

    // ⚠ your auth middleware sets `_id`, not `id`
    const userId = req.user._id;

    // Small debug to confirm Contact really is a model:
    console.log("Contact model typeof:", typeof Contact);
    console.log("Contact.hasFind:", typeof Contact.find);

    const contacts = await Contact.find({ userid: userId }).sort({
      updatedAt: -1,
    });

    res.json(contacts);
  } catch (err) {
    console.error("GET CONTACTS ERROR:", err);
    res.status(500).json({ error: "Failed to load contacts" });
  }
});

/* ===========================================================
   GET ONE CONTACT  ->  GET /api/networking/contacts/:id
=========================================================== */
router.get("/contacts/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.id,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    res.json(contact);
  } catch (err) {
    console.error("GET CONTACT ERROR:", err);
    res.status(500).json({ error: "Failed to load contact" });
  }
});

/* ===========================================================
   CREATE CONTACT  ->  POST /api/networking/contacts
=========================================================== */
router.post("/contacts", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const newContact = await Contact.create({
      ...req.body,
      userid: userId,
    });

    res.json(newContact);
  } catch (err) {
    console.error("CREATE CONTACT ERROR:", err);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

/* ===========================================================
   UPDATE CONTACT  ->  PUT /api/networking/contacts/:id
=========================================================== */
router.put("/contacts/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const updated = await Contact.findOneAndUpdate(
      { _id: req.params.id, userid: userId },
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Contact not found" });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE CONTACT ERROR:", err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

/* ===========================================================
   DELETE CONTACT  ->  DELETE /api/networking/contacts/:id
=========================================================== */
router.delete("/contacts/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    await Contact.deleteOne({
      _id: req.params.id,
      userid: userId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE CONTACT ERROR:", err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});


/* ===========================================================
   SET REMINDER  ->  POST /api/networking/reminders/:contactId
=========================================================== */
router.post("/reminders/:contactId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.contactId,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    contact.reminderDate = req.body.date;
    await contact.save();

    res.json(contact);
  } catch (err) {
    console.error("SET REMINDER ERROR:", err);
    res.status(500).json({ error: "Failed to set reminder" });
  }
});

/* ===========================================================
   GET INTERACTION HISTORY  ->  GET /api/networking/contacts/:id/interactions
=========================================================== */
router.get("/contacts/:id/interactions", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.id,
      userid: userId,
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact.interactions || []);
  } catch (err) {
    console.error("INTERACTION HISTORY ERROR:", err);
    res.status(500).json({ error: "Failed to load interaction history" });
  }
});


//add interaction
router.post("/interactions/:contactId", verifyJWT, async (req, res) => {
  const { type, note } = req.body;

  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.contactId,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const interaction = {
      interactionId: uuidv4(),
      type,
      note,
      date: new Date().toISOString(),
    };

    contact.interactions.push(interaction);
    contact.lastInteraction = interaction.date;

    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to add interaction" });
  }
});

/* ===========================================================
   UPDATE INTERACTION
   PUT /api/networking/interactions/:contactId/:interactionId
=========================================================== */
router.put("/interactions/:contactId/:interactionId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.contactId,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const interaction = contact.interactions.find(
      (i) => i.interactionId === req.params.interactionId
    );

    if (!interaction) return res.status(404).json({ error: "Interaction not found" });

    if (req.body.type) interaction.type = req.body.type;
    if (req.body.note) interaction.note = req.body.note;

    await contact.save();
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to update interaction" });
  }
});

/* ===========================================================
   DELETE INTERACTION
   DELETE /api/networking/interactions/:contactId/:interactionId
=========================================================== */
router.delete("/interactions/:contactId/:interactionId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.contactId,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    // Auto-fix missing IDs on old records:
    let changed = false;
    contact.interactions.forEach((i) => {
      if (!i.interactionId) {
        i.interactionId = uuidv4();
        changed = true;
      }
    });

    if (changed) await contact.save();

    contact.interactions = contact.interactions.filter(
      (i) => i.interactionId !== req.params.interactionId
    );

    await contact.save();
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE INTERACTION ERROR:", err);
    res.status(500).json({ error: "Failed to delete interaction" });
  }
});


/* ===========================================================
   GET ALL INTERACTIONS (for dashboard page)
   GET /api/networking/interactions
=========================================================== */
router.get("/interactions", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all contacts for this user
    const contacts = await Contact.find({ userid: userId });

    // Flatten all interactions into 1 array
    const allInteractions = [];

    contacts.forEach((c) => {
      c.interactions.forEach((i) => {
        allInteractions.push({
          contactId: c._id,
          name: c.fullname,
          type: i.type,
          note: i.note,
          date: i.date
        });
      });
    });

    res.json(allInteractions);
  } catch (err) {
    console.error("GET ALL INTERACTIONS ERROR:", err);
    res.status(500).json({ error: "Failed to load interactions" });
  }
});

/* ===========================================================
   GOOGLE CONTACTS OAUTH (Step 1: Send user to Google)
   GET /api/networking/google/oauth
=========================================================== */
router.get("/google/oauth", (req, res) => {
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    querystring.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_CONTACTS_REDIRECT,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/contacts.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
    });

  console.log("Redirecting user to Google OAuth:", authUrl);
  res.redirect(authUrl);
});


/* ===========================================================
   GOOGLE CONTACTS OAUTH CALLBACK
   GET /api/networking/google/oauth/callback
=========================================================== */
router.get("/google/oauth/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    console.error("Missing OAuth code!");
    return res.status(400).send("Missing OAuth code");
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CONTACTS_REDIRECT,
      grant_type: "authorization_code",
    });

    const accessToken = tokenRes.data.access_token;
    console.log("Google OAuth success, token received.");

    // Redirect to frontend importer page
    return res.redirect(
      `http://localhost:5173/networking/import?token=${accessToken}`
    );

  } catch (err) {
    console.error("OAuth ERROR:", err.response?.data || err.message);
    res.status(500).send("Google OAuth Error");
  }
});


/* ===========================================================
   IMPORT CONTACTS FROM GOOGLE
   POST /api/networking/google/import
=========================================================== */
router.post("/google/import", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing Google access token" });
  }

  try {
    const googleRes = await axios.get(
      "https://people.googleapis.com/v1/people/me/connections",
      {
        params: {
          personFields: "names,emailAddresses",
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const connections = googleRes.data.connections || [];

    // Clean & standardize data
    const cleaned = connections
      .map((c) => ({
        name: c.names?.[0]?.displayName || "",
        email: c.emailAddresses?.[0]?.value || "",
      }))
      .filter((c) => c.name || c.email); // remove empty rows

    res.json({ contacts: cleaned });

  } catch (err) {
    console.error("IMPORT ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to import Google contacts" });
  }
});

/* ===========================================================
   NETWORKING CAMPAIGNS
=========================================================== */

// GET all campaigns
router.get("/campaigns", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query; // Optional filter by status

    const filters = {};
    if (status) filters.status = status;

    const campaigns = await getCampaigns(userId, filters);
    res.json(campaigns);
  } catch (err) {
    console.error("GET CAMPAIGNS ERROR:", err);
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});

// GET single campaign by ID
router.get("/campaigns/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const campaign = await getCampaignById(req.params.id, userId);
    res.json(campaign);
  } catch (err) {
    console.error("GET CAMPAIGN ERROR:", err);
    res.status(404).json({ error: "Campaign not found" });
  }
});

// CREATE new campaign
router.post("/campaigns", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const campaign = await createCampaign(userId, req.body);
    res.status(201).json(campaign);
  } catch (err) {
    console.error("CREATE CAMPAIGN ERROR:", err);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// UPDATE campaign
router.put("/campaigns/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const campaign = await updateCampaign(req.params.id, userId, req.body);
    res.json(campaign);
  } catch (err) {
    console.error("UPDATE CAMPAIGN ERROR:", err);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// DELETE campaign
router.delete("/campaigns/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    await deleteCampaign(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE CAMPAIGN ERROR:", err);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

/* ===========================================================
   CAMPAIGN OUTREACHES
=========================================================== */

// ADD outreach to campaign
router.post("/campaigns/:id/outreaches", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const campaign = await addOutreach(req.params.id, userId, req.body);
    res.json(campaign);
  } catch (err) {
    console.error("ADD OUTREACH ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to add outreach" });
  }
});

// UPDATE outreach in campaign
router.put("/campaigns/:id/outreaches/:outreachId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const campaign = await updateOutreach(
      req.params.id, 
      userId, 
      req.params.outreachId, 
      req.body
    );
    res.json(campaign);
  } catch (err) {
    console.error("UPDATE OUTREACH ERROR:", err);
    res.status(500).json({ error: "Failed to update outreach" });
  }
});

// DELETE outreach from campaign
router.delete("/campaigns/:id/outreaches/:outreachId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const campaign = await deleteOutreach(
      req.params.id, 
      userId, 
      req.params.outreachId
    );
    res.json(campaign);
  } catch (err) {
    console.error("DELETE OUTREACH ERROR:", err);
    res.status(500).json({ error: "Failed to delete outreach" });
  }
});

/* ===========================================================
   CAMPAIGN ANALYTICS
=========================================================== */

// GET campaign analytics
router.get("/campaigns-analytics", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const analytics = await getCampaignAnalytics(userId);
    res.json(analytics);
  } catch (err) {
    console.error("GET ANALYTICS ERROR:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

/* ===========================================================
   RELATIONSHIP MAINTENANCE - UC-093
=========================================================== */

// GET contacts needing attention
router.get("/contacts/needing-attention", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const contacts = await getContactsNeedingAttention(userId);
    res.json(contacts);
  } catch (err) {
    console.error("GET CONTACTS NEEDING ATTENTION ERROR:", err);
    res.status(500).json({ error: "Failed to load contacts needing attention" });
  }
});

// GET upcoming reminders
router.get("/reminders/upcoming", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const contacts = await getUpcomingReminders(userId);
    res.json(contacts);
  } catch (err) {
    console.error("GET UPCOMING REMINDERS ERROR:", err);
    res.status(500).json({ error: "Failed to load upcoming reminders" });
  }
});

// POST update relationship health for single contact
router.post("/contacts/:id/update-health", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const contact = await updateContactRelationshipHealth(req.params.id, userId);
    res.json(contact);
  } catch (err) {
    console.error("UPDATE CONTACT HEALTH ERROR:", err);
    res.status(500).json({ error: "Failed to update contact health" });
  }
});

// POST update relationship health for all contacts
router.post("/contacts/update-all-health", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await updateAllContactsHealth(userId);
    res.json(result);
  } catch (err) {
    console.error("UPDATE ALL CONTACTS HEALTH ERROR:", err);
    res.status(500).json({ error: "Failed to update all contacts health" });
  }
});

// POST update contact engagement frequency
router.post("/contacts/:id/engagement-frequency", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const { frequency } = req.body;

    if (!['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
      return res.status(400).json({ error: "Invalid frequency" });
    }

    const contact = await Contact.findOne({
      _id: req.params.id,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    contact.engagementFrequency = frequency;
    await contact.save();

    // Recalculate health with new frequency
    await updateContactRelationshipHealth(req.params.id, userId);

    const updated = await Contact.findById(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error("UPDATE ENGAGEMENT FREQUENCY ERROR:", err);
    res.status(500).json({ error: "Failed to update engagement frequency" });
  }
});

// GET outreach templates for a contact
router.get("/contacts/:id/templates", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const { context } = req.query; // general, birthday, congratulations, job_opportunity, value_add

    const contact = await Contact.findOne({
      _id: req.params.id,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const template = generateOutreachTemplates(contact, context || 'general');
    res.json(template);
  } catch (err) {
    console.error("GET TEMPLATES ERROR:", err);
    res.status(500).json({ error: "Failed to generate templates" });
  }
});

// GET all outreach template types
router.get("/contacts/:id/templates/all", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;

    const contact = await Contact.findOne({
      _id: req.params.id,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const templates = {
      general: generateOutreachTemplates(contact, 'general'),
      birthday: generateOutreachTemplates(contact, 'birthday'),
      congratulations: generateOutreachTemplates(contact, 'congratulations'),
      job_opportunity: generateOutreachTemplates(contact, 'job_opportunity'),
      value_add: generateOutreachTemplates(contact, 'value_add'),
    };

    res.json(templates);
  } catch (err) {
    console.error("GET ALL TEMPLATES ERROR:", err);
    res.status(500).json({ error: "Failed to generate templates" });
  }
});

// GET relationship analytics
router.get("/analytics/relationships", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const analytics = await getRelationshipAnalytics(userId);
    res.json(analytics);
  } catch (err) {
    console.error("GET RELATIONSHIP ANALYTICS ERROR:", err);
    res.status(500).json({ error: "Failed to load relationship analytics" });
  }
});

// POST mark opportunity generated from contact
router.post("/contacts/:id/opportunity", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const { description } = req.body;

    const contact = await Contact.findOne({
      _id: req.params.id,
      userid: userId,
    });

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    contact.opportunitiesGenerated = (contact.opportunitiesGenerated || 0) + 1;

    // Add as an interaction
    contact.interactions.push({
      interactionId: uuidv4(),
      type: "Opportunity Generated",
      note: description || "Generated an opportunity from this contact",
      date: new Date().toISOString(),
    });

    contact.lastInteraction = new Date();
    await contact.save();

    // Update health
    await updateContactRelationshipHealth(req.params.id, userId);

    const updated = await Contact.findById(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error("MARK OPPORTUNITY ERROR:", err);
    res.status(500).json({ error: "Failed to mark opportunity" });
  }
});

export default router;
