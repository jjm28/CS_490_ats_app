// services/jobs.service.js
import Jobs from "../models/jobs.js";
import mongoose from "mongoose";
import { generateFollowUpContent } from "./followup_ai.service.js";
import notificationService from './notifications.service.js';
import { getDb } from "../db/connection.js";

export async function createJob({ userId, payload }) {
  // Prevent empty package
  if (payload.applicationPackage) delete payload.applicationPackage;

  return Jobs.create({ ...payload, userId });
}



export async function getAllJobs({ userId }) {
  return Jobs.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getJob({ userId, id }) {
  return Jobs.findOne({ _id: id, userId }).lean();
}

export async function updateJob({ userId, id, payload }) {
  return Jobs.findOneAndUpdate(
    { _id: id, userId },
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteJob({ userId, id }) {
  return Jobs.findOneAndDelete({ _id: id, userId });
}

export async function getArchivedJobs({ userId }) {
  return Jobs.find({ userId, archived: true }).sort({ updatedAt: -1 }).lean();
}

export async function setArchive({ userId, id, archive, reason }) {
  const payload = archive
    ? { archived: true, archiveReason: reason || "User action", archivedAt: new Date() }
    : { archived: false, archiveReason: null, archivedAt: null };
  return Jobs.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
}

export async function getJobStats(userId) {
  console.log("[getJobStats] starting for user:", userId);

  try {
    const all = await Jobs.find({ userId }).lean();
    if (!all || all.length === 0) {
      return {
        total: 0,
        byStatus: {},
        applicationsSent: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        overallConversion: 0,
        responseRate: 0,
        avgOfferTime: 0,
        deadlineAdherence: 100,
        monthlyCounts: {},
        avgStageDurations: {},
        averageResponseTimeDisplay: "—",
        conversion: {
          applyToPhone: 0,
          applyToInterview: 0,
          applyToOffer: 0,
          phoneToInterview: 0,
          interviewToOffer: 0,
        },
        applicationTrend7Days: {
          Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
        },
        successPatterns: {
          mostActiveDay: "N/A",
          interviewRate: "No interviews yet",
          avgResponse: "—"
        }
      };
    }

    // =======================================
    // BASIC COUNTS
    // =======================================
    let applicationsSent = 0;
    let interviewsScheduled = 0;
    let offersReceived = 0;

    for (const job of all) {
      const history = job.statusHistory || [];
      if (history.some(h => h.status === "applied")) applicationsSent++;
      if (history.some(h => h.status === "interview")) interviewsScheduled++;
      if (history.some(h => h.status === "offer")) offersReceived++;
    }

    const byStatus = all.reduce((acc, j) => {
      const s = j.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const total = all.length;

    // =======================================
    // TIME TO FIRST RESPONSE
    // =======================================
    let responseMinutesList = [];

    for (const job of all) {
      const hist = job.statusHistory || [];
      const applied = hist.find(h => h.status === "applied");
      if (!applied || !applied.timestamp) continue;

      const appliedAt = new Date(applied.timestamp);
      if (isNaN(appliedAt)) continue;

      const responses = hist
        .filter(h =>
          ["phone_screen", "interview", "rejected", "offer"].includes(h.status)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (responses.length === 0) continue;

      const firstResponse = new Date(responses[0].timestamp);
      if (isNaN(firstResponse)) continue;

      const diffMs = firstResponse - appliedAt;
      if (diffMs < 0) continue;

      responseMinutesList.push(diffMs / 60000);
    }

    let averageResponseTimeDisplay = "—";
    if (responseMinutesList.length > 0) {
      const avgMin =
        responseMinutesList.reduce((a, b) => a + b, 0) /
        responseMinutesList.length;

      if (avgMin < 60) {
        averageResponseTimeDisplay = `${Math.round(avgMin)} minutes`;
      } else if (avgMin < 48 * 60) {
        averageResponseTimeDisplay = `${Math.round(avgMin / 60)} hours`;
      } else {
        averageResponseTimeDisplay = `${Math.round(avgMin / 1440)} days`;
      }
    }

    // =======================================
    // CONVERSION FUNNEL (ENTRY-BASED)
    // =======================================
    let appliedCount = 0;
    let phoneCount = 0;
    let interviewCount = 0;
    let offerCount = 0;

    for (const job of all) {
      const hist = job.statusHistory || [];
      if (hist.some(h => h.status === "applied")) appliedCount++;
      if (hist.some(h => h.status === "phone_screen")) phoneCount++;
      if (hist.some(h => h.status === "interview")) interviewCount++;
      if (hist.some(h => h.status === "offer")) offerCount++;
    }

    const conversion = {
      applyToPhone: appliedCount ? Math.round((phoneCount / appliedCount) * 100) : 0,
      applyToInterview: appliedCount ? Math.round((interviewCount / appliedCount) * 100) : 0,
      applyToOffer: appliedCount ? Math.round((offerCount / appliedCount) * 100) : 0,
      phoneToInterview: phoneCount ? Math.round((interviewCount / phoneCount) * 100) : 0,
      interviewToOffer: interviewCount ? Math.round((offerCount / interviewCount) * 100) : 0,
    };

    const overallConversion =
      applicationsSent > 0
        ? Math.round((offersReceived / applicationsSent) * 100)
        : 0;

    // =======================================
    // 7-DAY TREND (SAFE VERSION)
    // =======================================
    const last7Days = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    for (const job of all) {
      if (!job.createdAt) continue;
      const created = new Date(job.createdAt);
      if (isNaN(created)) continue;

      const diff = (Date.now() - created.getTime()) / 86400000;
      if (diff < 0 || diff > 6) continue;

      const day = created.toLocaleDateString("en-US", { weekday: "short" });
      if (last7Days[day] !== undefined) {
        last7Days[day]++;
      }
    }

    // =======================================
    // SUCCESS PATTERNS FOR DEMO
    // =======================================
    const successPatterns = {
      mostActiveDay:
        Object.entries(last7Days).sort((a, b) => b[1] - a[1])[0][0] || "N/A",
      interviewRate:
        interviewsScheduled > 0
          ? `${interviewsScheduled} interviews so far`
          : "No interviews yet",
      avgResponse: averageResponseTimeDisplay
    };

    // =======================================
    // RESPONSE RATE
    // =======================================
    const respondedCount = all.filter(j =>
      j.responseReceived ||
      ["phone_screen", "interview", "offer", "rejected"].includes(j.status)
    ).length;

    const responseRate = total ? Math.round((respondedCount / total) * 100) : 0;

    return {
      total,
      byStatus,
      applicationsSent,
      interviewsScheduled,
      offersReceived,
      overallConversion,
      responseRate,
      avgOfferTime: 0, // not needed for demo now
      deadlineAdherence: 100,
      monthlyCounts: {},
      avgStageDurations: {},
      averageResponseTimeDisplay,
      conversion,
      applicationTrend7Days: last7Days,
      successPatterns
    };

  } catch (err) {
    console.error("[getJobStats] ERROR:", err);
    throw err;
  }
}

/**
 * Update job status and add entry to statusHistory
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.id - Job ID
 * @param {string} params.status - New status value
 * @param {string} [params.note] - Optional note about the status change
 * @returns {Promise<Object|null>} Updated job or null if not found
 */
export async function updateJobStatus({ userId, id, status, note }) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const updateData = {
    status,
    $push: {
      statusHistory: {
        status,
        timestamp: new Date(),
        ...(note && { note }),
      },
    },
  };

  const job = await Jobs.findOneAndUpdate({ _id: id, userId }, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  return job;
}

/**
 * Bulk update job statuses for multiple jobs
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string[]} params.jobIds - Array of job IDs to update
 * @param {string} params.status - New status value
 * @param {string} [params.note] - Optional note about the status change
 * @returns {Promise<Object>} Object with modifiedCount and updated jobs array
 */
export async function bulkUpdateJobStatus({ userId, jobIds, status, note }) {
  // Filter for valid ObjectIds only
  const validIds = jobIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    return { modifiedCount: 0, jobs: [] };
  }

  const timestamp = new Date();
  const historyEntry = {
    status,
    timestamp,
    ...(note && { note }),
  };

  // Perform bulk update
  const result = await Jobs.updateMany(
    {
      _id: { $in: validIds },
      userId,
    },
    {
      status,
      $push: { statusHistory: historyEntry },
    }
  );

  // Fetch the updated jobs to return to client
  const jobs = await Jobs.find({
    _id: { $in: validIds },
    userId,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    modifiedCount: result.modifiedCount,
    jobs,
  };
}

/**
 * Get jobs filtered by status (enhanced version of getAllJobs)
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} [params.status] - Optional status to filter by
 * @returns {Promise<Array>} Array of jobs
 */
export async function getJobsByStatus({ userId, status }) {
  const filter = { userId };

  // Add status filter if provided
  if (status) {
    filter.status = status;
  }

  const jobs = await Jobs.find(filter).sort({ updatedAt: -1 }).lean();
  return jobs;
}

export async function addApplicationHistory({ userId, id, action }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;
    job.applicationHistory.push({
      action: action.trim(),
      timestamp: new Date()
    });
    await job.save();
    return job;
  } catch (err) {
    console.error('Error in addApplicationHistory service:', err);
    throw err;
  }
}

export async function updateApplicationHistory({ userId, id, historyIndex, action }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    if (historyIndex >= job.applicationHistory.length) {
      return null;
    }

    job.applicationHistory[historyIndex].action = action.trim();
    // Keep original timestamp

    await job.save();
    return job;
  } catch (err) {
    console.error('Error in updateApplicationHistory service:', err);
    throw err;
  }
}

export async function deleteApplicationHistory({ userId, id, historyIndex }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    if (historyIndex >= job.applicationHistory.length) {
      return null;
    }

    job.applicationHistory.splice(historyIndex, 1);

    await job.save();
    return job;
  } catch (err) {
    console.error('Error in deleteApplicationHistory service:', err);
    throw err;
  }
}

/**
 * Get all upcoming interviews for a user across all jobs
 */
export async function getUpcomingInterviews({ userId }) {
  try {
    const now = new Date();
    const jobs = await Jobs.find({ 
      userId, 
      archived: { $ne: true },
      'interviews.0': { $exists: true } // Only get jobs that have interviews
    }).lean();

    const upcomingInterviews = [];

    for (const job of jobs) {
      if (job.interviews && job.interviews.length > 0) {
        for (const interview of job.interviews) {
          const interviewDate = new Date(interview.date);
          
          // Only include future interviews
          if (interviewDate >= now) {
            upcomingInterviews.push({
              _id: interview._id.toString(),
              jobId: job._id.toString(),
              company: job.company,
              jobTitle: job.jobTitle,
              type: interview.type,
              date: interview.date,
              interviewer: interview.interviewer,
              locationOrLink: interview.locationOrLink,
              preparationChecklist: interview.preparationChecklist,
              hasChecklist: interview.preparationChecklist?.items?.length > 0 || false,
            });
          }
        }
      }
    }

    // Sort by date (soonest first)
    upcomingInterviews.sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcomingInterviews;
  } catch (err) {
    console.error("Error fetching upcoming interviews:", err);
    throw err;
  }
}

/**
 * Generate checklist items for an interview
 */
export async function generateChecklistItems(job, interview) {
  const items = [];
  let order = 1;
  const jobTitleLower = job.jobTitle?.toLowerCase() || '';

  // RESEARCH CATEGORY
  items.push({
    id: 'research-company-mission',
    category: 'research',
    task: `Review ${job.company}'s mission, values, and company culture`,
    completed: false,
    order: order++
  });
  
  items.push({
    id: 'research-recent-news',
    category: 'research',
    task: `Research recent news and developments about ${job.company}`,
    completed: false,
    order: order++
  });
  
  if (interview.interviewer) {
    items.push({
      id: 'research-interviewer',
      category: 'research',
      task: `Look up ${interview.interviewer} on LinkedIn and review their background`,
      completed: false,
      order: order++
    });
  }
  
  items.push({
    id: 'research-competitors',
    category: 'research',
    task: `Understand ${job.company}'s competitive landscape and market position`,
    completed: false,
    order: order++
  });
  
  // LOGISTICS CATEGORY
  if (interview.type === 'video') {
    items.push({
      id: 'logistics-tech-check',
      category: 'logistics',
      task: 'Test camera, microphone, and internet connection',
      completed: false,
      order: order++
    });
    
    items.push({
      id: 'logistics-background',
      category: 'logistics',
      task: 'Prepare professional background and lighting for video call',
      completed: false,
      order: order++
    });
  }
  
  if (interview.type === 'in-person') {
    items.push({
      id: 'logistics-directions',
      category: 'logistics',
      task: `Plan route and travel time to ${interview.locationOrLink || 'interview location'}`,
      completed: false,
      order: order++
    });
    
    items.push({
      id: 'logistics-attire',
      category: 'logistics',
      task: 'Choose and prepare professional attire appropriate for company culture',
      completed: false,
      order: order++
    });

    // Enhanced attire suggestion
    const companyName = job.company?.toLowerCase() || '';
    let attireGuidance = 'Choose and prepare professional attire';
    
    // Check for startup indicators
    if (companyName.includes('startup') || 
        job.companySize === 'Small' || 
        jobTitleLower.includes('founder')) {
      attireGuidance += ' (business casual likely appropriate for startup culture)';
    } 
    // Check for corporate indicators
    else if (companyName.includes('bank') || 
            companyName.includes('consulting') || 
            companyName.includes('finance') ||
            companyName.includes('law')) {
      attireGuidance += ' (business formal recommended for corporate environment)';
    }
    // Tech companies
    else if (jobTitleLower.includes('engineer') || jobTitleLower.includes('developer')) {
      attireGuidance += ' (smart casual is often appropriate for tech roles)';
    }
    
    items.push({
      id: 'logistics-attire',
      category: 'logistics',
      task: attireGuidance,
      completed: false,
      order: order++
    });
  }
  
  items.push({
    id: 'logistics-materials',
    category: 'logistics',
    task: 'Have copies of resume, portfolio, and notepad ready',
    completed: false,
    order: order++
  });
  
  // MATERIALS CATEGORY
  items.push({
    id: 'materials-resume-review',
    category: 'materials',
    task: 'Review your resume and be ready to discuss each experience',
    completed: false,
    order: order++
  });
  
  items.push({
    id: 'materials-questions',
    category: 'materials',
    task: `Prepare 3-5 thoughtful questions to ask about ${job.jobTitle} role`,
    completed: false,
    order: order++
  });
  
  items.push({
    id: 'materials-examples',
    category: 'materials',
    task: 'Prepare specific examples demonstrating key skills for this role',
    completed: false,
    order: order++
  });
  
  // PRACTICE CATEGORY
  items.push({
    id: 'practice-common-questions',
    category: 'practice',
    task: 'Practice answers to common interview questions (Tell me about yourself, strengths/weaknesses)',
    completed: false,
    order: order++
  });
  
  items.push({
    id: 'practice-star-method',
    category: 'practice',
    task: 'Practice behavioral responses using STAR method (Situation, Task, Action, Result)',
    completed: false,
    order: order++
  });
  
  if (jobTitleLower.includes('engineer') || 
      jobTitleLower.includes('developer') ||
      jobTitleLower.includes('technical')) {
    items.push({
      id: 'practice-technical',
      category: 'practice',
      task: 'Review technical concepts and practice coding challenges relevant to the role',
      completed: false,
      order: order++
    });
  }

  // Design roles
  if (jobTitleLower.includes('designer') || jobTitleLower.includes('ux') || jobTitleLower.includes('ui')) {
    items.push({
      id: 'materials-portfolio-design',
      category: 'materials',
      task: 'Prepare design portfolio with 3-5 best projects and be ready to discuss design decisions',
      completed: false,
      order: order++
    });
  }

  // Sales/Business roles
  if (jobTitleLower.includes('sales') || jobTitleLower.includes('business development') || jobTitleLower.includes('account')) {
    items.push({
      id: 'practice-sales-pitch',
      category: 'practice',
      task: 'Practice your elevator pitch and prepare examples of successful deals/relationships',
      completed: false,
      order: order++
    });
  }

  // Product Manager roles
  if (jobTitleLower.includes('product manager') || jobTitleLower.includes('product owner')) {
    items.push({
      id: 'practice-product-case',
      category: 'practice',
      task: 'Practice product case studies and be ready to discuss prioritization frameworks',
      completed: false,
      order: order++
    });
  }

  // Data/Analytics roles
  if (jobTitleLower.includes('data') || jobTitleLower.includes('analyst') || jobTitleLower.includes('analytics')) {
    items.push({
      id: 'practice-data-case',
      category: 'practice',
      task: 'Prepare to discuss data projects and analytical approaches you\'ve used',
      completed: false,
      order: order++
    });
  }
  
  // MINDSET CATEGORY (enhanced)
  items.push({
    id: 'mindset-achievements',
    category: 'mindset',
    task: 'Review your key achievements and remind yourself of your value',
    completed: false,
    order: order++
  });

  // 🆕 Specific exercises
  items.push({
    id: 'mindset-breathing-exercise',
    category: 'mindset',
    task: 'Practice box breathing (4-4-4-4) to manage interview nerves',
    completed: false,
    order: order++
  });

  items.push({
    id: 'mindset-power-pose',
    category: 'mindset',
    task: 'Do a 2-minute power pose before the interview to boost confidence',
    completed: false,
    order: order++
  });

  items.push({
    id: 'mindset-visualization',
    category: 'mindset',
    task: 'Visualize a successful interview outcome and positive interactions',
    completed: false,
    order: order++
  });

  items.push({
    id: 'mindset-sleep',
    category: 'mindset',
    task: 'Get good rest the night before the interview',
    completed: false,
    order: order++
  });

  items.push({
    id: 'mindset-arrive-early',
    category: 'mindset',
    task: 'Plan to arrive/log in 10-15 minutes early',
    completed: false,
    order: order++
  });

  items.push({
    id: 'follow-up-thank-you',
    category: 'mindset', // Keep in mindset for now
    task: 'Send thank-you email within 24 hours of interview',
    completed: false,
    order: order++
  });
  
  return items;
}

// 1. Generate the template (Does not save to DB, just returns to UI)
export async function createFollowUpTemplate({ userId, jobId, interviewId, type }) {
  try {
    const jobIdValid = mongoose.Types.ObjectId.isValid(jobId);
    const interviewIdValid = mongoose.Types.ObjectId.isValid(interviewId);
    if (!jobIdValid) {
      throw new Error("Invalid job ID format");
    }
    if (!interviewIdValid) {
      throw new Error("Invalid interview ID format");
    }

    // ✅ Find job
    const job = await Jobs.findOne({ _id: jobId, userId }).lean();
    if (!job) {
      throw new Error("Job not found or does not belong to user");
    }

    const interview = job.interviews?.find(
      (i) => i._id.toString() === interviewId.toString()
    );
    
    if (!interview) {
      throw new Error("Interview not found in this job");
    }

    // 🆕 Fetch user information for personalization
    const db = getDb(); // Make sure you import getDb from your connection file
    const user = await db.collection('users').findOne({ _id: userId });
    
    const userInfo = {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    };

    // 🆕 Call the AI Service with user info
    const template = await generateFollowUpContent(job, interview, type, userInfo);
    
    return { ...template, type };
  } catch (err) {
    console.error("Error in createFollowUpTemplate:", err);
    throw err;
  }
}

// 2. Save a generated/edited follow-up to the DB
export async function saveFollowUp({ userId, jobId, interviewId, payload }) {
  try {
    // Normalize IDs to strings and trim whitespace
    const normalizedUserId = String(userId).trim();
    const normalizedJobId = String(jobId).trim();
    const normalizedInterviewId = String(interviewId).trim();

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(normalizedJobId)) {
      throw new Error("Invalid job ID format");
    }

    if (!mongoose.Types.ObjectId.isValid(normalizedInterviewId)) {
      throw new Error("Invalid interview ID format");
    }

    // Find job (NOT using .lean() because we need to modify it)
    const job = await Jobs.findOne({ _id: normalizedJobId, userId: normalizedUserId });
    if (!job) {
      throw new Error("Job not found or does not belong to user");
    }

    // Find interview using Mongoose .id() method
    const interview = job.interviews.id(normalizedInterviewId);
    if (!interview) {
      throw new Error("Interview not found in this job");
    }

    // Validate email if user wants to send
    if (payload.sendEmail && !interview.contactInfo) {
      throw new Error(
        "Cannot send email: No contact email found for this interview. " +
        "Please add the interviewer's email in the interview details first."
      );
    }

    // Validate email format if provided
    if (payload.sendEmail && interview.contactInfo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(interview.contactInfo)) {
        throw new Error(
          `Invalid email format: "${interview.contactInfo}". ` +
          "Please update the interviewer's contact info with a valid email."
        );
      }
    }

    // Create follow-up record
    const followUp = {
      type: payload.type,
      subject: payload.subject,
      body: payload.body,
      customized: payload.customized || false,
      sent: payload.sendEmail || false,
      sentAt: payload.sendEmail ? new Date() : null,
      sentVia: payload.sendEmail ? 'email' : 'copied',
      generatedAt: new Date()
    };

    // Push to array and save
    interview.followUps.push(followUp);
    await job.save();

    // Get the newly created follow-up
    const savedFollowUp = interview.followUps[interview.followUps.length - 1];

    // Send email if requested
    if (payload.sendEmail && interview.contactInfo) {
      try {
        // Fetch user info for sender name
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: normalizedUserId });
        
        const senderName = user?.firstName 
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : null;

        await notificationService.sendFollowUpEmail(
          interview.contactInfo,
          payload.subject,
          payload.body,
          senderName
        );
      } catch (emailError) {
        // Email failed but we still saved the follow-up
        // Update the follow-up to mark it as failed
        savedFollowUp.sent = false;
        savedFollowUp.sentVia = 'copied';
        await job.save();
        
        throw new Error(
          `Follow-up saved as draft, but email failed to send: ${emailError.message}. ` +
          "You can copy the email content and send it manually."
        );
      }
    }
    
    // Return the newly created item
    return savedFollowUp.toObject ? savedFollowUp.toObject() : savedFollowUp;
  } catch (err) {
    console.error("Error in saveFollowUp:", err.message);
    throw err;
  }
}

