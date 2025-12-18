// services/applicationImportPairing.service.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getDb } from "../db/connection.js";

const EXT_PAIRINGS_COLL = "extension_pairings";

function now() {
  return new Date();
}

function sha1(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex");
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function getJwtSecret() {
  // Use your existing JWT secret if you already have one in prod.
  // If you don't, set JWT_SECRET in production env.
  return (
    process.env.JWT_SECRET ||
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.SECRET ||
    "dev_jwt_secret_change_me"
  );
}
async function findActivePairingByCode({ db, code }) {
  const c = safeStr(code);
  if (!c) return null;

  const code6Hash = sha1(c);
  const doc = await db.collection(EXT_PAIRINGS_COLL).findOne(
    {
      code6Hash,
      usedAt: null,
      expiresAt: { $gt: now() },
    },
    { sort: { createdAt: -1 } }
  );

  return doc;
}

async function ensurePairingIndexes(db) {
  await db.collection(EXT_PAIRINGS_COLL).createIndex({ pairingId: 1 }, { unique: true });
  await db.collection(EXT_PAIRINGS_COLL).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection(EXT_PAIRINGS_COLL).createIndex({ userId: 1, createdAt: -1 });

  // NEW: supports code-only completion
  await db.collection(EXT_PAIRINGS_COLL).createIndex({ code6Hash: 1, createdAt: -1 });
}

function generatePairingId() {
  // 16 bytes => 32 hex chars
  return crypto.randomBytes(16).toString("hex");
}

function generateCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function startExtensionPairing({ userId, deviceName }) {
  const db = getDb();
  await ensurePairingIndexes(db);

  const pairingId = generatePairingId();
  const code = generateCode6();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const codeHash = sha1(`${pairingId}|${code}`);

  // NEW: allows lookup by code alone without storing plaintext code
  const code6Hash = sha1(code);

  await db.collection(EXT_PAIRINGS_COLL).insertOne({
    pairingId,
    userId: String(userId),
    deviceName: safeStr(deviceName || "") || "Browser Extension",
    codeHash,
    code6Hash, // ✅ NEW
    attempts: 0,
    usedAt: null,
    createdAt: now(),
    expiresAt,
  });

  return { pairingId, code, expiresAt: expiresAt.toISOString() };
}

export async function getExtensionPairingStatus({ userId, pairingId }) {
  const db = getDb();
  await ensurePairingIndexes(db);

  const doc = await db.collection(EXT_PAIRINGS_COLL).findOne({ pairingId: String(pairingId) });
  if (!doc) return { ok: false, error: "pairing_not_found" };

  // Only the owner can poll status (prevents leaking whether something paired)
  if (String(doc.userId) !== String(userId)) return { ok: false, error: "forbidden" };

  return {
    ok: true,
    pairingId: String(pairingId),
    paired: Boolean(doc.usedAt),
    usedAt: doc.usedAt ? new Date(doc.usedAt).toISOString() : null,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
  };
}

export async function completeExtensionPairing({ pairingId, code }) {
  const db = getDb();
  await ensurePairingIndexes(db);

  const pidInput = safeStr(pairingId);
  const c = safeStr(code);

  if (!c) return { ok: false, error: "missing_code" };

  // ✅ If pairingId not provided, find the active pairing by code (latest, unused, unexpired)
  let doc = null;
  let pid = pidInput;

  if (pid) {
    doc = await db.collection(EXT_PAIRINGS_COLL).findOne({ pairingId: pid });
  } else {
    doc = await findActivePairingByCode({ db, code: c });
    if (doc?.pairingId) pid = String(doc.pairingId);
  }

  if (!doc) return { ok: false, error: "pairing_not_found" };

  if (doc.usedAt) return { ok: false, error: "already_paired" };
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }

  // Still validate against the full pairingId|code hash (prevents accepting the right code for the wrong pairingId)
  const expected = doc.codeHash;
  const got = sha1(`${pid}|${c}`);

  if (got !== expected) {
    const attempts = Number(doc.attempts || 0) + 1;
    await db.collection(EXT_PAIRINGS_COLL).updateOne({ pairingId: pid }, { $set: { attempts } });

    if (attempts >= 8) {
      await db.collection(EXT_PAIRINGS_COLL).updateOne(
        { pairingId: pid },
        { $set: { expiresAt: new Date(Date.now() + 5 * 1000) } }
      );
      return { ok: false, error: "too_many_attempts" };
    }

    return { ok: false, error: "invalid_code" };
  }

  // Mark used atomically
  const usedAt = now();
  const upd = await db.collection(EXT_PAIRINGS_COLL).updateOne(
    { pairingId: pid, usedAt: null },
    { $set: { usedAt } }
  );
  if (upd.matchedCount === 0) return { ok: false, error: "already_paired" };

  const userId = String(doc.userId);

  const token = jwt.sign(
    {
      typ: "ext",
      scope: "application_import",
      uid: userId,
      pid,
    },
    getJwtSecret(),
    {
      expiresIn: "30d",
      issuer: "ontrac",
      audience: "ontrac-extension",
    }
  );

  return { ok: true, token, userId };
}

export function tryGetUserIdFromExtensionAuth(req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.toLowerCase().startsWith("bearer ")) return null;

  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "ontrac",
      audience: "ontrac-extension",
    });

    if (payload?.typ !== "ext") return null;
    if (payload?.scope !== "application_import") return null;

    const uid = payload?.uid;
    return uid ? String(uid) : null;
  } catch {
    return null;
  }
}
