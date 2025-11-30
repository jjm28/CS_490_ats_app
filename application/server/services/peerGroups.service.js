import { getDb } from '../db/connection.js';
import { ObjectId, ReturnDocument, Timestamp } from "mongodb";
import 'dotenv/config';
import { file, object } from 'zod';
import PeerGroup from "../models/PeerGroup.js";
import PeerGroupMembership from "../models/PeerGroupMembership.js"
import PeerGroupPost from '../models/PeerGroupPost.js';
import GroupChallenge from '../models/GroupChallenge.js'
import GroupChallengeParticipation from '../models/GroupChallengeParticipation.js';
import PeerOpportunity from '../models/PeerOpportunity.js';
import PeerOpportunityInterest from '../models/PeerOpportunityInterest.js';
import PeerGroupEvent from "../models/PeerGroupEvent.js";
import PeerGroupEventRsvp from "../models/PeerGroupEventRsvp.js";
export async function fetchAllPeerGroups(filter) {
    
  let result;
   result = await PeerGroup
    .find(    filter  )
    .lean()
  return result ;
}


export async function fetchAllPeerGroupMembership(filter) {
    
  let result;
   result = await PeerGroupMembership
    .find(    filter  )
    .lean()
  return result ;
}

export async function updatePeerGroup(filter,set=undefined,inc=undefined,options=undefined) {
    const membership = await PeerGroup
    .findOneAndUpdate(
      filter,
      { $set: set || {}, $inc: inc|| {}},
    options || {}
    );
    return membership
}

export async function updatePeerGroupMembership(filter,set=undefined,inc=undefined,options=undefined) {
    const membership = await PeerGroupMembership
    .findOneAndUpdate(
      filter,
      { $set: set || {}, $inc: inc|| {}},
    options || {}
    );
    return membership
}

export async function fetchAllmyPeerGroupMembership(userId) {
  const db = getDb();
  let result;
   result = await PeerGroupMembership
    .find( {userId: userId}  )
   .lean()
 

  return result ;
}



export async function JoinPeerGroup(userId, groupId) {
  const db = getDb();

 

  const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
      

   if (!group) {
      return  { error: "Group not found" };
    }

    const membership = await PeerGroupMembership
    .findOneAndUpdate(
      { userId, groupId },
      { $setOnInsert: { role: "member" } },
      { new: true, upsert: true }
    );

    if (membership.createdAt.getTime() === membership.updatedAt.getTime()) {
    const PeerGroups = await PeerGroup
    .updateOne(
      { _id: new ObjectId(groupId) },
      {$inc: { memberCount: 1 }, }
    );
       if (PeerGroups.matchedCount === 0) {
    return { message: "membership not found" };
  }
    }




  return membership

}


export async function LeavePeerGroup(userId, groupId) {
  const db = getDb();

    const membership = await 
    PeerGroupMembership
    .findOneAndDelete({ userId, groupId })
    if (membership) {
      await updatePeerGroup(  { _id: new ObjectId(groupId) },   undefined,{ memberCount: -1 },  undefined )
      
    }
  return true


}

export async function DeleteGroup( groupId) {
    await PeerGroupMembership.deleteMany({ groupId: groupId });
    await PeerGroup.deleteOne({ _id: new ObjectId(groupId )});
   
  return true


}


export async function canManageGroup(user, group) {
  if (!group) return false;
  if (!user) return false;
  if (group.createdBy == user) return true;
  return false;
}


export async function createGroup( { userId, name, description, industry, role, tags }) {
    const group = await PeerGroup.create({
      name,
      description: description || "",
      industry: industry || null,
      role: role || null,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: userId,
      memberCount: 1, // creator is first member
    });

    // creator becomes owner member
    const membership = await PeerGroupMembership.create({
      userId:userId,
      groupId: group._id,
      role: "owner",
      showRealNameInGroup: true,
      receiveOpportunityAlerts: true,
    });

    return {group,membership}
}


export async function createGroupPost( { groupId,userId, content, type }) {

  const post = PeerGroupPost.create({
      groupId,
      authorId: userId,
      content: content.trim(),
      type: type || "insight",
    });


    return post
}

