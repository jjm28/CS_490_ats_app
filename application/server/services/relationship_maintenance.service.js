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
  
  let health = 'at_risk';
  if (daysSince <= threshold.excellent) health = 'excellent';
  else if (daysSince <= threshold.good) health = 'good';
  else if (daysSince <= threshold.needs_attention) health = 'needs_attention';
  
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
 * Update relationship health for a single contact
 */
export async function updateContactRelationshipHealth(contactId, userId) {
  try {
    const contact = await Contact.findOne({ _id: contactId, userid: userId });
    if (!contact) throw new Error("Contact not found");
    
    const { health, daysSince } = calculateRelationshipHealth(contact);
    const nextSuggestedContact = calculateNextContactDate(
      contact.lastInteraction,
      contact.engagementFrequency
    );
    
    contact.relationshipHealth = health;
    contact.daysSinceLastContact = daysSince;
    contact.nextSuggestedContact = nextSuggestedContact;
    contact.totalOutreachCount = contact.interactions.length;
    
    await contact.save();
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
    const contacts = await Contact.find({ userid: userId });
    
    const updates = contacts.map(async (contact) => {
      const { health, daysSince } = calculateRelationshipHealth(contact);
      const nextSuggestedContact = calculateNextContactDate(
        contact.lastInteraction,
        contact.engagementFrequency
      );
      
      return Contact.updateOne(
        { _id: contact._id },
        {
          $set: {
            relationshipHealth: health,
            daysSinceLastContact: daysSince,
            nextSuggestedContact,
            totalOutreachCount: contact.interactions.length,
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