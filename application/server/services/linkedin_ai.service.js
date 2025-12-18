import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY_FOR_FOLLOWUP || process.env.GOOGLE_API_KEY
);

// ============================================
// MESSAGE TEMPLATES
// ============================================

const messageSchema = {
  type: SchemaType.OBJECT,
  properties: {
    scenario: { type: SchemaType.STRING },
    template: { type: SchemaType.STRING },
  },
  required: ["scenario", "template"],
};

export async function generateLinkedInMessage(context) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a professional networking coach helping craft effective LinkedIn messages. \n" +
      "OUTPUT FORMAT: Return STRICT JSON only: { scenario: string, template: string }. \n" +
      "TONE: Professional, warm, genuine, and respectful of recipient's time. \n" +
      "FORMATTING: Use \\n\\n for paragraph breaks (double line breaks for spacing). \n" +
      "LENGTH: Keep messages concise (3-4 short paragraphs max). \n" +
      "PLACEHOLDERS: Use [Name], [Company], [Position] for personalization. \n" +
      "IMPORTANT: Messages should feel authentic, not salesy or robotic.",
  });

  const { scenario, recipientInfo, userInfo } = context;

  let promptContext = `Generate a LinkedIn networking message for the following scenario: ${scenario}\n\n`;

  if (recipientInfo) {
    promptContext += `Recipient information: ${recipientInfo}\n\n`;
  }

  if (userInfo) {
    promptContext += `Sender background: ${userInfo}\n\n`;
  }

  promptContext += `Create a professional, personalized message that:
- Opens with a relevant connection or compliment
- Clearly states the purpose of outreach
- Respects their time with a specific, reasonable ask
- Closes warmly with next steps
- Uses [Name] placeholder for personalization`;
  const startTime = Date.now();
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptContext }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: messageSchema,
        temperature: 0.7,
      },
    });
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    console.error("AI LinkedIn message generation failed:", err);
    throw new Error("Failed to generate LinkedIn message");
  }
}

// ============================================
// CONNECTION REQUEST TEMPLATES
// ============================================

const connectionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    scenario: { type: SchemaType.STRING },
    template: { type: SchemaType.STRING },
    tips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["scenario", "template", "tips"],
};

export async function generateConnectionRequest(context) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a professional networking coach helping craft LinkedIn connection requests. \n" +
      "OUTPUT FORMAT: Return STRICT JSON: { scenario: string, template: string, tips: string[] }. \n" +
      "TONE: Brief, professional, and genuine. \n" +
      "LENGTH: Connection requests must be under 300 characters (LinkedIn limit). \n" +
      "TIPS: Provide 3-4 actionable tips for this specific scenario. \n" +
      "PLACEHOLDERS: Use [Name], [Company] for personalization.",
  });

  const { scenario, recipientInfo } = context;

  let promptContext = `Generate a LinkedIn connection request for: ${scenario}\n\n`;

  if (recipientInfo) {
    promptContext += `Recipient information: ${recipientInfo}\n\n`;
  }

  promptContext += `Create a brief connection request that:
- Establishes common ground or reason for connecting
- Is genuinely interested, not transactional
- Stays under 300 characters
- Uses [Name] placeholder

Also provide 3-4 practical tips for this scenario.`;
    const startTime = Date.now(); // ← ADD

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptContext }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: connectionSchema,
        temperature: 0.7,
      },
      
    });
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message);
    console.error("AI connection request generation failed:", err);
    throw new Error("Failed to generate connection request");
  }
}

// ============================================
// PROFILE OPTIMIZATION
// ============================================

const optimizationSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      category: {
        type: SchemaType.STRING,
        enum: ["headline", "summary", "experience", "skills", "other"],
      },
      suggestion: { type: SchemaType.STRING },
      priority: {
        type: SchemaType.STRING,
        enum: ["high", "medium", "low"],
      },
    },
    required: ["category", "suggestion", "priority"],
  },
};

export async function generateProfileOptimization(userProfile) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a LinkedIn profile optimization expert. \n" +
      "OUTPUT FORMAT: Return STRICT JSON array of suggestions. \n" +
      "Each suggestion must have: category (headline/summary/experience/skills/other), suggestion (string), priority (high/medium/low). \n" +
      "Provide 5-8 specific, actionable suggestions. \n" +
      "Be constructive and professional.",
  });

  const promptContext = `Analyze this LinkedIn profile and provide optimization suggestions:

Current Role/Headline: ${userProfile.currentRole || userProfile.headline || "Not specified"}
Years of Experience: ${userProfile.experienceLevel || userProfile.yearsOfExperience || "Not specified"}
Target Role: ${userProfile.targetRole || "Not specified"}
Industry: ${userProfile.industry || "Not specified"}
Skills: ${userProfile.skills || "Not specified"}
${userProfile.linkedInProfileUrl ? `LinkedIn URL: ${userProfile.linkedInProfileUrl}` : ""}

Provide 5-8 specific suggestions to improve this LinkedIn profile for:
- Better visibility in recruiter searches
- Stronger professional brand
- Increased engagement and connection opportunities
${userProfile.targetRole ? `- Positioning for ${userProfile.targetRole} roles` : ""}

Focus on practical, achievable improvements.`;
  const startTime = Date.now();
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptContext }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: optimizationSchema,
        temperature: 0.7,
      },
    });
    await logApiCall('gemini', '/generateContent', 200, Date.now() - startTime);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    await logApiCall('gemini', '/generateContent', 500, Date.now() - startTime, err.message); 
    console.error("AI profile optimization failed:", err);
    throw new Error("Failed to generate profile optimization");
  }
}

// ============================================
// CONTENT STRATEGY
// ============================================

const contentStrategySchema = {
  type: SchemaType.OBJECT,
  properties: {
    contentType: { type: SchemaType.STRING },
    frequency: { type: SchemaType.STRING },
    topics: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    tips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["contentType", "frequency", "topics", "tips"],
};

export async function generateContentStrategy(userProfile) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are a LinkedIn content strategist helping professionals build their personal brand. \n" +
      "OUTPUT FORMAT: Return STRICT JSON with contentType, frequency, topics array (4-6 items), tips array (5-7 items). \n" +
      "Be specific to their industry and role. \n" +
      "Focus on authentic, sustainable content strategies.",
  });

  const promptContext = `Create a LinkedIn content strategy for:

Role: ${userProfile.jobTitle || "Professional"}
Industry: ${userProfile.industry || "General"}
Experience level: ${userProfile.experienceLevel || "Mid-level"}
Current headline: ${userProfile.headline || "Not set"}

Provide:
1. Content focus/type recommendations
2. Realistic posting frequency
3. 4-6 specific topic areas to post about
4. 5-7 actionable tips for maximizing engagement

Tailor recommendations to their industry and career stage.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptContext }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: contentStrategySchema,
        temperature: 0.7,
      },
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error("AI content strategy generation failed:", err);
    throw new Error("Failed to generate content strategy");
  }
}