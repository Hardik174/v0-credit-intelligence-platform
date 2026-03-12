import { useState, useEffect } from 'react';
import { CreditDecision } from '@/types/risk';

const mockCreditDecision: CreditDecision = {
  entityId: 'ent-001',
  loanRecommendation: 'APPROVE',
  riskScore: 38,
  riskGrade: 'BBB',
  reasoning: [
    'Low litigation exposure with no active material legal proceedings',
    'Stable NBFC sector outlook with steady growth trajectory',
    'Positive media sentiment and stakeholder confidence',
    'Strong financial performance with consistent revenue growth',
    'Adequate collateral coverage and pledge mechanisms in place',
  ],
  riskFactorBreakdown: [
    { name: 'Financial Risk', score: 32 },
    { name: 'Legal Risk', score: 18 },
    { name: 'Operational Risk', score: 42 },
    { name: 'Sector Risk', score: 55 },
    { name: 'Reputation Risk', score: 28 },
  ],
  dataSourceTags: [
    'Financial Statements',
    'News Sentiment',
    'Litigation Records',
    'Sector Trends',
    'Macroeconomic Indicators',
  ],
  generatedAt: new Date().toISOString(),
};

export function useAICreditDecision(entityId?: string) {
  const [creditDecision, setCreditDecision] = useState<CreditDecision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analystNotes, setAnalystNotes] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    const fetchCreditDecision = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCreditDecision(mockCreditDecision);
      setIsLoading(false);
    };

    fetchCreditDecision();
  }, [entityId]);

  const recalculateRiskScore = async () => {
    setIsRecalculating(true);
    // Simulate recalculation with analyst notes
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (creditDecision) {
      // Slightly adjust risk score based on notes
      const adjustment = analystNotes.toLowerCase().includes('capacity') ? -5 : 0;
      const newRiskScore = Math.max(0, Math.min(100, creditDecision.riskScore + adjustment));

      setCreditDecision({
        ...creditDecision,
        riskScore: newRiskScore,
        generatedAt: new Date().toISOString(),
      });
    }

    setIsRecalculating(false);
  };

  return {
    creditDecision,
    isLoading,
    analystNotes,
    setAnalystNotes,
    recalculateRiskScore,
    isRecalculating,
  };
}
