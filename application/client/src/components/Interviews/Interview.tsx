// src/pages/Interview.tsx
import { useState } from 'react';
import MockPractice from './MockPractice';
import '../../styles/InterviewStyles/Interview.css';
import InterviewPrepResearch from './CompanyResearch';
import InterviewPrepChecklist from './InterviewPrepChecklist';
import SalaryNegotiationPage from './SalaryNegotiationPage';
import Questions from './Questions';
import '../../styles/InterviewPrepUI.css';
import WritingPractice from '../../components/Interviews/WritingPractice';
import InterviewFollowUpPage from './InterviewFollowUpPage';
import ResponseCoaching from './ResponseCoach';
import InterviewAnalyticsDashboard from './Analytics';
import Scheduling from './Scheduling';
import InterviewSuccessProbability from './InterviewSuccessProbability';
import InterviewSchedulerPage from './InterviewSchedulerPage';

type CardData = {
  label: string;
  title: string;
  description: string;
  color?: string;
  details?: string;
  component?: 'research' | 'checklist' | 'followup' | 'negotiation' | 'questions' | 'writing-practice' | 
  'success-probability' | 'calendar' | 'aicoaching' | 'scheduling' | 'mock-interview' | 'analytics' | null;
};

const cardData: CardData[] = [
  // ============================================
  // 📚 RESEARCH & PREPARATION
  // ============================================
  {
    label: 'Research',
    title: 'Company Research',
    description: 'Deep dive into company culture and values',
    color: '#0E3B43',
    details: 'Access curated reports, employee reviews, news, and cultural insights to understand what makes this company unique. Learn their mission, values, recent initiatives, and interview expectations.',
    component: 'research'
  },
  {
    label: 'Preparation',
    title: 'Preparation Checklist',
    description: 'Customized prep tasks for each interview',
    color: '#0E3B43',
    details: 'Get a personalized checklist for every interview with company research, logistics verification, practice reminders, and confidence-building activities.',
    component: 'checklist'
  },
  {
    label: 'Role Questions',
    title: 'Role-Specific Questions',
    description: 'Tailored questions for your position',
    color: '#0E3B43',
    details: 'Get a database of real interview questions asked for this exact role at this company. Filter by round (phone screen, onsite), experience level, and question type (coding, behavioral, system design).',
    component: 'questions'
  },
  {
    label: 'Success Probability',
    title: 'Interview Success Predictor',
    description: 'AI-powered success probability scoring',
    color: '#0E3B43',
    details: 'Get data-driven predictions for your interview success based on preparation level, company research, practice sessions, and historical performance. Receive actionable recommendations to improve your chances.',
    component: 'success-probability'
  },

  // ============================================
  // 🎯 PRACTICE & COACHING
  // ============================================
  {
    label: 'Mock Interviews/Tech Prep',
    title: 'Mock Interviews',
    description: 'Practice with coding challenges, system design, realistic scenarios',
    color: '#123F32',
    details: 'Simulate real interview conditions with timed coding challenges, system design prompts, and behavioral scenarios. Get scored on problem-solving, efficiency, and communication.',
    component: 'mock-interview'
  },
  {
    label: 'AI Coaching',
    title: 'AI Response Coaching',
    description: 'Real-time feedback on your responses',
    color: '#123F32',
    details: 'Answer interview questions and receive instant AI feedback on clarity, structure, technical accuracy, and communication style. Compare your answers to strong examples.',
    component: 'aicoaching'
  },

  {
    label: 'Scheduled Interviews',
    title: 'Scheduled Interviews',
    description: 'Manage and edit all your scheduled interviews',
    color: '#2B3A55',
    details: 'View your future scheduled interviews and prepare accordingly.',
    component: 'scheduling'
  },
  // ============================================
  // 📅 SCHEDULING & TRACKING
  // ============================================
  {
    label: 'Calendar',
    title: 'Calendar Integration',
    description: 'Schedule and track your interviews',
    color: '#2B3A55',
    details: 'Sync with Google Calendar to auto-schedule prep time, track upcoming interviews, set reminders, and log feedback after each round.',
    component: 'calendar'
  },

  {
    label: 'Writing Practice',
    title: 'Response Writing Practice',
    description: 'Improve clarity, structure, and storytelling',
    color: '#123F32',
    details: 'Practice writing interview responses with timed exercises, get AI feedback on clarity and structure, track improvement over time, and build confidence for virtual interviews.',
    component: 'writing-practice'
  },

  {
    label: 'Analytics',
    title: 'Performance Analytics',
    description: 'Track your progress and improvements',
    color: '#2B3A55',
    details: 'Visualize your skill growth over time. See strengths, weaknesses, improvement areas, and readiness scores for different companies and roles.',
    component: 'analytics'
  },

  // ============================================
  // 💼 POST-INTERVIEW
  // ============================================
  {
    label: 'Follow-Up',
    title: 'Interview Follow-Up',
    description: 'Send professional follow-up emails',
    color: '#442B48',
    details: 'Generate and send thank you emails, status inquiries, feedback requests, and networking follow-ups after your interviews.',
    component: 'followup'
  },
  {
    label: 'Salary Negotiation',
    title: 'Salary Negotiation',
    description: 'AI-powered negotiation preparation and strategy',
    color: '#442B48',
    details: 'Get personalized negotiation talking points, scripts for different scenarios, market salary analysis, and counter-offer recommendations based on real market data.',
    component: 'negotiation'
  },
];

