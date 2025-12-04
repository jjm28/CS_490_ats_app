import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import MentorMessage from "../models/mentorMessages.model.js";

const router = express.Router();

// Invite a mentor
router.post("/invite", verifyJWT, async (req, res) => {
  const db = getDb();

  // Accept multiple possible field names for backward compatibility
  const mentorEmail =
    req.body.mentorEmail ||
    req.body.email ||
    req.body.recipientEmail ||
    req.body.userEmail;

  const mentorName =
    req.body.mentorName ||
    req.body.name ||
    "Mentor";

  const permissions = req.body.permissions || {
    resume: false,
    applications: false,
    analytics: false,
    interviewPrep: false,
  };

  if (!mentorEmail) {
    return res.status(400).json({ error: "Email required" });
  }

  const invite = {
    userId: req.user._id,
    mentorEmail,
    mentorName,
    status: "pending",
    permissions,
    invitedAt: new Date(),
  };

  const result = await db.collection("mentorCollaborations").insertOne(invite);

  res.json({ success: true, message: "Invite sent", inviteId: result.insertedId });
});

// Mentor accepts invite
router.post("/:id/accept", async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  await db.collection("mentorCollaborations").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "accepted", acceptedAt: new Date() } }
  );

  res.json({ success: true });
});

// Get all mentors connected to the logged-in user
router.get("/my", verifyJWT, async (req, res) => {
  try {
    const db = getDb();

    const list = await db
      .collection("mentorCollaborations")
      .find({ userId: req.user._id })
      .toArray();

    res.json(list);
  } catch (err) {
    console.error("Failed to fetch mentors:", err);
    res.status(500).json({ error: "Failed to fetch mentors" });
  }
});

/* -------------------------------
   GET Messages for collaboration
--------------------------------*/
router.get("/:id/messages", verifyJWT, async (req, res) => {
  try {
    const messages = await MentorMessage.find({ mentorshipId: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Failed loading messages:", err);
    res.status(500).json({ error: "Could not load messages" });
  }
});

/* ----------------------------------
   POST New Message
-----------------------------------*/
router.post("/:id/messages", verifyJWT, async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const msg = await MentorMessage.create({
      mentorshipId: req.params.id,
      sender: sender || "user",
      message
    });

    res.json(msg);
  } catch (err) {
    console.error("Failed sending message:", err);
    res.status(500).json({ error: "Message failed to send" });
  }
});

// Get mentorship details
router.get("/:id", verifyJWT, async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  try {
    const mentorship = await db.collection("mentorCollaborations").findOne({
      _id: new ObjectId(id),
      userId: req.user._id
    });

    if (!mentorship) return res.status(404).json({ error: "Not found" });

    res.json(mentorship);
  } catch (err) {
    console.error("FETCH MENTORSHIP ERROR:", err);
    res.status(500).json({ error: "Failed to load mentorship" });
  }
});

/* -----------------------------------------
   Add Recommendation
------------------------------------------ */
router.post("/:id/recommendations", verifyJWT, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: "Text required" });

    const rec = {
      _id: new ObjectId(),
      text,
      implemented: false,
      createdAt: new Date()
    };

    await db.collection("mentorCollaborations").updateOne(
      { _id: new ObjectId(id), userId: req.user._id },
      { $push: { recommendations: rec } }
    );

    res.json(rec);
  } catch (err) {
    console.error("Add Rec Error:", err);
    res.status(500).json({ error: "Failed to add recommendation" });
  }
});


