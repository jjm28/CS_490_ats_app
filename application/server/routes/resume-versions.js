import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  listResumeVersions, getResumeVersion, createResumeVersion,
  updateResumeVersion, deleteResumeVersion, 
  compareVersions, mergeVersions,
  setDefaultVersion,updateResumeVersionContent
} from "../services/resume_version.service.js";

const router = express.Router();
// router.use((req,_res,next)=>{ if(!req.headers.authorization && req.cookies?.token){ req.headers.authorization = `Bearer ${req.cookies.token}`;} next(); });
// router.use(verifyJWT);
const userIdFrom = (req)=> req.query?.userid || req.body?.userid || req.user?._id || req.user?.id;

// list
router.get("/", async (req,res)=>{
  const userid = userIdFrom(req); const { resumeid } = req.query;
  if(!userid || !resumeid) return res.status(400).json({error:"Missing userid or resumeid"});
  const out = await listResumeVersions({ userid, resumeid });
  res.status(200).json(out);
});

// get one
router.get("/:id", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  if(!userid || !versionid) return res.status(400).json({error:"Missing fields"});
  const out = await getResumeVersion({ userid, versionid });
  if(!out) return res.status(404).json({error:"NotFound"});
  res.status(200).json(out);
});

// create (clone from base/default or an existing version)
router.post("/", async (req,res)=>{
  const userid = userIdFrom(req);
  const { resumeid, sourceVersionId, name, description } = req.body || {};
  if(!userid || !resumeid) return res.status(400).json({error:"Missing fields"});
  const out = await createResumeVersion({ userid, resumeid, sourceVersionId, name, description });
  res.status(201).json(out);
});

// update (rename, description, link jobs, archive)
router.patch("/:id", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  const { name, description, status, linkJobIds, unlinkJobIds } = req.body || {};
  const out = await updateResumeVersion({ userid, versionid, name, description, status, linkJobIds, unlinkJobIds });
  if(!out) return res.status(404).json({error:"NotFound"});
  res.status(200).json(out);
});

// delete
router.delete("/:id", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  const ok = await deleteResumeVersion({ userid, versionid });
  if(!ok) return res.status(404).json({error:"NotFound"});
  res.sendStatus(204);
});

// set default on parent resume
router.post("/:id/set-default", async (req,res)=>{
  const userid = userIdFrom(req); const versionid = req.params.id;
  const out = await setDefaultVersion({ userid, versionid });
  if(out?.error) return res.status(400).json(out);
  res.status(200).json(out);
});

// compare
router.post("/compare", async (req,res)=>{
  const userid = userIdFrom(req);
  const { leftVersionId, rightVersionId } = req.body || {};
  if(!userid || !leftVersionId || !rightVersionId) return res.status(400).json({error:"Missing fields"});
  const diff = await compareVersions({ userid, leftVersionId, rightVersionId });
  res.status(200).json(diff);
});

// merge
router.post("/merge", async (req,res)=>{
  const userid = userIdFrom(req);
  const { baseId, incomingId, resolution, name, description } = req.body || {};
  if(!userid || !baseId || !incomingId || !name) return res.status(400).json({error:"Missing fields"});
  const merged = await mergeVersions({ userid, baseId, incomingId, resolution, name, description });
  res.status(201).json(merged);
});

router.put("/:id", async (req, res) => {
  const userid = userIdFrom(req);
  const versionid = req.params.id;
  const { content, name } = req.body || {};
  if (!userid || !versionid || !content) {
    return res.status(400).json({ error: "Missing userid, versionid, or content" });
  }
  try {
    const out = await updateResumeVersionContent({ userid, versionid, content, name });
    if (!out) return res.status(404).json({ error: "NotFound" });
    res.status(200).json({ ok: true, _id: versionid });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});
export default router;
