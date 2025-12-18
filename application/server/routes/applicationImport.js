// routes/applicationImport.js
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  importApplicationEvent,
  importApplicationEventsBulk,
  getPlatformInfoForJob,
} from "../services/applicationImport.service.js";
import {
  startExtensionPairing,
  completeExtensionPairing,
  getExtensionPairingStatus,
  tryGetUserIdFromExtensionAuth,
} from "../services/applicationImportPairing.service.js";

const router = Router();

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

function isPairingPublicPath(req) {
  // Only /pair/complete should be callable without JWT/dev header
  return req.path === "/pair/complete";
}

/**
 * Auth middleware:
 * - Allow /pair/complete without JWT (it uses pairingId+code)
 * - If x-dev-user-id exists, use it (local dev)
 * - Else if extension bearer token exists, accept it (production extension)
 * - Else fallback to verifyJWT (normal app usage)
 */
router.use((req, res, next) => {
  if (isPairingPublicPath(req)) return next();

  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }

  const extUserId = tryGetUserIdFromExtensionAuth(req);
  if (extUserId) {
    req.user = { _id: extUserId };
    req.isExtensionAuth = true;
    return next();
  }

  return verifyJWT(req, res, next);
});

/**
 * Pairing: start (requires normal auth or x-dev-user-id)
 * Returns a short code the user enters into the extension popup.
 */
router.post("/pair/start", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const deviceName = req.body?.deviceName || "Browser Extension";
    const result = await startExtensionPairing({ userId, deviceName });
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e?.message || "Pair start failed" });
  }
});

/**
 * Pairing: status (requires auth)
 * Lets the web app show "Connected!" after the extension completes.
 */
router.get("/pair/status/:pairingId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const result = await getExtensionPairingStatus({ userId, pairingId: req.params.pairingId });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ ok: false, error: e?.message || "Pair status failed" });
  }
});

/**
 * Pairing: complete (PUBLIC)
 * Extension exchanges pairingId+code for an extension token.
 */
router.post("/pair/complete", async (req, res) => {
  try {
    const pairingId = req.body?.pairingId;
    const code = req.body?.code;
    const result = await completeExtensionPairing({ pairingId, code });
    if (!result.ok) return res.status(400).json(result);
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ ok: false, error: e?.message || "Pair complete failed" });
  }
});

// Existing routes (unchanged behavior)

router.post("/import", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await importApplicationEvent({ userId, payload: req.body || {} });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Import failed" });
  }
});

router.post("/email", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const payload = { ...(req.body || {}), sourceType: req.body?.sourceType || "email_forward" };
    const result = await importApplicationEvent({ userId, payload });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Email import failed" });
  }
});

router.post("/extension", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const payload = { ...(req.body || {}), sourceType: req.body?.sourceType || "browser_extension" };
    const result = await importApplicationEvent({ userId, payload });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Extension import failed" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const events = req.body?.events;
    const result = await importApplicationEventsBulk({ userId, events });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e?.message || "Bulk import failed" });
  }
});

router.get("/platforms/:jobId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await getPlatformInfoForJob({ userId, jobId: req.params.jobId });
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Failed to fetch platform info" });
  }
});

export default router;
