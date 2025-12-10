import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";

function toObjectId(id) {
  try {
    // if it's already an ObjectId, skip
    if (id && typeof id === "object" && id._bsontype === "ObjectId") return id;
    return new ObjectId(id);
  } catch {
    // fallback for plain string ids
    return id;
  }
}

async function isTeamMember(db, teamId, requesterId) {
  const teamObjId = toObjectId(teamId);
  const userObjId = toObjectId(requesterId);

  const query = {
    teamId: { $in: [teamObjId, teamId].filter(Boolean) },
    userId: { $in: [requesterId, userObjId].filter(Boolean) },
    status: "active",
  };

  return db.collection("teamMemberships").findOne(query);
}

export async function sendTeamMessage({ teamId, senderId, text }) {
  const db = getDb();

  // ✅ Verify sender exists in users collection
  const user = await db
    .collection("users")
    .findOne({ $or: [{ userId: senderId }, { _id: senderId }] });
  if (!user) throw new Error(`User not found for senderId=${senderId}`);

  // ✅ Verify sender is a team member
  const isMember = await isTeamMember(db, teamId, senderId);
  if (!isMember) throw new Error("Team not found or access denied.");

  if (!text || !text.trim()) throw new Error("Message text is required.");

  const now = new Date();
  const message = {
    teamId,
    senderId,
    senderName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    text: text.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("teamMessages").insertOne(message);
  return message;
}

/**
 * 💬 Get all messages for a given team
 */
export async function getTeamMessages({ teamId, requesterId }) {
  const db = getDb();

  // ✅ Verify requester is a team member
  const isMember = await isTeamMember(db, teamId, requesterId);
  if (!isMember) throw new Error("Team not found or access denied.");

  const matchStage = {
    $match: {
      $or: [
        { teamId }, // string
        { teamId: new ObjectId(teamId) }, // ObjectId
      ],
    },
  };

  const msgs = await db
    .collection("teamMessages")
    .aggregate([
      matchStage,
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: "users",
          let: { sid: "$senderId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$userId", "$$sid"] },
                    { $eq: [{ $toString: "$_id" }, "$$sid"] },
                  ],
                },
              },
            },
            { $project: { email: 1, firstName: 1, lastName: 1 } },
          ],
          as: "sender",
        },
      },
      {
        // ✅ Flatten sender safely
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
        },
      },
      {
        // ✅ Ensure everything is a string before concatenation
        $addFields: {
          senderEmail: { $ifNull: ["$sender.email", ""] },
          senderFirst: {
            $cond: [
              { $isArray: "$sender.firstName" },
              { $arrayElemAt: ["$sender.firstName", 0] },
              { $ifNull: ["$sender.firstName", ""] },
            ],
          },
          senderLast: {
            $cond: [
              { $isArray: "$sender.lastName" },
              { $arrayElemAt: ["$sender.lastName", 0] },
              { $ifNull: ["$sender.lastName", ""] },
            ],
          },
        },
      },
      {
        // ✅ Safely concatenate strings only
        $addFields: {
          senderName: {
            $trim: {
              input: { $concat: ["$senderFirst", " ", "$senderLast"] },
            },
          },
        },
      },
      {
        $project: {
          teamId: 1,
          text: 1,
          createdAt: 1,
          updatedAt: 1,
          senderEmail: 1,
          senderName: 1,
        },
      },
    ])
    .toArray();

  return msgs;
}