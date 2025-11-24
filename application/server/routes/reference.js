import express from 'express';
import { createReferee ,getReferee, getALLReferee,deleteReferees, updateReferee, updateJobandReferee, updateJobReferencestat,generateReferenceRequest, updatefeedback,addRelationtoReferee,
  getAlljobs,
  removeJobandReferee,
  buildCandidateSnapshot,
  buildCandidateSummary,
  generateReferencePrep
} from '../services/reference.service.js';
import { getJob } from '../services/jobs.service.js';
import { GetRelevantinfofromuser } from '../services/coverletter.service.js';
import { embed,cosine,runLimited } from '../lib/geminiEmbeddingsSimple.js';
import { verifyJWT } from '../middleware/auth.js';
import 'dotenv/config';
import { ObjectId } from 'mongodb';




const router = express.Router();
const EMBEDDINGS_WEIGHT = Number(process.env.EMBEDDINGS_WEIGHT || 30); // how strong the AI influence is
const EMBEDDINGS_ON = process.env.USE_EMBEDDINGS !== "false"; 
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


// GET /api/reference/impact?user_id=...
router.get("/impact", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // 1) get all jobs for this user that have references
    const jobs = await getAlljobs({ userId: user_id ,projections: { status: 1, references: 1 }})

    // 2) aggregate per reference_id
    const statsByRef = {}; // { [refId]: { applications, interviews, offers } }

    const isInterviewStage = (status) =>
      status === "phone_screen" ||
      status === "interview" ||
      status === "offer";

    for (const job of jobs) {
      const jobStatus = job.status;
      const refs = Array.isArray(job.references) ? job.references : [];

      for (const usage of refs) {
        const refId = usage.reference_id?.toString();
        if (!refId) continue;

        if (!statsByRef[refId]) {
          statsByRef[refId] = {
            reference_id: refId,
            applications: 0,
            interviews: 0,
            offers: 0,
          };
        }

        statsByRef[refId].applications += 1;

        if (isInterviewStage(jobStatus)) {
          statsByRef[refId].interviews += 1;
        }

        if (jobStatus === "offer") {
          statsByRef[refId].offers += 1;
        }
      }
    }

    // 3) compute success_rate and return as an array
    const result = Object.values(statsByRef).map((entry) => {
      const apps = entry.applications || 0;
      const offers = entry.offers || 0;
      const successRate = apps > 0 ? offers / apps : 0;
console.log({ reference_id: entry.reference_id,
        applications: apps,
        interviews: entry.interviews,
        offers: entry.offers,
        success_rate: successRate,})
      return {
        reference_id: entry.reference_id,
        applications: apps,
        interviews: entry.interviews,
        offers: entry.offers,
        success_rate: successRate, // 0–1, frontend can turn into %
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error in /reference/impact:", err);
    return res
      .status(500)
      .json({ error: "Failed to compute reference impact." });
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

// PUT /api/reference/removetojob/
router.put('/removetojob/', async (req, res) => {
  
 try {
    const { referenceId, job_id } = req.body || {} 

    if (!referenceId || !job_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const response = await removeJobandReferee({ referenceId, job_id})

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

    const user = await GetRelevantinfofromuser(user_id)
    const candidate =  await buildCandidateSnapshot(user)

    console.log(candidate)
    const { emailTemplate, prepNotes } =
      await generateReferenceRequest({ job, referee,candidate });
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

// POST /api/reference/generate-prep
router.post("/generate-prep", async (req, res) => {
  try {
    const { job_id, referenceId, user_id } = req.body || {};
    if (!job_id || !referenceId || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const job = await getJob({ userId: user_id, id: new ObjectId(job_id) });
    if (!job) return res.status(404).json({ error: "Job not found." });

    const referee = await getReferee({ userid: user_id, referee_id: referenceId });
    if (!referee) return res.status(404).json({ error: "Reference not found." });

    const user = await GetRelevantinfofromuser(user_id)
    const candidate = {
      name: user.ProfileHistory?.fullName,
      currentRole: user.EmploymentHistory,
      school: user.EducationHistory,
      topSkills: user.skills,
      projects: user.ProjectHistory,
    };

    const candidateSummary = buildCandidateSummary(candidate);

    const prepPayload = await generateReferencePrep({
      job,
      referee,
      candidateSummary,
    });

    return res.status(200).json(prepPayload);
  } catch (err) {
    console.error("Error in /reference/generate-prep:", err);

    if (err.status === 429) {
      return res.status(429).json({
        error:
          "The AI service is currently rate-limited. Please wait a bit and try again.",
      });
    }

    return res.status(500).json({
      error: "Failed to generate reference preparation guidance.",
    });
  }
});


// PATCH /api/reference/update-feedback
router.patch("/update-feedback", async (req, res) => {
  try {
    const { job_id, referenceId, feedback , user_id} = req.body;

    if (!job_id || !referenceId || !feedback || !user_id) {
      return res
        .status(400)
        .json({ error: "Missing required fields." });
    }
    const response =  await updatefeedback({job_id, referenceId, feedback , user_id})
    // Build the $set update object for only the fields provided


    return res.status(200).json(response);
  } catch (err) {
    console.error("Error in /reference/update-feedback:", err);
    return res.status(500).json({ error: "Failed to update feedback." });
  }
});

// PATCH /api/reference/relationship/add
router.patch("/relationship/add", async (req, res) => {
  try {
    const { referenceId, action, message_content } = req.body;

    if (!referenceId || !action) {
      return res
        .status(400)
        .json({ error: "referenceId and action are required." });
    }
     const response =  await addRelationtoReferee({referenceId,action,message_content})
   

    return res.status(200).json(response);
    // return updated reference
  } catch (err) {
    console.error("Error in /reference/relationship/add:", err);
    return res.status(500).json({ error: "Failed to log relationship entry." });
  }
});

// POST /api/reference/generate-appreciation
router.post("/generate-appreciation", async (req, res) => {
  try {
    const { reference, job, type } = req.body;

    const refName = reference?.full_name || "your reference";
    const company = job?.company || "the company";
    const role = job?.jobTitle || "the role";

    let generated_message = "";

    switch (type) {
      case "thank_you":
        generated_message = `Hi ${refName},

I just wanted to say thank you again for supporting my application for the ${role} role at ${company}. I really appreciate you taking the time to speak on my behalf.

I'll keep you posted on how things go, and I'm grateful for your continued support.

Best regards,
[Your Name]`;
        break;
      case "update":
        generated_message = `Hi ${refName},

I wanted to send you a quick update regarding my application for the ${role} role at ${company}. [Share any updates here.]

Thank you again for being willing to act as a reference. Your support means a lot.

Best,
[Your Name]`;
        break;
      default:
        generated_message = `Hi ${refName},

I hope you're doing well. I just wanted to keep in touch and let you know I really appreciate your support in my career journey.

Best,
[Your Name]`;
    }

    return res.status(200).json({ generated_message });
  } catch (err) {
    console.error("Error in /reference/generate-appreciation:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate appreciation message." });
  }
});


router.post("/portfolio", async (req, res) => {
  try {
    const { user_id, goal, limit = 5 } = req.body || {};
    if (!user_id || !goal) {
      return res.status(400).json({ error: "user_id and goal are required." });
    }

    const normalizedGoal = (goal || "").toLowerCase().trim();

    // 1) Load all references for this user
    const refs = await getALLReferee({ user_id });
    if (!refs || refs.length === 0) {
      return res.status(200).json({
        goal,
        generated_at: new Date().toISOString(),
        references: [],
      });
    }

    // 2) Load relevant bits from jobs
    const jobs = await getAlljobs({
      userId: user_id,
      projections: { status: 1, jobTitle: 1, type: 1, industry: 1, references: 1 },
    });

    // helper for job stats aggregation
    const statsByRef = {}; // { [refId]: { applications, offers, titles:Set, industries:Set } }
    const isOffer = (status) => (status || "").toLowerCase() === "offer";

    for (const job of jobs) {
      const jobStatus = (job.status || "").toLowerCase();
      const jobTitle = (job.jobTitle || "").toLowerCase();
      const jobIndustry = (job.industry || "").toLowerCase();
      const usages = Array.isArray(job.references) ? job.references : [];

      for (const usage of usages) {
        const refId = usage.reference_id?.toString();
        if (!refId) continue;

        if (!statsByRef[refId]) {
          statsByRef[refId] = {
            applications: 0,
            offers: 0,
            titles: new Set(),
            industries: new Set(),
          };
        }

        statsByRef[refId].applications += 1;
        if (isOffer(jobStatus)) statsByRef[refId].offers += 1;
        if (jobTitle) statsByRef[refId].titles.add(jobTitle);
        if (jobIndustry) statsByRef[refId].industries.add(jobIndustry);
      }
    }

    // 3) Prepare lightweight blobs per reference for embedding
    const refBlobs = refs.map((ref) => ({
      id: ref._id.toString(),
      textParts: [
        (ref.title || ""),
        (ref.organization || ""),
        (ref.relationship || ""),
        ...(Array.isArray(ref.tags) ? ref.tags : []),
        // we'll add aggregated job titles below
      ],
      ref,
    }));

    // add job titles into textParts for each ref
    for (const rb of refBlobs) {
      const titles = Array.from(statsByRef[rb.id]?.titles || []);
      rb.textParts.push(...titles);
    }

    // 4) Embed goal and refs with small concurrency cap
    let goalVec = null;
    if (EMBEDDINGS_ON) {
      try { goalVec = await embed(normalizedGoal); } catch { goalVec = null; }
    }

    const refVectors = new Map(); // id -> vector
    if (goalVec && EMBEDDINGS_ON) {
      const tasks = refBlobs.map((rb) => async () => {
        const blob = rb.textParts
          .filter(Boolean)
          .map((s) => s.toLowerCase())
          .join(" ; ");
        try {
          const v = await embed(blob);
          return { id: rb.id, vec: v };
        } catch {
          return { id: rb.id, vec: null };
        }
      });

      const results = await runLimited(tasks, 3); // respect rate limits
      results.forEach((r) => {
        if (r && r.vec) refVectors.set(r.id, r.vec);
      });
    }

    // 5) Score each reference (your deterministic logic + small AI boost)
    const scored = refBlobs.map(({ id, ref }) => {
      const stats = statsByRef[id] || {
        applications: 0,
        offers: 0,
        titles: new Set(),
        industries: new Set(),
      };

      const tags = Array.isArray(ref.tags)
        ? ref.tags.map((t) => (t || "").toLowerCase())
        : [];
      const relationship = (ref.relationship || "").toLowerCase();
      const title = (ref.title || "").toLowerCase();
      const org = (ref.organization || "").toLowerCase();

      let score = 0;
      const explain = [];

      // base signals
      score += (stats.applications || 0) * 2;
      score += (stats.offers || 0) * 5;

      // exact/loose token matches against the goal
      const haystack = [
        ...tags,
        relationship,
        title,
        org,
        ...Array.from(stats.titles || []),
      ];
      haystack.forEach((s) => {
        if (!s) return;
        if (s.includes(normalizedGoal)) score += 5;
        const tokens = normalizedGoal.split(/\s+/);
        tokens.forEach((tok) => {
          if (tok.length > 2 && s.includes(tok)) score += 1;
        });
      });

      // availability / capacity nudges
      const avail = (ref.availability_status || "").toLowerCase();
      if (avail === "unavailable") { score -= 12; explain.push("Currently unavailable"); }
      else if (avail === "limited") { score -= 5; explain.push("Availability limited"); }

      const overPreferred =
        ref.preferred_number_of_uses != null &&
        ref.usage_count != null &&
        ref.usage_count >= ref.preferred_number_of_uses;
      if (overPreferred) { score -= 6; explain.push("At/over preferred yearly usage"); }

      // AI semantic boost
      if (goalVec && refVectors.has(id)) {
        const sim = cosine(goalVec, refVectors.get(id)); // 0..1
        score += Math.round(sim * EMBEDDINGS_WEIGHT);
        if (sim >= 0.4) explain.push("Strong semantic match to goal");
      }

      const apps = stats.applications || 0;
      const offers = stats.offers || 0;
      const successRate = apps > 0 ? offers / apps : 0;

      const summary = apps
        ? `Used in ${apps} application${apps === 1 ? "" : "s"} with ${
            offers ? `${offers} offer${offers === 1 ? "" : "s"}` : "no offers yet"
          } for roles like ${Array.from(stats.titles).slice(0, 3).join(", ") || "various positions"}.`
        : "Not yet used in tracked applications.";

      return {
        reference_id: id,
        full_name: ref.full_name,
        title: ref.title,
        organization: ref.organization,
        relationship: ref.relationship,
        email: ref.email,
        tags: ref.tags || [],
        stats: { applications: apps, offers, success_rate: successRate },
        score,
        summary,
        explain,
      };
    });

    // 6) sort/trim and return
    scored.sort((a, b) => b.score - a.score);
    const top = scored
      .filter((r) => r.score > 0 || r.stats.applications > 0)
      .slice(0, limit);

    return res.status(200).json({
      goal,
      generated_at: new Date().toISOString(),
      references: top,
    });
  } catch (err) {
    console.error("Error in /reference/portfolio:", err);
    return res.status(500).json({ error: "Failed to generate reference portfolio." });
  }
});


export default router;
