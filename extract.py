from google import genai
from google.genai import types
import json
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from the .env file")

client = genai.Client(api_key=GEMINI_API_KEY)

def process_form_images(image_paths: list[str]):
    print(f"Uploading and processing {len(image_paths)} image(s) with Gemini...")
    
    image_parts = []
    file_names = []
    
    for image_path in image_paths:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image {image_path} not found.")

        mime_type = "image/jpeg"
        if image_path.lower().endswith(".png"):
            mime_type = "image/png"
        elif image_path.lower().endswith(".webp"):
            mime_type = "image/webp"
        elif image_path.lower().endswith(".pdf"):
            mime_type = "application/pdf"

        with open(image_path, "rb") as f:
            image_data = f.read()
            
        image_parts.append(
            types.Part.from_bytes(data=image_data, mime_type=mime_type)
        )
        file_names.append(os.path.basename(image_path))

    prompt = """
    Analyze these application form images. They may belong to the same multi-page document.
    1. Extract all the text content, preserving the original language (e.g., Kannada, English) and logical structure as much as possible. Combine text from all pages logically.
    2. Carefully analyze all pages to identify any "Required Documents" or attachments mentioned (e.g., Aadhaar, Marksheet, Income Certificate, Photos, etc.).
    
    Output the result STRICTLY as a JSON object with three keys:
    - "extracted_content": A string containing all the extracted text combined.
    - "required_documents": A list of strings, each being a required document mentioned in the form. If none are found, return an empty list [].
    - "form_fields": A list of strings, representing the blank fields or columns in the form that the user needs to fill (e.g., "Full Name", "Date of Birth", "Address"). Return an empty list [] if none are found.
    
    Do not wrap the JSON in markdown blocks (e.g., no ```json ... ```). Output ONLY valid JSON.
    """

    content_payload = [prompt] + image_parts

    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=content_payload,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=1024)
        )
    )
    
    try:
        # Strip potential markdown formatting if model didn't listen strictly
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        data = json.loads(response_text.strip())
        
        # Add metadata
        data["file_names"] = file_names
        data["status"] = "digitized_ready_for_rag"
        
        output_file = "extracted_data.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            
        print(f"Extraction complete. Data saved to {output_file}")
        return data

    except json.JSONDecodeError:
        print("Failed to parse Gemini response as JSON. Raw response:")
        print(response.text)
        raise ValueError("Invalid JSON received from Gemini")