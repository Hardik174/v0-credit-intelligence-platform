export type Sentiment = 'Positive' | 'Neutral' | 'Negative';

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
