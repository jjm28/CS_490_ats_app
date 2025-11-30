import express, { response } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { 
  fetchAllPeerGroups,
  fetchAllmyPeerGroupMembership, 
  JoinPeerGroup,
  LeavePeerGroup, 
  canManageGroup,
  createGroup,updatePeerGroup,DeleteGroup,fetchAllPeerGroupMembership,
  updatePeerGroupMembership,
createGroupPost,
fetchposts,
fetchAllChallanges,
createChallenge,
joinChallenge,
incrementprogress,
leaveChallenge,
fetchleaderboard,clearHighlight,
fetchsharedOpp,
shareOpp,  expressorupdateInterest,
getinterstedCandidate,getGroupEvents,createPeerGroupEvent,rsvpToEvent,getNetworkingImpact,createJobFromPeerOpportunity
} from '../services/peerGroups.service.js';
import { ObjectId } from 'mongodb';
import { file } from 'zod';
import { getAllJobs } from '../services/jobs.service.js';


const router = express.Router();

// router.use(verifyJWT);



// GET /api/peer-groups/
router.get("/", async (req, res) => {
  try {
    const { industry, role } = req.query;

    const filter = {};
    if (industry) filter.industry = industry;
    if (role) filter.role = role;
    const groups = await fetchAllPeerGroups(filter)
     
    res.json(groups);
  } catch (err) {
    console.error("Error fetching peer groups:", err);
    res.status(500).json({ error: "Server error fetching peer groups" });
  }
});

// GET /api/peer-groups/my : Returns groups + memberships for the current user

router.get("/my", async (req, res) => {
  try {
    const { userId } = req.query
    
    const memberships = await fetchAllmyPeerGroupMembership(userId)
    
    const groupIds = memberships.map((m) => new ObjectId( m.groupId));
    const filter = { _id: { $in: groupIds } }
    const groups = await fetchAllPeerGroups(filter)
    const job =  await getAllJobs({userId})[0]
    const userProfile = {
      targetRole: job?.jobTitle || null,
      targetIndustry: job?.industry || null,
    };
    res.json({ groups, memberships ,userProfile});
  } catch (err) {
    console.error("Error fetching my peer groups:", err);
    res.status(500).json({ error: "Server error fetching my peer groups" });
  }
});

// GET /api/peer-groups/:groupId/posts?limit=20
// Return posts with privacy-aware persona info
router.get("/posts",  async (req, res) => {
  try {
    const { groupId } = req.query;
     const { userId } = req.query
    const limit = Math.min(parseInt(req.query.limit || "30", 10), 100);

  const result = await fetchposts({groupId, limit,userId})

    res.json({ posts: result });
  } catch (err) {
    console.error("Error fetching peer group posts:", err);
    res.status(500).json({ error: "Server error fetching posts" });
  }
});


