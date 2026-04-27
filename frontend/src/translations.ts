import axios from 'axios';
import { translations } from './locales';

// We keep a small local cache of translated strings to avoid 
// flickering and unnecessary API calls for frequent static labels.
const translationCache: Record<string, string> = {};

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === 'English' || !text) return text;
  
  // First, check our pre-generated local translations
  if (translations[targetLanguage] && translations[targetLanguage][text]) {
    return translations[targetLanguage][text];
  }
  
  const cacheKey = `${text}_${targetLanguage}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];

  try {
    const response = await axios.post<{ translated_texts: string[] }>('http://localhost:8000/api/translate', {
      texts: [text],
      target_language: targetLanguage
    });
    const result = response.data.translated_texts[0] || text;
    translationCache[cacheKey] = result;
    return result;
  } catch (e) {
    console.error("API translation error:", e);
    return text;
  }
}

// Synchronous legacy function used as a fallback for initial render
export function t(text: string, language: string): string {
  if (language === 'English') return text;
  
  if (translations[language] && translations[language][text]) {
    return translations[language][text];
  }
  
  const cacheKey = `${text}_${language}`;
  return translationCache[cacheKey] || text;
}
