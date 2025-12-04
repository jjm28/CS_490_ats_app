// services/interviewSuccessPrediction.service.js
import Jobs from "../models/jobs.js";
import InterviewSuccessPrediction from "../models/interviewSuccessPrediction.js";
import InterviewPrep from "../models/interviewPrep.js";
import PracticeSession from "../models/practicesession.js";

/**
 * Calculate preparation checklist completion score
 * @param {Object} preparationChecklist - The checklist from interview
 * @returns {Number} Score from 0-100
 */
function calculatePreparationScore(preparationChecklist) {
  if (!preparationChecklist || !preparationChecklist.items || preparationChecklist.items.length === 0) {
    return 0; // No checklist = 0 score
  }

  const items = preparationChecklist.items;
  const completedItems = items.filter(item => item.completed).length;
  const totalItems = items.length;

  const completionRate = (completedItems / totalItems) * 100;

  // Weight by category importance
  const categoryWeights = {
    research: 1.2,    // Most important
    practice: 1.1,    // Very important
    materials: 1.0,   // Important
    logistics: 0.9,   // Important but less impact
    mindset: 0.8      // Helpful but least direct impact
  };

  let weightedScore = 0;
  let totalWeight = 0;

  for (const item of items) {
    const weight = categoryWeights[item.category] || 1.0;
    totalWeight += weight;
    if (item.completed) {
      weightedScore += weight;
    }
  }

  const finalScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
  
  return Math.round(Math.min(100, finalScore));
}

/**
 * Calculate company research completion score
 * @param {String} userId - User ID
 * @param {String} jobId - Job ID
 * @param {String} companyName - Company name
 * @returns {Promise<Number>} Score from 0-100
 */
async function calculateCompanyResearchScore(userId, jobId, companyName) {
  try {
    const research = await InterviewPrep.findOne({ userId, jobId }).lean();
    
    if (!research) {
      return 0; // No research done
    }

    let score = 0;
    
    // Basic company info (20 points)
    if (research.basicInfo?.description) score += 10;
    if (research.basicInfo?.mission) score += 5;
    if (research.basicInfo?.culture) score += 5;
    
    // Leadership research (15 points)
    if (research.leadership?.searchResults?.length > 0) score += 15;
    
    // News/Recent developments (25 points)
    if (research.news?.length >= 5) score += 25;
    else if (research.news?.length >= 3) score += 15;
    else if (research.news?.length >= 1) score += 10;
    
    // Competitors (15 points)
    if (research.competitors?.length >= 3) score += 15;
    else if (research.competitors?.length >= 1) score += 10;
    
    // Financial health (15 points)
    if (research.financialHealth?.length > 0) score += 15;
    
    // Social media (10 points)
    const hasSocial = research.socialMedia?.linkedin || 
                      research.socialMedia?.twitter || 
                      research.socialMedia?.facebook;
    if (hasSocial) score += 10;
    
    // Recency bonus (up to 10 points)
    if (research.lastResearched) {
      const daysSinceResearch = (Date.now() - new Date(research.lastResearched)) / (1000 * 60 * 60 * 24);
      if (daysSinceResearch <= 7) score += 10;
      else if (daysSinceResearch <= 14) score += 5;
    }
    
    return Math.min(100, score);
  } catch (error) {
    console.error("Error calculating company research score:", error);
    return 0;
  }
}

/**
 * Calculate practice session score
 * @param {String} userId - User ID
 * @param {String} jobId - Job ID
 * @returns {Promise<Number>} Score from 0-100
 */
