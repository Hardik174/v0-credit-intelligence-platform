// import { useState, useEffect } from 'react';
// import { ResearchInsight, SectorTrend, MacroIndicator } from '@/types/research';

// const mockInsights: ResearchInsight[] = [
//   {
//     id: 'r1',
//     entityId: '1',
//     category: 'News',
//     headline: 'Tata Steel Reports Strong Q3 Results, EBITDA Up 15%',
//     summary: 'Tata Steel reported a 15% increase in EBITDA for Q3 FY24, driven by strong domestic demand and improved operational efficiency.',
//     source: 'Economic Times',
//     sentiment: 'Positive',
//     publishedAt: '2024-01-14T08:00:00Z',
//     url: '#',
//   },
//   {
//     id: 'r2',
//     entityId: '1',
//     category: 'Legal',
//     headline: 'NCLT Approves Tata Steel\'s Merger with Seven Subsidiaries',
//     summary: 'The National Company Law Tribunal has approved the merger of seven subsidiaries into Tata Steel, simplifying the corporate structure.',
//     source: 'LiveMint',
//     sentiment: 'Positive',
//     publishedAt: '2024-01-13T12:00:00Z',
//     url: '#',
//   },
//   {
//     id: 'r3',
//     entityId: '1',
//     category: 'Sector',
//     headline: 'Steel Sector Faces Headwinds from Chinese Dumping',
//     summary: 'Indian steel producers face increased competition from cheap Chinese imports, with dumping margins estimated at 20-30%.',
//     source: 'Business Standard',
//     sentiment: 'Negative',
//     publishedAt: '2024-01-12T10:00:00Z',
//     url: '#',
//   },
//   {
//     id: 'r4',
//     entityId: '1',
//     category: 'Macro',
//     headline: 'RBI Maintains Repo Rate at 6.5%, GDP Growth at 7%',
//     summary: 'The Reserve Bank of India kept the repo rate unchanged at 6.5%, projecting GDP growth at 7% for FY24.',
//     source: 'Reuters',
//     sentiment: 'Neutral',
//     publishedAt: '2024-01-11T06:00:00Z',
//     url: '#',
//   },
// ];

// const mockSectorTrends: SectorTrend[] = [
//   { month: 'Jul', sectorIndex: 82, entityPerformance: 78 },
//   { month: 'Aug', sectorIndex: 85, entityPerformance: 82 },
//   { month: 'Sep', sectorIndex: 83, entityPerformance: 85 },
//   { month: 'Oct', sectorIndex: 88, entityPerformance: 87 },
//   { month: 'Nov', sectorIndex: 86, entityPerformance: 90 },
//   { month: 'Dec', sectorIndex: 90, entityPerformance: 92 },
//   { month: 'Jan', sectorIndex: 92, entityPerformance: 88 },
// ];

// const mockMacroIndicators: MacroIndicator[] = [
//   { name: 'GDP Growth Rate', value: 7.0, change: 0.3, trend: 'up' },
//   { name: 'Repo Rate', value: 6.5, change: 0, trend: 'stable' },
//   { name: 'Inflation (CPI)', value: 5.7, change: -0.2, trend: 'down' },
//   { name: 'Steel Price Index', value: 112.5, change: 2.3, trend: 'up' },
//   { name: 'USD/INR', value: 83.12, change: 0.15, trend: 'up' },
//   { name: 'Industrial Production', value: 5.8, change: 0.5, trend: 'up' },
// ];

// export function useResearch(entityId?: string) {
//   const [insights, setInsights] = useState<ResearchInsight[]>([]);
//   const [sectorTrends, setSectorTrends] = useState<SectorTrend[]>([]);
//   const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const fetchResearch = async () => {
//       setIsLoading(true);
//       await new Promise((resolve) => setTimeout(resolve, 800));
//       setInsights(mockInsights);
//       setSectorTrends(mockSectorTrends);
//       setMacroIndicators(mockMacroIndicators);
//       setIsLoading(false);
//     };
//     fetchResearch();
//   }, [entityId]);

//   return { insights, sectorTrends, macroIndicators, isLoading };
// }


import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ResearchInsight, SectorTrend, MacroIndicator } from "@/types/research";

export function useResearch(sessionId?: string) {

  const [insights, setInsights] = useState<ResearchInsight[]>([]);
  const [sectorTrends, setSectorTrends] = useState<SectorTrend[]>([]);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    if (!sessionId) return;

    const fetchResearch = async () => {

      try {

        setIsLoading(true);

        const data = await api.getResearchInsights(sessionId);

        setInsights(data.latest_research || []);
        setSectorTrends(data.sector_trends || []);
        setMacroIndicators(data.macro_indicators || []);

      } catch (error) {

        console.error("Research API error", error);

      } finally {

        setIsLoading(false);

      }

    };

    fetchResearch();

  }, [sessionId]);

  return { insights, sectorTrends, macroIndicators, isLoading };
}