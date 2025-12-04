import express from 'express';
import { getDb } from '../db/connection.js';
import { verifyJWT } from '../middleware/auth.js';
import {
    generateLinkedInMessage,
    generateConnectionRequest,
    generateProfileOptimization,
    generateContentStrategy
} from '../services/linkedin_ai.service.js';

const router = express.Router();

// all profile routes need auth
router.use(verifyJWT);

// unified way to get "who is this?"
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers['x-dev-user-id'];
  return dev ? dev.toString() : null;
}

// GET /api/linkedin/profile - Get user's LinkedIn profile data
router.get('/profile', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const user = await db.collection('users').findOne({ _id: req.user._id });
    
    if (!user || !user.linkedInId) {
      return res.status(404).json({ error: 'No LinkedIn profile connected' });
    }

    const profile = await db.collection('profiles').findOne({ userId: userId });

    return res.json({
      linkedInId: user.linkedInId,
      linkedInProfileUrl: profile?.linkedInProfileUrl || null, // ✅ Return actual URL
      headline: profile?.headline,
      photoUrl: profile?.photoUrl,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    return res.status(500).json({ error: 'Failed to fetch LinkedIn profile' });
  }
});

// GET /api/linkedin/templates/messages - Get static message templates
router.get('/templates/messages', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Static templates for now - will be AI-generated later
    const templates = [
      {
        _id: '1',
        scenario: 'informational_interview',
        template: 'Hi [Name],\n\nI came across your profile and was impressed by your work in [Industry/Role]. I\'m currently exploring opportunities in this field and would love to learn from your experience.\n\nWould you be open to a brief 15-20 minute conversation? I\'d be grateful for any insights you could share.\n\nThank you for considering!\n\nBest regards,\n[Your Name]'
      },
      {
        _id: '2',
        scenario: 'job_referral',
        template: 'Hi [Name],\n\nI hope this message finds you well. I noticed that [Company] is hiring for a [Position] role, and I believe my background in [Your Experience] would be a strong fit.\n\nI was wondering if you\'d be comfortable providing a referral or pointing me in the right direction. I\'ve attached my resume for your reference.\n\nI really appreciate any help you can provide!\n\nBest,\n[Your Name]'
      },
      {
        _id: '3',
        scenario: 'reconnecting',
        template: 'Hi [Name],\n\nIt\'s been a while since we last connected! I hope you\'re doing well.\n\nI wanted to reach out and see how things are going on your end. I\'d love to catch up and hear about what you\'ve been working on.\n\nLet me know if you\'re free for a quick call or coffee sometime!\n\nBest,\n[Your Name]'
      },
      {
        _id: '4',
        scenario: 'industry_insight',
        template: 'Hi [Name],\n\nI\'ve been following your posts about [Topic] and found your perspective really valuable. I\'m particularly interested in [Specific Area] and would love to hear more about your experience.\n\nWould you be open to connecting and sharing some insights?\n\nThanks!\n[Your Name]'
      }
    ];

    return res.json(templates);
  } catch (error) {
    console.error('Error fetching message templates:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/linkedin/templates/messages/generate - AI-generate message template
router.post('/templates/messages/generate', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { scenario, recipientInfo, userInfo } = req.body;
    
    if (!scenario || !scenario.trim()) {
      return res.status(400).json({ error: 'Scenario is required' });
    }

    console.log('Generating AI message for scenario:', scenario);
    
    const template = await generateLinkedInMessage({
      scenario,
      recipientInfo,
      userInfo,
    });
    
    return res.json({
      ...template,
      customized: true,
    });
  } catch (error) {
    console.error('Error generating message template:', error);
    return res.status(500).json({ error: 'Failed to generate template' });
  }
});

// POST /api/linkedin/templates/connections/generate - AI-generate connection template
router.post('/templates/connections/generate', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { scenario, recipientInfo } = req.body;
    
    if (!scenario || !scenario.trim()) {
      return res.status(400).json({ error: 'Scenario is required' });
    }

    console.log('Generating AI connection request for scenario:', scenario);
    
    const template = await generateConnectionRequest({
      scenario,
      recipientInfo,
    });
    
    return res.json(template);
  } catch (error) {
    console.error('Error generating connection template:', error);
    return res.status(500).json({ error: 'Failed to generate template' });
  }
});

