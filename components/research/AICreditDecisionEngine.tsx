'use client';

import React from 'react';
import { useAICreditDecision } from '@/hooks/useAICreditDecision';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';

export function AICreditDecisionEngine({ entityId }: { entityId?: string }) {
  const {
    creditDecision,
    isLoading,
    analystNotes,
    setAnalystNotes,
    recalculateRiskScore,
    isRecalculating,
  } = useAICreditDecision(entityId);

  if (isLoading || !creditDecision) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Credit Decision Engine</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'REVIEW':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'REJECT':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return null;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return 'bg-green-100 text-green-700';
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECT':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'bg-green-500';
    if (score <= 50) return 'bg-yellow-500';
    if (score <= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGradeColor = (grade: string) => {
    const gradeColors: Record<string, string> = {
      'AAA': 'bg-green-100 text-green-700',
      'AA': 'bg-green-100 text-green-700',
      'A': 'bg-blue-100 text-blue-700',
      'BBB': 'bg-yellow-100 text-yellow-700',
      'BB': 'bg-orange-100 text-orange-700',
      'B': 'bg-red-100 text-red-700',
    };
    return gradeColors[grade] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Credit Decision Engine</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Explainable AI credit underwriting decision with risk assessment breakdown
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credit Decision Summary Card */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recommendation */}
            <div className="flex items-center space-x-4">
              {getRecommendationIcon(creditDecision.loanRecommendation)}
              <div>
                <p className="text-sm text-gray-600">Loan Recommendation</p>
                <Badge className={getRecommendationColor(creditDecision.loanRecommendation)}>
                  {creditDecision.loanRecommendation}
                </Badge>
              </div>
            </div>

            {/* Risk Score with Progress Bar */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Risk Score</p>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-bold text-gray-900">
                    {creditDecision.riskScore}
                  </span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${getRiskScoreColor(
                      creditDecision.riskScore
                    )}`}
                    style={{ width: `${creditDecision.riskScore}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Lower score indicates lower risk
              </p>
            </div>

            {/* Risk Grade */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Risk Grade</p>
              <Badge className={getGradeColor(creditDecision.riskGrade)}>
                <span className="text-lg font-bold">{creditDecision.riskGrade}</span>
              </Badge>
              <p className="text-xs text-gray-500 mt-2">
                {creditDecision.riskGrade === 'AAA' || creditDecision.riskGrade === 'AA'
                  ? 'Excellent Credit Quality'
                  : creditDecision.riskGrade === 'A'
                    ? 'Good Credit Quality'
                    : creditDecision.riskGrade === 'BBB'
                      ? 'Acceptable Credit Quality'
                      : 'Higher Risk Profile'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Reasoning Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Explainable AI Reasoning</h3>
          <div className="space-y-2">
            {creditDecision.reasoning.map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                  ✓
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factor Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk Factor Breakdown</h3>
          <div className="space-y-4">
            {creditDecision.riskFactorBreakdown.map((factor) => (
              <div key={factor.name}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-700">{factor.name}</p>
                  <span className="text-sm text-gray-600">{factor.score}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      factor.score <= 30
                        ? 'bg-green-500'
                        : factor.score <= 50
                          ? 'bg-yellow-500'
                          : factor.score <= 70
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Source Tags */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Data Sources Influencing Decision</h3>
          <div className="flex flex-wrap gap-2">
            {creditDecision.dataSourceTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-gray-100 text-gray-700 border border-gray-300"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Analyst Override Input */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Credit Officer Observations</h3>
          <div className="space-y-3">
            <textarea
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              placeholder="Factory operating at 40% capacity"
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <Button
              onClick={recalculateRiskScore}
              disabled={isRecalculating || !analystNotes.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recalculating...
                </>
              ) : (
                'Recalculate Risk Score'
              )}
            </Button>
          </div>
        </div>

        {/* Generated Info */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Generated: {new Date(creditDecision.generatedAt).toLocaleString('en-IN')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