type InterviewCardProps = {
  label: string;
  title: string;
  description: string;
  color?: string;
  onClick: () => void;
};

const InterviewCard = ({ label, title, description, color, onClick }: InterviewCardProps) => {
  return (
    <div
      className="magic-bento-card magic-bento-card--border-glow clickable"
      style={{ backgroundColor: color || '#0E3B43', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="magic-bento-card__header">
        <div className="magic-bento-card__label">{label}</div>
      </div>
      <div className="magic-bento-card__content">
        <h2 className="magic-bento-card__title">{title}</h2>
        <p className="magic-bento-card__description">{description}</p>
      </div>
    </div>
  );
};

// 🔍 Detail View Component
const DetailView = ({ 
  card, 
  onBack 
}: { 
  card: CardData; 
  onBack: () => void;
}) => {
  // Route to appropriate component based on card type
  switch (card.component) {
    case 'research':
      return <InterviewPrepResearch onBack={onBack} />;
    case 'questions':
      return <Questions onBack={onBack} />;
    case 'checklist':
      return <InterviewPrepChecklist onBack={onBack} />;
    case 'negotiation':
      return <SalaryNegotiationPage onBack={onBack} />;
    case 'followup':
      return <InterviewFollowUpPage onBack={onBack} />;
    case 'aicoaching':
      return <ResponseCoaching onBack={onBack} />;
    case 'calendar':
      return <InterviewSchedulerPage onBack={onBack} />;
    default:
      // Default detail view for cards without specific components
      return (
        <div 
          className="interview-detail-view"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: card.color || '#0E3B43',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            boxSizing: 'border-box',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <button
            onClick={onBack}
            style={{
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginBottom: '2rem'
            }}
          >
            ← Back to Overview
          </button>

          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <span 
              className="magic-bento-card__label"
              style={{ 
                display: 'inline-block',
                marginBottom: '1rem',
                background: 'rgba(255,255,255,0.1)',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px'
              }}
            >
              {card.label}
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
              {card.title}
            </h1>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.9 }}>
              {card.details || card.description}
            </p>
          </div>
        </div>
      );
  }
};

const Interview = () => {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const handleCardClick = (index: number) => {
    const card = cardData[index];
    
    // Handle special features that need full-page rendering
    if (card.component === 'mock-interview') {
      setActiveFeature('mock-interview');
      return;
    }

    if (card.component === 'writing-practice') {
      setActiveFeature('writing-practice');
      return;
    }

    if (card.component === 'analytics') {
      setActiveFeature('analytics');
      return;
    }

    if (card.component === 'scheduling') {
      setActiveFeature('scheduling');
      return;
    }

    if (card.component === 'success-probability') {
      setActiveFeature('success-probability');
      return;
    }
    
    // Default: show detail view
    setSelectedCardIndex(index);
  };

  const handleBack = () => {
    setSelectedCardIndex(null);
    setActiveFeature(null);
  };

  // Render full-page features
  if (activeFeature === 'success-probability') {
    return <InterviewSuccessProbability onBack={handleBack} />;
  }

  if (activeFeature === 'mock-interview') {
    return <MockPractice onBack={handleBack} />;
  }

  if (activeFeature === 'writing-practice') {
    return <WritingPractice onBack={handleBack} />;
  }

  if (activeFeature === 'scheduling') {
    return <Scheduling onBack={handleBack} />;
  }

  if (activeFeature === 'analytics') {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={handleBack}
          style={{
            position: 'fixed',
            top: '2rem',
            left: '2rem',
            background: '#357266',
            border: 'none',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          ← Back to Overview
        </button>
        <InterviewAnalyticsDashboard />
      </div>
    );
  }

  // Detail Mode
  if (selectedCardIndex !== null) {
    return <DetailView card={cardData[selectedCardIndex]} onBack={handleBack} />;
  }

  // Grid Mode
  return (
    <div className="magic-bento-container">
      <div className="card-grid">
        {cardData.map((card, index) => (
          <InterviewCard
            key={index}
            label={card.label}
            title={card.title}
            description={card.description}
            color={card.color}
            onClick={() => handleCardClick(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default Interview;