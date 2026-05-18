/**
 * Documents Store — Zustand
 */

import { create } from "zustand";
import type { DocumentRecord } from "@/types/document.types";

interface DocumentsState {
  documents: DocumentRecord[];
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  setDocuments: (docs: DocumentRecord[]) => void;
  addDocument: (doc: DocumentRecord) => void;
  updateDocument: (id: string, updates: Partial<DocumentRecord>) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (docId: string, progress: number) => void;
}

export const useDocumentsStore = create<DocumentsState>((set) => ({
  documents: [],
  isUploading: false,
  uploadProgress: {},

  setDocuments: (documents) => set({ documents }),

  addDocument: (doc) =>
    set((state) => ({ documents: [...state.documents, doc] })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),

  clearDocuments: () => set({ documents: [], uploadProgress: {} }),

  setUploading: (isUploading) => set({ isUploading }),

  setUploadProgress: (docId, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [docId]: progress },
    })),
}));