// GET /api/linkedin/templates/connections - Get static connection request templates
router.get('/templates/connections', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const templates = [
      {
        _id: '1',
        scenario: 'alumni',
        template: 'Hi [Name],\n\nI\'m a fellow [University] alum and came across your profile. I\'d love to connect and learn more about your experience in [Industry].',
        tips: ['Mention your graduation year', 'Reference shared experiences', 'Keep it brief']
      },
      {
        _id: '2',
        scenario: 'same_company',
        template: 'Hi [Name],\n\nI see we both work at [Company]! I\'d love to connect and learn more about your work in [Department/Role].',
        tips: ['Mention your role', 'Show genuine interest', 'Suggest a virtual coffee chat']
      },
      {
        _id: '3',
        scenario: 'industry_peer',
        template: 'Hi [Name],\n\nI noticed we\'re both working in [Industry]. I\'ve been following your content on [Topic] and would love to connect!',
        tips: ['Reference specific content they\'ve shared', 'Show value alignment', 'Be authentic']
      },
      {
        _id: '4',
        scenario: 'recruiter',
        template: 'Hi [Name],\n\nI\'m actively exploring opportunities in [Field] and would love to connect. I\'d be happy to share my background if relevant roles come up.',
        tips: ['Be professional', 'Mention your skills', 'Show proactive interest']
      }
    ];

    return res.json(templates);
  } catch (error) {
    console.error('Error fetching connection templates:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/linkedin/profile/optimize - Get AI-powered profile optimization suggestions
router.post('/profile/optimize', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    
    // Get user's LinkedIn data
    const user = await db.collection('users').findOne({ _id: userId });
    const profile = await db.collection('profiles').findOne({ userId: userId });

    if (!user || !user.linkedInId) {
      return res.status(404).json({ error: 'No LinkedIn account connected' });
    }

    console.log('Generating AI profile optimization');
    
    // Use stored context if available, otherwise use request body
    const { currentRole, yearsOfExperience, targetRole, skills } = req.body || {};
    
    const contextToUse = {
      currentRole: currentRole || profile?.linkedInOptimization?.currentRole || profile?.headline || "Professional",
      yearsOfExperience: yearsOfExperience || profile?.linkedInOptimization?.yearsOfExperience || profile?.experienceLevel,
      targetRole: targetRole || profile?.linkedInOptimization?.targetRole,
      skills: skills || profile?.linkedInOptimization?.skills,
      industry: profile?.industry,
      linkedInProfileUrl: profile?.linkedInProfileUrl,
    };
    
    const suggestions = await generateProfileOptimization(contextToUse);

    // 🆕 Save to database
    const now = new Date();
    const analysisCount = (profile?.linkedInOptimization?.analysisCount || 0) + 1;
    
    await db.collection('profiles').updateOne(
      { userId: userId },
      {
        $set: {
          'linkedInOptimization.currentRole': contextToUse.currentRole,
          'linkedInOptimization.yearsOfExperience': contextToUse.yearsOfExperience,
          'linkedInOptimization.targetRole': contextToUse.targetRole,
          'linkedInOptimization.skills': contextToUse.skills,
          'linkedInOptimization.suggestions': suggestions.map(s => ({
            ...s,
            completed: false,
            completedAt: null,
            notes: ''
          })),
          'linkedInOptimization.lastAnalyzedAt': now,
          'linkedInOptimization.analysisCount': analysisCount,
          updatedAt: now
        }
      },
      { upsert: true }
    );

    return res.json({
      suggestions,
      context: {
        currentRole: contextToUse.currentRole,
        yearsOfExperience: contextToUse.yearsOfExperience,
        targetRole: contextToUse.targetRole,
        skills: contextToUse.skills,
      },
      meta: {
        lastAnalyzedAt: now,
        analysisCount
      }
    });
  } catch (error) {
    console.error('Error generating profile optimization:', error);
    return res.status(500).json({ error: 'Failed to optimize profile' });
  }
});