// 3. Mark a follow-up as sent (if user sends it later via 'copy to clipboard')
export async function updateFollowUpStatus({ userId, jobId, interviewId, followUpId, updates }) {
  try {
    console.log('🔍 ===== DEBUG: updateFollowUpStatus =====');
    console.log('📥 Received params:');
    console.log('  userId:', userId, '| type:', typeof userId);
    console.log('  jobId:', jobId, '| type:', typeof jobId);
    console.log('  interviewId:', interviewId, '| type:', typeof interviewId);
    console.log('  followUpId:', followUpId, '| type:', typeof followUpId);
    console.log('  updates:', updates);

    // 🆕 Normalize IDs to strings and trim whitespace
    const normalizedUserId = String(userId).trim();
    const normalizedJobId = String(jobId).trim();
    const normalizedInterviewId = String(interviewId).trim();
    const normalizedFollowUpId = String(followUpId).trim();

    console.log('🔍 Normalized IDs:');
    console.log('  userId:', normalizedUserId);
    console.log('  jobId:', normalizedJobId);
    console.log('  interviewId:', normalizedInterviewId);
    console.log('  followUpId:', normalizedFollowUpId);

    // ✅ Validate ObjectId formats
    console.log('🔑 Validating ObjectIds...');
    const jobIdValid = mongoose.Types.ObjectId.isValid(normalizedJobId);
    const interviewIdValid = mongoose.Types.ObjectId.isValid(normalizedInterviewId);
    const followUpIdValid = mongoose.Types.ObjectId.isValid(normalizedFollowUpId);
    
    console.log('  jobId valid?', jobIdValid);
    console.log('  interviewId valid?', interviewIdValid);
    console.log('  followUpId valid?', followUpIdValid);

    if (!jobIdValid) {
      throw new Error("Invalid job ID format");
    }

    if (!interviewIdValid) {
      throw new Error("Invalid interview ID format");
    }

    if (!followUpIdValid) {
      throw new Error("Invalid follow-up ID format");
    }

    // ✅ Find job (NOT using .lean() because we need to modify it)
    console.log('🔎 Searching for job with query:', { _id: normalizedJobId, userId: normalizedUserId });
    const job = await Jobs.findOne({ _id: normalizedJobId, userId: normalizedUserId });
    
    console.log('📊 Job found?', !!job);
    if (job) {
      console.log('  Job ID:', job._id);
      console.log('  Job userId:', job.userId, '| type:', typeof job.userId);
      console.log('  Company:', job.company);
      console.log('  Number of interviews:', job.interviews?.length || 0);
    } else {
      // Check if job exists without userId
      console.log('❌ Job not found with userId. Checking if job exists without userId...');
      const jobWithoutUser = await Jobs.findOne({ _id: normalizedJobId });
      if (jobWithoutUser) {
        console.log('⚠️  Job EXISTS but with different userId!');
        console.log('  Expected userId:', normalizedUserId, '| type:', typeof normalizedUserId);
        console.log('  Actual userId:', jobWithoutUser.userId, '| type:', typeof jobWithoutUser.userId);
        console.log('  Are they equal?', normalizedUserId === jobWithoutUser.userId);
      } else {
        console.log('❌ Job does not exist in database at all');
      }
    }

    if (!job) {
      throw new Error("Job not found or does not belong to user");
    }

    // ✅ Find interview
    console.log('🔎 Searching for interview...');
    const interview = job.interviews.id(normalizedInterviewId);
    
    console.log('📊 Interview found?', !!interview);
    if (interview) {
      console.log('  Interview ID:', interview._id);
      console.log('  Interview type:', interview.type);
      console.log('  Number of follow-ups:', interview.followUps?.length || 0);
      if (interview.followUps && interview.followUps.length > 0) {
        console.log('  Available follow-up IDs:', interview.followUps.map(f => f._id.toString()));
      }
    } else {
      console.log('  Available interview IDs:', job.interviews?.map(i => i._id.toString()));
    }

    if (!interview) {
      throw new Error("Interview not found in this job");
    }

    // ✅ Find follow-up
    console.log('🔎 Searching for follow-up...');
    const followUp = interview.followUps?.id(normalizedFollowUpId);
    
    console.log('📊 Follow-up found?', !!followUp);
    if (followUp) {
      console.log('  Follow-up ID:', followUp._id);
      console.log('  Follow-up type:', followUp.type);
      console.log('  Current sent status:', followUp.sent);
      console.log('  Current sentVia:', followUp.sentVia);
    }

    if (!followUp) {
      throw new Error("Follow-up not found in this interview");
    }

    // ✅ Validate updates
    console.log('🔍 Validating update fields...');
    const allowedUpdates = ['sent', 'sentAt', 'sentVia', 'responseReceived', 'responseDate', 'customized'];
    const updateKeys = Object.keys(updates);
    
    const invalidKeys = updateKeys.filter(key => !allowedUpdates.includes(key));
    if (invalidKeys.length > 0) {
      console.log('❌ Invalid update fields detected:', invalidKeys);
      throw new Error(`Invalid update fields: ${invalidKeys.join(', ')}`);
    }
    
    console.log('✅ All update fields are valid:', updateKeys);

    // ✅ Apply updates
    console.log('📝 Applying updates to follow-up...');
    Object.assign(followUp, updates);
    
    // ✅ Auto-set sentAt if marking as sent
    if (updates.sent === true && !followUp.sentAt) {
      console.log('📅 Auto-setting sentAt timestamp');
      followUp.sentAt = new Date();
    }

    // ✅ Auto-set responseDate if marking response received
    if (updates.responseReceived === true && !followUp.responseDate) {
      console.log('📅 Auto-setting responseDate timestamp');
      followUp.responseDate = new Date();
    }

    console.log('💾 Saving job to database...');
    await job.save();
    console.log('✅ Job saved successfully');

    // ✅ Return updated follow-up
    console.log('✅ Returning updated follow-up');
    const result = followUp.toObject ? followUp.toObject() : followUp;
    console.log('📊 Result:', result);
    
    return result;
  } catch (err) {
    console.error("❌ Error in updateFollowUpStatus:", err.message);
    console.error("Stack trace:", err.stack);
    throw err;
  }
}