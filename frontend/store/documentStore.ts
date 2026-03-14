'use client';

import { create } from 'zustand';
import { Document, UploadProgress } from '@/types/document';

interface DocumentStore {
  documents: Document[];
  uploadProgress: UploadProgress[];
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateUploadProgress: (progress: UploadProgress) => void;
  removeUploadProgress: (fileId: string) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  uploadProgress: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (document) =>
    set((state) => ({
      documents: [...state.documents, document],
    })),
  updateUploadProgress: (progress) =>
    set((state) => ({
      uploadProgress: state.uploadProgress.some((p) => p.fileId === progress.fileId)
        ? state.uploadProgress.map((p) =>
            p.fileId === progress.fileId ? progress : p
          )
        : [...state.uploadProgress, progress],
    })),
  removeUploadProgress: (fileId) =>
    set((state) => ({
      uploadProgress: state.uploadProgress.filter((p) => p.fileId !== fileId),
    })),
}));
