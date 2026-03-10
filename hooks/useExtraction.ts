import { useState, useEffect } from 'react';
import { ExtractionResult } from '@/types/extraction';

const mockExtraction: ExtractionResult = {
  id: 'ext1',
  documentId: 'd1',
  entityId: '1',
  status: 'needs_review',
  confidence: 91,
  createdAt: '2024-01-12T10:00:00Z',
  extractedData: [
    {
      id: 'f1',
      fieldName: 'Company Name',
      value: 'Tata Steel Limited',
      confidence: 99,
      source: 'Page 1, Header',
      pageNumber: 1,
      isEdited: false,
      isFlagged: false,
    },
    {
      id: 'f2',
      fieldName: 'Total Assets',
      value: '₹3,10,000 Cr',
      confidence: 94,
      source: 'Page 5, Balance Sheet',
      pageNumber: 5,
      isEdited: false,
      isFlagged: false,
    },
    {
      id: 'f3',
      fieldName: 'Net Revenue',
      value: '₹2,48,000 Cr',
      confidence: 96,
      source: 'Page 4, P&L Statement',
      pageNumber: 4,
      isEdited: false,
      isFlagged: false,
    },
    {
      id: 'f4',
      fieldName: 'EBITDA',
      value: '₹52,000 Cr',
      confidence: 88,
      source: 'Page 4, P&L Statement',
      pageNumber: 4,
      isEdited: false,
      isFlagged: false,
    },
    {
      id: 'f5',
      fieldName: 'Net Profit',
      value: '₹33,000 Cr',
      confidence: 95,
      source: 'Page 4, P&L Statement',
      pageNumber: 4,
      isEdited: false,
      isFlagged: false,
    },
    {
      id: 'f6',
      fieldName: 'Debt-to-Equity Ratio',
      value: '0.68',
      confidence: 72,
      source: 'Page 6, Key Ratios',
      pageNumber: 6,
      isEdited: false,
      isFlagged: true,
    },
  ],
  tables: [
    {
      id: 't1',
      tableName: 'ALM Maturity Profile',
      headers: ['Bucket', 'Assets (₹ Cr)', 'Liabilities (₹ Cr)', 'Gap (₹ Cr)', 'Cumulative Gap (₹ Cr)'],
      confidence: 87,
      rows: [
        {
          id: 'r1',
          cells: [
            { value: '1-30 days', confidence: 95, isEdited: false },
            { value: '45,000', confidence: 90, isEdited: false },
            { value: '38,000', confidence: 88, isEdited: false },
            { value: '7,000', confidence: 92, isEdited: false },
            { value: '7,000', confidence: 92, isEdited: false },
          ],
        },
        {
          id: 'r2',
          cells: [
            { value: '31-90 days', confidence: 95, isEdited: false },
            { value: '32,000', confidence: 85, isEdited: false },
            { value: '28,000', confidence: 87, isEdited: false },
            { value: '4,000', confidence: 86, isEdited: false },
            { value: '11,000', confidence: 86, isEdited: false },
          ],
        },
        {
          id: 'r3',
          cells: [
            { value: '91-180 days', confidence: 95, isEdited: false },
            { value: '28,000', confidence: 82, isEdited: false },
            { value: '35,000', confidence: 84, isEdited: false },
            { value: '-7,000', confidence: 83, isEdited: false },
            { value: '4,000', confidence: 83, isEdited: false },
          ],
        },
      ],
    },
  ],
};

export function useExtraction(documentId?: string) {
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExtraction = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setExtraction(mockExtraction);
      setIsLoading(false);
    };
    fetchExtraction();
  }, [documentId]);

  return { extraction, isLoading, setExtraction };
}
