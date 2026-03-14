import { useState, useEffect } from 'react';
import { Document } from '@/types/document';

const mockDocuments: Document[] = [
  {
    id: 'd1',
    entityId: '1',
    fileName: 'tata_steel_alm_2024.pdf',
    fileType: 'application/pdf',
    fileSize: 2456789,
    documentType: 'ALM Report',
    status: 'Extracted',
    uploadedAt: '2024-01-11T10:00:00Z',
    classification: {
      suggestedType: 'ALM Report',
      confidence: 95,
      approved: true,
    },
  },
  {
    id: 'd2',
    entityId: '1',
    fileName: 'tata_steel_shareholding_q3.xlsx',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize: 1234567,
    documentType: 'Shareholding Pattern',
    status: 'Classified',
    uploadedAt: '2024-01-11T10:05:00Z',
    classification: {
      suggestedType: 'Shareholding Pattern',
      confidence: 92,
      approved: true,
    },
  },
  {
    id: 'd3',
    entityId: '1',
    fileName: 'annual_report_2023.pdf',
    fileType: 'application/pdf',
    fileSize: 15678901,
    documentType: 'Annual Reports',
    status: 'Uploaded',
    uploadedAt: '2024-01-12T09:00:00Z',
    classification: {
      suggestedType: 'Annual Reports',
      confidence: 88,
      approved: false,
    },
  },
];

export function useDocuments(entityId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      const filtered = entityId
        ? mockDocuments.filter((d) => d.entityId === entityId)
        : mockDocuments;
      setDocuments(filtered);
      setIsLoading(false);
    };
    fetchDocuments();
  }, [entityId]);

  return { documents, isLoading, setDocuments };
}
