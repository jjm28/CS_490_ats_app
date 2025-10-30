import express from "express";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import "dotenv/config";

const router = express.Router();

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const db = getDb();

    // Start of what was added in UC032
    const {
      search = "",
      tech = "",
      industry = "",
      sort = "date_desc", // default newest → oldest
    } = req.query;

    const q = { userId };

    // text-like filters
    if (search) {
      // match in name or description
      q.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (tech) {
      // your field is "technologies" as string; do regex
      q.technologies = { $regex: tech, $options: "i" };
    }

    if (industry) {
      q.industry = { $regex: industry, $options: "i" };
    }

    // build sort
    let sortObj = {};
    if (sort === "date_desc") {
      sortObj = { startDate: -1, _id: -1 };
    } else if (sort === "date_asc") {
      sortObj = { startDate: 1, _id: 1 };
    } else if (sort === "name_asc") {
      sortObj = { name: 1 };
    } else if (sort === "name_desc") {
      sortObj = { name: -1 };
    }
    // END of what was added in UC032

    //How would new line access userId
    const projects = await db.collection("projects").find({ userId }).toArray();
    res.status(200).json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects", error: err });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      name,
      description,
      role,
      startDate,
      endDate,
      technologies,
      url,
      teamSize,
      collaborationDetails,
      outcomes,
      industry,
      status,
      mediaUrl,
      thumbnailUrl, //UC032
    } = req.body;

    if (!name || !description || !role || !startDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDb();
    const newProject = {
      name,
      description,
      role,
      startDate,
      endDate,
      technologies,
      url,
      teamSize,
      collaborationDetails,
      outcomes,
      industry,
      status,
      mediaUrl,
      userId,
      thumbnailUrl: thumbnailUrl || "", //UC032
    };

    const result = await db.collection("projects").insertOne(newProject);
    res.status(201).json({ _id: result.insertedId, ...newProject });
  } catch (err) {
    res.status(500).json({ message: "Error adding project", error: err });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const updatedProject = req.body;

    const db = getDb();
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id), userId }, { $set: updatedProject });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    const updatedDoc = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    res.status(200).json(updatedDoc);
  } catch (err) {
    res.status(500).json({ message: "Error updating project", error: err });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = req.params.id;
    const db = getDb();

    const result = await db
      .collection("projects")
      .deleteOne({ _id: new ObjectId(id), userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Project not found or unauthorized" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting project", error: err });
  }
});

// printing the summary for each user UC032
router.get("/:id/summary", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const db = getDb();
    const proj = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(req.params.id), userId });

    if (!proj) return res.status(404).json({ message: "Not found" });

    // print-friendly data
    res.json({
      name: proj.name,
      description: proj.description,
      role: proj.role,
      duration: proj.startDate + (proj.endDate ? ` – ${proj.endDate}` : " – Present"),
      technologies: proj.technologies,
      outcomes: proj.outcomes,
      industry: proj.industry,
      url: proj.url,
      status: proj.status,
      createdAt: proj.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching summary", error: err });
  }
});

export default router;