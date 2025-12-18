import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { logApiCall } from "../middleware/apiLogger.js"; // ← ADD THIS

// ✅ Follow your existing API key hierarchy
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY_FOR_CHECKLIST ||
  process.env.GOOGLE_API_KEY_FOR_NEGOTIATION || 
  process.env.GOOGLE_API_KEY_FOR_FOLLOWUP || 
  process.env.GOOGLE_API_KEY
);

// ✅ Define the exact schema your database expects
const checklistSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          category: { 
            type: SchemaType.STRING,
            enum: ['research', 'logistics', 'materials', 'practice', 'mindset']
          },
          task: { type: SchemaType.STRING },
          completed: { type: SchemaType.BOOLEAN },
          order: { type: SchemaType.NUMBER }
        },
        required: ['id', 'category', 'task', 'completed', 'order']
      }
    }
  },
  required: ['items']
};

/**
 * Generate AI-powered interview preparation checklist
 * @param {Object} job - Job object with company, title, description, etc.
 * @param {Object} interview - Interview object with type, date, interviewer, etc.
 * @returns {Promise<Array>} Array of checklist items
 */
export async function generateChecklistWithAI(job, interview) {
  const startTime = Date.now(); // ← ADD THIS
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert interview preparation coach. Generate a personalized interview preparation checklist.\n" +
      "OUTPUT FORMAT: Return STRICT JSON only matching the schema.\n" +
      "CATEGORIES: Use exactly these 5 categories: research, logistics, materials, practice, mindset\n" +
      "STRUCTURE: Each item needs: id (unique string), category, task (clear action item), completed (always false), order (1-30)\n" +
      "TONE: Professional, actionable, specific to the job and company.\n" +
      "IMPORTANT: Make tasks specific to the actual company name, role, and interview type provided.",
  });

  // ✅ Build context from your job and interview data
  const jobTitleLower = job.jobTitle?.toLowerCase() || '';
  const companyName = job.company || 'the company';
  const interviewType = interview.type || 'interview';
  const interviewer = interview.interviewer || 'the hiring team';
  const interviewDate = interview.date ? new Date(interview.date).toLocaleDateString() : 'upcoming';

  // ✅ Detect role type for targeted recommendations
  const isEngineer = /engineer|developer|technical|software|devops|sre/i.test(jobTitleLower);
  const isDesigner = /designer|ux|ui|product design/i.test(jobTitleLower);
  const isSales = /sales|business development|account/i.test(jobTitleLower);
  const isPM = /product manager|product owner|pm/i.test(jobTitleLower);
  const isData = /data|analyst|analytics|scientist/i.test(jobTitleLower);

  const prompt = `Generate a personalized interview preparation checklist for an upcoming interview.

INTERVIEW CONTEXT:
- Company: ${companyName}
- Position: ${job.jobTitle}
- Interview Type: ${interviewType} (phone/video/in-person)
- Interview Date: ${interviewDate}
- Interviewer: ${interviewer}
${job.description ? `- Job Description: ${job.description.substring(0, 400)}...` : ''}
${job.industry ? `- Industry: ${job.industry}` : ''}
${job.companySize ? `- Company Size: ${job.companySize}` : ''}

ROLE CONTEXT:
${isEngineer ? '- This is a TECHNICAL role - include coding prep, system design, technical concepts' : ''}
${isDesigner ? '- This is a DESIGN role - include portfolio prep, design case studies, tools discussion' : ''}
${isSales ? '- This is a SALES role - include pitch practice, deal examples, CRM knowledge' : ''}
${isPM ? '- This is a PRODUCT role - include product case studies, prioritization frameworks, metrics discussion' : ''}
${isData ? '- This is a DATA role - include SQL prep, analysis examples, statistical concepts' : ''}

INSTRUCTIONS:
1. Generate 20-30 specific, actionable checklist items
2. Distribute items across ALL 5 categories (research, logistics, materials, practice, mindset)
3. Make tasks SPECIFIC to ${companyName} and ${job.jobTitle} role
4. For RESEARCH: Include company-specific items (mission, recent news, interviewer LinkedIn lookup)
5. For LOGISTICS: Adapt to interview type (${interviewType} - video needs tech check, in-person needs directions)
6. For MATERIALS: Include role-specific prep (resume review, portfolio, code samples, etc.)
7. For PRACTICE: Include role-specific practice (STAR method, technical questions, case studies, etc.)
8. For MINDSET: Include confidence-building and wellness items (breathing exercises, power pose, sleep, etc.)
9. Use clear, actionable language (e.g., "Review ${companyName}'s Q3 earnings report" not "Research company finances")
10. Order items logically within categories (most important first)

CHECKLIST ITEM FORMAT:
Each item must have:
- id: Unique identifier (e.g., "research-company-mission", "logistics-tech-check")
- category: One of [research, logistics, materials, practice, mindset]
- task: Clear, specific action item (use company name and role title)
- completed: false (always)
- order: Sequential number 1-30

Return as JSON with this structure:
{
  "items": [
    {
      "id": "research-company-mission",
      "category": "research",
      "task": "Review ${companyName}'s mission statement and core values on their website",
      "completed": false,
      "order": 1
    }
  ]
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: checklistSchema,
        temperature: 0.8,
      },
    });

    // ← ADD THIS - Log successful call
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    
    // ✅ Validate we got items
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error("AI returned empty or invalid checklist");
    }

    console.log(`✅ AI generated ${parsed.items.length} checklist items`);
    return parsed.items;

  } catch (err) {
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    
    console.error("❌ AI checklist generation failed:", err);
    throw err; // Let the caller handle fallback
  }
}