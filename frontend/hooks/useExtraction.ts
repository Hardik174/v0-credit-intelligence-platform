import { useState, useEffect } from 'react';
import { ExtractionResult } from '@/types/extraction';
import { getFinancialAnalysis } from '@/lib/ingestor-api';

// Transform the ingestor's financial_analysis output into the UI's ExtractionResult format
function transformIngestorDataToUI(data: any, sessionId: string): ExtractionResult {
  // Extract all the fields from the different sections of financial_analysis
  const analysis = data.financial_analysis || {};

  const extractedFields: any[] = [];
  let idCounter = 1;
  const confidence = 92; // Default mock confidence if not provided

  // Mapping function to add fields
  const addField = (name: string, value: any, source: string) => {
    if (value !== undefined && value !== null) {
      extractedFields.push({
        id: `f${idCounter++}`,
        fieldName: name,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        confidence,
        source,
        pageNumber: 1,
        isEdited: false,
        isFlagged: false,
      });
    }
  };

  // Basic Info
  addField('Company Name', analysis.basic_info?.company_name, 'Company Overview');
  addField('Registration No', analysis.basic_info?.registration_number, 'Company Overview');
  addField('Industry', analysis.basic_info?.industry, 'Company Overview');

  // Financial Metrics
  if (analysis.financial_metrics) {
    const metrics = analysis.financial_metrics;
    addField('Revenue', metrics.revenue, 'Income Statement');
    addField('EBITDA', metrics.ebitda, 'Income Statement');
    addField('Net Profit', metrics.net_profit, 'Income Statement');
    addField('Total Assets', metrics.total_assets, 'Balance Sheet');
    addField('Total Liabilities', metrics.total_liabilities, 'Balance Sheet');
    addField('Current Ratio', metrics.current_ratio, 'Key Ratios');
    addField('Debt to Equity', metrics.debt_to_equity, 'Key Ratios');
  }

  // Add fraud flags as flagged fields
  const fraudFlags = analysis.fraud_flags || [];
  fraudFlags.forEach((flagItem: any) => {
    // Some flags are strings, others are detailed objects
    let flagValue = typeof flagItem === 'string' ? flagItem : 'Fraud Alert';

    if (typeof flagItem === 'object' && flagItem !== null) {
      if (flagItem.flag && flagItem.description) {
        flagValue = `${flagItem.flag}: ${flagItem.description}`;
      } else {
        flagValue = JSON.stringify(flagItem);
      }
    }

    extractedFields.push({
      id: `f${idCounter++}`,
      fieldName: 'Fraud Alert',
      value: flagValue,
      confidence: 99,
      source: 'Risk Engine',
      pageNumber: 1,
      isEdited: false,
      isFlagged: true,
    });
  });

  return {
    id: `ext_${sessionId}`,
    documentId: sessionId,
    entityId: sessionId,
    status: 'needs_review',
    confidence: confidence,
    createdAt: new Date().toISOString(),
    extractedData: extractedFields,
    tables: [] // The backend doesn't output tables in the same format yet
  };
}

export function useExtraction(sessionId?: string) {
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const fetchExtraction = async () => {
      try {
        setIsLoading(true);
        const data = await getFinancialAnalysis(sessionId);
        const transformed = transformIngestorDataToUI(data, sessionId);
        setExtraction(transformed);
      } catch (error) {
        console.error("Failed to fetch extraction data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExtraction();
  }, [sessionId]);

  return { extraction, isLoading, setExtraction };
}
