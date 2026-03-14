// 'use client';

// import React from 'react';
// import { useRiskAnalysis } from '@/hooks/useRiskAnalysis';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { getRiskColor, getRiskBgColor } from '@/lib/utils';
// import { ChartSkeleton } from '@/components/shared/LoadingSkeleton';
// import { AlertCircle, TrendingUp } from 'lucide-react';
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
//   RadarChart,
//   PolarGrid,
//   PolarAngleAxis,
//   PolarRadiusAxis,
//   Radar,
// } from 'recharts';

// export default function RiskEnginePage() {
//   const { riskAnalysis, isLoading } = useRiskAnalysis();

//   if (isLoading) {
//     return (
//       <div className="space-y-6">
//         <ChartSkeleton />
//         <ChartSkeleton />
//       </div>
//     );
//   }

//   if (!riskAnalysis) {
//     return <div>No risk analysis available</div>;
//   }

//   const radarData = riskAnalysis.categories.map((cat) => ({
//     name: cat.name.split(' ')[0],
//     value: cat.score,
//   }));

//   const getRiskBadge = (score: number) => {
//     if (score >= 80) return <Badge className="bg-green-100 text-green-700">Low Risk</Badge>;
//     if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-700">Medium Risk</Badge>;
//     if (score >= 40) return <Badge className="bg-orange-100 text-orange-700">High Risk</Badge>;
//     return <Badge className="bg-red-100 text-red-700">Critical Risk</Badge>;
//   };

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div>
//         <h1 className="text-3xl font-bold text-gray-900">Risk Engine</h1>
//         <p className="text-gray-600 mt-1">AI-powered credit risk assessment and analysis</p>
//       </div>

//       {/* Overall Score */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Overall Risk Score</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="flex items-center justify-between">
//             <div>
//               <div className="flex items-end gap-2 mb-2">
//                 <span className={`text-5xl font-bold ${getRiskColor(riskAnalysis.overallScore)}`}>
//                   {riskAnalysis.overallScore}
//                 </span>
//                 <span className="text-gray-600 mb-2">/100</span>
//               </div>
//               {getRiskBadge(riskAnalysis.overallScore)}
//             </div>
//             <div className={`w-40 h-40 rounded-full flex items-center justify-center ${getRiskBgColor(riskAnalysis.overallScore)} opacity-10`} />
//           </div>
//           <p className="text-sm text-gray-600 mt-4 leading-relaxed">{riskAnalysis.aiReasoning}</p>
//         </CardContent>
//       </Card>

//       {/* Risk Categories */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {/* Category Cards */}
//         <div className="space-y-4">
//           {riskAnalysis.categories.map((cat) => (
//             <Card key={cat.name}>
//               <CardHeader className="pb-2">
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-sm">{cat.name}</CardTitle>
//                   {getRiskBadge(cat.score)}
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 <div>
//                   <div className="flex items-end justify-between mb-1">
//                     <span className="text-sm text-gray-600">Score</span>
//                     <span className={`text-2xl font-bold ${getRiskColor(cat.score)}`}>
//                       {cat.score}
//                     </span>
//                   </div>
//                   <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
//                     <div
//                       className={`h-full ${getRiskBgColor(cat.score)}`}
//                       style={{ width: `${cat.score}%` }}
//                     />
//                   </div>
//                 </div>
//                 <p className="text-xs text-gray-600">{cat.explanation}</p>
//                 <div className="space-y-2 mt-3">
//                   {cat.factors.map((factor) => (
//                     <div key={factor.name} className="text-xs">
//                       <div className="flex items-center gap-2 mb-0.5">
//                         <span className="font-medium text-gray-900">{factor.name}</span>
//                         <Badge variant="outline" className="text-[10px]">
//                           {factor.impact}
//                         </Badge>
//                       </div>
//                       <p className="text-gray-600 ml-0">{factor.description}</p>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>

//         {/* Radar Chart */}
//         <Card className="flex flex-col">
//           <CardHeader>
//             <CardTitle>Risk Distribution</CardTitle>
//           </CardHeader>
//           <CardContent className="flex-1">
//             <ResponsiveContainer width="100%" height={300}>
//               <RadarChart data={radarData}>
//                 <PolarGrid stroke="#e5e7eb" />
//                 <PolarAngleAxis dataKey="name" stroke="#6b7280" />
//                 <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#d1d5db" />
//                 <Radar
//                   name="Risk Score"
//                   dataKey="value"
//                   stroke="#3b82f6"
//                   fill="#3b82f6"
//                   fillOpacity={0.5}
//                 />
//                 <Tooltip
//                   contentStyle={{
//                     backgroundColor: '#fff',
//                     border: '1px solid #e5e7eb',
//                     borderRadius: '0.5rem',
//                   }}
//                 />
//               </RadarChart>
//             </ResponsiveContainer>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Key Indicators */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Key Risk Indicators</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             {riskAnalysis.keyIndicators.map((indicator) => (
//               <div
//                 key={indicator.name}
//                 className="p-3 bg-gray-50 rounded-lg border border-gray-200"
//               >
//                 <p className="text-xs text-gray-600 font-medium mb-1">{indicator.name}</p>
//                 <div className="flex items-baseline gap-2 mb-2">
//                   <span className="text-xl font-bold text-gray-900">{indicator.value}</span>
//                   <span className="text-xs text-gray-500">Threshold: {indicator.threshold}</span>
//                 </div>
//                 <Badge
//                   variant="outline"
//                   className={
//                     indicator.status === 'safe'
//                       ? 'bg-green-100 text-green-700'
//                       : indicator.status === 'warning'
//                       ? 'bg-yellow-100 text-yellow-700'
//                       : 'bg-red-100 text-red-700'
//                   }
//                 >
//                   {indicator.status.charAt(0).toUpperCase() + indicator.status.slice(1)}
//                 </Badge>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