// GET /api/linkedin/profile/optimize - Get saved optimization data
router.get('/profile/optimize', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const profile = await db.collection('profiles').findOne({ userId: userId });

    if (!profile?.linkedInOptimization) {
      return res.status(404).json({ error: 'No optimization data found' });
    }

    return res.json({
      suggestions: profile.linkedInOptimization.suggestions || [],
      context: {
        currentRole: profile.linkedInOptimization.currentRole,
        yearsOfExperience: profile.linkedInOptimization.yearsOfExperience,
        targetRole: profile.linkedInOptimization.targetRole,
        skills: profile.linkedInOptimization.skills,
      },
      meta: {
        lastAnalyzedAt: profile.linkedInOptimization.lastAnalyzedAt,
        analysisCount: profile.linkedInOptimization.analysisCount || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching optimization data:', error);
    return res.status(500).json({ error: 'Failed to fetch optimization data' });
  }
});

// PATCH /api/linkedin/profile/optimize/suggestion/:index - Mark suggestion as completed
router.patch('/profile/optimize/suggestion/:index', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { index } = req.params;
    const { completed, notes } = req.body;

    const db = getDb();
    const profile = await db.collection('profiles').findOne({ userId: userId });

    if (!profile?.linkedInOptimization?.suggestions?.[index]) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const updateFields = {
      [`linkedInOptimization.suggestions.${index}.completed`]: completed,
      [`linkedInOptimization.suggestions.${index}.notes`]: notes || '',
      updatedAt: new Date()
    };

    if (completed) {
      updateFields[`linkedInOptimization.suggestions.${index}.completedAt`] = new Date();
    } else {
      updateFields[`linkedInOptimization.suggestions.${index}.completedAt`] = null;
    }

    await db.collection('profiles').updateOne(
      { userId: userId },
      { $set: updateFields }
    );

    return res.json({ message: 'Suggestion updated successfully' });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// POST /api/linkedin/content/strategy - Get AI-powered content strategy
router.post('/content/strategy', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = getDb();
    const profile = await db.collection('profiles').findOne({ 
      userId: userId
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Generating AI content strategy');
    
    const strategy = await generateContentStrategy({
      headline: profile.headline,
      jobTitle: profile.fullName, // Adjust based on your schema
      industry: profile.industry,
      experienceLevel: profile.experienceLevel,
    });

    return res.json(strategy);
  } catch (error) {
    console.error('Error generating content strategy:', error);
    return res.status(500).json({ error: 'Failed to generate strategy' });
  }
});

// GET /api/linkedin/campaigns/templates - Get networking campaign templates
router.get('/campaigns/templates', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const templates = [
      {
        name: 'Target Company Outreach',
        description: 'Systematic approach to connecting with employees at your target companies',
        targetAudience: 'Employees at target companies',
        timeline: '4-6 weeks',
        steps: [
          'Research company and identify key departments',
          'Connect with 2-3 employees per department',
          'Engage with their content for 1-2 weeks',
          'Send personalized connection requests',
          'Follow up with informational interview requests'
        ]
      },
      {
        name: 'Industry Thought Leader Network',
        description: 'Build relationships with influencers in your field',
        targetAudience: 'Industry leaders and influencers',
        timeline: '8-12 weeks',
        steps: [
          'Identify top 10 thought leaders in your industry',
          'Follow and engage with their content regularly',
          'Share and comment thoughtfully on their posts',
          'Send connection requests with personalized notes',
          'Contribute valuable insights to their discussions'
        ]
      },
      {
        name: 'Alumni Network Activation',
        description: 'Reconnect with alumni for career opportunities',
        targetAudience: 'Alumni from your school',
        timeline: '6-8 weeks',
        steps: [
          'Search for alumni in your target industry/companies',
          'Connect mentioning shared alma mater',
          'Ask about their career path',
          'Seek advice on industry trends',
          'Request informational interviews'
        ]
      }
    ];

    return res.json(templates);
  } catch (error) {
    console.error('Error fetching campaign templates:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// PUT /api/linkedin/profile/url - Update LinkedIn profile URL
router.put('/profile/url', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { linkedInProfileUrl } = req.body;
    
    if (!linkedInProfileUrl) {
      return res.status(400).json({ error: 'LinkedIn profile URL is required' });
    }

    // Basic validation
    if (!linkedInProfileUrl.includes('linkedin.com')) {
      return res.status(400).json({ error: 'Please enter a valid LinkedIn URL' });
    }

    const db = getDb();
    
    // Update profile
    await db.collection('profiles').updateOne(
      { userId: String(req.user._id) },
      { 
        $set: { 
          linkedInProfileUrl: linkedInProfileUrl,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    return res.json({ 
      message: 'LinkedIn profile URL updated successfully',
      linkedInProfileUrl 
    });
  } catch (error) {
    console.error('Error updating LinkedIn URL:', error);
    return res.status(500).json({ error: 'Failed to update LinkedIn URL' });
  }
});

export default router;