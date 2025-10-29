import express from 'express';
import { createUser,verifyUser,findUserByEmailCaseSensitve} from '../services/user.service.js';
import 'dotenv/config';
import jwt from "jsonwebtoken";
import { google, paymentsresellersubscription_v1 } from 'googleapis';
import axios from 'axios';
import { connectDB, getDb } from "../db/connection.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = express.Router();
const oauth2 = new google.auth.OAuth2(  
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await createUser({ email, password, firstName, lastName });
    // Return new userId so client can use it for subsequent profile calls
    const token = jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});

    return res.status(201).json({ token, userId: String(user._id), user });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password} = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await verifyUser({ email, password},false);

     if (!user || user.isDeleted) {
      return res.status(401).json({ error: 'Account deleted or not found' });
    }

    // Return new userId so client can use it for subsequent profile calls
    const token = jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});
    return res.status(201).json({token, userId: String(user._id), user });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/google/login', async (req, res) => {
const url = oauth2.generateAuthUrl({ access_type: "online", scope: ["openid", "email", "profile"]})
res.redirect(url)
});

router.get('/microsoft/login', async (req, res) => {
const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email User.Read",
    prompt: "select_account" 
  });
res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`)
});

router.get('/google/callback', async (req, res) => {
try {
    const {code} =req.query
    const {tokens} = await oauth2.getToken(code)
    oauth2.setCredentials(tokens)
   const ticket = await google.auth.OAuth2.prototype.verifyIdToken.call(
      oauth2,
      { idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID }
    );
   const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
      return res.status(400).send("Google account email is not verified.");
    }

    //Create or Verify User
    let user =  await findUserByEmailCaseSensitve(payload.email);
    let token
    if(!user){
      // Register User
    
      user = await createUser({email: payload.email,password:null,firstName: payload?.given_name ?? null,lastName: payload?.family_name ?? null});
      const email = payload.email
      token= jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});


    }
    else {
          

    const user = await verifyUser({ email: payload.email,password:null},true);
    // Return new userId so client can use it for subsequent profile calls
    const email = payload.email
    token = jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});
    }
    const userB64 = Buffer.from(JSON.stringify(user)).toString("base64url");

    return res.redirect(`${process.env.FRONTEND_ORIGIN}/auth/callback?token=${token}&u=${userB64}`);

}
catch (e){
 console.error(e);
    return res.status(500).send("OAuth error");
}

});

router.get('/microsoft/callback', async (req, res) => {
try {
    const {code} =req.query

    const tokenRes = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

        const me = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
     const payload = me.data;
  
  if (!payload?.mail) {
      return res.status(400).send("Microsoft account email is not verified.");
    }

    //Create or Verify User
    let user =  await findUserByEmailCaseSensitve(payload.mail);
    let token
    if(!user){
      // Register User
    
      user = await createUser({email: payload.mail,password:null,firstName: payload?.givenName ?? null,lastName: payload?.surname ?? null});
      const email = payload.mail
      token= jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});


    }
    else {
          

    const user = await verifyUser({ email: payload.mail,password:null},true);
    // Return new userId so client can use it for subsequent profile calls
    const email = payload.mail
    token = jwt.sign({id: String(user._id),email}, process.env.JWT_SECRET,{expiresIn: "10m"});
    }
    const userB64 = Buffer.from(JSON.stringify(user)).toString("base64url");

    return res.redirect(`${process.env.FRONTEND_ORIGIN}/auth/callback?token=${token}&u=${userB64}`);

}
catch (e){
 console.error(e);
    return res.status(500).send("OAuth error");
}

});

router.delete("/delete", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });

    const db = getDb();

    // Fetch user
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user._id) });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const now = new Date();

    // Soft-delete user and profile
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isDeleted: true, deletedAt: now } }
    );

    await db.collection("profiles").updateOne(
      { userId: user._id },
      { $set: { isDeleted: true, deletedAt: now } }
    );

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: "Your account deletion request",
      text: `Your account has been scheduled for deletion. It will be permanently removed after 30 days.`,
    });

    // Return success (frontend will log out)
    res.json({ message: "Account deletion scheduled. You will be logged out." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    await connectDB();
    const db = getDb();
    const users = db.collection("users");

    console.log("Looking up email:", email);
    const user = await users.findOne({ email: new RegExp(`^${email}$`, "i") });

    if (!user) {
      console.log("No user found for", email);
      return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    }

    console.log("User found:", user.email);

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600 * 1000; // 1 hour

    const result = await users.updateOne(
      { email: user.email },
      { $set: { resetToken: token, resetTokenExpiry: expiry } }
    );

    console.log("Update result:", result);

    console.log(`Reset link: http://localhost:5173/reset-password?token=${token}`);
    return res.status(200).json({ message: "Reset link sent (check console for testing)." });

  } catch (err) {
    console.error("Error in forgot-password:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});


// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Missing token or new password" });

    await connectDB();
    const db = getDb();
    const users = db.collection("users");
    const user = await users.findOne({ resetToken: token });
    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    if (Date.now() > user.resetTokenExpiry) {
      return res.status(400).json({ error: "Reset token expired" });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password and remove token
    await users.updateOne(
      { email: user.email },
      { $set: { passwordHash: hashed }, $unset: { resetToken: "", resetTokenExpiry: "" } }
    );

    // Auto-login JWT
    const authToken = jwt.sign(
      { email: user.email, _id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Password reset successful",
      token: authToken,
      user: { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Reset failed" });
  }
});

export default router;
