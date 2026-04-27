import { useState, useEffect } from 'react';
import { translateText, t } from '../translations';

export function TranslatedText({ text, language }: { text: string; language: string }) {
  // Use the synchronous 't' function to get immediate translation if available locally
  const [translated, setTranslated] = useState(() => t(text, language));

  useEffect(() => {
    // Also update instantly if language prop changes
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
