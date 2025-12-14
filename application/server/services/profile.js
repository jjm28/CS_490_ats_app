// services/profile.js
import { getDb } from '../db/connection.js';

export async function getProfileByUserId(userId) {
  const db = getDb();
  return db.collection('profiles').findOne({ userId });
}

export async function upsertProfileByUserId(userId, data) {
  const db = getDb();
  const coll = db.collection('profiles');
  const now = new Date();

  const update = {
    $set: { ...data, userId, updatedAt: now },
    $setOnInsert: { createdAt: now },
  };

  // filter by { userId } → one doc per user; 
  await coll.updateOne({ userId }, update, { upsert: true });
  return coll.findOne({ userId });
}

// ==================== PROFILE STRENGTH CALCULATION ====================

/**
 * Helper to check if a value exists and is not empty
 */
function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object' && !Array.isArray(value)) {
    // For objects like location, check if they have actual values
    return Object.values(value).some(v => v && String(v).trim().length > 0);
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Calculate Basic Info score (30 points max)
 */
function calculateBasicInfo(profile) {
  let score = 0;
  
  // Full Name (5 points)
  if (hasValue(profile.fullName)) score += 5;
  
  // Email (5 points)
  if (hasValue(profile.email)) score += 5;
  
  // Phone (5 points)
  if (hasValue(profile.phone)) score += 5;
  
  // Location (5 points) - properly checks if location has actual values
  if (hasValue(profile.location)) score += 5;
  
  // Industry (5 points)
  if (hasValue(profile.industry)) score += 5;
  
  // Photo URL (5 points)
  if (hasValue(profile.photoUrl)) score += 5;
  
  return score;
}

/**
 * Calculate Professional Summary score (15 points max)
 */
function calculateProfessionalSummary(profile) {
  let score = 0;
  
  // Headline (5 points) - with quality check
  if (hasValue(profile.headline)) {
    if (profile.headline.length >= 20) {
      score += 5; // Full points for good headline
    } else if (profile.headline.length >= 10) {
      score += 3; // Partial credit
    } else {
      score += 1; // Minimal credit
    }
  }
  
  // Bio/Summary (10 points) - with quality check
  if (hasValue(profile.bio)) {
    const bioLength = profile.bio.length;
    if (bioLength >= 200) {
      score += 10; // Full points for comprehensive bio
    } else if (bioLength >= 100) {
      score += 7; // Good bio
    } else if (bioLength >= 50) {
      score += 4; // Basic bio
    } else {
      score += 2; // Too short
    }
  }
  
  return score;
}

/**
 * Calculate Experience score (10 points max)
 */
function calculateExperience(profile) {
  let score = 0;
  
  // Experience Level (5 points)
  if (hasValue(profile.experienceLevel)) score += 5;
  
  // LinkedIn Profile URL (5 points) - shows professional presence
  if (hasValue(profile.linkedInProfileUrl)) score += 5;
  
  return score;
}

/**
 * Calculate Employment History score (10 points max)
 */
function calculateEmployment(employmentCount) {
  if (employmentCount >= 3) return 10;
  if (employmentCount >= 2) return 7;
  if (employmentCount >= 1) return 5;
  return 0;
}

/**
 * Calculate Additional Info score (15 points max)
 */
function calculateAdditionalInfo(profile, counts) {
  let score = 0;
  
  // Education (15 points)
  const educationCount = counts.education || 0;
  if (educationCount >= 2) {
    score += 15; // Multiple education entries
  } else if (educationCount === 1) {
    score += 10; // At least one
  }
  
  return score;
}

/**
 * Calculate Skills score (10 points max)
 */
function calculateSkills(skillsCount) {
  if (skillsCount >= 10) return 10;
  if (skillsCount >= 7) return 8;
  if (skillsCount >= 5) return 6;
  if (skillsCount >= 3) return 4;
  if (skillsCount >= 1) return 2;
  return 0;
}

/**
 * Calculate Projects score (10 points max)
 */
function calculateProjects(projectsCount) {
  if (projectsCount >= 5) return 10;
  if (projectsCount >= 3) return 7;
  if (projectsCount >= 2) return 5;
  if (projectsCount >= 1) return 3;
  return 0;
}