export async function latestposts( { groupId,limit }) {

 const posts = await PeerGroupPost.find({
      groupId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return posts
}


export async function fetchposts( { groupId ,limit, userId}) {
const db = getDb()
  const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
    if (!group) {
     throw new Error("Group not found");
    }
    // get latest posts

    const posts = await latestposts({groupId, limit})

    if (posts.length === 0) {
      return []
    }
    const authorIds = [...new Set(posts.map(p => p.authorId))];


    const memberships = await PeerGroupMembership.find({
      groupId,
      userId: { $in: authorIds },
    }).lean();
  
    const users = await db.collection("profiles").find({ userId: { $in: authorIds } },    { projection: {userId: 1,fullName:1, headline:1, photoUrl:1} })
    
      .toArray();

    const membershipByKey = new Map();
    memberships.forEach((m) => {
      membershipByKey.set(`${m.userId}`, m);
    });

    const userById = new Map();
    users.forEach((u) => {
      userById.set(`${u.userId}`, u);
    });

    function buildPersona(user, membership) {
      if (!membership || !user) {
        return {
          mode: "anonymous",
          displayName: "Anonymous",
          canViewProfile: false,
        };
      }

      const interactionLevel = membership.interactionLevel || "public";

      if (interactionLevel === "anonymous") {
        return {
          mode: "anonymous",
          displayName: "Anonymous",
          canViewProfile: false,
        };
      }

      if (interactionLevel === "alias") {
        return {
          mode: "alias",
          displayName: membership.alias || "Anonymous",
          canViewProfile: false,
        };
      }

      // public
      const displayName = user.fullName || user.name || "Member";
      return {
        mode: "public",
        displayName,
        headline: user.headline || "",
        canViewProfile:
          membership.showProfileLink !== undefined
            ? membership.showProfileLink
            : true,
      };
    }

    const result = posts.map((p) => {
      const m = membershipByKey.get(`${p.authorId}`);
      const u = userById.get(`${p.authorId}`);
      const persona = buildPersona(u, m);

      return {
        _id: p._id,
        groupId: p.groupId,
        content: p.content,
        type: p.type,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        persona,
        highlightType: p.highlightType || null,  
          isMine: String(p.authorId) === String(userId),
      };
    });

    return result
}
export async function fetchAllChallanges({groupId,userId}) {

const challenges = await GroupChallenge.find({ groupId })
      .sort({ startDate: -1 })
      .lean();

    if (challenges.length === 0) {
      return { challenges: [], myParticipations: [], stats: {} };
    }

    const challengeIds = challenges.map((c) => String(c._id));

    // participations for THIS user
    const myParticipations = await GroupChallengeParticipation.find({
      userId,
      challengeId: { $in: challengeIds },
    }).lean();

    // aggregate overall stats per challenge
    const agg = await GroupChallengeParticipation.aggregate([
      { $match: { challengeId: { $in: challengeIds } } },
      {
        $group: {
          _id: "$challengeId",
          participantCount: { $sum: 1 },
          totalProgress: { $sum: "$progressValue" },
        },
      },
    ]);

    const stats = {};
    agg.forEach((row) => {
      stats[String(row._id)] = {
        participantCount: row.participantCount,
        totalProgress: row.totalProgress,
      };
    });
    return {
      challenges,
      myParticipations,
      stats,
    }
}



 

export async function createChallenge({groupId,userId,title,description,type,targetValue,unitLabel,startDate,endDate}) {

    const challenge = await GroupChallenge.create({
      groupId,
      createdBy: userId,
      title: title.trim(),
      description: (description || "").trim(),
      type: type || "applications",
      targetValue: Number(targetValue),
      unitLabel: unitLabel || "actions",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    });

    return challenge
}

export async function joinChallenge({challengeId,userId}) {
    
    const challenge = await GroupChallenge.findById(challengeId);
    if (!challenge) {
      throw new Error("Challenge not found")
    }

    const membership = await PeerGroupMembership.findOne({
      groupId: challenge.groupId,
      userId,
    });

    if (!membership) {
       throw new Error("You must be a member of this group to join challenges");
    }

    let participation = await GroupChallengeParticipation.findOne({
      challengeId,
      userId,
    });

    if (!participation) {
      participation = await GroupChallengeParticipation.create({
        challengeId,
        userId,
        progressValue: 0,
      });
    }

    return participation
}




export async function incrementprogress({ challengeId, userId, note, increment }) {
  const challenge = await GroupChallenge.findById(challengeId);
  if (!challenge) {
    const err = new Error("Challenge not found");
    err.status = 404;
    throw err;
  }

  const membership = await PeerGroupMembership.findOne({
    groupId: challenge.groupId,
    userId,
  });

  if (!membership) {
    const err = new Error(
      "You must be a member of this group to update progress"
    );
    err.status = 403;
    throw err;
  }

  const participation =
    (await GroupChallengeParticipation.findOne({
      challengeId,
      userId,
    })) ||
    (await GroupChallengeParticipation.create({
      challengeId,
      userId,
      progressValue: 0,
    }));

  participation.progressValue += increment;
  participation.lastUpdateAt = new Date();
  if (note) participation.lastNote = note;
  await participation.save();

  return participation;
}



export async function leaveChallenge({challengeId,userId}) {
    
      const participation = await GroupChallengeParticipation.findOne({
        challengeId,
        userId,
      });

      if (!participation) {
        throw new Error("Participation not found" );
      }

      await participation.deleteOne();
}


export async function fetchleaderboard({challengeId,userId}) {
    const db = getDb()
   
    const challenge = await GroupChallenge.findById(challengeId);
    if (!challenge) {
      throw new Error("Challenge not found" );
    }

    const participations = await GroupChallengeParticipation.find({
      challengeId,
    })
      .sort({ progressValue: -1, lastUpdateAt: 1 })
      .limit(10)
      .lean();

    if (participations.length === 0) {
      return [] ;
    }

    const userIds = [
      ...new Set(participations.map((p) => String(p.userId))),
    ].map((id) =>id);
    const memberships = await PeerGroupMembership.find({
      groupId: challenge.groupId,
      userId: { $in: userIds },
    }).lean();
    
    const users = await db.collection("profiles").find({ userId: { $in: userIds } },    { projection: {userId: 1,fullName:1, headline:1, photoUrl:1} }).toArray();



    const membershipByUser = new Map();
    memberships.forEach((m) => membershipByUser.set(String(m.userId), m));

    const userById = new Map();
    users.forEach((u) => userById.set(String(u.userId), u));

    function buildPersona(user, membership) {
      if (!membership || !user) {
        return {
          mode: "anonymous",
          displayName: "Anonymous",
        };
      }

      const interactionLevel = membership.interactionLevel || "public";

      if (interactionLevel === "anonymous") {
        return {
          mode: "anonymous",
          displayName: "Anonymous",
        };
      }

      if (interactionLevel === "alias") {
        return {
          mode: "alias",
          displayName: membership.alias || "Anonymous",
        };
      }

      const displayName = user.fullName || user.name || "Member";
      return {
        mode: "public",
        displayName,
        headline: user.headline || "",
      };
    }

    const entries = participations.map((p) => {
      const u = userById.get(String(p.userId));
      const m = membershipByUser.get(String(p.userId));
      const persona = buildPersona(u, m);
      return {
        userId: String(p.userId),
        progressValue: p.progressValue,
        persona,
      };
    });
    
    return entries
}


export async function clearHighlight({groupId,postId,highlightType,userId}) {
    
            const group = await PeerGroup.findById(groupId);
      if (!group) {
         throw new Error( "Group not found" );
      }

      const post = await PeerGroupPost.findOne({ _id: new ObjectId(postId), groupId });
      if (!post) {
        throw new Error("Post not found" );
      }
    
      // Only group owner OR post author can change highlight
      const isOwner = String(group.createdBy) === String(userId);
      const isAuthor = String(post.authorId) === String(userId);

      if (!isOwner && !isAuthor) {
        throw new Error( "You are not allowed to highlight this post" );
      }

      if (
        highlightType !== "success" &&
        highlightType !== "learning" &&
        highlightType !== null
      ) {
        throw new Error( "Invalid highlight type" );
      }
      post.highlightType = highlightType;
      await post.save();
     
      return {
        _id: post._id,
        groupId: post.groupId,
        content: post.content,
        type: post.type,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        highlightType: post.highlightType,
      };

}

export async function fetchsharedOpp({groupId,userId}) {
    
  const group = await PeerGroup.findById(groupId);
    if (!group) {
      throw new Error( "Group not found" );
    }

    const opps = await PeerOpportunity.find({ groupId })
      .sort({ createdAt: -1 })
      .lean();

    if (opps.length === 0) {
      return {
        opportunities: [],
        myInterests: [],
        stats: {},
      };
    }

    const oppIds = opps.map((o) => String(o._id));

    // my interests
    const myInterests = await PeerOpportunityInterest.find({
      opportunityId: { $in: oppIds },
      userId,
    }).lean();

    // aggregate stats (interestCount, referredCount) per opportunity
    const agg = await PeerOpportunityInterest.aggregate([
      { $match: { opportunityId: { $in: oppIds } } },
      {
        $group: {
          _id: "$opportunityId",
          interestCount: { $sum: 1 },
          referredCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "referred"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = {};
    agg.forEach((row) => {
      stats[String(row._id)] = {
        interestCount: row.interestCount,
        referredCount: row.referredCount,
      };
    });
console.log(agg)
    return {
      opportunities: opps,
      myInterests,
      stats,
    };


}

export async function shareOpp({groupId,userId,      title,
      company,
      location,
      jobUrl,
      source,
      referralAvailable,
      maxReferrals,
      tags,
      notes,
      expiresAt})  {
    
    const group = await PeerGroup.findById(groupId);
    if (!group) {
      throw new Error("Group not found" );
    }
 
    const membership = await PeerGroupMembership.findOne({ groupId, userId });

    if (!membership) {
      throw new Error("You must be a member to share opportunities" );
    }

    const opp = await PeerOpportunity.create({
      groupId,
      createdBy: userId,
      title: title.trim(),
      company: company.trim(),
      location: (location || "").trim(),
      jobUrl: (jobUrl || "").trim(),
      source: (source || "").trim(),
      referralAvailable: !!referralAvailable,
      maxReferrals: maxReferrals ? Number(maxReferrals) : 0,
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      notes: (notes || "").trim(),
      status: "open",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    return opp
}


export async function  expressorupdateInterest({opportunityId,userId,note,status}) {
    
  const opp = await PeerOpportunity.findById(opportunityId);
      if (!opp) {
       throw new Error("Opportunity not found" );
      }

      const membership = await PeerGroupMembership.findOne({
        groupId: opp.groupId,
        userId,
      });
      if (!membership) {
        throw new Error( "You must be a member to express interest" );
      }

      let interest = await PeerOpportunityInterest.findOne({
        opportunityId,
        userId,
      });

      if (!interest) {
        interest = await PeerOpportunityInterest.create({
          opportunityId,
          userId,
          status: "interested",
          note: note || "",
        });
      } else {
        if (note !== undefined) interest.note = note;
        if (status && interest.status !== status) {
          // allow candidate to withdraw; referrer can change status via other endpoint later if you want
          if (status === "withdrawn" || status === "interested") {
            interest.status = status;
          }
        }
        await interest.save();
      }

    return interest
}

export async function getinterstedCandidate({opportunityId,userId}) {
    const db = getDb()
      const opp = await PeerOpportunity.findById(opportunityId);
      if (!opp) {
        throw new Error( "Opportunity not found" );
      }

      const group = await PeerGroup.findById(opp.groupId);
      if (!group) {
       throw new Error( "Group not found" );
      }

      // Only the creator (referrer) or group owner can see interest details
      const isOwner = String(group.createdBy) === String(userId);
      const isReferrer = String(opp.createdBy) === String(userId);
      if (!isOwner && !isReferrer) {
        throw new Error(  "Not allowed to view interested candidates" );
      }

      const interests = await PeerOpportunityInterest.find({
        opportunityId,
      })
        .sort({ createdAt: 1 })
        .lean();

      if (interests.length === 0) {
        return { entries: [] };
      }

      const userIds = [
        ...new Set(interests.map((i) => String(i.userId))),
      ].map((id) => id);

      const memberships = await PeerGroupMembership.find({
        groupId: opp.groupId,
        userId: { $in: userIds },
      }).lean();
    const users = await db.collection("profiles").find({ userId: { $in: userIds } },    { projection: {userId: 1,fullName:1, headline:1, photoUrl:1} }).toArray();


      const membershipByUser = new Map();
      memberships.forEach((m) => membershipByUser.set(String(m.userId), m));

      const userById = new Map();
      users.forEach((u) => userById.set(String(u.userId), u));

      function buildPersona(user, membership) {
        if (!membership || !user) {
          return { mode: "anonymous", displayName: "Anonymous" };
        }
        const interactionLevel = membership.interactionLevel || "public";
        if (interactionLevel === "anonymous") {
          return { mode: "anonymous", displayName: "Anonymous" };
        }
        if (interactionLevel === "alias") {
          return {
            mode: "alias",
            displayName: membership.alias || "Anonymous",
          };
        }
        const displayName = user.fullName || user.name || "Member";
        return {
          mode: "public",
          displayName,
          headline: user.headline || "",
        };
      }

      const entries = interests.map((i) => {
        const u = userById.get(String(i.userId));
        const m = membershipByUser.get(String(i.userId));
        const persona = buildPersona(u, m);
        return {
          _id: i._id,
          userId: String(i.userId),
          status: i.status,
          note: i.note,
          createdAt: i.createdAt,
          persona,
        };
      });
return  { entries: entries }
}

export async function getGroupEvents({ groupId, userId }) {
  if (!groupId) {
    const err = new Error("groupId is required");
    err.statusCode = 400;
    throw err;
  }

  // optional: validate group exists
  const group = await PeerGroup.findById(groupId);
  if (!group) {
    const err = new Error("Group not found");
    err.statusCode = 404;
    throw err;
  }

  // you can decide if non-members can see events; here we require membership
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }

  const membership = await PeerGroupMembership.findOne({
    groupId: groupId.toString(),
    userId: userId.toString(),
  });

  if (!membership) {
    const err = new Error("You must be a member to view events");
    err.statusCode = 403;
    throw err;
  }

  // Fetch all events for this group (you can later filter to upcoming only)
  const events = await PeerGroupEvent.find({
    groupId: groupId.toString(),
  })
    .sort({ startTime: 1 })
    .lean();

  if (events.length === 0) {
    return {
      events: [],
      myRsvps: [],
      stats: {},
    };
  }

  const eventIds = events.map((e) => e._id.toString());

  // my RSVPs
  const myRsvps = await PeerGroupEventRsvp.find({
    eventId: { $in: eventIds },
    userId: userId.toString(),
  }).lean();

  // aggregate stats for each event
  const agg = await PeerGroupEventRsvp.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $group: {
        _id: "$eventId",
        goingCount: {
          $sum: { $cond: [{ $eq: ["$status", "going"] }, 1, 0] },
        },
        interestedCount: {
          $sum: { $cond: [{ $eq: ["$status", "interested"] }, 1, 0] },
        },
      },
    },
  ]);

  const stats = {};
  agg.forEach((row) => {
    stats[row._id] = {
      goingCount: row.goingCount,
      interestedCount: row.interestedCount,
    };
  });

  return {
    events,
    myRsvps,
    stats,
  };
}


export async function createPeerGroupEvent({
  groupId,
  userId,
  title,
  description,
  type,
  startTime,
  endTime,
  locationType,
  locationText,
  joinUrl,
  maxAttendees,
}) {
  if (!groupId || !userId) {
    const err = new Error("groupId and userId are required");
    err.statusCode = 400;
    throw err;
  }
  if (!title || !startTime || !endTime) {
    const err = new Error("Title, startTime, and endTime are required");
    err.statusCode = 400;
    throw err;
  }

  const group = await PeerGroup.findById(groupId);
  if (!group) {
    const err = new Error("Group not found");
    err.statusCode = 404;
    throw err;
  }

  // Only group owner can create events (you can relax this later)
  if (group.createdBy?.toString() !== userId.toString()) {
    const err = new Error("Not allowed to create events for this group");
    err.statusCode = 403;
    throw err;
  }

  const event = await PeerGroupEvent.create({
    groupId: groupId.toString(),
    createdBy: userId.toString(),
    title: title.trim(),
    description: (description || "").trim(),
    type: type || "group_coaching",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    locationType: locationType || "online",
    locationText: (locationText || "").trim(),
    joinUrl: (joinUrl || "").trim(),
    maxAttendees: maxAttendees ? Number(maxAttendees) : 0,
    status: "scheduled",
  });

  return event;
}


export async function rsvpToEvent({ eventId, userId, status }) {
  if (!eventId || !userId) {
    const err = new Error("eventId and userId are required");
    err.statusCode = 400;
    throw err;
  }

  const event = await PeerGroupEvent.findById(eventId);
  if (!event) {
    const err = new Error("Event not found");
    err.statusCode = 404;
    throw err;
  }

  const group = await PeerGroup.findById(event.groupId);
  if (!group) {
    const err = new Error("Group not found");
    err.statusCode = 404;
    throw err;
  }

  const membership = await PeerGroupMembership.findOne({
    groupId: event.groupId.toString(),
    userId: userId.toString(),
  });

  if (!membership) {
    const err = new Error("You must be a member to RSVP to this event");
    err.statusCode = 403;
    throw err;
  }

  const allowedStatuses = ["going", "interested", "not_going"];
  const finalStatus = allowedStatuses.includes(status) ? status : "interested";

  let rsvp = await PeerGroupEventRsvp.findOne({
    eventId: event._id.toString(),
    userId: userId.toString(),
  });

  if (!rsvp) {
    rsvp = await PeerGroupEventRsvp.create({
      eventId: event._id.toString(),
      userId: userId.toString(),
      status: finalStatus,
    });
  } else {
    rsvp.status = finalStatus;
    await rsvp.save();
  }

  return rsvp;
}