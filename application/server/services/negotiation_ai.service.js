import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY_FOR_NEGOTIATION || 
  process.env.GOOGLE_API_KEY_FOR_FOLLOWUP || 
  process.env.GOOGLE_API_KEY
);

// Schema for talking points
const talkingPointsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    talkingPoints: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: { 
            type: SchemaType.STRING,
            enum: ['experience', 'skills', 'market_value', 'total_comp', 'unique_value', 'other']
          },
          point: { type: SchemaType.STRING },
          order: { type: SchemaType.NUMBER }
        },
        required: ['category', 'point', 'order']
      }
    }
  },
  required: ['talkingPoints']
};

// Schema for negotiation scripts
const scriptsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    scripts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          scenario: {
            type: SchemaType.STRING,
            enum: ['initial_response', 'counter_offer', 'benefits_discussion', 'timeline_discussion', 'final_decision']
          },
          script: { type: SchemaType.STRING },
          tips: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        },
        required: ['scenario', 'script', 'tips']
      }
    }
  },
  required: ['scripts']
};

// Schema for counter-offer strategy
const counterOfferSchema = {
  type: SchemaType.OBJECT,
  properties: {
    targetSalary: { type: SchemaType.NUMBER },
    minimumAcceptable: { type: SchemaType.NUMBER },
    justification: { type: SchemaType.STRING },
    confidenceLevel: {
      type: SchemaType.STRING,
      enum: ['low', 'medium', 'high']
    }
  },
  required: ['targetSalary', 'minimumAcceptable', 'justification', 'confidenceLevel']
};

// Schema for strategy
const strategySchema = {
  type: SchemaType.OBJECT,
  properties: {
    timing: { type: SchemaType.STRING },
    leverage: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    },
    risks: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    },
    alternatives: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    }
  },
  required: ['timing', 'leverage', 'risks', 'alternatives']
};

/**
 * Generate talking points for salary negotiation
 */
export async function generateTalkingPoints(job, userInfo, marketData) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert salary negotiation coach. Generate 5-7 compelling talking points for a candidate to use in salary negotiation.\n" +
      "OUTPUT FORMAT: Return STRICT JSON only matching the schema.\n" +
      "CATEGORIES: Use these categories: experience, skills, market_value, total_comp, unique_value, other\n" +
      "TONE: Professional, confident, data-driven.\n" +
      "IMPORTANT: Make each point specific and actionable. Use actual numbers when provided.",
  });

  const candidateName = userInfo.firstName 
    ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim()
    : "the candidate";

  const prompt = `Generate salary negotiation talking points for ${candidateName}.

CONTEXT:
- Position: ${job.jobTitle} at ${job.company}
- Current Offer: $${job.finalSalary?.toLocaleString() || 'Not specified'}
- Market Median: $${marketData.average?.toLocaleString() || 'Unknown'}
- Market Range: $${marketData.min?.toLocaleString()} - $${marketData.max?.toLocaleString()}
${job.description ? `- Job Description: ${job.description.substring(0, 300)}...` : ''}

INSTRUCTIONS:
1. Generate 5-7 specific talking points
2. Include at least one point about market value (using the data above)
3. Include points about relevant experience and skills
4. Include a point about total compensation if applicable
5. Order them from strongest to weakest (order: 1-7)
6. Make each point 1-2 sentences, specific and confident

Return as JSON with this structure:
{
  "talkingPoints": [
    {
      "category": "market_value",
      "point": "Based on market research, the median salary for ${job.jobTitle} positions in this market is $X, which is Y% higher than the current offer.",
      "order": 1
    }
  ]
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: talkingPointsSchema,
        temperature: 0.8,
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed.talkingPoints;
  } catch (err) {
    console.error("AI talking points generation failed:", err);
    throw new Error("Failed to generate talking points");
  }
}

/**
 * Generate negotiation scripts for different scenarios
 */
export async function generateNegotiationScripts(job, userInfo, marketData) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert salary negotiation coach. Generate professional negotiation scripts for different scenarios.\n" +
      "OUTPUT FORMAT: Return STRICT JSON only matching the schema.\n" +
      "TONE: Professional, confident but respectful, appreciative.\n" +
      "FORMAT: Each script should be 3-5 sentences. Include 2-3 actionable tips per script.\n" +
      "IMPORTANT: Use the candidate's actual name, not placeholders.",
  });

  const candidateName = userInfo.firstName 
    ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim()
    : "the candidate";

  const prompt = `Generate salary negotiation scripts for ${candidateName}.

