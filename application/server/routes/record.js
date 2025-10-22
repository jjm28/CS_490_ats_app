import express from "express";
import { getDb } from "../db/connection.js"; // ✅ import named function
import { ObjectId } from "mongodb";

const router = express.Router();

// ✅ GET all records
router.get("/", async (req, res) => {
  try {
    const db = getDb(); // ✅ get active database
    const collection = db.collection("records");
    const results = await collection.find({}).toArray();
    res.status(200).send(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving records");
  }
});

// ✅ GET single record by ID
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const collection = db.collection("records");
    const query = { _id: new ObjectId(req.params.id) };
    const result = await collection.findOne(query);

    if (!result) res.status(404).send("Record not found");
    else res.status(200).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving record");
  }
});

// ✅ POST create new record
router.post("/", async (req, res) => {
  try {
    const db = getDb();
    const newDocument = {
      name: req.body.name,
      position: req.body.position,
      level: req.body.level,
    };
    const collection = db.collection("records");
    const result = await collection.insertOne(newDocument);
    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});

// ✅ PATCH update record by ID
router.patch("/:id", async (req, res) => {
  try {
    const db = getDb();
    const query = { _id: new ObjectId(req.params.id) };
    const updates = {
      $set: {
        name: req.body.name,
        position: req.body.position,
        level: req.body.level,
      },
    };

    const collection = db.collection("records");
    const result = await collection.updateOne(query, updates);
    res.status(200).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating record");
  }
});

// ✅ DELETE record by ID
router.delete("/:id", async (req, res) => {
  try {
    const db = getDb();
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("records");
    const result = await collection.deleteOne(query);

    res.status(200).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting record");
  }
});

export default router;
