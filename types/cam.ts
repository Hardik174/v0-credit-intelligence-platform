export interface CAMReport {
  id: string;
  entityId: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  sections: CAMSection[];
  generatedAt: string;
  lastModified: string;
}

export interface CAMSection {
  id: string;
  title: string;
  slug: string;
  content: string;
  isEdited: boolean;
  order: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'document' | 'extraction' | 'research' | 'risk';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