/**
 * Calculate Certifications score (5 points max)
 */
function calculateCertifications(certificationsCount) {
  if (certificationsCount >= 3) return 5;
  if (certificationsCount >= 2) return 4;
  if (certificationsCount >= 1) return 3;
  return 0;
}

/**
 * Get badge based on score
 */
function getBadge(score) {
  if (score >= 90) return "All-Star";
  if (score >= 70) return "Strong Profile";
  if (score >= 50) return "On Your Way";
  return "Getting Started";
}

/**
 * Generate personalized suggestions
 */
function generateSuggestions(profile, breakdown, counts) {
  const suggestions = [];
  
  // Basic Info suggestions
  if (breakdown.basicInfo < 30) {
    if (!hasValue(profile.photoUrl)) {
      suggestions.push("Add a professional profile picture to make a great first impression");
    }
    if (!hasValue(profile.phone)) {
      suggestions.push("Add your phone number for better contact options");
    }
    if (!hasValue(profile.location)) {
      suggestions.push("Add your location to help with relevant opportunities");
    }
    if (!hasValue(profile.industry)) {
      suggestions.push("Specify your industry to improve profile visibility");
    }
  }
  
  // Professional Summary suggestions
  if (breakdown.professionalSummary < 15) {
    if (!hasValue(profile.headline)) {
      suggestions.push("Add a compelling headline that summarizes your professional identity");
    } else if (profile.headline.length < 20) {
      suggestions.push("Expand your headline to at least 20 characters for better impact");
    }
    
    if (!hasValue(profile.bio)) {
      suggestions.push("Write a professional bio highlighting your skills and experience");
    } else if (profile.bio.length < 200) {
      suggestions.push("Expand your bio to at least 200 characters for better visibility");
    }
  }
  
  // Experience suggestions
  if (breakdown.experience < 10) {
    if (!hasValue(profile.experienceLevel)) {
      suggestions.push("Add your experience level to help match you with suitable opportunities");
    }
    if (!hasValue(profile.linkedInProfileUrl)) {
      suggestions.push("Add your LinkedIn profile URL to showcase your professional network");
    }
  }
  
  // Employment suggestions
  if (breakdown.employment < 10) {
    const employmentCount = counts.employment || 0;
    if (employmentCount === 0) {
      suggestions.push("Add your work history to demonstrate your professional experience");
    } else if (employmentCount < 3) {
      suggestions.push(`Add more employment entries to strengthen your profile (you have ${employmentCount}, aim for 3+)`);
    }
  }
  
  // Education suggestions
  if (breakdown.education < 15) {
    const educationCount = counts.education || 0;
    if (educationCount === 0) {
      suggestions.push("Add your educational background to complete your profile");
    } else if (educationCount === 1) {
      suggestions.push("Consider adding additional education or certifications");
    }
  }
  
  // Skills suggestions
  if (breakdown.skills < 10) {
    const skillsCount = counts.skills || 0;
    if (skillsCount === 0) {
      suggestions.push("Add your top skills to increase your visibility");
    } else if (skillsCount < 5) {
      suggestions.push(`Add at least 5 skills to improve your profile (you have ${skillsCount})`);
    } else if (skillsCount < 10) {
      suggestions.push(`Add more skills to maximize your score (you have ${skillsCount}, aim for 10+)`);
    }
  }
  
  // Projects suggestions
  if (breakdown.projects < 10) {
    const projectsCount = counts.projects || 0;
    if (projectsCount === 0) {
      suggestions.push("Showcase projects to demonstrate your practical experience");
    } else if (projectsCount < 3) {
      suggestions.push(`Add more projects to stand out (you have ${projectsCount}, aim for 3+)`);
    }
  }
  
  // Certifications suggestions
  if (breakdown.certifications < 5) {
    const certificationsCount = counts.certifications || 0;
    if (certificationsCount === 0) {
      suggestions.push("Add certifications to demonstrate your expertise and commitment");
    } else if (certificationsCount < 3) {
      suggestions.push(`Add more certifications to maximize your credibility (you have ${certificationsCount})`);
    }
  }
  
  // Return top 5 most important suggestions
  return suggestions.slice(0, 5);
}

