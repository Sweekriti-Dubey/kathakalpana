import os
import random
import json
from typing import List
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        print("⚠️ Dev Mode: No token found. Using bypass user ID.")
        return "08a9f0e0-cc8f-44d9-b5c8-c85a5e789b0e"

    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)

        if not user or not user.user:
            return "08a9f0e0-cc8f-44d9-b5c8-c85a5e789b0e"
        
        return user.user.id
    except Exception:
        return "08a9f0e0-cc8f-44d9-b5c8-c85a5e789b0e"

class StoryRequest(BaseModel):
    genre: str
    chapters: int

class ChapterModel(BaseModel):
    title: str
    content: str
    image_prompt: str
    image_seed: int

class StoryModel(BaseModel):
    title: str
    moral: str
    chapters: List[ChapterModel]

@app.post("/generate")
def generate_story(request: StoryRequest, user_id: str = Depends(get_current_user)):
    try: 
        client = Groq(api_key=GROQ_API_KEY)
        system_prompt = (
            "You are a Pixar movie director. Output valid JSON only. \n"
            "CONSISTENCY RULE: Describe characters exactly the same way every time. \n"
            "MANDATORY JSON STRUCTURE: \n"
            "{\"title\": \"...\", \"moral\": \"...\", \"chapters\": [{\"title\": \"...\", \"content\": \"...\", \"image_prompt\": \"...\"}]}"
        )

        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Write a {request.genre} story with {request.chapters} chapters."}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )

        story_data = json.loads(chat_completion.choices[0].message.content)
        for chapter in story_data.get("chapters", []):
            chapter["image_seed"] = random.randint(10000, 99999)

        return story_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save_story")
async def save_story(story: StoryModel, user_id: str = Depends(get_current_user)):
    try:
        data = supabase.table("stories").insert({
            "user_id": user_id,
            "title": story.title,
            "content": story.model_dump(),
            "type": "story"
        }).execute()

        return {"message": "Story saved to library!", "data": data.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/my_stories")
async def get_my_stories(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("stories").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception  as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/complete_reading")
async def complete_reading(user_id: str = Depends(get_current_user)):
    try:
        supabase.rpc('increment_streak', {'u_id': user_id}).execute()

        supabase.rpc('add_pet_xp', {'u_id': user_id, 'xp_to_add': 20}).execute()

        return {"message": "Reading recorded! Chottuu is happy.", "xp_gained": 10}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pet_status")
async def get_pet_status(user_id: str = Depends(get_current_user)):
    try:
        response = supabase.table("pet_stats").select("*").eq("user_id").single().execute()

        if not response.data:
            return {
                "pet_name": "Chotuu",
                "xp": 0,
                "level": 1,
                "evolution_stage": "egg"
            }

            return response.data
        except Exception as e:
            raise HTTPException(status_code = 500, detail = str(e))

@app.get("/")
def read_root():
    return {"status": "alive", "engine": "Supabase + Groq"}