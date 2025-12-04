// server/services/relationship_maintenance.service.js
import Contact from "../models/contacts.js";
import { getDb } from "../db/connection.js";

/**
 * Calculate relationship health based on last interaction and engagement frequency
 */
function calculateRelationshipHealth(contact) {
  const now = new Date();
  const lastInteraction = contact.lastInteraction ? new Date(contact.lastInteraction) : null;
  
  if (!lastInteraction) {
    return { health: 'needs_attention', daysSince: 999 };
  }
  
  const daysSince = Math.floor((now - lastInteraction) / (1000 * 60 * 60 * 24));
  
  // Define thresholds based on engagement frequency
  const thresholds = {
    weekly: { excellent: 7, good: 14, needs_attention: 30 },
    biweekly: { excellent: 14, good: 30, needs_attention: 60 },
    monthly: { excellent: 30, good: 60, needs_attention: 90 },
    quarterly: { excellent: 90, good: 120, needs_attention: 180 },
    yearly: { excellent: 180, good: 365, needs_attention: 500 },
  };
  
  const threshold = thresholds[contact.engagementFrequency] || thresholds.monthly;
  
  // Calculate base health from time
  let health = 'at_risk';
  if (daysSince <= threshold.excellent) health = 'excellent';
  else if (daysSince <= threshold.good) health = 'good';
  else if (daysSince <= threshold.needs_attention) health = 'needs_attention';
  
  // ===== NEW: ADJUST HEALTH BASED ON RECIPROCITY =====
  const reciprocityScore = contact.reciprocityScore || 50;
  
  // Poor reciprocity (0-30) = downgrade health
  if (reciprocityScore <= 30) {
    if (health === 'excellent') health = 'good';
    else if (health === 'good') health = 'needs_attention';
    // at_risk stays at_risk
  }
  
  // Very poor reciprocity (0-20) = further downgrade
  if (reciprocityScore <= 20) {
    if (health === 'excellent') health = 'needs_attention';
    else if (health === 'good') health = 'at_risk';
    else if (health === 'needs_attention') health = 'at_risk';
  }
  
  // Great reciprocity (70-100) = upgrade health (but not past excellent)
  if (reciprocityScore >= 70 && daysSince <= threshold.good) {
    if (health === 'good') health = 'excellent';
  }
  
  return { health, daysSince };
}

/**
 * Calculate next suggested contact date based on engagement frequency
 */
function calculateNextContactDate(lastInteraction, engagementFrequency) {
  if (!lastInteraction) return new Date();
  
  const last = new Date(lastInteraction);
  const daysToAdd = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  };
  
  const days = daysToAdd[engagementFrequency] || 30;
  const nextDate = new Date(last);
  nextDate.setDate(nextDate.getDate() + days);
  
  return nextDate;
}

/**
 * Calculate reciprocity score based on interaction patterns
 * Analyzes inbound vs outbound interactions to measure mutual value exchange
 */
/**
 * Calculate reciprocity score based on interaction patterns
 * Analyzes inbound vs outbound interactions to measure mutual value exchange
 * Uses a rolling window of the last 50 interactions for current relationship state
 */
