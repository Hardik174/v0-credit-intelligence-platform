export interface ExtractionResult {
  id: string;
  documentId: string;
  entityId: string;
  status: 'pending' | 'completed' | 'needs_review' | 'approved';
  extractedData: ExtractionField[];
  tables: ExtractionTable[];
  confidence: number;
  createdAt: string;
}

export interface ExtractionField {
  id: string;
  fieldName: string;
  value: string;
  confidence: number;
  source: string;
  pageNumber: number;
  isEdited: boolean;
  isFlagged: boolean;
}

export interface ExtractionTable {
  id: string;
  tableName: string;
  headers: string[];
  rows: ExtractionTableRow[];
  confidence: number;
}

export interface ExtractionTableRow {
  id: string;
  cells: ExtractionCell[];
}

export interface ExtractionCell {
  value: string;
  confidence: number;
  isEdited: boolean;
}
