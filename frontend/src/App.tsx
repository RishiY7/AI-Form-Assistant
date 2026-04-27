import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadArea } from './components/UploadArea';
import { InsightsPanel } from './components/InsightsPanel';
import { ChatInterface } from './components/ChatInterface';
import { LucideBot } from 'lucide-react';
import type { UploadResponse } from './types';
import { translateText, t } from './translations';
import './App.css';

// Component to handle individual text translation via API
function TranslatedText({ text, language }: { text: string; language: string }) {
  // Use the synchronous 't' function from translations.ts for instant lookup
  const [translated, setTranslated] = useState(() => t(text, language));

  useEffect(() => {
    // Instantly update if language prop changes
    setTranslated(t(text, language));
    
    let isMounted = true;
    async function update() {
      const res = await translateText(text, language);
      if (isMounted) setTranslated(res);
    }
    
    // Only perform async fetch if local dictionary misses (fallback)
    if (t(text, language) === text && language !== 'English') {
      update();
    }
    
    return () => { isMounted = false; };
  }, [text, language]);

  return <>{translated}</>;
}

function App() {
  const [extractedData, setExtractedData] = useState<UploadResponse | null>(null);
  const [translatedData, setTranslatedData] = useState<UploadResponse | null>(null);
  const [language, setLanguage] = useState('English');

  const handleUploadSuccess = (data: UploadResponse) => {
    setExtractedData(data);
  };

  useEffect(() => {
    if (!extractedData) {
      setTranslatedData(null);
      return;
    }
    
    // Instantly show the original extracted data so the UI doesn't appear stuck
    setTranslatedData(extractedData);
    
    if (language === 'English') {
      return;
    }

    let isMounted = true;
    const translateContent = async () => {
      try {
        const reqDocsRes = await axios.post<{ translated_texts: string[] }>('http://localhost:8000/api/translate', {
          texts: extractedData.required_documents || [],
          target_language: language
        });
        
        const formFieldsRes = await axios.post<{ translated_texts: string[] }>('http://localhost:8000/api/translate', {
          texts: extractedData.form_fields || [],
          target_language: language
        });

        if (isMounted) {
          setTranslatedData({
            ...extractedData,
            required_documents: reqDocsRes.data.translated_texts,
            form_fields: formFieldsRes.data.translated_texts
          });
        }
      } catch (e) {
        console.error("Translation failed:", e);
        // We already set the original data above as fallback
      }
    };
    
    translateContent();
    return () => { isMounted = false; };
  }, [extractedData, language]);

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-left">
          <LucideBot className="text-primary" size={24} />
          <h1><TranslatedText text="Form Assistant" language={language} /></h1>
        </div>
        <div className="header-right">
          <select 
            className="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
            <option value="Hindi">Hindi (हिंदी)</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="layout-grid">
          {/* Left Column */}
          <div className="left-column">
            <section className="page-header">
              <h1><TranslatedText text="Process Your Forms" language={language} /></h1>
              <p><TranslatedText text="Upload any PDF or image to extract structured data and generate intelligent responses." language={language} /></p>
            </section>
            
            <UploadArea onUploadSuccess={handleUploadSuccess} language={language} />
            
            {/* The Command Bar input is now handled inside ChatInterface */}
            {translatedData && <ChatInterface language={language} setLanguage={setLanguage} />}
          </div>

          {/* Right Column */}
          <div className="right-column">
            <div className="right-column-header">
              <h2>
                <LucideBot size={24} className="text-primary" />
                <TranslatedText text="AI Insights" language={language} />
              </h2>
              <span className="status-badge"><TranslatedText text="Assistant Live" language={language} /></span>
            </div>
            {translatedData ? (
              <InsightsPanel requiredDocuments={translatedData.required_documents} formFields={translatedData.form_fields} language={language} />
            ) : (
              <div className="insight-card dark-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p className="status-message"><TranslatedText text="Upload a form to get insights and required documents analysis." language={language} /></p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
