import { useState, useEffect } from 'react';
import { translateText } from '../translations';

export function useTranslate(text: string, language: string) {
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;
    
    async function performTranslation() {
      const result = await translateText(text, language);
      if (isMounted) setTranslated(result);
    }

    performTranslation();
    return () => { isMounted = false; };
  }, [text, language]);

  return translated;
}