async function calculatePracticeScore(userId, jobId) {
  try {
    const sessions = await PracticeSession.find({ 
      userId, 
      jobId,
      completed: true 
    }).lean();
    
    if (!sessions || sessions.length === 0) {
      return 0; // No practice sessions
    }

    // Score based on:
    // 1. Number of sessions (more is better, up to 5)
    // 2. Average score across sessions
    // 3. Recency of practice
    
    const sessionCount = Math.min(sessions.length, 5);
    const sessionCountScore = (sessionCount / 5) * 40; // Max 40 points
    
    // Average score across all sessions
    const avgScore = sessions.reduce((sum, s) => sum + (s.averageScore || 0), 0) / sessions.length;
    const avgScorePoints = (avgScore / 100) * 40; // Max 40 points
    
    // Recency bonus (max 20 points)
    const mostRecentSession = sessions.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    
    const daysSinceLastPractice = (Date.now() - new Date(mostRecentSession.createdAt)) / (1000 * 60 * 60 * 24);
    let recencyPoints = 0;
    
    if (daysSinceLastPractice <= 3) recencyPoints = 20;
    else if (daysSinceLastPractice <= 7) recencyPoints = 15;
    else if (daysSinceLastPractice <= 14) recencyPoints = 10;
    else if (daysSinceLastPractice <= 30) recencyPoints = 5;
    
    const totalScore = sessionCountScore + avgScorePoints + recencyPoints;
    
    return Math.round(Math.min(100, totalScore));
  } catch (error) {
    console.error("Error calculating practice score:", error);
    return 0;
  }
}

/**
 * Calculate historical performance score based on past interviews
 * @param {String} userId - User ID
 * @returns {Promise<Number>} Score from 0-100
 */
async function calculateHistoricalPerformance(userId) {
  try {
    const jobs = await Jobs.find({ userId }).lean();
    
    const allInterviews = [];
    
    for (const job of jobs) {
      if (job.interviews && job.interviews.length > 0) {
        for (const interview of job.interviews) {
          allInterviews.push({
            date: interview.date,
            outcome: interview.outcome
          });
        }
      }
    }
    
    if (allInterviews.length === 0) {
      return 50; // Neutral score for no history
    }
    
    // Filter to completed interviews only
    const completedInterviews = allInterviews.filter(i => 
      ['passed', 'rejected', 'offer'].includes(i.outcome)
    );
    
    if (completedInterviews.length === 0) {
      return 50; // Neutral score
    }
    
    // Calculate success rate
    const successfulInterviews = completedInterviews.filter(i => 
      ['passed', 'offer'].includes(i.outcome)
    ).length;
    
    const successRate = (successfulInterviews / completedInterviews.length) * 100;
    
    // Weight more recent interviews higher
    const sortedInterviews = completedInterviews.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    // Take last 5 interviews with higher weight
    const recentInterviews = sortedInterviews.slice(0, 5);
    const recentSuccessful = recentInterviews.filter(i => 
      ['passed', 'offer'].includes(i.outcome)
    ).length;
    
    const recentSuccessRate = recentInterviews.length > 0 
      ? (recentSuccessful / recentInterviews.length) * 100 
      : successRate;
    
    // Weighted average: 60% recent, 40% overall
    const finalScore = (recentSuccessRate * 0.6) + (successRate * 0.4);
    
    return Math.round(Math.min(100, finalScore));
  } catch (error) {
    console.error("Error calculating historical performance:", error);
    return 50; // Default neutral score
  }
}

/**
 * Calculate role match score based on job application data
 * @param {Object} job - Job document
 * @returns {Number} Score from 0-100
 */
