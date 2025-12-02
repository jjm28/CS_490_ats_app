import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../../utils/apiBase';
import Button from '../StyledComponents/Button';
import Card from '../StyledComponents/Card';
import type { NegotiationPrep } from '../../types/jobs.types';

interface SalaryNegotiationProps {
  jobId: string;
  jobTitle: string;
  company: string;
  currentOffer: number;
  onClose?: () => void;
}

const SalaryNegotiation: React.FC<SalaryNegotiationProps> = ({
  jobId,
  jobTitle,
  company,
  currentOffer,
  onClose
}) => {
  const navigate = useNavigate();
  const [negotiationPrep, setNegotiationPrep] = useState<NegotiationPrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'talking-points' | 'scripts' | 'strategy'>('overview');
  const [customNotes, setCustomNotes] = useState('');

  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';

  useEffect(() => {
    fetchNegotiationPrep();
  }, [jobId]);

  const fetchNegotiationPrep = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/jobs/${jobId}/negotiation`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        setNegotiationPrep(null);
      } else if (response.ok) {
        const data = await response.json();
        setNegotiationPrep(data.negotiationPrep);
        setCustomNotes(data.negotiationPrep.strategy?.notes || '');
      } else {
        throw new Error('Failed to fetch negotiation prep');
      }
    } catch (err: any) {
      console.error('Error fetching negotiation prep:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/jobs/${jobId}/negotiation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate negotiation prep');
      }

      const data = await response.json();
      setNegotiationPrep(data);
      setActiveTab('overview');
    } catch (err: any) {
      console.error('Error generating negotiation prep:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!negotiationPrep) return;

    try {
      const response = await fetch(`${API_BASE}/api/jobs/${jobId}/negotiation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          strategy: {
            ...negotiationPrep.strategy,
            notes: customNotes
          }
        })
      });

      if (response.ok) {
        await fetchNegotiationPrep();
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile < 25) return 'text-red-600';
    if (percentile < 50) return 'text-orange-600';
    if (percentile < 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getConfidenceColor = (level: string) => {
    if (level === 'high') return 'text-green-600';
    if (level === 'medium') return 'text-yellow-600';
    return 'text-orange-600';
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading negotiation prep...</span>
        </div>
      </Card>
    );
  }

  // Not generated yet
  if (!negotiationPrep) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="mb-4">
            <span className="text-6xl">💰</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Salary Negotiation Preparation
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get AI-powered negotiation strategies, talking points, and scripts tailored to your offer at {company}.
          </p>
          
          {currentOffer ? (
            <>
              <div className="mb-6">
                <div className="text-sm text-gray-500">Current Offer</div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(currentOffer)}</div>
              </div>
              
              <Button 
                onClick={handleGenerate} 
                disabled={generating}
                className="inline-flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    🤖 Generate Negotiation Prep
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                Please enter the offered salary in the job details first, then come back to generate your negotiation prep.
              </p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Generated - show tabs
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">💰 Salary Negotiation Prep</h2>
            <p className="text-gray-600 mt-1">
              {jobTitle} at {company}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Generated {new Date(negotiationPrep.generatedAt).toLocaleDateString()}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', emoji: '📊' },
            { id: 'talking-points', label: 'Talking Points', emoji: '💬' },
            { id: 'scripts', label: 'Scripts', emoji: '📝' },
            { id: 'strategy', label: 'Strategy', emoji: '💡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Market Comparison */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📈</span> Market Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Your Offer</div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(negotiationPrep.marketData.yourOffer)}
                </div>
                <div className={`text-sm font-medium mt-1 ${getPercentileColor(negotiationPrep.marketData.percentile)}`}>
                  {negotiationPrep.marketData.percentile}th percentile
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Market Min</span>
                  <span className="font-medium">{formatCurrency(negotiationPrep.marketData.marketMin)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Market Median</span>
                  <span className="font-medium">{formatCurrency(negotiationPrep.marketData.marketMedian)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Market Max</span>
                  <span className="font-medium">{formatCurrency(negotiationPrep.marketData.marketMax)}</span>
                </div>
              </div>
            </div>

            {/* Visual bar */}
            <div className="mt-6">
              <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
                <div 
                  className="absolute h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                  style={{ width: '100%' }}
                />
                <div 
                  className="absolute h-full w-1 bg-blue-600"
                  style={{ 
                    left: `${negotiationPrep.marketData.percentile}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-blue-600 whitespace-nowrap">
                    Your Offer
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Low</span>
                <span>Market Median</span>
                <span>High</span>
              </div>
            </div>
          </Card>

          {/* Counter-Offer Recommendation */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📊</span> Recommended Counter-Offer
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm text-blue-700 mb-1">Target Salary</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatCurrency(negotiationPrep.counterOffer.targetSalary)}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(negotiationPrep.counterOffer.confidenceLevel)}`}>
                  {negotiationPrep.counterOffer.confidenceLevel.toUpperCase()} confidence
                </div>
              </div>
              
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Minimum Acceptable:</span> {formatCurrency(negotiationPrep.counterOffer.minimumAcceptable)}
              </div>
              
              <p className="text-sm text-gray-700">
                {negotiationPrep.counterOffer.justification}
              </p>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="text-center">
                <div className="text-3xl mb-2">💬</div>
                <div className="text-2xl font-bold text-gray-900">
                  {negotiationPrep.talkingPoints.length}
                </div>
                <div className="text-sm text-gray-600">Talking Points</div>
              </div>
            </Card>
            
            <Card>
              <div className="text-center">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-2xl font-bold text-gray-900">
                  {negotiationPrep.scripts.length}
                </div>
                <div className="text-sm text-gray-600">Negotiation Scripts</div>
              </div>
            </Card>
            
            <Card>
              <div className="text-center">
                <div className="text-3xl mb-2">💪</div>
                <div className="text-2xl font-bold text-gray-900">
                  {negotiationPrep.strategy.leverage.length}
                </div>
                <div className="text-sm text-gray-600">Leverage Points</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'talking-points' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Talking Points
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Use these points to support your salary negotiation. They're ordered from strongest to supporting arguments.
          </p>
          
          <div className="space-y-4">
            {negotiationPrep.talkingPoints
              .sort((a, b) => a.order - b.order)
              .map((point, index) => (
                <div 
                  key={index}
                  className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {point.order}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {point.category.replace('_', ' ')}
                      </div>
                      <p className="text-gray-900">{point.point}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {activeTab === 'scripts' && (
        <div className="space-y-4">
          {negotiationPrep.scripts.map((script, index) => (
            <Card key={index}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                {script.scenario.replace(/_/g, ' ')}
              </h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-gray-800 italic">"{script.script}"</p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-900 mb-2">💡 Tips:</div>
                <ul className="space-y-2">
                  {script.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'strategy' && (
        <div className="space-y-4">
          {/* Timing */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>⏰</span> Timing
            </h3>
            <p className="text-gray-700">{negotiationPrep.strategy.timing}</p>
          </Card>

          {/* Leverage */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-green-600">💪</span> Your Leverage Points
            </h3>
            <ul className="space-y-2">
              {negotiationPrep.strategy.leverage.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Risks */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-orange-600">⚠️</span> Potential Risks to Consider
            </h3>
            <ul className="space-y-2">
              {negotiationPrep.strategy.risks.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">⚠</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Alternatives (BATNA) */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">🔄</span> Alternative Options (BATNA)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              If salary negotiation doesn't work, consider these alternatives:
            </p>
            <ul className="space-y-2">
              {negotiationPrep.strategy.alternatives.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Custom Notes */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📝</span> Your Notes
            </h3>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="form-input w-full"
              rows={4}
              placeholder="Add your own notes, observations, or additional strategy points..."
            />
            <div className="flex justify-end mt-3">
              <Button onClick={handleSaveNotes} variant="secondary">
                Save Notes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalaryNegotiation;