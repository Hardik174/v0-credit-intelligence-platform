import { useState, useEffect } from 'react';
import { RiskAnalysis } from '@/types/risk';

const mockRiskAnalysis: RiskAnalysis = {
  entityId: '1',
  overallScore: 72,
  generatedAt: '2024-01-15T10:00:00Z',
  aiReasoning:
    'The entity demonstrates strong operational fundamentals with a diversified revenue base. However, elevated debt levels relative to the sector average and exposure to cyclical steel prices present moderate financial risk. Governance structures are robust with independent board oversight. The proposed loan amount aligns with the entity\'s capacity for additional debt service, though the DSCR is marginally above the minimum threshold.',
  categories: [
    {
      name: 'Financial Risk',
      score: 65,
      explanation:
        'Moderate financial risk due to elevated debt-to-equity ratio of 0.68 and cyclical revenue patterns. However, strong EBITDA margins and consistent cash flow generation provide adequate debt servicing capacity.',
      factors: [
        { name: 'High Debt-to-Equity Ratio', impact: 'High', description: 'D/E ratio of 0.68 is above industry median of 0.52' },
        { name: 'Revenue Cyclicality', impact: 'Medium', description: 'Steel prices are subject to global commodity cycles' },
        { name: 'Strong EBITDA Margins', impact: 'Low', description: 'EBITDA margin of 21% is above industry average' },
      ],
    },
    {
      name: 'Operational Risk',
      score: 78,
      explanation:
        'Low operational risk with world-class manufacturing facilities and strong supply chain management. Ongoing Kalinganagar expansion is on schedule.',
      factors: [
        { name: 'Production Efficiency', impact: 'Low', description: 'Capacity utilization at 92%' },
        { name: 'Supply Chain', impact: 'Low', description: 'Captive iron ore mines reduce input risk' },
        { name: 'Expansion Risk', impact: 'Medium', description: 'Large capex project underway' },
      ],
    },
    {
      name: 'Market Risk',
      score: 58,
      explanation:
        'Elevated market risk from global steel price volatility and increasing Chinese imports. Government anti-dumping measures provide some protection.',
      factors: [
        { name: 'Chinese Import Threat', impact: 'High', description: 'Chinese steel dumping affecting domestic prices' },
        { name: 'Global Price Volatility', impact: 'High', description: 'Steel prices showed 25% variance in last 12 months' },
        { name: 'Domestic Demand', impact: 'Low', description: 'Infrastructure push driving strong domestic demand' },
      ],
    },
    {
      name: 'Governance Risk',
      score: 88,
      explanation:
        'Strong governance framework with experienced board, independent directors, and robust compliance systems. Tata Group\'s reputation adds governance strength.',
      factors: [
        { name: 'Board Independence', impact: 'Low', description: '60% independent directors on board' },
        { name: 'Audit Quality', impact: 'Low', description: 'Clean audit opinions for 5 consecutive years' },
        { name: 'Related Party Transactions', impact: 'Low', description: 'All RPTs at arm\'s length pricing' },
      ],
    },
  ],
  keyIndicators: [
    { name: 'DSCR', value: 1.45, threshold: 1.25, status: 'safe' },
    { name: 'Current Ratio', value: 1.12, threshold: 1.0, status: 'warning' },
    { name: 'Interest Coverage', value: 5.8, threshold: 3.0, status: 'safe' },
    { name: 'Debt/EBITDA', value: 1.67, threshold: 3.0, status: 'safe' },
    { name: 'Net NPA', value: 0.0, threshold: 2.0, status: 'safe' },
    { name: 'Return on Equity', value: 18.5, threshold: 12.0, status: 'safe' },
  ],
};

export function useRiskAnalysis(entityId?: string) {
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setRiskAnalysis(mockRiskAnalysis);
      setIsLoading(false);
    };
    fetchRisk();
  }, [entityId]);

  return { riskAnalysis, isLoading };
}
