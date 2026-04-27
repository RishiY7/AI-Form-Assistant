export interface UploadResponse {
  message: string;
  required_documents: string[];
  form_fields?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
