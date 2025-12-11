import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_FOLLOWUP || process.env.GOOGLE_API_KEY);

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
  },
  required: ["subject", "body"],
};

export async function generateFollowUpContent(job, interview, type, userInfo = {}) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction:
      "You are an expert career coach helping a candidate write a professional interview follow-up email. \n" +
      "OUTPUT FORMAT: Return STRICT JSON only: { subject: string, body: string }. \n" +
      "TONE: Professional, concise, courteous, and enthusiastic. \n" +
      "FORMATTING: Use \\n\\n for paragraph breaks in the body (double line breaks for spacing). \n" +
      "IMPORTANT: Never use placeholder text like [Your Name] or [Job Title]. Use the actual information provided.",
  });

  // Construct context with actual user info
  const candidateName = userInfo.firstName 
    ? `${userInfo.firstName} ${userInfo.lastName || ''}`.trim()
    : "the candidate"; // Fallback if no name
    
  const interviewerName = interview.interviewer || "the hiring team";
  const interviewType = interview.type || "interview";
  const company = job.company;
  const role = job.jobTitle;

  let promptContext = "";

  switch (type) {
    case "thank_you":
      promptContext = `Write a thank you email from ${candidateName} after a ${interviewType} interview for the ${role} position at ${company}. 
      
Recipient: ${interviewerName}
Candidate's Name: ${candidateName}
Position: ${role}
Company: ${company}

Goal: Express gratitude, reiterate interest, and mention looking forward to next steps.

Key points to include:
- Thank ${interviewerName} for their time
- Reference the ${role} position specifically
- Show enthusiasm for ${company}
- Keep it concise (3-4 short paragraphs)
- Close professionally with candidate's name: ${candidateName}`;
      break;

    case "status_inquiry":
      promptContext = `Write a polite status inquiry email from ${candidateName}. They interviewed for the ${role} position at ${company} about a week ago and haven't heard back.

Recipient: ${interviewerName}
Candidate's Name: ${candidateName}
Position: ${role}
Company: ${company}

Goal: Professionally ask for a hiring timeline update without sounding desperate or pushy.

Key points:
- Remind them of the interview date
- Reiterate interest in the ${role} position
- Politely ask for an update on the timeline
- Express continued enthusiasm for ${company}
- Sign with candidate's name: ${candidateName}`;
      break;

    case "feedback_request":
      promptContext = `Write a graceful feedback request email from ${candidateName} after being rejected for the ${role} position at ${company}.

Recipient: ${interviewerName}
Candidate's Name: ${candidateName}
Position: ${role}
Company: ${company}

Goal: Accept the decision gracefully and request constructive feedback to improve future interviews.

Key points:
- Thank them for the opportunity and consideration
- Accept the decision professionally
- Ask for 1-2 specific pieces of feedback on the interview performance
- Express appreciation for any guidance they can provide
- Keep tone humble and receptive
- Sign with candidate's name: ${candidateName}`;
      break;

    case "networking":
      promptContext = `Write a networking follow-up email from ${candidateName} to ${interviewerName} after not getting the ${role} position at ${company}.

Recipient: ${interviewerName}
Candidate's Name: ${candidateName}
Position: ${role}
Company: ${company}

Goal: Maintain a professional relationship and express interest in future opportunities.

Key points:
- Thank them for the interview experience
- Express continued admiration for ${company}
- Suggest connecting on LinkedIn
- Express interest in staying on their radar for future roles
- Keep tone positive and forward-looking
- Sign with candidate's name: ${candidateName}`;
      break;

    default:
      promptContext = `Write a professional follow-up email from ${candidateName} for the ${role} position at ${company}.`;
  }

  // Add specific interview notes if available
  if (interview.notes) {
    promptContext += `\n\nIMPORTANT: Reference this specific topic discussed during the interview: "${interview.notes}"\nWeave this naturally into the email to show attentiveness and personalization.`;
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: promptContext }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.7,
      },
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error("AI Follow-up generation failed:", err);
    throw new Error("Failed to generate email content");
  }
}