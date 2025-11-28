import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { fetchAllPeerGroups,fetchAllmyPeerGroupMembership, JoinPeerGroup,LeavePeerGroup} from '../services/peerGroups.service.js';
import { ObjectId } from 'mongodb';
import { file } from 'zod';



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

    res.json({ groups, memberships });
  } catch (err) {
    console.error("Error fetching my peer groups:", err);
    res.status(500).json({ error: "Server error fetching my peer groups" });
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
router.post("/:groupId/leave",  async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId =  req.query;

    const success = await LeavePeerGroup(userId,groupId)

    res.json({ ok: success });
  } catch (err) {
    console.error("Error leaving peer group:", err);
    res.status(500).json({ error: "Server error leaving group" });
  }
});


export default router;