// POST /api/peer-groups
router.post("/",  async (req, res) => {
  try {
    
    const { userId, name, description, industry, role, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

     const response = await createGroup( { userId, name, description, industry, role, tags })
    
    res.status(201).json(response);
  } catch (err) {
    console.error("Error creating peer group:", err);
    res.status(500).json({ error: "Server error creating group" });
  }
});


// POST /api/peer-groups/:groupId/join

router.post("/join",  async (req, res) => {
  try {
    const { groupId } = req.query;
    const {userId} = req.query;
  

    const result = await JoinPeerGroup(userId, groupId)
    const  membership = result
    res.json({ groupId, membership });
  } catch (err) {
    console.error("Error joining peer group:", err);
    
    res.status(500).json({ error: "Server error joining group" });
  }
});

/**
 * POST /api/peer-groups/:groupId/leave
 */
router.post("/leave",  async (req, res) => {
  try {
    const { groupId } = req.query;
    const {userId} =  req.query;

    const success = await LeavePeerGroup(userId,groupId)

    res.json({ ok: success });
  } catch (err) {
    console.error("Error leaving peer group:", err);
    res.status(500).json({ error: "Server error leaving group" });
  }
});


router.post("/posts",  async (req, res) => {
  try {
   const { groupId } = req.query;
    const {userId} =  req.query;
    const { content, type } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const membership = await fetchAllPeerGroupMembership({ userId,groupId})
    if (!membership) {
      return res
        .status(403)
        .json({ error: "You must join this group before posting" });
    }

    const post = await createGroupPost({groupId,userId,content,type})

    res.status(201).json(post);
  } catch (err) {
    console.error("Error creating peer group post:", err);
    res.status(500).json({ error: "Server error creating post" });
  }
});

// PATCH /api/peer-groups/
router.patch("/",  async (req, res) => {
  try {
      const { groupId } = req.query;
    const {userId} = req.query;
    const groups = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
    const group =  groups[0]
    if (!group) return res.status(404).json({ error: "Group not found" });
 
    const allowed = await canManageGroup(userId, group);
    if (!allowed) return res.status(403).json({ error: "Not allowed" });

    const { name, description, industry, role, tags } = req.body;
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (industry !== undefined) group.industry = industry;
    if (role !== undefined) group.role = role;
    if (tags !== undefined) group.tags = Array.isArray(tags) ? tags : [];
    const response = await updatePeerGroup({_id: new ObjectId(groupId)},group,undefined,    { returnDocument: "after" })


    res.json(response);
  } catch (err) {
    console.error("Error updating peer group:", err);
    res.status(500).json({ error: "Server error updating group" });
  }
});

router.patch("/membership/privacy",  async (req, res) => {
  try {
      const { groupId } = req.query;
    const {userId} = req.query;
    const {
      interactionLevel,
      alias,
      allowDirectMessages,
      showProfileLink,
      showRealNameInGroup,
    } = req.body;

    const memberships = await fetchAllPeerGroupMembership({ userId, groupId })
    const membership = memberships[0]
    if (!membership) {
      return res.status(404).json({ error: "Membership not found for this group" });
    }

    if (interactionLevel !== undefined) membership.interactionLevel = interactionLevel;
    if (alias !== undefined) membership.alias = alias;
    if (allowDirectMessages !== undefined)
      membership.allowDirectMessages = !!allowDirectMessages;
    if (showProfileLink !== undefined)
      membership.showProfileLink = !!showProfileLink;
    if (showRealNameInGroup !== undefined)
      membership.showRealNameInGroup = !!showRealNameInGroup;
 const response = await updatePeerGroupMembership({ userId, groupId },membership,undefined,    { returnDocument: "after" })

    res.json(response);
  } catch (err) {
    console.error("Error updating membership privacy:", err);
    res.status(500).json({ error: "Server error updating membership privacy" });
  }
});

// DELETE /api/peer-groups/:groupId
router.delete("/",  async (req, res) => {
  try {
    const { groupId } = req.query;
    const {userId} = req.query;
    const groups = await fetchAllPeerGroups({_id: new ObjectId(groupId)})
    const group =  groups[0]
    if (!group) return res.status(404).json({ error: "Group not found" });
    
    const allowed = await canManageGroup(userId, group);
    if (!allowed) return res.status(403).json({ error: "Not allowed" });

    if (group.memberCount > 20) {
      return res
        .status(400)
        .json({ error: "Cannot delete a large group. Contact support/admin." });
    }

    const response = await DeleteGroup(groupId)

    res.json({ ok: response });
  } catch (err) {
    console.error("Error deleting peer group:", err);
    res.status(500).json({ error: "Server error deleting group" });
  }
});



// GET /api/peer-groups/:groupId
router.get("/single",  async (req, res) => {
  try {
    const { groupId } = req.query;
    const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)});
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.json(group[0]);
  } catch (err) {
    console.error("Error fetching peer group:", err);
    res.status(500).json({ error: "Server error fetching group" });
  }
});


