import express from 'express';
import { createUser,verifyUser,findUserByEmailCaseSensitve} from '../services/user.service.js';
import 'dotenv/config';
import jwt from "jsonwebtoken";
import { google, paymentsresellersubscription_v1 } from 'googleapis';
import axios from 'axios';


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
export default router;
