import express from "express";
import db from "../db/connection.js";
import { ObjectId } from "mongodb";
const router = express.Router();

//Get all skills
router.get("/", async (req, res) => {
  try {
    const skills = await db.collection("skills").find({}).toArray();
    res.status(200).json(skills);
  } catch (err) {
    res.status(500).json({ message: "Error fetching skills", error: err });
  }
});

//Add a new skill
router.post("/", async (req, res) => {
  try {
    const { name, category, proficiency } = req.body;
    if (!name || !category || !proficiency) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    //Prevent duplicates
    const existingSkill = await db.collection("skills").findOne({ name });
    if (existingSkill) {
      return res.status(409).json({ message: "Skill already exists" });
    }
    const newSkill = { name, category, proficiency };
    const result = await db.collection("skills").insertOne(newSkill);
    res.status(201).json({ _id: result.insertedId, ...newSkill });
  } catch (err) {
    res.status(500).json({ message: "Error adding skill", error: err });
  }
});

//Update skill proficiency
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedSkill = req.body;
    const result = await db
      .collection("skills")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedSkill });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Skill not found" });
    }
    res.status(200).json({ message: "Skill updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating skill", error: err });
  }
});

//Delete skill
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db
      .collection("skills")
      .deleteOne  ({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Skill not found" });
    }
    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting skill", error: err });
  }
});

export default router;