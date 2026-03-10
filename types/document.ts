export type DocumentType =
  | 'ALM Report'
  | 'Shareholding Pattern'
  | 'Borrowing Profile'
  | 'Annual Reports'
  | 'Portfolio Performance';

export type DocumentStatus =
  | 'Not Uploaded'
  | 'Uploaded'
  | 'Classified'
  | 'Extracted'
  | 'Analyzed'
  | 'CAM Generated';

export interface Document {
  id: string;
  entityId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: DocumentType;
  status: DocumentStatus;
  uploadedAt: string;
  classification?: {
    suggestedType: DocumentType;
    confidence: number;
    approved: boolean;
  };
  extractionId?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}
