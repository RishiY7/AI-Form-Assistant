# AI Form Assistant

AI Form Assistant is a smart application designed to help users understand and fill out forms effortlessly. By uploading an image or PDF of a form, the application uses Gemini AI to extract the form fields, identify required documents, and provide a guided, interactive chat interface to help users complete the form step-by-step. 

The application is fully multilingual, supporting English, Kannada, and Hindi, and includes Text-to-Speech (TTS) capabilities for better accessibility.

## Features

- **Form Digitization**: Upload images (PNG, JPEG, WEBP) or PDFs of forms. The app uses Gemini AI to extract structured data, including blank fields and required attachments.
- **Multilingual Support**: Real-time translation of form fields and chat interface into Kannada and Hindi.
- **Interactive Chat Assistant**: A step-by-step conversational guide that acts as an interviewer, asking for form details one by one in the user's preferred language.
- **Text-to-Speech (TTS)**: Built-in audio playback for chat responses to assist users with accessibility needs.
- **Robust API Key Management**: The backend supports multiple Gemini API keys with automatic fallback and rotation to handle rate limits and quota exhaustion seamlessly.

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript and Vite
- **Styling**: Vanilla CSS with a responsive layout
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python)
- **AI Integration**: Google GenAI SDK (`gemini-3.1-flash-lite-preview` with fallback to `gemini-2.5-flash`)
- **Text-to-Speech**: gTTS (Google Text-to-Speech)
- **Environment Management**: `python-dotenv`

## Prerequisites

- Node.js (v18 or higher recommended)
- Python 3.9+
- A Google Gemini API Key

## Setup Instructions

### 1. Backend Setup

1. Navigate to the root directory of the project.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install the required Python packages (Ensure you have a `requirements.txt`, or install them manually):
   ```bash
   pip install fastapi uvicorn google-genai gtts python-dotenv python-multipart pydantic
   ```
4. Create a `.env` file in the root directory and add your Gemini API keys (comma-separated for fallback support):
   ```env
   GEMINI_API_KEYS=your_api_key_1,your_api_key_2
   ```
5. Start the FastAPI server:
   ```bash
   python main.py
   # Or using uvicorn directly: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend API will run on `http://localhost:8000`.

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).

## Usage

1. **Upload a Form**: Drag and drop or select a form image/PDF in the "Process Your Forms" section.
2. **Select Language**: Choose your preferred language (English, Kannada, or Hindi) from the top right dropdown.
3. **Review Insights**: The "AI Insights" panel will populate with the required documents and form fields extracted from the upload.
4. **Chat for Assistance**: Use the chat interface to answer questions step-by-step. The AI will guide you through the form-filling process in your chosen language. You can also click the speaker icon to hear the AI's response.
