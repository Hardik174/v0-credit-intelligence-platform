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