function calculateReciprocityScore(contact) {
  console.log('🔍 CALCULATING RECIPROCITY for:', contact.name);
  
  const allInteractions = contact.interactions || [];
  console.log('Total interactions:', allInteractions.length);
  
  // ===== NEW: Use rolling window of last 50 interactions =====
  const WINDOW_SIZE = 50;
  const interactions = allInteractions.slice(-WINDOW_SIZE);
  
  console.log('Using last', interactions.length, 'interactions for calculation');
  
  if (interactions.length === 0) {
    console.log('⚠️ No interactions, returning default 50');
    return 50; // Default neutral score for new contacts
  }
  
  // Categorize interactions as inbound, outbound, or mutual
  const inboundTypes = [
    'Inbound Call',
    'They Reached Out',
    'Job Referral Received',
    'Introduction Received',
    'Advice Received',
    'Opportunity Shared by Them'
  ];
  
  const outboundTypes = [
    'Email/Message',
    'Outbound Call',
    'Coffee/Lunch',
    'I Reached Out',
    'Follow-up',
    'Request Sent'
  ];
  
  const mutualTypes = [
    'Meeting',
    'Coffee',
    'Lunch',
    'Event',
    'Video Call',
    'Networking Event'
  ];
  
  let inboundCount = 0;
  let outboundCount = 0;
  let mutualCount = 0;
  
  interactions.forEach(interaction => {
    const type = interaction.type || '';
    const note = (interaction.note || '').toLowerCase();
    
    // Check interaction type
    if (inboundTypes.some(t => type.includes(t))) {
      inboundCount++;
    } else if (outboundTypes.some(t => type.includes(t))) {
      outboundCount++;
    } else if (mutualTypes.some(t => type.includes(t))) {
      mutualCount++;
    } else {
      // Try to infer from notes
      if (note.includes('they') || note.includes('their') || note.includes('received')) {
        inboundCount++;
      } else if (note.includes('i ') || note.includes('my ') || note.includes('sent')) {
        outboundCount++;
      } else {
        mutualCount++; // Default to mutual if unclear
      }
    }
  });
  
  // Weight mutual interactions positively
  const totalInteractions = inboundCount + outboundCount + mutualCount;
  
  // Calculate reciprocity based on balance
  // Perfect balance (50/50) = 100 score
  // All outbound = low score (20-40)
  // All inbound = high score (70-90)
  
  let score = 50; // Start at neutral
  
  if (totalInteractions > 0) {
    const inboundRatio = (inboundCount + mutualCount * 0.5) / totalInteractions;
    const outboundRatio = (outboundCount + mutualCount * 0.5) / totalInteractions;
    
    // Calculate balance score
    const balance = Math.min(inboundRatio, outboundRatio) / Math.max(inboundRatio, outboundRatio);
    
    // Base score on balance (0 = one-sided, 1 = perfect balance)
    score = 50 + (balance * 50);
    
    // Bonus for having both inbound and outbound
    if (inboundCount > 0 && outboundCount > 0) {
      score += 10;
    }
    
    // Bonus for mutual interactions
    const mutualRatio = mutualCount / totalInteractions;
    score += mutualRatio * 15;
    
    // Penalty for very one-sided relationships
    if (outboundCount > inboundCount * 3) {
      score -= 20; // You're doing all the work
    }
    
    if (inboundCount > outboundCount * 3) {
      score -= 10; // They're doing all the work (unusual but still not ideal)
    }
  }
  
  // Factor in opportunities generated (high reciprocity indicator)
  // Note: This uses total opportunities, not just recent, as opportunities are significant
  const opportunitiesBonus = Math.min((contact.opportunitiesGenerated || 0) * 5, 20);
  score += opportunitiesBonus;
  
  // Clamp to 0-100 range
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  console.log('✅ Calculated reciprocity score:', score);
  console.log('Breakdown - Inbound:', inboundCount, 'Outbound:', outboundCount, 'Mutual:', mutualCount);
  console.log('Window:', interactions.length, 'interactions (last', WINDOW_SIZE, 'of', allInteractions.length, 'total)');
  
  return score;
}

/**
 * Calculate relationship strength (0-100) based on multiple factors
 * This is a holistic score combining engagement, reciprocity, and opportunities
 */
function calculateRelationshipStrength(contact) {
  console.log('💪 CALCULATING RELATIONSHIP STRENGTH for:', contact.name);
  
  let strength = 0;
  
  // Factor 1: Reciprocity Score (40% weight)
  const reciprocityScore = contact.reciprocityScore || 50;
  strength += (reciprocityScore / 100) * 40;
  console.log('  - Reciprocity contribution:', (reciprocityScore / 100) * 40);
  
  // Factor 2: Engagement Frequency (20% weight)
  // More frequent engagement = stronger relationship
  const frequencyScores = {
    weekly: 100,
    biweekly: 85,
    monthly: 70,
    quarterly: 50,
    yearly: 30
  };
  const frequencyScore = frequencyScores[contact.engagementFrequency] || 70;
  strength += (frequencyScore / 100) * 20;
  console.log('  - Frequency contribution:', (frequencyScore / 100) * 20);
  
  // Factor 3: Relationship Health (20% weight)
  const healthScores = {
    excellent: 100,
    good: 75,
    needs_attention: 50,
    at_risk: 25
  };
  const healthScore = healthScores[contact.relationshipHealth] || 50;
  strength += (healthScore / 100) * 20;
  console.log('  - Health contribution:', (healthScore / 100) * 20);
  
  // Factor 4: Interaction Volume (10% weight)
  // More interactions = stronger relationship (but capped)
  const allInteractions = contact.interactions || [];
  const interactionScore = Math.min(allInteractions.length * 2, 100); // Cap at 100
  strength += (interactionScore / 100) * 10;
  console.log('  - Interaction volume contribution:', (interactionScore / 100) * 10);
  
  // Factor 5: Opportunities Generated (10% weight)
  // High-value indicator of relationship strength
  const opportunities = contact.opportunitiesGenerated || 0;
  const opportunityScore = Math.min(opportunities * 20, 100); // 5 opportunities = max
  strength += (opportunityScore / 100) * 10;
  console.log('  - Opportunities contribution:', (opportunityScore / 100) * 10);
  
  // Clamp to 0-100
  strength = Math.max(0, Math.min(100, Math.round(strength)));
  
  console.log('✅ Calculated relationship strength:', strength);
  
  return strength;
}

