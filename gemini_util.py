import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(override=True)

class GeminiManager:
    def __init__(self):
        keys_str = os.getenv("GEMINI_API_KEYS", "")
        self.keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if not self.keys:
            single_key = os.getenv("GEMINI_API_KEY")
            if single_key:
                self.keys = [single_key]
            else:
                raise ValueError("No GEMINI_API_KEYS found in .env")
        
        self.current_key_index = 0
        self.clients = [genai.Client(api_key=k) for k in self.keys]
        self.key_status = [True] * len(self.keys) # True = Working, False = Exhausted
        self.last_check = [0.0] * len(self.keys)

    def get_client(self):
        # Find the first key that is not marked as exhausted
        # or has been resting for more than 5 minutes
        now = time.time()
        for i in range(len(self.keys)):
            idx = (self.current_key_index + i) % len(self.keys)
            if self.key_status[idx] or (now - self.last_check[idx] > 300):
                if not self.key_status[idx]:
                    print(f"Retrying resting Key {idx + 1}...")
                    self.key_status[idx] = True
                self.current_key_index = idx
                return self.clients[idx]
        
        # If all fail, just return the current one and let the error bubble up
        return self.clients[self.current_key_index]

    def mark_exhausted(self):
        print(f"Key {self.current_key_index + 1} marked as exhausted/invalid.")
        self.key_status[self.current_key_index] = False
        self.last_check[self.current_key_index] = time.time()
        self.current_key_index = (self.current_key_index + 1) % len(self.keys)

    def call_with_fallback(self, func, *args, **kwargs):
        attempts = 0
        max_attempts = len(self.keys)

        while attempts < max_attempts:
            client = self.get_client()
            try:
                return func(client, *args, **kwargs)
            except Exception as e:
                error_str = str(e).upper()
                if any(x in error_str for x in ["QUOTA", "RESOURCE_EXHAUSTED", "INVALID", "EXPIRED", "429"]):
                    self.mark_exhausted()
                    attempts += 1
                elif any(x in error_str for x in ["503", "UNAVAILABLE"]):
                    print(f"Service busy, trying next key...")
                    self.current_key_index = (self.current_key_index + 1) % len(self.keys)
                    attempts += 1
                else:
                    raise e
        
        raise Exception("All Gemini API keys are currently exhausted or unavailable. Please try again later.")

gemini_manager = GeminiManager()
