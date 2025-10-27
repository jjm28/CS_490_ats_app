import express from "express";
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
const router = express.Router();

//Get all education entries
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const education = await db.collection("education").find({}).toArray();
    res.status(200).json(education);
  } catch (err) {
    res.status(500).json({ message: "Error fetching education", error: err });
  }
});

//Add a new education entry
router.post("/", async (req, res) => {
  try {
    const {
      institution,
      degree,
      fieldOfStudy,
      graduationDate,
      gpa,
      isPrivateGpa,
      currentlyEnrolled,
      educationLevel,
      achievements,
    } = req.body;

    if (!institution || !degree || !fieldOfStudy || !educationLevel) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = getDb();
    const newEducation = {
      institution,
      degree,
      fieldOfStudy,
      graduationDate,
      gpa,
      isPrivateGpa,
      currentlyEnrolled,
      educationLevel,
      achievements,
    };

    const result = await db.collection("education").insertOne(newEducation);
    res.status(201).json({ _id: result.insertedId, ...newEducation });
  } catch (err) {
    res.status(500).json({ message: "Error adding education", error: err });
  }
});

//Update education entry
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedEducation = req.body;
    const db = getDb();
    const result = await db
      .collection("education")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedEducation });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Education entry not found" });
    }
    res.status(200).json({ message: "Education updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating education", error: err });
  }
});

//Delete education entry
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const db = getDb();
    const result = await db
      .collection("education")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Education entry not found" });
    }
    res.status(200).json({ message: "Education deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting education", error: err });
  }
});

export default router;