'use client';

import React from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useRiskAnalysis } from '@/hooks/useRiskAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRiskColor, getRiskBgColor } from '@/lib/utils';
import { ChartSkeleton } from '@/components/shared/LoadingSkeleton';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';

export default function RiskEnginePage() {

  // Get session id from global store
  const { sessionId } = useSessionStore();

  const { riskAnalysis, isLoading } = useRiskAnalysis(sessionId || undefined);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!riskAnalysis) {
    return <div>No risk analysis available</div>;
  }

  const radarData = riskAnalysis.categories.map((cat) => ({
    name: cat.name.split(' ')[0],
    value: cat.score,
  }));

  const getRiskBadge = (score: number) => {
    if (score >= 80)
      return <Badge className="bg-green-100 text-green-700">Low Risk</Badge>;
    if (score >= 60)
      return <Badge className="bg-yellow-100 text-yellow-700">Medium Risk</Badge>;
    if (score >= 40)
      return <Badge className="bg-orange-100 text-orange-700">High Risk</Badge>;
    return <Badge className="bg-red-100 text-red-700">Critical Risk</Badge>;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Risk Engine</h1>
        <p className="text-gray-600 mt-1">
          AI-powered credit risk assessment and analysis
        </p>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Risk Score</CardTitle>
        </CardHeader>

        <CardContent>

          <div className="flex items-center justify-between">

            <div>

              <div className="flex items-end gap-2 mb-2">

                <span
                  className={`text-5xl font-bold ${getRiskColor(
                    riskAnalysis.overallScore
                  )}`}
                >
                  {riskAnalysis.overallScore}
                </span>

                <span className="text-gray-600 mb-2">/100</span>

              </div>

              {getRiskBadge(riskAnalysis.overallScore)}

            </div>

            <div
              className={`w-40 h-40 rounded-full flex items-center justify-center ${getRiskBgColor(
                riskAnalysis.overallScore
              )} opacity-10`}
            />

          </div>

          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            {riskAnalysis.aiReasoning}
          </p>

        </CardContent>
      </Card>

      {/* Risk Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Category Cards */}
        <div className="space-y-4">

          {riskAnalysis.categories.map((cat) => (

            <Card key={cat.name}>

              <CardHeader className="pb-2">

                <div className="flex items-center justify-between">

                  <CardTitle className="text-sm">
                    {cat.name}
                  </CardTitle>

                  {getRiskBadge(cat.score)}

                </div>

              </CardHeader>

              <CardContent className="space-y-3">

                <div>

                  <div className="flex items-end justify-between mb-1">

                    <span className="text-sm text-gray-600">
                      Score
                    </span>

                    <span
                      className={`text-2xl font-bold ${getRiskColor(cat.score)}`}
                    >
                      {cat.score}
                    </span>

                  </div>

                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">

                    <div
                      className={`h-full ${getRiskBgColor(cat.score)}`}
                      style={{ width: `${cat.score}%` }}
                    />

                  </div>

                </div>

                <p className="text-xs text-gray-600">
                  {cat.explanation}
                </p>

                <div className="space-y-2 mt-3">

                  {cat.factors.map((factor) => (

                    <div key={factor.name} className="text-xs">

                      <div className="flex items-center gap-2 mb-0.5">

                        <span className="font-medium text-gray-900">
                          {factor.name}
                        </span>

                        <Badge variant="outline" className="text-[10px]">
                          {factor.impact}
                        </Badge>

                      </div>

                      <p className="text-gray-600">
                        {factor.description}
                      </p>

                    </div>

                  ))}

                </div>

              </CardContent>

            </Card>

          ))}

        </div>

        {/* Radar Chart */}
        <Card className="flex flex-col">

          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>

          <CardContent className="flex-1">

            <ResponsiveContainer width="100%" height={300}>

              <RadarChart data={radarData}>

                <PolarGrid stroke="#e5e7eb" />

                <PolarAngleAxis
                  dataKey="name"
                  stroke="#6b7280"
                />

                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  stroke="#d1d5db"
                />

                <Radar
                  name="Risk Score"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />

                <Tooltip />

              </RadarChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

      </div>

      {/* Key Indicators */}
      <Card>

        <CardHeader>
          <CardTitle>Key Risk Indicators</CardTitle>
        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {riskAnalysis.keyIndicators.map((indicator) => (

              <div
                key={indicator.name}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >

                <p className="text-xs text-gray-600 font-medium mb-1">
                  {indicator.name}
                </p>

                <div className="flex items-baseline gap-2 mb-2">

                  <span className="text-xl font-bold text-gray-900">
                    {indicator.value}
                  </span>

                  <span className="text-xs text-gray-500">
                    Threshold: {indicator.threshold}
                  </span>

                </div>

                <Badge
                  variant="outline"
                  className={
                    indicator.status === 'safe'
                      ? 'bg-green-100 text-green-700'
                      : indicator.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }
                >
                  {indicator.status.charAt(0).toUpperCase() +
                    indicator.status.slice(1)}
                </Badge>

              </div>

            ))}

          </div>

        </CardContent>

      </Card>

    </div>
  );
}