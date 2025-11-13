// server/services/matchAnalysis.service.js
import { ObjectId } from 'mongodb';
import { getDb } from '../../db/connection.js'; // Adjust path if needed

// Main function to calculate match score

export async function analyzeJobMatch(
  userId,
  jobId,
  weights = { skills: 0.6, experience: 0.3, education: 0.1 } // ✅ default weights
) {
    const db = getDb();
    const job = await db.collection('jobs').findOne({ _id: ObjectId(jobId), userId });
    const userSkills = await db.collection('skills').find({ userId }).toArray();
    const userProfile = await db.collection('profiles').findOne({ userId });

  // Call your core analysis logic
  const analysis = calculateJobMatch(job, userSkills, weights, userProfile);

  // Update the job document
  await db.collection('jobs').updateOne(
    { _id: ObjectId(jobId), userId },
    {
      $set: {
        matchScore: analysis.matchScore,
        matchBreakdown: analysis.breakdown,
        skillGaps: analysis.skillGaps,
        matchedSkills: analysis.matchedSkills,
        suggestions: analysis.suggestions,
        matchTimestamp: new Date()
      },
      $push: {
        matchHistory: {
          $each: [{ ...analysis, timestamp: new Date() }],
          $slice: -20
        }
      }
    }
  );

  return analysis;
}


export function calculateJobMatch(job, userSkills, weights, userProfile) {
  const jobDescription = job.description || '';
  const requiredSkills = extractSkillsFromJob(jobDescription);

  const matchedSkills = [];
  const missingSkills = [];

  const userSkillNames = userSkills.map(s => s.name.toLowerCase());
  for (const skill of requiredSkills) {
    if (userSkillNames.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // --- EXPERIENCE MATCH ---
  const jobLevel = extractExperienceLevel(jobDescription);
  const userLevel = userProfile?.experienceLevel || 'Intermediate';
  const experienceMatch = compareExperience(jobLevel, userLevel);

  // --- EDUCATION MATCH ---
  const requiredEdu = extractEducationRequirement(jobDescription);
  const userEdu = userProfile?.educationLevel || 'Bachelor';
  const educationMatch = compareEducation(requiredEdu, userEdu);

  const breakdown = {
    skills: Math.round((matchedSkills.length / requiredSkills.length) * 100),
    experience: experienceMatch,
    education: educationMatch
  };

  const overallScore = Math.round(
    breakdown.skills * weights.skills +
    breakdown.experience * weights.experience +
    breakdown.education * weights.education
  );

  const suggestions = generateSuggestions(missingSkills, jobLevel, userLevel, requiredEdu, userEdu);

  return {
    matchScore: overallScore,
    breakdown,
    matchedSkills,
    skillGaps: missingSkills,
    suggestions
  };
}


// Helper functions
function extractSkillsFromJob(description) {
  const skillKeywords = [
    'Python', 'JavaScript', 'React', 'SQL', 'Tableau', 'Excel', 'AWS', 'Docker', 'Kubernetes'
  ];
  const foundSkills = [];
  const lowerDesc = description.toLowerCase();
  for (const skill of skillKeywords) {
    if (lowerDesc.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  return foundSkills;
}

function extractExperienceLevel(description) {
  if (description.match(/senior/i)) return 'Senior';
  if (description.match(/junior/i)) return 'Junior';
  return 'Intermediate';
}

function compareExperience(jobLevel, userLevel) {
  const levels = ['Junior', 'Intermediate', 'Senior'];
  const diff = levels.indexOf(userLevel) - levels.indexOf(jobLevel);
  return diff >= 0 ? 100 : 70 + diff * 15; // crude heuristic
}

function extractEducationRequirement(description) {
  if (description.match(/master/i)) return 'Master';
  if (description.match(/phd/i)) return 'PhD';
  return 'Bachelor';
}

function compareEducation(required, user) {
  const levels = ['Associate', 'Bachelor', 'Master', 'PhD'];
  const diff = levels.indexOf(user) - levels.indexOf(required);
  return diff >= 0 ? 100 : 70 + diff * 10;
}

function generateSuggestions(missingSkills, jobLevel, userLevel, requiredEdu, userEdu) {
  const suggestions = [];

  if (missingSkills.length)
    suggestions.push(
      `Consider learning these skills: ${missingSkills.join(', ')}.`
    );

  if (userLevel !== jobLevel)
    suggestions.push(`Your experience level (${userLevel}) differs from the job’s (${jobLevel}).`);

  if (userEdu !== requiredEdu)
    suggestions.push(`This job requires ${requiredEdu}-level education, you currently have ${userEdu}.`);

  missingSkills.forEach(skill => {
    suggestions.push(`Learn ${skill} here: ${generateLearningLink(skill)}`);
  });

  return suggestions;
}


function generateLearningLink(skill) {
  // Trim potential trailing spaces from copied URLs
  const resourceMap = {
    'Python': 'https://www.python.org/about/gettingstarted/',
    'SQL': 'https://www.w3schools.com/sql/',
    'React': 'https://react.dev/learn/tutorial-tic-tac-toe',
    'Tableau': 'https://www.tableau.com/learn/training',
    'AWS': 'https://aws.amazon.com/training/',
    'Docker': 'https://www.docker.com/101-tutorial/',
    'Kubernetes': 'https://kubernetes.io/docs/tutorials/',
  };
  // Use the mapped URL or a Google search fallback, ensuring no trailing spaces
  return resourceMap[skill.trim()] || `https://www.google.com/search?q=learn+${encodeURIComponent(skill.trim())}`;
}