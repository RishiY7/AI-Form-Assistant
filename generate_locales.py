import requests
import json
import time

strings = [
    'Analyzing Document...',
    'Extracting text and structure with our AI model',
    'Upload Complete',
    'Your document is ready for insights',
    'Drop your form here',
    'Supports PDF, PNG, WEBP, and JPEG up to 20MB',
    'Browse Files',
    'Columns to Fill',
    'These are the fields identified in the form.',
    'Required Documents',
    'All clear',
    'Export Form Guide PDF',
    'Accuracy Rate',
    'Proc. Speed',
    'Thinking...',
    'Form Assistant',
    'Process Your Forms',
    'Upload any PDF or image to extract structured data and generate intelligent responses.',
    'AI Insights',
    'Assistant Live',
    'Upload a form to get insights and required documents analysis.'
]

def translate_batch(target_lang):
    print(f"Translating to {target_lang}...")
    try:
        res = requests.post('http://localhost:8000/api/translate', json={'texts': strings, 'target_language': target_lang})
        res.raise_for_status()
        data = res.json()
        translated = data.get('translated_texts', [])
        # Extract just the translated part (format is "English / Translated")
        result = {}
        for s, t in zip(strings, translated):
            if ' / ' in t:
                result[s] = t.split(' / ')[-1]
            else:
                result[s] = t
        return result
    except Exception as e:
        print(f"Failed: {e}")
        return {s: s for s in strings}

def main():
    data = {
        'English': {s: s for s in strings},
        'Hindi': translate_batch('Hindi'),
        'Kannada': translate_batch('Kannada')
    }
    
    with open('frontend/src/locales.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done generating locales!")

if __name__ == '__main__':
    main()
