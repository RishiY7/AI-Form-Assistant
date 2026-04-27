import { FileText, AlertCircle, CheckCircle2, Download, Gauge, Timer, ListTodo } from 'lucide-react';
import { TranslatedText } from './TranslatedText';
import './InsightsPanel.css';

interface InsightsPanelProps {
  requiredDocuments: string[];
  formFields?: string[];
  language: string;
}

export function InsightsPanel({ requiredDocuments, formFields = [], language }: InsightsPanelProps) {
  if (!requiredDocuments && !formFields) return null;

  const hasDocuments = requiredDocuments.length > 0;
  const hasFields = formFields.length > 0;

  return (
    <div className="insights-container">
      {hasFields && (
        <div className="insight-card document-card">
          <div className="card-accent-bar" style={{ backgroundColor: '#8b5cf6' }}></div>
          <div className="card-content">
            <div className="icon-badge text-primary" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <ListTodo size={18} />
            </div>
            <div className="card-body">
              <p className="card-title"><TranslatedText text="Columns to Fill" language={language} /></p>
              <p className="card-desc"><TranslatedText text="These are the fields identified in the form." language={language} /></p>
              
              <ul className="document-list mt-4">
                {formFields.map((field, index) => (
                  <li key={index} className="document-item">
                    <CheckCircle2 size={16} className="text-secondary" />
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasDocuments && (
        <div className="insight-card document-card">
          <div className="card-accent-bar"></div>
          <div className="card-content">
            <div className="icon-badge bg-primary-light text-primary">
              <FileText size={18} />
            </div>
            <div className="card-body">
              <p className="card-title"><TranslatedText text="Required Documents" language={language} /></p>
              <p className="card-desc">I've detected {requiredDocuments.length} missing documents for your application.</p>
              
              <ul className="document-list mt-4">
                {requiredDocuments.map((doc, index) => (
                  <li key={index} className="document-item">
                    <AlertCircle size={16} className="text-error" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {(!hasDocuments && !hasFields) && (
        <div className="insight-card success-card">
          <div className="card-accent-bar bg-success"></div>
          <div className="card-content">
            <div className="icon-badge bg-success-light text-success">
              <CheckCircle2 size={18} />
            </div>
            <div className="card-body">
              <p className="card-title"><TranslatedText text="All clear" language={language} /></p>
              <p className="card-desc">Our scan indicates no extra documents are specifically required. You are ready to proceed!</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="insight-card">
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.print()}>
          <Download size={16} /> <TranslatedText text="Export Form Guide PDF" language={language} />
        </button>
      </div>

      {/* Bento Grid Stats */}
      <div className="bento-grid">
        <div className="insight-card stat-card">
          <Gauge className="text-secondary mb-2" size={24} />
          <div className="stat-value">98%</div>
          <p className="stat-label"><TranslatedText text="Accuracy Rate" language={language} /></p>
        </div>
        <div className="insight-card stat-card">
          <Timer className="text-primary mb-2" size={24} />
          <div className="stat-value">1.2s</div>
          <p className="stat-label"><TranslatedText text="Proc. Speed" language={language} /></p>
        </div>
      </div>

      {/* Assistant Status */}
      <div className="insight-card dark-card">
        <div className="status-header">
          <div className="pulse-dot"></div>
          <span><TranslatedText text="Assistant Active" language={language} /></span>
        </div>
        <p className="status-message"><TranslatedText text="Analyzing context from the uploaded documents to provide precise answers." language={language} /></p>
      </div>
    </div>
  );
}
