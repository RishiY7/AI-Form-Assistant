import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, User, Loader2, Mic, MicOff } from 'lucide-react';
import { translateText } from '../translations';
import { TranslatedText } from './TranslatedText';
import './ChatInterface.css';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  language: string;
  setLanguage: (lang: string) => void;
}

export function ChatInterface({ language, setLanguage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize initial message via API
  useEffect(() => {
    async function init() {
      const welcome = await translateText('Hello! I have analyzed the form. How can I help you understand or fill it out?', language);
      setMessages([{ role: 'assistant', content: welcome }]);
    }
    init();
  }, [language]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        const langMap: Record<string, string> = {
          'English': 'en-IN',
          'Hindi': 'hi-IN',
          'Kannada': 'kn-IN'
        };
        recognitionRef.current.lang = langMap[language] || 'en-IN';
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error(e);
        }
      } else {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await axios.post<{ answer: string }>('http://localhost:8000/api/chat', {
        question: userMsg,
        language: language
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error: any) {
      const errorBase = await translateText('Sorry, I encountered an error. Please try asking again.', language);
      const errorPrefix = await translateText('Error:', language);
      setMessages(prev => [...prev, { role: 'assistant', content: `${errorPrefix} ${errorBase}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`message-bubble ${msg.role}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-wrapper assistant">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-bubble assistant loading">
                <Loader2 className="spin" size={14} />
                <span><TranslatedText text="Thinking..." language={language} /></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="command-bar">
        <div style={{ display: 'flex', gap: '4px', paddingLeft: '8px', alignItems: 'center' }}>
          {['English', 'Hindi', 'Kannada'].map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              title={`Switch to ${l}`}
              style={{
                background: language === l ? 'var(--primary, #8b5cf6)' : 'transparent',
                color: language === l ? 'white' : 'var(--text-secondary, #6b7280)',
                border: `1px solid ${language === l ? 'var(--primary, #8b5cf6)' : 'var(--border, #e5e7eb)'}`,
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {l === 'English' ? 'EN' : l === 'Hindi' ? 'HI' : 'KN'}
            </button>
          ))}
        </div>
        <button 
          className="icon-btn mic-btn" 
          onClick={toggleListening} 
          type="button" 
          title="Voice Input" 
          disabled={isLoading}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}
        >
          {isListening ? <MicOff style={{ color: '#ba1a1a' }} size={20} /> : <Mic className="text-primary" size={20} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask assistant..."
          disabled={isLoading}
          className="command-input"
        />
        <div className="command-shortcut">
          <span>Ctrl</span>
          <span>K</span>
        </div>
      </form>
    </div>
  );
}
