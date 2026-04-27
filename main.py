from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.genai import types
import json
import os
import shutil
from gemini_util import gemini_manager
from extract import process_form_images

app = FastAPI(title="AI Form Assistant API")

# Simple in-memory cache for translations
translation_cache = {}

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    language: str = "English"

class TranslateRequest(BaseModel):
    texts: list[str]
    target_language: str

@app.post("/api/translate")
async def translate_texts(request: TranslateRequest):
    if not request.texts:
        return {"translated_texts": []}

    # Check cache for every individual text
    uncached_texts = []
    results_map = {}
    
    for text in request.texts:
        cache_key = f"{text}_{request.target_language}"
        if cache_key in translation_cache:
            results_map[text] = translation_cache[cache_key]
        else:
            uncached_texts.append(text)
    
    if not uncached_texts:
        return {"translated_texts": [results_map[t] for t in request.texts]}

    prompt = f"""For each of the following strings (extracted from a form), provide:
1. The English translation.
2. The Hindi translation (common, everyday spoken language).
3. The Kannada translation (common, everyday spoken language).

Input JSON array: {json.dumps(uncached_texts)}

Respond ONLY with a valid JSON array of objects, where each object has keys "english", "hindi", and "kannada". Do not include any explanations or markdown tags."""

    def make_request(client, model_name):
        return client.models.generate_content(
            model=model_name,
            contents=[prompt],
            config=types.GenerateContentConfig(
                system_instruction="You are a professional multilingual translator. You MUST output ONLY a valid JSON array of objects. Never include any conversational text.",
                temperature=0.0
            )
        )

    try:
        try:
            response = gemini_manager.call_with_fallback(make_request, "gemini-3.1-flash-lite-preview")
        except Exception:
            response = gemini_manager.call_with_fallback(make_request, "gemini-2.5-flash")
        
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        translated_data = json.loads(response_text)
        
        for i, item in enumerate(translated_data):
            # The 'orig' here might already be "Source / English"
            orig_composite = uncached_texts[i]
            eng = item.get("english", "")
            hi = item.get("hindi", "")
            kn = item.get("kannada", "")
            
            final_parts = []
            
            if request.target_language == "Hindi":
                # Order: Hindi / OriginalComposite
                final_parts.append(hi)
                if orig_composite.lower() != hi.lower():
                    final_parts.append(orig_composite)
            elif request.target_language == "Kannada":
                # Order: Kannada / OriginalComposite
                final_parts.append(kn)
                if orig_composite.lower() != kn.lower():
                    final_parts.append(orig_composite)
            else:
                final_parts.append(orig_composite)
            
            translated_str = " / ".join(final_parts)
            results_map[orig_composite] = translated_str
            # Cache it
            translation_cache[f"{orig_composite}_{request.target_language}"] = translated_str

        return {"translated_texts": [results_map[t] for t in request.texts]}
    except Exception as e:
        print(f"Translation parsing error: {e}")
        # Return what we have from cache, or original as fallback
        return {"translated_texts": [results_map.get(t, t) for t in request.texts]}

@app.post("/api/upload")
async def upload_form(files: list[UploadFile] = File(...)):
    temp_file_paths = []
    try:
        for file in files:
            temp_file_path = f"temp_{file.filename}"
            temp_file_paths.append(temp_file_path)
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        data = process_form_images(temp_file_paths)

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
    try:
        with open("extracted_data.json", "r", encoding="utf-8") as f:
            form_data = json.load(f)
            form_context = form_data.get("extracted_content", "")
            required_docs = form_data.get("required_documents", [])
            form_fields = form_data.get("form_fields", [])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Form data not found. Please upload and extract a form first.")

    req_docs_str = "\n- ".join(required_docs) if required_docs else "None specified."
    form_fields_str = "\n- ".join(form_fields) if form_fields else "None specified."

    system_prompt = f"""You are a helpful form-filling assistant.
Your goal is to guide the user to fill out the uploaded form.

CRITICAL: You MUST respond ENTIRELY and EXCLUSIVELY in {request.language}. 
Do not use a single word of English if the language is Hindi or Kannada.
Use common, everyday spoken language that is easy for the general public to understand.
All your explanations, guidance, and answers must be written in {request.language}.

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

    def make_request(client, model_name):
        return client.models.generate_content(
            model=model_name,
            contents=[request.question],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.5
            )
        )

    try:
        try:
            response = gemini_manager.call_with_fallback(make_request, "gemini-3.1-flash-lite-preview")
        except Exception:
            response = gemini_manager.call_with_fallback(make_request, "gemini-2.5-flash")

        answer_text = response.text.strip()
        return {"answer": answer_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
