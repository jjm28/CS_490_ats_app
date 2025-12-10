import express from 'express';
import Interview from '../models/interviewAnalytics.js';

const router = express.Router();

// GET all analytics for a user
router.get('/analytics', async (req, res) => {
  try {
    const { userId } = req.query; // or however you handle auth
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const analytics = await Interview.find({ userId })
      .sort({ date: -1 }) // Most recent first
      .lean();

    res.json({ 
      interviews,
      benchmarks: {
        avgConversionRate: 40, // Industry benchmark
        avgScoresByArea: {
          technical: 75,
          communication: 70,
          problemSolving: 72,
          behavioral: 68,
          systemDesign: 70,
          coding: 73
        }
      }
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// POST create new interview
router.post('/interviews', async (req, res) => {
  try {
    const interview = new Interview(req.body);
    await interview.save();
    res.status(201).json(interview);
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ error: 'Failed to create interview' });
  }
});

// PATCH update interview
router.patch('/analytics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    res.json(interview);
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// DELETE interview
router.delete('/analytics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const interview = await Interview.findByIdAndDelete(id);
    
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    
    res.json({ message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
});

export default router;