function calculateRoleMatchScore(job) {
  if (!job) return 50;
  
  // Use matchScore if available (from other UC features)
  if (job.matchScore != null && !isNaN(job.matchScore)) {
    return Math.round(job.matchScore);
  }
  
  // Otherwise calculate basic match score
  let score = 50; // Start neutral
  
  // If there are skill gaps, reduce score
  if (job.skillGaps && job.skillGaps.length > 0) {
    const gapPenalty = Math.min(30, job.skillGaps.length * 5);
    score -= gapPenalty;
  }
  
  // If match breakdown exists, use it
  if (job.matchBreakdown) {
    const { skills, experience, education } = job.matchBreakdown;
    if (skills != null || experience != null || education != null) {
      const validScores = [skills, experience, education].filter(s => s != null);
      if (validScores.length > 0) {
        score = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
      }
    }
  }
  
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Generate actionable recommendations based on factor scores
 * @param {Object} factors - Factor breakdown object
 * @param {Number} daysUntilInterview - Days until interview
 * @returns {Array} Array of recommendations
 */
function generateRecommendations(factors, daysUntilInterview) {
  const recommendations = [];
  
  // Preparation checklist
  if (factors.preparationScore < 70) {
    recommendations.push({
      priority: 'high',
      category: 'preparation',
      action: 'Complete your interview preparation checklist. Focus on research and practice categories first.',
      potentialImpact: Math.round((100 - factors.preparationScore) * 0.25)
    });
  }
  
  // Company research
  if (factors.companyResearchScore < 60) {
    recommendations.push({
      priority: 'high',
      category: 'research',
      action: 'Deepen your company research. Review recent news, understand their competitors, and research the leadership team.',
      potentialImpact: Math.round((100 - factors.companyResearchScore) * 0.20)
    });
  }
  
  // Practice sessions
  if (factors.practiceScore < 50) {
    recommendations.push({
      priority: 'high',
      category: 'practice',
      action: 'Complete mock interview practice sessions. Aim for at least 2-3 full practice sessions before your interview.',
      potentialImpact: Math.round((100 - factors.practiceScore) * 0.25)
    });
  } else if (factors.practiceScore < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'practice',
      action: 'Do one more practice session focusing on your weakest question types.',
      potentialImpact: Math.round((100 - factors.practiceScore) * 0.25)
    });
  }
  
  // Timing-based recommendations
  if (daysUntilInterview <= 2) {
    recommendations.push({
      priority: 'high',
      category: 'timing',
      action: 'Focus on final preparation: review company research, practice key stories, and prepare thoughtful questions to ask.',
      potentialImpact: 10
    });
  } else if (daysUntilInterview <= 7) {
    recommendations.push({
      priority: 'medium',
      category: 'timing',
      action: 'You have a week to prepare. Dedicate 1-2 hours daily to practice and research.',
      potentialImpact: 15
    });
  }
  
  // Role match
  if (factors.roleMatchScore < 60) {
    recommendations.push({
      priority: 'medium',
      category: 'strategy',
      action: 'Prepare strong examples that demonstrate transferable skills and address any experience gaps proactively.',
      potentialImpact: Math.round((100 - factors.roleMatchScore) * 0.10)
    });
  }
  
  // Sort by potential impact (highest first)
  recommendations.sort((a, b) => b.potentialImpact - a.potentialImpact);
  
  // Limit to top 5 recommendations
  return recommendations.slice(0, 5);
}

/**
 * Calculate confidence level based on data availability and factor variance
 * @param {Object} factors - Factor breakdown object
 * @param {Object} dataAvailability - Flags for what data exists
 * @returns {String} 'low', 'medium', or 'high'
 */
function calculateConfidence(factors, dataAvailability) {
  const { hasChecklist, hasResearch, hasPractice, hasHistory } = dataAvailability;
  
  // Count how many data sources we have
  const dataSourceCount = [hasChecklist, hasResearch, hasPractice, hasHistory]
    .filter(Boolean).length;
  
  // Check variance in factor scores
  const scores = Object.values(factors);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  
  // High confidence: 3+ data sources and low variance
  if (dataSourceCount >= 3 && variance < 400) {
    return 'high';
  }
  
  // Low confidence: 0-1 data sources or very high variance
  if (dataSourceCount <= 1 || variance > 900) {
    return 'low';
  }
  
  // Medium confidence: everything else
  return 'medium';
}

