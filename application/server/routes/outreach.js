import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import Contact from "../models/contacts.js";
import Jobs from "../models/jobs.js";

const router = express.Router();

/*
=============================================================
   POST /api/networking/outreach
   Generate AI outreach message
=============================================================
*/
router.post("/", verifyJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    const { contactId, jobId } = req.body;

    if (!contactId || !jobId) {
      return res.status(400).json({ error: "Missing contactId or jobId" });
    }

    // Get contact
    const contact = await Contact.findOne({ _id: contactId, userid: userId });
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    // Get job
    const job = await Jobs.findOne({ _id: jobId, userId });
    if (!job) return res.status(404).json({ error: "Job not found" });

    // -------------------------------------------------------
    // 🔥 AI MESSAGE GENERATION (You can adjust the prompt)
    // -------------------------------------------------------

    const prompt = `
Generate a short, friendly networking outreach message.

Contact:
- Name: ${contact.name}
- Company: ${contact.company}
- Relationship: ${contact.relationshipType || "N/A"}

Job I'm applying to:
- Title: ${job.jobTitle}
- Company: ${job.companyName || job.company || "Unknown"}

Please write a concise but warm outreach message.
`;

    // ▶ If you use OpenAI:
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4o-mini",
    //   messages: [{ role: "user", content: prompt }],
    // });
    // const message = completion.choices[0].message.content;

    // TEMPORARY: return dummy text so UI works
    const message = `Hi ${contact.name}, I hope you're well! I'm currently applying for a ${job.jobTitle} role at ${job.companyName || job.company}. I would love any insight you may have.`;

    return res.json({ message });

  } catch (err) {
    console.error("Outreach generation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
