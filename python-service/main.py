# main.py

import os
import asyncio
import openai
from openai import AsyncOpenAI, APIError, APIConnectionError, RateLimitError, Timeout
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from typing import Optional

# -----------------------------------------------------
# 1) Pydantic Models
# -----------------------------------------------------
class ChatRequest(BaseModel):
    userMessage: str

class ChatResponse(BaseModel):
    assistant: str

# -----------------------------------------------------
# 2) Configure OpenAI (AsyncOpenAI)
# -----------------------------------------------------
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OpenAI API key not found in 'OPENAI_API_KEY'.")

openai.api_key = api_key  # Set the global API key
# Create an AsyncOpenAI client
client = AsyncOpenAI(api_key=api_key)

# -----------------------------------------------------
# 3) Create FastAPI App
# -----------------------------------------------------
app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Receives { "userMessage": "..." }
    Asynchronously calls the chat model,
    Returns { "assistant": "..." }
    """
    user_message = request.userMessage.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Empty 'userMessage'.")

    try:
        # Use the client.chat.completions.create(...) asynchronously
        response = await client.chat.completions.create(
            model="chatgpt-4o-latest",  
            messages=[
                {"role": "user", "content": user_message}
            ],
            max_tokens=4096,
            temperature=0.7,
            stream=False
        )

        # Extract the assistant's text
        if not response.choices:
            raise HTTPException(status_code=500, detail="No choices returned by OpenAI API.")

        content = response.choices[0].message.content.strip()
        return ChatResponse(assistant=content)

    except (APIError, APIConnectionError, RateLimitError, Timeout) as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------
# 4) Run via uvicorn with HTTPS (Self-Signed Cert)
# -----------------------------------------------------
if __name__ == "__main__":
    crt_path = "ssl/selfsigned.crt"
    key_path = "ssl/selfsigned.key"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        ssl_certfile=crt_path,
        ssl_keyfile=key_path
    )