/**
 * Update relationship health for a single contact
 */
export async function updateContactRelationshipHealth(contactId, userId) {
  try {
    console.log('🔄 Updating health for contact:', contactId);
    
    const contact = await Contact.findOne({ _id: contactId, userid: userId });
    if (!contact) throw new Error("Contact not found");
    
    // Calculate reciprocity FIRST (needed for health and strength)
    const reciprocityScore = calculateReciprocityScore(contact);
    contact.reciprocityScore = reciprocityScore;
    
    // Calculate health (uses reciprocityScore)
    const { health, daysSince } = calculateRelationshipHealth(contact);
    contact.relationshipHealth = health;
    contact.daysSinceLastContact = daysSince;
    
    // Calculate other metrics
    const nextSuggestedContact = calculateNextContactDate(
      contact.lastInteraction,
      contact.engagementFrequency
    );
    contact.nextSuggestedContact = nextSuggestedContact;
    contact.totalOutreachCount = contact.interactions.length;
    
    // Calculate relationship strength (uses reciprocity and health)
    const relationshipStrength = calculateRelationshipStrength(contact);
    contact.relationshipStrength = relationshipStrength;
    
    console.log('📊 Results:', { 
      health, 
      daysSince, 
      reciprocityScore, 
      relationshipStrength 
    });
    
    await contact.save();
    
    console.log('✅ Contact updated successfully');
    
    return contact;
  } catch (error) {
    console.error("Error updating relationship health:", error);
    throw error;
  }
}

/**
 * Update relationship health for all contacts for a user
 */
export async function updateAllContactsHealth(userId) {
  try {
    console.log("🔄 Updating relationship health for all contacts of user:", userId);
    const contacts = await Contact.find({ userid: userId });
    
    const updates = contacts.map(async (contact) => {
      // Calculate all metrics
      const reciprocityScore = calculateReciprocityScore(contact);
      
      // Temporarily set reciprocity for health calculation
      contact.reciprocityScore = reciprocityScore;
      
      const { health, daysSince } = calculateRelationshipHealth(contact);
      contact.relationshipHealth = health;
      
      const nextSuggestedContact = calculateNextContactDate(
        contact.lastInteraction,
        contact.engagementFrequency
      );
      
      const relationshipStrength = calculateRelationshipStrength(contact);
      
      console.log(`Updating contact: ${contact.name} | Health: ${health} | Days Since: ${daysSince} | Reciprocity: ${reciprocityScore} | Strength: ${relationshipStrength}`);
      
      return Contact.updateOne(
        { _id: contact._id },
        {
          $set: {
            relationshipHealth: health,
            daysSinceLastContact: daysSince,
            nextSuggestedContact,
            totalOutreachCount: contact.interactions.length,
            reciprocityScore,
            relationshipStrength, // NEW
          },
        }
      );
    });
    
    await Promise.all(updates);
    return { success: true, updated: contacts.length };
  } catch (error) {
    console.error("Error updating all contacts health:", error);
    throw error;
  }
}

/**
 * Get contacts that need attention (overdue for contact)
 */
export async function getContactsNeedingAttention(userId) {
  try {
    await updateAllContactsHealth(userId);
    
    const contacts = await Contact.find({
      userid: userId,
      relationshipHealth: { $in: ['needs_attention', 'at_risk'] },
    }).sort({ daysSinceLastContact: -1 });
    
    return contacts;
  } catch (error) {
    console.error("Error getting contacts needing attention:", error);
    throw error;
  }
}

