// src/components/Interviews/NerveManagementModal.tsx
import { useEffect, useState } from 'react';

type NerveManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;  // NEW: Optional back handler
  jobTitle?: string;
};

export default function NerveManagementModal({ 
  isOpen, 
  onClose,
  onBack,
  jobTitle 
}: NerveManagementModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    if (!isOpen) {
      setCountdown(null);
      return;
    }
  }, [isOpen]);

  const startBreathingExercise = () => {
    setCountdown(4);
    setBreathingPhase('inhale');
  };

  useEffect(() => {
    if (countdown === null || countdown === 0) return;

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        // Move to next phase
        if (breathingPhase === 'inhale') {
          setBreathingPhase('hold');
          setCountdown(4);
        } else if (breathingPhase === 'hold') {
          setBreathingPhase('exhale');
          setCountdown(4);
        } else {
          // Completed one cycle
          setCountdown(null);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, breathingPhase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg relative">
          {/* Back Button (optional) */}
          {onBack && (
            <button
              onClick={() => {
                onBack();
                onClose();
              }}
              className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
              title="Go back"
            >
              <span className="text-xl">←</span>
            </button>
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <span className="text-2xl">×</span>
          </button>
          
          <h2 className="text-2xl font-bold mb-2 text-center">
            🧘 Pre-Practice Preparation
          </h2>
          <p className="text-blue-100 text-center">
            Take a moment to center yourself before practicing for {jobTitle || 'this position'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Mindset Tips */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>💭</span> Mindset Preparation
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700">
                • <strong>Remember:</strong> This is practice, not the real thing. You're here to improve.
              </p>
              <p className="text-sm text-gray-700">
                • <strong>Focus on progress:</strong> Even small improvements matter.
              </p>
              <p className="text-sm text-gray-700">
                • <strong>Be authentic:</strong> The best responses come from your real experiences.
              </p>
              <p className="text-sm text-gray-700">
                • <strong>Learn from feedback:</strong> AI feedback is a tool to help you grow, not judge you.
              </p>
            </div>
          </section>

          {/* Breathing Exercise */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🌬️</span> Box Breathing Exercise
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-4">
                This 4-4-4 breathing technique helps calm your nervous system and improve focus.
              </p>
              
              {countdown === null ? (
                <button
                  onClick={startBreathingExercise}
                  className="w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start Breathing Exercise
                </button>
              ) : (
                <div className="text-center">
                  <div className={`mb-4 text-6xl font-bold transition-all duration-1000 ${
                    breathingPhase === 'inhale' ? 'text-blue-600 scale-110' :
                    breathingPhase === 'hold' ? 'text-purple-600 scale-105' :
                    'text-green-600 scale-100'
                  }`}>
                    {countdown}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mb-2 capitalize">
                    {breathingPhase === 'inhale' ? '🫁 Breathe In' :
                     breathingPhase === 'hold' ? '⏸️ Hold' :
                     '💨 Breathe Out'}
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <div className={`w-4 h-4 rounded-full ${breathingPhase === 'inhale' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <div className={`w-4 h-4 rounded-full ${breathingPhase === 'hold' ? 'bg-purple-600' : 'bg-gray-300'}`} />
                    <div className={`w-4 h-4 rounded-full ${breathingPhase === 'exhale' ? 'bg-green-600' : 'bg-gray-300'}`} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Quick Tips */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>⚡</span> Quick Tips for This Session
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✍️ <strong>Write naturally:</strong> Don't overthink - your first instinct is often best</li>
                <li>📊 <strong>Use STAR method:</strong> Situation, Task, Action, Result (for behavioral questions)</li>
                <li>📏 <strong>Aim for 75-150 words:</strong> Enough detail without rambling</li>
                <li>🎯 <strong>Be specific:</strong> Include metrics, names, and concrete examples</li>
                <li>⏱️ <strong>Respect the timer:</strong> Practice under realistic time pressure</li>
              </ul>
            </div>
          </section>

          {/* Common Mistakes to Avoid */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>❌</span> Avoid These Mistakes
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li>🚫 Don't use generic answers - make it personal to your experience</li>
                <li>🚫 Don't ramble - be concise and structured</li>
                <li>🚫 Don't skip the "result" - always show the impact</li>
                <li>🚫 Don't use jargon without explanation</li>
                <li>🚫 Don't forget to proofread before submitting</li>
              </ul>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            {onBack && (
              <button
                onClick={() => {
                  onBack();
                  onClose();
                }}
                className="flex-1 py-3 px-6 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Go Back
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              I'm Ready - Let's Practice! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}