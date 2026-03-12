import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResearchInsight, Sentiment } from '@/types/research';

interface ResearchArticleCardProps {
  article: ResearchInsight;
}

export function ResearchArticleCard({ article }: ResearchArticleCardProps) {
  const getSentimentStyles = (sentiment: Sentiment) => {
    switch (sentiment) {
      case 'Positive':
        return {
          badge: 'bg-green-100 text-green-700',
          icon: <TrendingUp className="w-4 h-4" />,
        };
      case 'Negative':
        return {
          badge: 'bg-red-100 text-red-700',
          icon: <TrendingDown className="w-4 h-4" />,
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-700',
          icon: <Minus className="w-4 h-4" />,
        };
    }
  };

  const sentimentStyles = getSentimentStyles(article.sentiment);

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 leading-tight line-clamp-2">
            {article.headline}
          </h4>
          <p className="text-xs text-gray-500 mt-1">{article.source}</p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded text-sm font-medium whitespace-nowrap ${sentimentStyles.badge}`}>
          {sentimentStyles.icon}
          <span>{article.sentiment}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.summary}</p>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {new Date(article.publishedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors"
            title="Open article"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
