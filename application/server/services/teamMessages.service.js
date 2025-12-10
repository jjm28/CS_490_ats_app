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

//SEND TEAM MESSAGES
export async function sendTeamMessage({
  teamId,
  senderId,
  text,
  scope,
  recipientIds,
}) {
  const db = getDb();

  const senderStr =
    senderId && senderId.toString ? senderId.toString() : String(senderId);

  // ✅ Verify sender exists in users collection
  const user = await db.collection("users").findOne({
    $or: [{ userId: senderStr }, { _id: toObjectId(senderStr) }],
  });
  if (!user) throw new Error(`User not found for senderId=${senderStr}`);

  // ✅ Verify sender is a team member
  const isMember = await isTeamMember(db, teamId, senderStr);
  if (!isMember) throw new Error("Team not found or access denied.");

  if (!text || !text.trim()) throw new Error("Message text is required.");

  // 🔽 Normalize & validate recipients (must be active team members, not self)
  const rawRecipients = Array.isArray(recipientIds) ? recipientIds : [];
  const candidateIds = rawRecipients
    .map((r) => (r && r.toString ? r.toString() : String(r)))
    .filter(Boolean);

  let cleanRecipients = [];
  if (candidateIds.length) {
    const teamObjId = toObjectId(teamId);
    const membershipDocs = await db
      .collection("teamMemberships")
      .find({
        teamId: { $in: [teamObjId, teamId].filter(Boolean) },
        userId: { $in: candidateIds },
        status: "active",
      })
      .toArray();

    const validIds = new Set(
      membershipDocs
        .map((m) =>
          m.userId && m.userId.toString ? m.userId.toString() : m.userId
        )
        .filter(Boolean)
    );

    cleanRecipients = candidateIds.filter(
      (id) => id !== senderStr && validIds.has(id)
    );
  }

  const finalScope =
    cleanRecipients.length > 0 || scope === "direct" ? "direct" : "team";

  const now = new Date();
  const message = {
    teamId,
    senderId: senderStr,
    senderName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    senderEmail: user.email || null,
    text: text.trim(),
    scope: finalScope, // "team" or "direct"
    recipientIds: cleanRecipients, // [] for team messages
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

  const requesterStr =
    requesterId && requesterId.toString
      ? requesterId.toString()
      : String(requesterId);

  // ✅ Verify requester is a team member
  const isMember = await isTeamMember(db, teamId, requesterStr);
  if (!isMember) throw new Error("Team not found or access denied.");

  const matchStage = {
    $match: {
      $and: [
        {
          $or: [
            { teamId }, // string
            { teamId: new ObjectId(teamId) }, // ObjectId
          ],
        },
        {
          // ✅ Visibility:
          //   - All "team" (or legacy) messages
          //   - "direct" messages where requester is sender OR recipient
          $or: [
            { scope: { $in: [null, "team"] } },
            {
              scope: "direct",
              $or: [
                { senderId: requesterStr },
                { recipientIds: { $in: [requesterStr] } },
              ],
            },
          ],
        },
      ],
    },
  };

  const msgs = await db
    .collection("teamMessages")
    .aggregate([
      matchStage,
      // 🔽 newest first
      { $sort: { createdAt: -1 } },
      // 🔢 cap to latest 50
      { $limit: 50 },
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
        $addFields: {
          sender: { $arrayElemAt: ["$sender", 0] },
        },
      },
      {
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
          senderId: 1, 
          senderName: 1,
          scope: 1,
          recipientIds: 1,
        },
      },
      // 🔽 re-sort oldest → newest for UI
      { $sort: { createdAt: 1 } },
    ])
    .toArray();

  const members = await getTeamMembersForChat(db, teamId);

  return {
    messages: msgs,
    members,
    currentUserId: requesterStr,
  };
}

async function getTeamMembersForChat(db, teamId) {
  const teamObjId = toObjectId(teamId);

  // All active memberships on this team
  const memberships = await db
    .collection("teamMemberships")
    .find({
      teamId: { $in: [teamObjId, teamId].filter(Boolean) },
      status: "active",
    })
    .toArray();

  if (!memberships.length) return [];

  // Unique string userIds
  const rawIds = memberships
    .map((m) =>
      m.userId && m.userId.toString ? m.userId.toString() : m.userId
    )
    .filter(Boolean);

  const uniqIds = [...new Set(rawIds)];
  const userObjIds = uniqIds.map((id) => toObjectId(id));

  // Fetch user docs to build names/emails
  const users = await db
    .collection("users")
    .find({
      $or: [
        { userId: { $in: uniqIds } },
        { _id: { $in: userObjIds } },
      ],
    })
    .toArray();

  return memberships.map((m) => {
    const idStr =
      m.userId && m.userId.toString ? m.userId.toString() : m.userId;

    const u =
      users.find(
        (u) =>
          (u.userId && u.userId.toString() === idStr) ||
          (u._id && u._id.toString() === idStr)
      ) || {};

    const name =
      `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
      u.email ||
      idStr;

    return {
      id: idStr,
      name,
      email: u.email || null,
      roles: m.roles || [],
    };
  });
}