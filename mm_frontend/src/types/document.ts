/**
 * Represents an uploaded document with metadata
 */
export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  category?: string;
  uploadedAt?: string;
}