/**
 * Get missing required fields
 */
function getMissingRequiredFields(profile) {
  const missing = [];
  
  if (!hasValue(profile.fullName)) missing.push("Full Name");
  if (!hasValue(profile.email)) missing.push("Email");
  if (!hasValue(profile.headline)) missing.push("Professional Headline");
  if (!hasValue(profile.bio)) missing.push("Professional Bio");
  
  return missing;
}

/**
 * Get completed sections
 */
function getCompletedSections(breakdown, weights) {
  const completed = [];
  
  if (breakdown.basicInfo === weights.basicInfo) completed.push("Basic Information");
  if (breakdown.professionalSummary === weights.professionalSummary) completed.push("Professional Summary");
  if (breakdown.experience === weights.experience) completed.push("Experience");
  if (breakdown.employment === weights.employment) completed.push("Employment History");
  if (breakdown.education === weights.education) completed.push("Education");
  if (breakdown.skills === weights.skills) completed.push("Skills");
  if (breakdown.projects === weights.projects) completed.push("Projects");
  if (breakdown.certifications === weights.certifications) completed.push("Certifications");
  
  return completed;
}

/**
 * Main calculation function - exported for use in routes
 * @param {Object} profile - The user's profile data
 * @param {Object} counts - Counts from related collections (skills, projects, education, employment, certifications)
 * @returns {Object} Complete profile strength analysis
 */
export function calculateProfileStrength(profile, counts = {}) {
  const WEIGHTS = {
    basicInfo: 30,
    professionalSummary: 15,
    experience: 10,
    employment: 10,
    education: 15,
    skills: 10,
    projects: 5,
    certifications: 5,
  };
  
  const INDUSTRY_AVERAGE = 65;
  
  // Calculate each section
  const breakdown = {
    basicInfo: calculateBasicInfo(profile),
    professionalSummary: calculateProfessionalSummary(profile),
    experience: calculateExperience(profile),
    employment: calculateEmployment(counts.employment || 0),
    education: calculateAdditionalInfo(profile, counts),
    skills: calculateSkills(counts.skills || 0),
    projects: calculateProjects(counts.projects || 0),
    certifications: calculateCertifications(counts.certifications || 0),
  };
  
  // Calculate total score
  const totalScore = Math.round(
    breakdown.basicInfo +
    breakdown.professionalSummary +
    breakdown.experience +
    breakdown.employment +
    breakdown.education +
    breakdown.skills +
    breakdown.projects +
    breakdown.certifications
  );
  
  // Get badge
  const badge = getBadge(totalScore);
  
  // Generate suggestions
  const suggestions = generateSuggestions(profile, breakdown, counts);
  
  // Get missing required fields
  const missingFields = getMissingRequiredFields(profile);
  
  // Get completed sections
  const completedSections = getCompletedSections(breakdown, WEIGHTS);
  
  // Calculate comparison to industry average
  const comparison = totalScore - INDUSTRY_AVERAGE;
  
  return {
    score: totalScore,
    badge,
    suggestions,
    comparison,
    industryAverage: INDUSTRY_AVERAGE,
    breakdown,
    missingFields,
    completedSections,
  };
}

/**
 * Get profile strength for a user (fetches all necessary data)
 * @param {string} userId - The user's ID
 * @returns {Object} Complete profile strength analysis
 */
export async function getProfileStrengthByUserId(userId) {
  const db = getDb();
  
  // Get the base profile
  const profile = await db.collection("profiles").findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Fetch counts from related collections
  const skillsCount = await db.collection("skills").countDocuments({ userId });
  const projectsCount = await db.collection("projects").countDocuments({ userId });
  const educationCount = await db.collection("education").countDocuments({ userId });
  const employmentCount = await db.collection("employments").countDocuments({ userId });
  const certificationsCount = await db.collection("certifications").countDocuments({ userId });

  // Calculate and return strength
  return calculateProfileStrength(profile, {
    skills: skillsCount,
    projects: projectsCount,
    education: educationCount,
    employment: employmentCount,
    certifications: certificationsCount,
  });
}