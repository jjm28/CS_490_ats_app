import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { fetchAllPeerGroups,fetchAllmyPeerGroupMembership, JoinPeerGroup,LeavePeerGroup, canManageGroup,createGroup,updatePeerGroup,DeleteGroup} from '../services/peerGroups.service.js';
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
    console.log(result)
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

// PATCH /api/peer-groups/:groupId
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
console.log(response)


    res.json(response);
  } catch (err) {
    console.error("Error updating peer group:", err);
    res.status(500).json({ error: "Server error updating group" });
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
export default router;
