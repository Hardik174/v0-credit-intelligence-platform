export interface RiskAnalysis {
  entityId: string;
  overallScore: number;
  categories: RiskCategory[];
  keyIndicators: RiskIndicator[];
  aiReasoning: string;
  generatedAt: string;
}

export interface RiskCategory {
  name: 'Financial Risk' | 'Operational Risk' | 'Market Risk' | 'Governance Risk';
  score: number;
  explanation: string;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  impact: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface RiskIndicator {
  name: string;
  value: number;
  threshold: number;
  status: 'safe' | 'warning' | 'danger';
}

export type LoanRecommendation = 'APPROVE' | 'REVIEW' | 'REJECT';
export type RiskGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B';

export interface RiskFactorBreakdown {
  name: 'Financial Risk' | 'Legal Risk' | 'Operational Risk' | 'Sector Risk' | 'Reputation Risk';
  score: number;
}

export interface CreditDecision {
  entityId: string;
  loanRecommendation: LoanRecommendation;
  riskScore: number;
  riskGrade: RiskGrade;
  reasoning: string[];
  riskFactorBreakdown: RiskFactorBreakdown[];
  dataSourceTags: string[];
  generatedAt: string;
}