/* -----------------------------------------
   Toggle Recommendation Implementation
------------------------------------------ */
router.patch("/:id/recommendations/:recId", verifyJWT, async (req, res) => {
  try {
    const db = getDb();
    const { id, recId } = req.params;
    const { implemented } = req.body;

    await db.collection("mentorCollaborations").updateOne(
      { _id: new ObjectId(id), userId: req.user._id, "recommendations._id": new ObjectId(recId) },
      { $set: { "recommendations.$.implemented": implemented } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Toggle Rec Error:", err);
    res.status(500).json({ error: "Failed to update recommendation" });
  }
});

// Update recommendation
router.patch("/:mentorshipId/recommendations/:recId", verifyJWT, async (req, res) => {
  try {
    const db = getDb();
    const { mentorshipId, recId } = req.params;
    const updateFields = req.body;

    const mentorship = await db.collection("mentorCollaborations").findOneAndUpdate(
      { _id: new ObjectId(mentorshipId), userId: req.user._id },
      { $set: { "recommendations.$[elem]": { _id: recId, ...updateFields } } },
      { arrayFilters: [{ "elem._id": recId }], returnDocument: "after" }
    );

    res.json(mentorship.value.recommendations);
  } catch (err) {
    console.error("Recommendation update failed:", err);
    res.status(500).json({ error: "Failed to update recommendation" });
  }
});

router.delete("/:id", verifyJWT, async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  await db.collection("mentorCollaborations").deleteOne({
    _id: new ObjectId(id),
    userId: req.user._id
  });

  res.json({ success: true });
});

router.delete("/:mentorshipId/recommendations/:recId", verifyJWT, async (req, res) => {
  const db = getDb();
  const { mentorshipId, recId } = req.params;

  await db.collection("mentorCollaborations").updateOne(
    { _id: new ObjectId(mentorshipId), userId: req.user._id },
    { $pull: { recommendations: { _id: new ObjectId(recId) } } }
  );

  res.json({ success: true });
});



router.get("/:mentorId/export", verifyJWT, async (req, res) => {
  try {
    const db = getDb();
    const { mentorId } = req.params;

    const collab = await db.collection("mentorCollaborations").findOne({
      _id: new ObjectId(mentorId),
      userId: req.user._id,
    });

    if (!collab) {
      return res.status(404).json({ error: "Not found" });
    }

    const { mentorEmail, mentorName, recommendations = [], permissions, invitedAt } = collab;

    const total = recommendations.length;
    const done = recommendations.filter(r => r.implemented).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    // PDF SETUP
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mentor-progress-${mentorId}.pdf"`
    );
    doc.pipe(res);

    // HEADER
    doc
      .fontSize(22)
      .fillColor("#0A3D62")
      .text("Mentorship Progress Report", { align: "center" })
      .moveDown(1);

    doc
      .fontSize(14)
      .fillColor("black")
      .text(`Mentor: ${mentorName || "Unknown"} (${mentorEmail})`)
      .text(`Start Date: ${new Date(invitedAt).toLocaleDateString()}`)
      .moveDown(1);

    // PROGRESS SECTION
    doc.fontSize(16).fillColor("#0A3D62").text("Progress Overview");
    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Completed: ${done}/${total} (${percent}%)`)
      .moveDown(0.5);

    // Progress bar
    const barX = 50, barY = doc.y;
    const barWidth = 500, barHeight = 10;
    doc.rect(barX, barY, barWidth, barHeight).stroke("#c4c4c4");
    doc
      .rect(barX, barY, (percent / 100) * barWidth, barHeight)
      .fill("#007bff");
    doc.moveDown(1.5);

    // RECOMMENDATIONS SECTION
    doc.fontSize(16).fillColor("#0A3D62").text("Recommendations");
    doc.moveDown(0.5);

    if (recommendations.length === 0) {
      doc.fontSize(12).text("No recommendations yet.");
    } else {
      recommendations.forEach((rec) => {
        doc
          .fontSize(12)
          .circle(doc.x - 5, doc.y + 5, 3)
          .fill(rec.implemented ? "green" : "gray")
          .stroke()
          .fillColor("black")
          .text(`${rec.text}  ${rec.implemented ? "(Completed)" : "(Pending)"}`, doc.x + 10);
      });
    }

    doc.moveDown(1.5);

    // PERMISSIONS SECTION
    doc.fontSize(16).fillColor("#0A3D62").text("Shared Access");
    doc.moveDown(0.5);

    Object.entries(permissions).forEach(([key, val]) => {
      if (val) doc.fontSize(12).text(`• ${key.replace("share", "")}`);
    });

    // FOOTER
    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Generated on ${new Date().toLocaleString()}`, {
        align: "right",
        baseline: "bottom",
      });

    doc.end();
  } catch (err) {
    console.error("Export PDF error:", err);
    res.status(500).json({ error: "Failed to export PDF" });
  }
});

export default router;
