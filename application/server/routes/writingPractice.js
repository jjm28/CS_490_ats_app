// routes/writingPractice.js
import express from 'express';
import WritingPracticeSession from '../models/WritingPracticeSession.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// ===================================
// SAVE WRITING PRACTICE SESSION
// ===================================
router.post('/save', verifyJWT, async (req, res) => {
  try {
    const { 
      jobId, 
      jobTitle, 
      company, 
      sessionType, 
      timerDuration, 
      totalDuration,
      responses 
    } = req.body;
    
    console.log('=== SAVE WRITING PRACTICE SESSION ===');
    console.log('User ID:', req.user._id);
    console.log('Job ID:', jobId);
    console.log('Responses count:', responses?.length);
    
    if (!jobId || !responses || responses.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid session data: jobId and responses required' 
      });
    }

    // Calculate improvement from last session
    let improvementFromLastSession = null;
    const lastSession = await WritingPracticeSession.findOne({ 
      userId: req.user._id,
      jobId 
    }).sort({ createdAt: -1 });

    if (lastSession && lastSession.averageOverallScore != null) {
      const currentAvg = responses.reduce((sum, r) => sum + r.overallScore, 0) / responses.length;
      improvementFromLastSession = Math.round(
        ((currentAvg - lastSession.averageOverallScore) / lastSession.averageOverallScore) * 100
      );
      console.log(`Improvement from last session: ${improvementFromLastSession}%`);
    }

    // Create session
    const session = new WritingPracticeSession({
      userId: req.user._id,
      jobId,
      title: `Writing Practice - ${jobTitle || 'Position'} @ ${company || 'Company'}`,
      sessionType: sessionType || 'timed',
      timerDuration,
      totalDuration,
      completed: true,
      responses: responses.map(r => ({
        question: r.question,
        response: r.response,
        category: r.category,
        overallScore: r.overallScore,
        structureScore: r.structureScore,
        clarityScore: r.clarityScore,
        storytellingScore: r.storytellingScore,
        feedback: r.feedback,
        strengths: r.strengths || [],
        improvements: r.improvements || [],
        wordCount: r.wordCount,
        timeSpentSeconds: r.timeSpentSeconds,
        hasSTARElements: r.hasSTARElements,
        analyzedAt: r.analyzedAt || new Date()
      })),
      improvementFromLastSession
    });

    await session.save();
    console.log('Writing practice session saved successfully!');

    res.status(201).json({
      sessionId: session._id,
      averageOverallScore: session.averageOverallScore,
      averageStructureScore: session.averageStructureScore,
      averageClarityScore: session.averageClarityScore,
      averageStorytellingScore: session.averageStorytellingScore,
      improvementFromLastSession: session.improvementFromLastSession,
      responses: session.responses
    });

  } catch (error) {
    console.error('!!! ERROR SAVING WRITING PRACTICE SESSION !!!');
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to save writing practice session',
      details: error.message
    });
  }
});

// ===================================
// GET USER'S WRITING PRACTICE SESSIONS
// ===================================
router.get('/sessions', verifyJWT, async (req, res) => {
  try {
    const { jobId } = req.query;
    
    const query = { userId: req.user._id };
    if (jobId) {
      query.jobId = jobId;
    }

    const sessions = await WritingPracticeSession.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching writing practice sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ===================================
// GET SPECIFIC SESSION DETAILS
// ===================================
router.get('/sessions/:id', verifyJWT, async (req, res) => {
  try {
    const session = await WritingPracticeSession.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// ===================================
// GET PROGRESS DATA FOR ANALYTICS
// ===================================
router.get('/progress', verifyJWT, async (req, res) => {
  try {
    const { jobId } = req.query;
    
    const query = { userId: req.user._id };
    if (jobId) {
      query.jobId = jobId;
    }

    const sessions = await WritingPracticeSession.find(query)
      .sort({ createdAt: 1 }) // Oldest first for trend analysis
      .select('averageOverallScore averageStructureScore averageClarityScore averageStorytellingScore createdAt responses');
    
    if (sessions.length === 0) {
      return res.json({ 
        progressData: [],
        overallTrend: null,
        totalSessions: 0,
        totalResponses: 0
      });
    }

    // Calculate progress data for charts
    const progressData = sessions.map(s => ({
      date: s.createdAt,
      overallScore: s.averageOverallScore,
      structureScore: s.averageStructureScore,
      clarityScore: s.averageClarityScore,
      storytellingScore: s.averageStorytellingScore,
      responseCount: s.responses.length
    }));

    // Calculate overall trend (first vs last)
    const firstScore = sessions[0].averageOverallScore;
    const lastScore = sessions[sessions.length - 1].averageOverallScore;
    const overallTrend = lastScore - firstScore;

    // Calculate totals
    const totalResponses = sessions.reduce((sum, s) => sum + s.responses.length, 0);

    res.json({
      progressData,
      overallTrend,
      totalSessions: sessions.length,
      totalResponses,
      firstSessionDate: sessions[0].createdAt,
      lastSessionDate: sessions[sessions.length - 1].createdAt
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// ===================================
// GET COMPARISON BETWEEN TWO SESSIONS
// ===================================
router.get('/compare/:sessionId1/:sessionId2', verifyJWT, async (req, res) => {
  try {
    const { sessionId1, sessionId2 } = req.params;

    const [session1, session2] = await Promise.all([
      WritingPracticeSession.findOne({ _id: sessionId1, userId: req.user._id }),
      WritingPracticeSession.findOne({ _id: sessionId2, userId: req.user._id })
    ]);

    if (!session1 || !session2) {
      return res.status(404).json({ error: 'One or both sessions not found' });
    }

    const comparison = {
      session1: {
        id: session1._id,
        date: session1.createdAt,
        overallScore: session1.averageOverallScore,
        structureScore: session1.averageStructureScore,
        clarityScore: session1.averageClarityScore,
        storytellingScore: session1.averageStorytellingScore
      },
      session2: {
        id: session2._id,
        date: session2.createdAt,
        overallScore: session2.averageOverallScore,
        structureScore: session2.averageStructureScore,
        clarityScore: session2.averageClarityScore,
        storytellingScore: session2.averageStorytellingScore
      },
      improvements: {
        overall: session2.averageOverallScore - session1.averageOverallScore,
        structure: (session2.averageStructureScore || 0) - (session1.averageStructureScore || 0),
        clarity: (session2.averageClarityScore || 0) - (session1.averageClarityScore || 0),
        storytelling: (session2.averageStorytellingScore || 0) - (session1.averageStorytellingScore || 0)
      }
    };

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing sessions:', error);
    res.status(500).json({ error: 'Failed to compare sessions' });
  }
});

export default router;