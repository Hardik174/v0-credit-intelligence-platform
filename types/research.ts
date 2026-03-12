export type Sentiment = 'Positive' | 'Neutral' | 'Negative';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ResearchInsight {
  id: string;
  entityId: string;
  category: 'News' | 'Legal' | 'Sector' | 'Macro' | 'Competitor';
  headline: string;
  summary: string;
  source: string;
  sentiment: Sentiment;
  publishedAt: string;
  url?: string;
}

export interface SectorTrend {
  month: string;
  sectorIndex: number;
  entityPerformance: number;
}

export interface MacroIndicator {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RiskSignal {
  id: string;
  title: string;
  value: string;
  riskLevel: RiskLevel;
  description: string;
  icon?: string;
}

export interface AIInsightSummary {
  summary: string;
  timestamp: string;
}
