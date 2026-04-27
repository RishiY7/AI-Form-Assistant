from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
import json
import os
import shutil
from dotenv import load_dotenv
from extract import process_form_images

# Load API keys securely
load_dotenv()

app = FastAPI(title="AI Form Assistant API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to specific frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google GenAI Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from the .env file")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    question: str
    language: str = "English"

class TranslateRequest(BaseModel):
    texts: list[str]
    target_language: str

@app.post("/api/translate")
async def translate_texts(request: TranslateRequest):
    if request.target_language == "English" or not request.texts:
        return {"translated_texts": request.texts}

    prompt = f"Translate the following JSON array of strings into {request.target_language}. Use common, everyday spoken language (especially for Hindi and Kannada) that is easy for the general public to understand, avoiding overly formal or complex vocabulary. Respond ONLY with a valid JSON array of strings in the exact same order. Do not include any explanations, reasoning, or markdown tags.\n\nInput: {json.dumps(request.texts)}"

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt],
            config=types.GenerateContentConfig(
                system_instruction="You are a professional translator. You MUST output ONLY a valid JSON array. Never include any conversational text.",
                temperature=0.0
            )
        )
        response_text = response.text.strip()

        # Strip potential markdown formatting
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        translated_array = json.loads(response_text)

        # Combine original English and translated text
        bilingual_texts = [
            f"{orig} / {trans}" 
            for orig, trans in zip(request.texts, translated_array)
        ]

        return {"translated_texts": bilingual_texts}
    except Exception as e:
        print(f"Translation parsing error: {e}")
        print(f"Cleaned response text: {response_text if 'response_text' in locals() else 'None'}")
        # Fallback to original text if parsing fails
        return {"translated_texts": request.texts}

@app.post("/api/upload")
async def upload_form(files: list[UploadFile] = File(...)):
    temp_file_paths = []

    try:
        # Save all uploaded files temporarily
        for file in files:
            temp_file_path = f"temp_{file.filename}"
            temp_file_paths.append(temp_file_path)
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        # Process multi-page images with Gemini
        data = process_form_images(temp_file_paths)

        # Clean up temporary files
        for temp_file_path in temp_file_paths:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

        return {
            "message": f"Successfully processed {len(files)} pages",
            "required_documents": data.get("required_documents", []),
            "form_fields": data.get("form_fields", [])
        }
    except Exception as e:
        for temp_file_path in temp_file_paths:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_form(request: ChatRequest):
    # 1. Load the extracted form text
    try:
        with open("extracted_data.json", "r", encoding="utf-8") as f:
            form_data = json.load(f)
            form_context = form_data.get("extracted_content", "")
            required_docs = form_data.get("required_documents", [])
            form_fields = form_data.get("form_fields", [])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Form data not found. Please upload and extract a form first.")

    # Format the required documents for the prompt
    req_docs_str = "\n- ".join(required_docs) if required_docs else "None specified."
    form_fields_str = "\n- ".join(form_fields) if form_fields else "None specified."

    # 2. Construct the prompt for Gemini
    system_prompt = f"""You are a helpful form-filling assistant.
Your goal is to guide the user to fill out the uploaded form.
You must respond entirely in {request.language}. Use common, everyday spoken language (especially for Hindi and Kannada) that is easy for the general public to understand, avoiding overly formal or complex vocabulary. All your explanations, guidance, and answers must be written in {request.language}.

Here are the blank fields that need to be filled in this form:
{form_fields_str}

Your task:
1. Act as an interviewer. Ask the user for the information required for these fields ONE BY ONE in {request.language}.
2. Do not ask for all fields at once. Wait for the user's response before asking the next question.
3. Provide simple explanations if the user is confused about a field.
4. Once all the information is collected, generate a final summary of all the fields and the user's answers, and tell the user they can use the 'Export PDF' button on the screen to save their form guide.

Extracted Form Text Context:
{form_context}

Required Documents mentioned in this form:
- {req_docs_str}
"""

    # 3. Request the answer from the Google Gemini API
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[request.question],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.5
            )
        )

        answer_text = response.text.strip()

        return {"answer": answer_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
