import express from 'express';
import { createReferee ,getReferee, getALLReferee,deleteReferees, updateReferee} from '../services/reference.service.js';
import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';


//const genAI_rewrite = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);


const router = express.Router();

// router.use(verifyJWT);

// GET /api/reference/
router.get("/", async (req, res) => {
  try {
    const { userid, referee_id } = req.query 

    if (!userid || !referee_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const response = await getReferee({userid,referee_id})

    res.status(200).json(response);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reference/all
router.get("/all", async (req, res) => {
  try {
    const { userid } = req.query 

    if (!userid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const response = await getALLReferee({userid})

    res.status(200).json({referees: response});
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});




// POST /api/reference/addnew
router.post('/addnew', async (req, res) => {
  
  try {

    const { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count, referenceid} = req.body || {} ;
    if (!user_id || !full_name || !relationship || !email || !preferred_contact_method ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let  response
    if(!referenceid){
      response = await createReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count});
    }
    else {
      response = await updateReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, availability_notes,tags, last_used_at, usage_count,referenceid});

    }

  
    return res.status(201).json(response);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});


// DELETE /api/reference/addnew
router.delete('/', async (req, res) => {
  
 try {
    const { referee_ids } = req.body || {} 

    if (!referee_ids) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const response = await deleteReferees({referee_ids})

    res.status(200).json({completed: response.acknowledged});
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
