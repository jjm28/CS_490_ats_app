//services/sharedDocs.service.js
import mongoose from "mongoose";
import Resume from "../models/resume.js";
import Coverletter from "../models/coverletters.js";

/**
 * Add a new comment to a shared document (resume or cover letter)
 */
export async function addSharedDocComment(sharedId, type, text, userId) {
  try {
    const model = type === "resume" ? Resume : Coverletter;

    const comment = {
      _id: new mongoose.Types.ObjectId(),
      text,
      userId,
      createdAt: new Date(),
      resolved: false, // ⬅ ensure comment starts unresolved
    };

    const doc = await model.findByIdAndUpdate(
      sharedId,
      { $push: { comments: comment } },
      { new: true }
    );

    if (!doc) throw new Error(`${type} not found`);

    return comment;
  } catch (err) {
    console.error("Error adding shared doc comment:", err);
    throw err;
  }
}

/**
 * Resolve an existing comment on a shared document
 */
export async function resolveSharedDocComment(sharedId, type, commentId) {
  try {
    const model = type === "resume" ? Resume : Coverletter;
    const doc = await model.findOneAndUpdate(
      { _id: sharedId, "comments._id": commentId },
      { $set: { "comments.$.resolved": true } },
      { new: true }
    );
    return doc;
  } catch (err) {
    console.error("Error resolving shared doc comment:", err);
    throw err;
  }
}

/**
 * Mark all comments as resolved when the document is re-shared
 */
export async function markAllCommentsResolved(sharedId, type) {
  try {
    const model = type === "resume" ? Resume : Coverletter;
    await model.updateOne(
      { _id: sharedId },
      { $set: { "comments.$[].resolved": true } }
    );
  } catch (err) {
    console.error("Error marking comments resolved:", err);
    throw err;
  }
}

/**
 * Export document data for review/download
 */
export async function exportSharedDoc(sharedId, type) {
  try {
    const model = type === "resume" ? Resume : Coverletter;
    const doc = await model.findById(sharedId);
    if (!doc) throw new Error("Document not found");
    return { [type]: doc };
  } catch (err) {
    console.error("Error exporting shared doc:", err);
    throw err;
  }
}