CONTEXT:
- Candidate: ${candidateName}
- Position: ${job.jobTitle} at ${job.company}
- Current Offer: $${job.finalSalary?.toLocaleString() || 'Not specified'}
- Market Median: $${marketData.average?.toLocaleString() || 'Unknown'}

SCENARIOS TO COVER:
1. initial_response - How to respond when first receiving the offer
2. counter_offer - How to present a counter-offer professionally
3. benefits_discussion - How to negotiate non-salary benefits
4. timeline_discussion - How to ask for more time to decide
5. final_decision - How to accept or decline gracefully

For each scenario:
- Write a 3-5 sentence script the candidate can use
- Include 2-3 specific tips for that scenario
- Use ${candidateName}'s actual name in the script
- Make it natural and conversational

Return as JSON matching the schema.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: scriptsSchema,
        temperature: 0.8,
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed.scripts;
  } catch (err) {
    console.error("AI scripts generation failed:", err);
    throw new Error("Failed to generate negotiation scripts");
  }
}

/**
 * Generate counter-offer recommendation
 */
export async function generateCounterOffer(job, userInfo, marketData) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert salary negotiation strategist. Generate a data-driven counter-offer recommendation.\n" +
      "OUTPUT FORMAT: Return STRICT JSON only matching the schema.\n" +
      "IMPORTANT: Be realistic and strategic. Base recommendations on market data.",
  });

  const currentOffer = job.finalSalary || 0;
  const marketMedian = marketData.average || currentOffer;
  const marketMax = marketData.max || marketMedian * 1.2;

  const prompt = `Generate a counter-offer recommendation.

CONTEXT:
- Current Offer: $${currentOffer.toLocaleString()}
- Market Median: $${marketMedian.toLocaleString()}
- Market Max: $${marketMax.toLocaleString()}
- Position: ${job.jobTitle}

INSTRUCTIONS:
1. Calculate a realistic target salary (typically 10-20% above current offer, not exceeding market max)
2. Calculate a minimum acceptable salary (your walk-away point)
3. Provide a clear justification citing market data
4. Assess confidence level (high if offer is below market, medium if near market, low if above market)

Return as JSON with:
{
  "targetSalary": number,
  "minimumAcceptable": number,
  "justification": "string explaining the recommendation",
  "confidenceLevel": "low" | "medium" | "high"
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: counterOfferSchema,
        temperature: 0.7,
      },
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error("AI counter-offer generation failed:", err);
    throw new Error("Failed to generate counter-offer");
  }
}

/**
 * Generate negotiation strategy
 */
export async function generateNegotiationStrategy(job, userInfo, marketData) {
    if (!job.finalSalary) {
      throw new Error("Current salary offer is required to generate strategy");
    }
  
    const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction:
      "You are an expert salary negotiation strategist. Generate a comprehensive negotiation strategy.\n" +
      "OUTPUT FORMAT: Return STRICT JSON only matching the schema.\n" +
      "TONE: Strategic, realistic, risk-aware.",
  });

  const prompt = `Generate a salary negotiation strategy.

CONTEXT:
- Position: ${job.jobTitle} at ${job.company}
- Current Offer: $${job.finalSalary?.toLocaleString() || 'Not specified'}
- Market Position: ${marketData.average ? (job.finalSalary > marketData.average ? 'Above' : 'Below') + ' market median' : 'Unknown'}

INSTRUCTIONS:
Generate a strategy covering:
1. TIMING: When to respond (e.g., "Within 3-5 business days")
2. LEVERAGE: 3-5 points that strengthen negotiating position (e.g., "Specialized skills in high demand")
3. RISKS: 2-4 potential risks to be aware of (e.g., "Company may have fixed salary bands")
4. ALTERNATIVES: 2-3 alternatives if salary negotiation fails (e.g., "Negotiate sign-on bonus", "Request earlier salary review")

Return as JSON matching the schema.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: strategySchema,
        temperature: 0.8,
      },
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error("AI strategy generation failed:", err);
    throw new Error("Failed to generate negotiation strategy");
  }
}