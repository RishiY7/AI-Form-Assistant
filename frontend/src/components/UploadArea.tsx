import { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { TranslatedText } from './TranslatedText';
import './UploadArea.css';
import type { UploadResponse } from '../types';

interface UploadAreaProps {
  onUploadSuccess: (data: UploadResponse) => void;
  language: string;
}

export function UploadArea({ onUploadSuccess, language }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.every(file => file.type.startsWith('image/') || file.type === 'application/pdf');
    
    if (!validFiles) {
      setError('Please select valid image formats or PDFs only (JPG/PNG/WEBP/PDF).');
      return;
    }

    setError(null);
    setIsUploading(true);
    setSuccess(false);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post<UploadResponse>('http://localhost:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
      onUploadSuccess(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to process the image(s). Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div 
        className={`upload-dropzone ${isDragging ? 'drag-active' : ''} ${success ? 'success' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInput} 
          accept="image/jpeg, image/png, image/webp, application/pdf" 
          className="hidden-input" 
          multiple
        />
        
        {isUploading ? (
          <div className="upload-content">
            <div className="icon-wrapper">
              <Loader2 className="upload-icon spin text-primary" size={32} />
            </div>
            <h3 className="upload-title"><TranslatedText text="Analyzing Document..." language={language} /></h3>
            <p className="upload-desc"><TranslatedText text="Extracting text and structure with our AI model" language={language} /></p>
          </div>
        ) : success ? (
          <div className="upload-content">
            <div className="icon-wrapper">
              <CheckCircle className="upload-icon text-primary" size={32} />
            </div>
            <h3 className="upload-title"><TranslatedText text="Upload Complete" language={language} /></h3>
            <p className="upload-desc"><TranslatedText text="Your document is ready for insights" language={language} /></p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="icon-wrapper group-hover-scale">
              <UploadCloud className="upload-icon text-primary" size={32} />
            </div>
            <h3 className="upload-title"><TranslatedText text="Drop your form here" language={language} /></h3>
            <p className="upload-desc mb-6"><TranslatedText text="Supports PDF, PNG, WEBP, and JPEG up to 20MB" language={language} /></p>
            <button className="browse-btn" onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}>
              <TranslatedText text="Browse Files" language={language} />
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}