/**
 * Main function to calculate interview success probability
 * @param {String} userId - User ID
 * @param {String} jobId - Job ID
 * @param {String} interviewId - Interview ID from jobs.interviews[]
 * @returns {Promise<Object>} Prediction object
 */
export async function calculateSuccessProbability(userId, jobId, interviewId) {
  try {
    // Fetch the job with interview details
    const job = await Jobs.findOne({ 
      _id: jobId, 
      userId 
    }).lean();
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Find the specific interview
    const interview = job.interviews?.find(i => i._id.toString() === interviewId);
    
    if (!interview) {
      throw new Error('Interview not found');
    }
    
    // Calculate days until interview
    const daysUntilInterview = Math.ceil(
      (new Date(interview.date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate each factor score
    const preparationScore = calculatePreparationScore(interview.preparationChecklist);
    const companyResearchScore = await calculateCompanyResearchScore(userId, jobId, job.company);
    const practiceScore = await calculatePracticeScore(userId, jobId);
    const historicalPerformance = await calculateHistoricalPerformance(userId);
    const roleMatchScore = calculateRoleMatchScore(job);
    
    const factors = {
      preparationScore,
      companyResearchScore,
      practiceScore,
      historicalPerformance,
      roleMatchScore
    };
    
    // Define weights (can be adjusted based on research/data)
    const weights = {
      preparation: 0.25,
      companyResearch: 0.20,
      practice: 0.25,
      historicalPerformance: 0.20,
      roleMatch: 0.10
    };
    
    // Calculate weighted success probability
    const successProbability = Math.round(
      (factors.preparationScore * weights.preparation) +
      (factors.companyResearchScore * weights.companyResearch) +
      (factors.practiceScore * weights.practice) +
      (factors.historicalPerformance * weights.historicalPerformance) +
      (factors.roleMatchScore * weights.roleMatch)
    );
    
    // Determine confidence level
    const dataAvailability = {
      hasChecklist: interview.preparationChecklist?.items?.length > 0,
      hasResearch: companyResearchScore > 0,
      hasPractice: practiceScore > 0,
      hasHistory: historicalPerformance !== 50
    };
    
    const confidence = calculateConfidence(factors, dataAvailability);
    
    // Generate recommendations
    const recommendations = generateRecommendations(factors, daysUntilInterview);
    
    // Create or update prediction
    const predictionData = {
      userId,
      jobId,
      interviewId,
      successProbability,
      confidence,
      factors,
      weights,
      recommendations,
      interviewContext: {
        company: job.company,
        jobTitle: job.jobTitle,
        interviewType: interview.type,
        interviewDate: interview.date,
        daysUntilInterview
      },
      lastRecalculatedAt: new Date()
    };
    
    // Upsert prediction
    const prediction = await InterviewSuccessPrediction.findOneAndUpdate(
      { userId, jobId, interviewId },
      predictionData,
      { upsert: true, new: true }
    );
    
    return prediction;
    
  } catch (error) {
    console.error("Error calculating success probability:", error);
    throw error;
  }
}

/**
 * Get predictions for all upcoming interviews
 * @param {String} userId - User ID
 * @returns {Promise<Array>} Array of predictions with interview details
 */
export async function getUpcomingInterviewPredictions(userId) {
  try {
    const jobs = await Jobs.find({ userId, archived: { $ne: true } }).lean();
    
    const upcomingPredictions = [];
    const now = new Date();
    
    for (const job of jobs) {
      if (job.interviews && job.interviews.length > 0) {
        for (const interview of job.interviews) {
          const interviewDate = new Date(interview.date);
          
          // Only include future interviews
          if (interviewDate >= now && interview.outcome === 'pending') {
            // Calculate or fetch existing prediction
            let prediction = await InterviewSuccessPrediction.findOne({
              userId,
              jobId: job._id,
              interviewId: interview._id.toString()
            }).lean();
            
            // If no prediction exists or it's old (>24 hours), recalculate
            if (!prediction || 
                (Date.now() - new Date(prediction.lastRecalculatedAt || prediction.predictedAt)) > 24 * 60 * 60 * 1000) {
              prediction = await calculateSuccessProbability(userId, job._id.toString(), interview._id.toString());
            }
            
            upcomingPredictions.push({
              ...prediction.toObject ? prediction.toObject() : prediction,
              interview: {
                _id: interview._id,
                type: interview.type,
                date: interview.date,
                locationOrLink: interview.locationOrLink
              }
            });
          }
        }
      }
    }
    
    // Sort by interview date (soonest first)
    upcomingPredictions.sort((a, b) => 
      new Date(a.interviewContext.interviewDate) - new Date(b.interviewContext.interviewDate)
    );
    
    return upcomingPredictions;
    
  } catch (error) {
    console.error("Error getting upcoming interview predictions:", error);
    throw error;
  }
}

/**
 * Update prediction with actual interview outcome
 * @param {String} predictionId - Prediction document ID
 * @param {String} actualOutcome - The actual outcome ('passed', 'rejected', 'offer')
 * @returns {Promise<Object>} Updated prediction
 */
export async function updatePredictionOutcome(predictionId, actualOutcome) {
  try {
    const prediction = await InterviewSuccessPrediction.findByIdAndUpdate(
      predictionId,
      { 
        actualOutcome,
        // predictionAccurate and accuracyScore are calculated by the pre-save hook
      },
      { new: true }
    );
    
    if (!prediction) {
      throw new Error('Prediction not found');
    }
    
    return prediction;
    
  } catch (error) {
    console.error("Error updating prediction outcome:", error);
    throw error;
  }
}

/**
 * Get prediction accuracy statistics for a user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Accuracy statistics
 */
export async function getPredictionAccuracyStats(userId) {
  try {
    const predictions = await InterviewSuccessPrediction.find({
      userId,
      actualOutcome: { $ne: 'pending' }
    }).lean();
    
    if (predictions.length === 0) {
      return {
        totalPredictions: 0,
        accurateCount: 0,
        inaccurateCount: 0,
        uncertainCount: 0,
        accuracyRate: null,
        averageAccuracyScore: null
      };
    }
    
    const accurateCount = predictions.filter(p => p.predictionAccurate === true).length;
    const inaccurateCount = predictions.filter(p => p.predictionAccurate === false).length;
    const uncertainCount = predictions.filter(p => p.predictionAccurate === null).length;
    
    const accuracyRate = predictions.length > 0 
      ? Math.round((accurateCount / predictions.length) * 100) 
      : 0;
    
    const avgAccuracyScore = predictions.reduce((sum, p) => sum + (p.accuracyScore || 0), 0) / predictions.length;
    
    return {
      totalPredictions: predictions.length,
      accurateCount,
      inaccurateCount,
      uncertainCount,
      accuracyRate,
      averageAccuracyScore: Math.round(avgAccuracyScore)
    };
    
  } catch (error) {
    console.error("Error getting prediction accuracy stats:", error);
    throw error;
  }
}

/**
 * Mark a recommendation as completed
 * @param {String} predictionId - Prediction document ID
 * @param {Number} recommendationIndex - Index of recommendation in array
 * @returns {Promise<Object>} Updated prediction
 */
export async function markRecommendationCompleted(predictionId, recommendationIndex) {
  try {
    const prediction = await InterviewSuccessPrediction.findById(predictionId);
    
    if (!prediction) {
      throw new Error('Prediction not found');
    }
    
    if (recommendationIndex >= prediction.recommendations.length) {
      throw new Error('Invalid recommendation index');
    }
    
    prediction.recommendations[recommendationIndex].completed = true;
    prediction.recommendations[recommendationIndex].completedAt = new Date();
    
    await prediction.save();
    
    return prediction;
    
  } catch (error) {
    console.error("Error marking recommendation as completed:", error);
    throw error;
  }
}