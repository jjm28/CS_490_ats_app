// server/services/campaign.service.js
import Campaign from "../models/campaign.js";
import Contact from "../models/contacts.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Calculate and update campaign metrics
 */
function calculateMetrics(campaign) {
  const totalOutreach = campaign.outreaches.length;
  const sent = campaign.outreaches.filter(o => 
    ['sent', 'responded', 'no-response'].includes(o.status)
  ).length;
  const responses = campaign.outreaches.filter(o => 
    o.status === 'responded'
  ).length;
  const responseRate = sent > 0 ? Math.round((responses / sent) * 100) : 0;

  campaign.metrics = {
    totalOutreach,
    sent,
    responses,
    responseRate
  };

  // Update A/B test variant metrics
  if (campaign.abTestVariants && campaign.abTestVariants.length > 0) {
    campaign.abTestVariants.forEach(variant => {
      const variantOutreaches = campaign.outreaches.filter(o => 
        o.variantUsed === variant.variantName
      );
      
      const variantSent = variantOutreaches.filter(o => 
        ['sent', 'responded', 'no-response'].includes(o.status)
      ).length;
      
      const variantResponses = variantOutreaches.filter(o => 
        o.status === 'responded'
      ).length;

      variant.sent = variantSent;
      variant.responses = variantResponses;
      variant.successRate = variantSent > 0 ? Math.round((variantResponses / variantSent) * 100) : 0;
      variant.outreachIds = variantOutreaches.map(o => o.outreachId);
    });
  }

  return campaign;
}

/**
 * Get all campaigns for a user
 */
export async function getCampaigns(userId, filters = {}) {
  try {
    const query = { userid: userId };

    // Optional filters
    if (filters.status) {
      query.status = filters.status;
    }

    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return campaigns;
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    throw error;
  }
}

/**
 * Get single campaign by ID
 */
export async function getCampaignById(campaignId, userId) {
  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userid: userId
    }).lean();

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    return campaign;
  } catch (error) {
    console.error("Error fetching campaign:", error);
    throw error;
  }
}

/**
 * Create new campaign
 */
export async function createCampaign(userId, campaignData) {
  try {
    const newCampaign = new Campaign({
      userid: userId,
      name: campaignData.name,
      description: campaignData.description,
      targetIndustry: campaignData.targetIndustry,
      targetCompanies: campaignData.targetCompanies || [],
      goals: campaignData.goals,
      status: campaignData.status || 'active',
      outreaches: [],
      strategyNotes: campaignData.strategyNotes || '',
      abTestVariants: campaignData.abTestVariants || [],
      linkedJobs: campaignData.linkedJobs || [],
      metrics: {
        totalOutreach: 0,
        sent: 0,
        responses: 0,
        responseRate: 0
      }
    });

    await newCampaign.save();
    return newCampaign.toObject();
  } catch (error) {
    console.error("Error creating campaign:", error);
    throw error;
  }
}

/**
 * Update campaign
 */
export async function updateCampaign(campaignId, userId, updateData) {
  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userid: userId
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'description', 'targetIndustry', 'targetCompanies',
      'goals', 'status', 'strategyNotes', 'abTestVariants', 'linkedJobs'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        campaign[field] = updateData[field];
      }
    });

    await campaign.save();
    return campaign.toObject();
  } catch (error) {
    console.error("Error updating campaign:", error);
    throw error;
  }
}

/**
 * Delete campaign
 */
export async function deleteCampaign(campaignId, userId) {
  try {
    const result = await Campaign.deleteOne({
      _id: campaignId,
      userid: userId
    });

    if (result.deletedCount === 0) {
      throw new Error("Campaign not found");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting campaign:", error);
    throw error;
  }
}

/**
 * Add outreach to campaign
 */
export async function addOutreach(campaignId, userId, outreachData) {
  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userid: userId
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Verify contact exists and belongs to user
    const contact = await Contact.findOne({
      _id: outreachData.contactId,
      userid: userId
    });

    if (!contact) {
      throw new Error("Contact not found");
    }

    // Create outreach entry
    const newOutreach = {
      outreachId: uuidv4(),
      contactId: contact._id,
      contactName: contact.name,
      status: outreachData.status || 'pending',
      approach: outreachData.approach,
      variantUsed: outreachData.variantUsed || null,
      sentDate: outreachData.sentDate || null,
      responseDate: outreachData.responseDate || null,
      notes: outreachData.notes || ''
    };

    campaign.outreaches.push(newOutreach);
    
    // Recalculate metrics
    calculateMetrics(campaign);

    await campaign.save();
    return campaign.toObject();
  } catch (error) {
    console.error("Error adding outreach:", error);
    throw error;
  }
}

/**
 * Update outreach status
 */
export async function updateOutreach(campaignId, userId, outreachId, updateData) {
  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userid: userId
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const outreach = campaign.outreaches.find(o => o.outreachId === outreachId);

    if (!outreach) {
      throw new Error("Outreach not found");
    }

    // Update fields
    if (updateData.status) outreach.status = updateData.status;
    if (updateData.approach) outreach.approach = updateData.approach;
    if (updateData.variantUsed !== undefined) outreach.variantUsed = updateData.variantUsed;
    if (updateData.sentDate) outreach.sentDate = updateData.sentDate;
    if (updateData.responseDate) outreach.responseDate = updateData.responseDate;
    if (updateData.notes !== undefined) outreach.notes = updateData.notes;

    // Auto-set dates based on status changes
    if (updateData.status === 'sent' && !outreach.sentDate) {
      outreach.sentDate = new Date();
    }
    if (updateData.status === 'responded' && !outreach.responseDate) {
      outreach.responseDate = new Date();
    }

    // Recalculate metrics
    calculateMetrics(campaign);

    await campaign.save();
    return campaign.toObject();
  } catch (error) {
    console.error("Error updating outreach:", error);
    throw error;
  }
}

/**
 * Delete outreach from campaign
 */
export async function deleteOutreach(campaignId, userId, outreachId) {
  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userid: userId
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    campaign.outreaches = campaign.outreaches.filter(o => o.outreachId !== outreachId);
    
    // Recalculate metrics
    calculateMetrics(campaign);

    await campaign.save();
    return campaign.toObject();
  } catch (error) {
    console.error("Error deleting outreach:", error);
    throw error;
  }
}

/**
 * Get campaign analytics
 */
export async function getCampaignAnalytics(userId) {
  try {
    const campaigns = await Campaign.find({ userid: userId });

    const analytics = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalOutreaches: 0,
      totalResponses: 0,
      overallResponseRate: 0,
      campaignBreakdown: []
    };

    campaigns.forEach(campaign => {
      analytics.totalOutreaches += campaign.metrics.totalOutreach;
      analytics.totalResponses += campaign.metrics.responses;
      
      analytics.campaignBreakdown.push({
        name: campaign.name,
        status: campaign.status,
        metrics: campaign.metrics,
        goalProgress: {
          outreachProgress: Math.round((campaign.metrics.totalOutreach / campaign.goals.outreachCount) * 100),
          responseProgress: Math.round((campaign.metrics.responses / campaign.goals.responseTarget) * 100)
        }
      });
    });

    analytics.overallResponseRate = analytics.totalOutreaches > 0 
      ? Math.round((analytics.totalResponses / analytics.totalOutreaches) * 100) 
      : 0;

    return analytics;
  } catch (error) {
    console.error("Error calculating analytics:", error);
    throw error;
  }
}