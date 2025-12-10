// routes/customReports.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { generateCustomReport, getJobFilterSummary } from "../services/customReport.service.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post("/generate", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.headers["x-dev-user-id"];
    if (!userId) return res.status(401).json({ error: "Missing user ID" });

    const { filters, options } = req.body;
    const report = await generateCustomReport(userId, filters, options);

    if (!report) {
      return res.status(500).json({ error: "Failed to generate report" });
    }

    // ✅ If format is PDF or Excel, send as a binary file (no JSON)
    if (options?.format === "pdf" || options?.format === "excel") {
      const filePath = path.resolve(`.${report.path}`);
      const fileName = path.basename(filePath);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.setHeader(
        "Content-Type",
        options.format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return res.sendFile(filePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).end();
        }
      });
    }

    // ✅ Otherwise return JSON normally
    res.json(report);
  } catch (err) {
    console.error("[CustomReport] Error:", err);
    if (!res.headersSent)
      res.status(500).json({ error: err.message || "Internal server error" });
  }
});

router.get("/filters", async (req, res) => {
  try {
    const userId = req.user?.id || req.headers["x-user-id"];
    const data = await getJobFilterSummary(userId);
    res.json(data);
  } catch (err) {
    console.error("Error loading job filters:", err);
    res.status(500).json({ error: "Failed to load job filters" });
  }
});

export default router;