/**
 * Get contacts with upcoming reminders
 */
export async function getUpcomingReminders(userId) {
  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const contacts = await Contact.find({
      userid: userId,
      $or: [
        { reminderDate: { $gte: now, $lte: nextWeek } },
        { nextSuggestedContact: { $gte: now, $lte: nextWeek } },
      ],
    }).sort({ reminderDate: 1, nextSuggestedContact: 1 });
    
    return contacts;
  } catch (error) {
    console.error("Error getting upcoming reminders:", error);
    throw error;
  }
}

/**
 * Generate outreach templates based on relationship type and context
 */
export function generateOutreachTemplates(contact, context = 'general') {
  const templates = {
    general: {
      subject: `Checking in - ${contact.name}`,
      message: `Hi ${contact.name.split(' ')[0]},\n\nI hope this message finds you well! It's been a while since we last connected, and I wanted to reach out to see how things are going${contact.company ? ` at ${contact.company}` : ''}.\n\n[Add your personalized message here]\n\nLooking forward to hearing from you!\n\nBest regards`,
    },
    birthday: {
      subject: `Happy Birthday ${contact.name.split(' ')[0]}! 🎉`,
      message: `Happy Birthday, ${contact.name.split(' ')[0]}! 🎂\n\nWishing you an amazing day filled with joy and celebration. I hope this year brings you continued success and happiness.\n\nBest wishes!`,
    },
    congratulations: {
      subject: `Congratulations ${contact.name.split(' ')[0]}!`,
      message: `Hi ${contact.name.split(' ')[0]},\n\nI wanted to reach out and congratulate you on [achievement/milestone]! It's inspiring to see your continued success.\n\n[Add specific details here]\n\nWishing you all the best!\n\nCongratulations again!`,
    },
    job_opportunity: {
      subject: `Quick question - opportunity`,
      message: `Hi ${contact.name.split(' ')[0]},\n\nI hope you're doing well! I'm currently exploring opportunities in [field/industry], and I thought of you given your experience${contact.company ? ` at ${contact.company}` : ''}.\n\nWould you have a few minutes in the coming weeks for a quick call? I'd love to get your perspective on [specific topic].\n\nThank you for considering!`,
    },
    value_add: {
      subject: `Thought you might find this interesting`,
      message: `Hi ${contact.name.split(' ')[0]},\n\nI came across [article/resource/opportunity] and immediately thought of you${contact.industry ? ` given your work in ${contact.industry}` : ''}.\n\n[Link or details here]\n\nHope you find it valuable! Let me know what you think.\n\nBest,`,
    },
  };
  
  return templates[context] || templates.general;
}

/**
 * Get relationship analytics
 */
export async function getRelationshipAnalytics(userId) {
  try {
    const contacts = await Contact.find({ userid: userId });
    
    const analytics = {
      total: contacts.length,
      byHealth: {
        excellent: contacts.filter(c => c.relationshipHealth === 'excellent').length,
        good: contacts.filter(c => c.relationshipHealth === 'good').length,
        needs_attention: contacts.filter(c => c.relationshipHealth === 'needs_attention').length,
        at_risk: contacts.filter(c => c.relationshipHealth === 'at_risk').length,
      },
      byFrequency: {
        weekly: contacts.filter(c => c.engagementFrequency === 'weekly').length,
        biweekly: contacts.filter(c => c.engagementFrequency === 'biweekly').length,
        monthly: contacts.filter(c => c.engagementFrequency === 'monthly').length,
        quarterly: contacts.filter(c => c.engagementFrequency === 'quarterly').length,
        yearly: contacts.filter(c => c.engagementFrequency === 'yearly').length,
      },
      averageRelationshipStrength: Math.round(
        contacts.reduce((sum, c) => sum + c.relationshipStrength, 0) / contacts.length || 0
      ),
      totalOpportunities: contacts.reduce((sum, c) => sum + c.opportunitiesGenerated, 0),
      needingAttention: contacts.filter(c => 
        ['needs_attention', 'at_risk'].includes(c.relationshipHealth)
      ).length,
    };
    
    return analytics;
  } catch (error) {
    console.error("Error getting relationship analytics:", error);
    throw error;
  }
}