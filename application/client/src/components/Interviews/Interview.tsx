// src/pages/Interview.tsx
import { useState } from 'react';
import MockPractice from './MockPractice';
import '../../styles/InterviewStyles/Interview.css';

type CardData = {
  label: string;
  title: string;
  description: string;
  color?: string;
  // Optional: add more detail later
  details?: string;
};

const cardData: CardData[] = [
  {
    label: 'Research',
    title: 'Company Research',
    description: 'Deep dive into company culture and values',
    color: '#0E3B43',
    details: 'Access curated reports, employee reviews, news, and cultural insights to understand what makes this company unique. Learn their mission, values, recent initiatives, and interview expectations.'
  },
  {
    label: 'Role Questions',
    title: 'Role-Specific Qs',
    description: 'Tailored questions for your position',
    color: '#0E3B43',
    details: 'Get a database of real interview questions asked for this exact role at this company. Filter by round (phone screen, onsite), experience level, and question type (coding, behavioral, system design).'
  },
  {
    label: 'AI Coaching',
    title: 'AI Coaching',
    description: 'Real-time feedback on your responses',
    color: '#0E3B43',
    details: 'Record yourself answering questions and receive instant AI feedback on clarity, structure, technical accuracy, and communication style. Compare your answers to strong examples.'
  },
  {
    label: 'Mock Interviews/Tech Prep',
    title: 'Mock Interviews',
    description: 'Practice with coding challenges, system design, realistic scenarios',
    color: '#0E3B43',
    details: 'Simulate real interview conditions with timed coding challenges, system design prompts, and behavioral scenarios. Get scored on problem-solving, efficiency, and communication.'
  },
  {
    label: 'Calendar',
    title: 'Calendar Integration',
    description: 'Schedule and track your interviews',
    color: '#0E3B43',
    details: 'Sync with Google Calendar to auto-schedule prep time, track upcoming interviews, set reminders, and log feedback after each round.'
  },
  {
    label: 'Analytics',
    title: 'Performance Analytics',
    description: 'Track your progress and improvements',
    color: '#0E3B43',
    details: 'Visualize your skill growth over time. See strengths, weaknesses, improvement areas, and readiness scores for different companies and roles.'
  }
];

type InterviewCardProps = {
  label: string;
  title: string;
  description: string;
  color?: string;
  onClick: () => void; // 👈 Add click handler
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
      {/* Back Button */}
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

      {/* Content */}
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

        {/* You can add more content here later — forms, buttons, etc. */}
      </div>
    </div>
  );
};

const Interview = () => {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null); // ✅ Add this

  const handleCardClick = (index: number) => {
    const card = cardData[index];
    
    // ✅ Check if it's Mock Interview card
    if (card.label === 'Mock Interviews/Tech Prep') {
      setActiveFeature('mock-interview');
      return; // Don't set selectedCardIndex
    }
    
    // For other cards, show the detail view
    setSelectedCardIndex(index);
  };

  const handleBack = () => {
    setSelectedCardIndex(null);
    setActiveFeature(null); // ✅ Reset both
  };

  // ✅ Show Mock Interview feature
  if (activeFeature === 'mock-interview') {
    return <MockPractice onBack={handleBack} />;
  }

  // 🔍 Detail Mode (existing)
  if (selectedCardIndex !== null) {
    return <DetailView card={cardData[selectedCardIndex]} onBack={handleBack} />;
  }

  // 📊 Grid Mode (existing)
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