import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  listCoverletterVersions, getCoverletterVersion, createCoverletterVersion,
  updateCoverletterVersion, deleteCoverletterVersion,
  setDefaultCoverletterVersion, updateCoverletterVersionContent,
  listCoverletterVersionsLinkedToJob
} from "../services/coverletter_version.service.js";

const router = express.Router();
// router.use((req,_res,next)=>{ if(!req.headers.authorization && req.cookies?.token){ req.headers.authorization = `Bearer ${req.cookies.token}`;} next(); });
// router.use(verifyJWT);
const userIdFrom = (req)=> req.query?.userid || req.body?.userid || req.user?._id || req.user?.id;

// list
router.get("/", async (req,res)=>{
  const userid = userIdFrom(req); const { coverletterid } = req.query;
  if(!userid || !coverletterid) return res.status(400).json({error:"Missing userid or coverletterid"});
  const out = await listCoverletterVersions({ userid, coverletterid });
  res.status(200).json(out);
});

router.get("/linked-to-job/:jobId", async (req, res) => {
  try {
    const userid = userIdFrom(req);
    const { jobId } = req.params;
    if (!userid || !jobId) {
      return res.status(400).json({ error: "Missing userid or jobId" });
    }

    const out = await listCoverletterVersionsLinkedToJob({ userid, jobId });
    // expect out to look like { items: [...] }
    res.status(200).json(out);
  } catch (e) {
    console.error("linked-to-job error:", e);
    res
      .status(500)
      .json({ error: e?.message || "Failed to load linked coverletter versions" });
  }
});

// get one
router.get("/:id", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  if(!userid || !versionid) return res.status(400).json({error:"Missing fields"});
  const out = await getCoverletterVersion({ userid, versionid });
  if(!out) return res.status(404).json({error:"NotFound"});
  res.status(200).json(out);
});

// create (clone from base/default or an existing version)
router.post("/", async (req,res)=>{
  const userid = userIdFrom(req);
  const { coverletterid, sourceVersionId, name, description } = req.body || {};
  if(!userid || !coverletterid) return res.status(400).json({error:"Missing fields"});
  const out = await createCoverletterVersion({ userid, coverletterid, sourceVersionId, name, description });
  res.status(201).json(out);
});

// update (rename, description, link jobs, archive)
router.patch("/:id", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  const { name, description, status, linkJobIds, unlinkJobIds } = req.body || {};
  const out = await updateCoverletterVersion({ userid, versionid, name, description, status, linkJobIds, unlinkJobIds });
  if(!out) return res.status(404).json({error:"NotFound"});
  res.status(200).json(out);
});

// delete
router.delete("/:id", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  const ok = await deleteCoverletterVersion({ userid, versionid });
  if(!ok) return res.status(404).json({error:"NotFound"});
  res.sendStatus(204);
});

// set default on parent coverletter
router.post("/:id/set-default", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  const out = await setDefaultCoverletterVersion({ userid, versionid });
  if(out?.error) return res.status(400).json(out);
  res.status(200).json(out);
});

// NOTE: Compare and merge functionality can be added later if needed

router.put("/:id", async (req, res) => {
  const userid = userIdFrom(req);
  const versionid = req.params.id;
  const { content, name } = req.body || {};
  if (!userid || !versionid || !content) {
    return res.status(400).json({ error: "Missing userid, versionid, or content" });
  }
  try {
    const out = await updateCoverletterVersionContent({ userid, versionid, content, name });
    if (!out) return res.status(404).json({ error: "NotFound" });
    res.status(200).json({ ok: true, _id: versionid });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});
export default router;