// GET /api/peer-groups/challenges
router.get("/challenges",  async (req, res) => {
  try {
        const { groupId } = req.query;
    const {userId} = req.query;
    const group = await fetchAllPeerGroups({_id: new ObjectId(groupId)});
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const response  = await fetchAllChallanges({groupId,userId})

    res.json(response);
  } catch (err) {
    console.error("Error fetching group challenges:", err);
    res.status(500).json({ error: "Server error fetching challenges" });
  }
});



// POST /api/peer-groups/:groupId/challenges
router.post("/challenges",  async (req, res) => {
  try {
      const { groupId } = req.query;
    const {userId} = req.query;
    
    const {
      title,
      description,
      type,
      targetValue,
      unitLabel,
      startDate,
      endDate,
    } = req.body;

    if (!title || !targetValue || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const groups = await fetchAllPeerGroups({_id: new ObjectId(groupId)});
    const group = groups[0]
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const allowed = await canManageGroup(userId, group);
    if (!allowed) {
      return res.status(403).json({ error: "Not allowed to create challenges" });
    }

    const response = await createChallenge({groupId,userId,title,description,type,targetValue,unitLabel,startDate,endDate})

    res.status(201).json(response);
  } catch (err) {
    console.error("Error creating group challenge:", err);
    res.status(500).json({ error: "Server error creating challenge" });
  }
});


// POST /api/peer-groups/challenges//join
router.post("/challenges/join",  async (req, res) => {
  try {
    const { challengeId } = req.query;
    const {userId} = req.query;
 const response = await joinChallenge({challengeId,userId})


    res.json(response);
  } catch (err) {
    console.error("Error joining challenge:", err);
    res.status(500).json({ error: "Server error joining challenge" });
  }
});


// POST /api/peer-groups/challenges/:challengeId/progress
router.post("/challenges/progress", async (req, res) => {
  try {
    const { challengeId, userId } = req.query;
    const { delta, note } = req.body;

    const increment = Number(delta || 0);
    if (!increment || isNaN(increment)) {
      return res
        .status(400)
        .json({ error: "delta (number of actions) is required" });
    }

    const participation = await incrementprogress({
      challengeId,
      userId,
      note,
      increment,
    });

    res.json(participation);
  } catch (err) {
    console.error("Error updating challenge progress:", err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
});



router.delete(  "/challenges/participation",  async (req, res) => {
    try {
            const { challengeId } = req.query;
      const {userId} = req.query;

      await leaveChallenge({challengeId,userId})
      res.json({ ok: true });
    } catch (err) {
      console.error("Error leaving challenge:", err);
      res.status(500).json({ error: "Server error leaving challenge" });
    }
  }
);



// GET /api/peer-groups/challenges/:challengeId/leaderboard
router.get("/challenges/leaderboard",  async (req, res) => {
  try {
      const { challengeId } = req.query;
      const {userId} = req.query;

      const respone = await fetchleaderboard({challengeId,userId})

    res.json({ entries: respone });
  } catch (err) {
    console.error("Error fetching challenge leaderboard:", err);
    res.status(500).json({ error: "Server error fetching leaderboard" });
  }
});


// PATCH /api/peer-groups/:groupId/posts/:postId/highlight
router.patch(  "/posts/highlight",  async (req, res) => {
    try {
      const { groupId, postId } = req.query;
      const { highlightType } = req.body; // "success" | "learning" | null
          const {userId} = req.query;

      const response = await clearHighlight({groupId,postId,highlightType,userId})
      res.json(response)
    } catch (err) {
      console.error("Error updating post highlight:", err);
      res.status(500).json({ error: "Server error updating highlight" });
    }
  }
);


// GET /api/peer-groups/:groupId/opportunities
router.get("/opportunities",  async (req, res) => {
  try {
    const { groupId } = req.query;
    const {userId} = req.query;
    
    const response = await fetchsharedOpp({groupId,userId})
    res.json(response)
  } catch (err) {
    console.error("Error fetching opportunities:", err);
    res.status(500).json({ error: "Server error fetching opportunities" });
  }
});


// POST /api/peer-groups/:groupId/opportunities
router.post("/opportunities",  async (req, res) => {
  try {
    const { groupId } = req.query;
    const {userId} = req.query;
    const {
      title,
      company,
      location,
      jobUrl,
      source,
      referralAvailable,
      maxReferrals,
      tags,
      notes,
      expiresAt,
    } = req.body;

    if (!title || !company) {
      return res.status(400).json({ error: "Title and company are required" });
    }
     const response =  await shareOpp({groupId,userId,      title,
      company,
      location,
      jobUrl,
      source,
      referralAvailable,
      maxReferrals,
      tags,
      notes,
      expiresAt}) 

    res.status(201).json(response);
  } catch (err) {
    console.error("Error creating opportunity:", err);
    res.status(500).json({ error: "Server error creating opportunity" });
  }
});


// POST /api/peer-groups/opportunities/:opportunityId/interest
router.post(  "/opportunities/interest", async (req, res) => {
    try {
      const { opportunityId } = req.query;
      const {userId} = req.query;
      const { note, status } = req.body;

      const response = await expressorupdateInterest({opportunityId,userId,note,status})
      res.json(response);
    } catch (err) {
      console.error("Error expressing interest:", err);
      res.status(500).json({ error: "Server error expressing interest" });
    }
  }
);


// GET /api/peer-groups/opportunities/:opportunityId/interests
router.get(  "/opportunities/interests",  async (req, res) => {
    try {
      const { opportunityId } = req.query;
      const {userId} = req.query;

      const response = await getinterstedCandidate({opportunityId,userId});
      res.json( response );
    } catch (err) {
      console.error("Error fetching opportunity interests:", err);
      res.status(500).json({ error: "Server error fetching interests" });
    }
  }
);

// GET /api/peer-groups/events?groupId=...&userId=...
router.get("/events", async (req, res) => {
  try {
    const { groupId, userId } = req.query;

    const data = await getGroupEvents({
      groupId,
      userId,
    });

    res.json(data);
  } catch (err) {
    console.error("Error fetching group events:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
});

// POST /api/peer-groups/events?groupId=...&userId=...
router.post("/events", async (req, res) => {
  try {
    const { groupId, userId } = req.query;
    const {
      title,
      description,
      type,
      startTime,
      endTime,
      locationType,
      locationText,
      joinUrl,
      maxAttendees,
    } = req.body;

    const event = await createPeerGroupEvent({
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
    });

    res.status(201).json(event);
  } catch (err) {
    console.error("Error creating group event:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
});

// POST /api/peer-groups/events/rsvp?eventId=...&userId=...
router.post("/events/rsvp", async (req, res) => {
  try {
    const { eventId, userId } = req.query;
    const { status } = req.body; // "going" | "interested" | "not_going"

    const rsvp = await rsvpToEvent({
      eventId,
      userId,
      status,
    });

    res.json(rsvp);
  } catch (err) {
    console.error("Error RSVPing to event:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
});


router.get("/networking-impact", async (req, res) => {
  try {
    const { groupId, userId } = req.query;

    const data = await getNetworkingImpact({ groupId, userId });
    console.log(data)
    res.json(data);
  } catch (err) {
    console.error("Error fetching networking impact:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
});


// POST /api/jobs/from-peer-opportunity?userId=...&groupId=...&opportunityId=...
router.post("/from-peer-opportunity", async (req, res) => {
  try {
    const { userId, groupId, opportunityId } = req.query;

    const job = await createJobFromPeerOpportunity({
      userId,
      groupId,
      opportunityId,
    });

    res.status(201).json(job);
  } catch (err) {
    console.error("Error creating job from peer opportunity:", err);
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message || "Server error" });
  }
});

export default router;