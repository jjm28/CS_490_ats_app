import express from 'express';
import { createReferee ,getReferee, getALLReferee,deleteReferees, updateReferee, updateJobandReferee, updateJobReferencestat,generateReferenceRequest} from '../services/reference.service.js';
import { getJob } from '../services/jobs.service.js';
import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { ObjectId } from 'mongodb';


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

    const { user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count, referenceid,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses} = req.body || {} ;
    if (!user_id || !full_name || !relationship || !email || !preferred_contact_method ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let  response
    if(!referenceid){
      response = await createReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses});
    }
    else {
      response = await updateReferee({ user_id, full_name, title, organization, relationship, email, preferred_contact_method, phone, tags, last_used_at, usage_count,referenceid,availability_status,availability_other_note,preferred_opportunity_types,preferred_number_of_uses});

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



// PUT /api/reference/addtojob/
router.put('/addtojob/', async (req, res) => {
  
 try {
    const { referenceIds, job_id } = req.body || {} 

    if (!referenceIds || !job_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const response = await updateJobandReferee({referenceIds, job_id})

    res.status(200).json(response);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});


// Patch /api/reference/updaterefstat/
router.patch('/updaterefstat', async (req, res) => {
  
 try {
    const {status, referenceId, job_id } = req.body || {} 

    if (!referenceId || !job_id || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const response = await updateJobReferencestat({referenceId, job_id,status})

    res.status(200).json(response);
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: 'Server error' });
  }
});



// POST /api/reference/generate-request
router.post('/generate-request', async (req, res) => {
  
  try {

    const {job_id,referenceId, user_id} = req.body || {} ;
    if (!job_id || !referenceId || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    const job =  await getJob({userId: user_id, id: new ObjectId(job_id) })
    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }
    const referee = await getReferee({userid: user_id, referee_id: referenceId})
    if (!referee) {
      return res.status(404).json({ error: "Reference not found." });
    }
    const { emailTemplate, prepNotes } =
      await generateReferenceRequest({ job, referee });

    return res.status(200).json({
      emailTemplate,
      prepNotes,
    });
  
  } catch (err) {
    console.error("Error in /reference/generate-request:", err);

    if (err.status === 429) {
      return res.status(429).json({
        error:
          "The AI service is currently rate-limited. Please wait a bit and try again.",
      });
    }

    return res.status(500).json({
      error: "Failed to generate reference request.",
    });
  }
});
export default router;
