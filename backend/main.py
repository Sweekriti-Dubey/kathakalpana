import os
import random
import json
import requests
import base64
import time
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from groq import Groq
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- CONFIGURATION ---
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")
MONGO_URL = os.getenv("MONGO_URL")

SECRET_KEY = "supersecretkey_change_this_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

MAIN_CHARACTER_VISUAL = "a cute small blue tit bird with a fluffy yellow belly and big eyes"

app = FastAPI()

# --- MIDDLEWARE & SECURITY ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- HELPER FUNCTIONS ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return email

# --- DATABASE MODELS ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class StoryRequest(BaseModel):
    genre: str      
    chapters: int   

class ChapterModel(BaseModel):
    title: str
    content: str
    image: Optional[str] = None
    image_prompt: Optional[str] = None

class StoryModel(BaseModel):
    title: str
    moral: str
    chapters: List[ChapterModel]

# --- DATABASE CONNECTION ---
@app.on_event("startup")
async def startup_db():
    try:
        if not MONGO_URL:
            print("❌ Error: MONGO_URL is missing in .env")
            return
        client = AsyncIOMotorClient(MONGO_URL)
        app.mongodb = client.story_app 
        await app.mongodb.users.create_index("email", unique=True)
        await app.mongodb.command("ping")
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")

# --- AUTH ENDPOINTS ---
@app.post("/signup")
async def signup(user: UserCreate):
    existing_user = await app.mongodb.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    user_dict = {"email": user.email, "password": hashed_password}
    await app.mongodb.users.insert_one(user_dict)
    return {"message": "User created successfully"}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await app.mongodb.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

# --- STORY GENERATION CORE ---

# --- REPLACEMENT FUNCTION ---

def download_image_hf(scene_action_prompt, character_desc):
    # 1. USE THE FASTER MODEL (SD 1.5) - Much more reliable for free tier
    API_URL = "https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5"
    headers = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
    
    final_prompt = (
        f"children's book illustration, cute vector style, soft colors, masterpiece, "
        f"{character_desc}, "
        f"{scene_action_prompt}, "
        f"white background"
    )
    
    print(f"   -> Requesting Image: {scene_action_prompt[:30]}...")

    for attempt in range(5): 
        try:
            response = requests.post(API_URL, headers=headers, json={"inputs": final_prompt}, timeout=45)
            
            if response.status_code == 200:
                return f"data:image/jpeg;base64,{base64.b64encode(response.content).decode('utf-8')}"
            
            elif response.status_code == 503:
                print("      -> Model loading (503)... waiting 5s")
                time.sleep(5)
            
            else:
                print(f"      -> FAILED with Status: {response.status_code}. Response: {response.text}")
                time.sleep(2)

        except Exception as e:
             print(f"      -> Connection Error: {e}")
             time.sleep(2)
             
    print("      -> Gave up on image after 5 attempts.")
    return None

@app.post("/generate")
async def generate_story(request: StoryRequest, current_user: str = Depends(get_current_user)):
    try:
        print(f"=== Generating Story: {request.genre} ===")
        if not HF_TOKEN: raise HTTPException(status_code=500, detail="Missing HF_TOKEN")

        client = Groq(api_key=GROQ_API_KEY)
        
        system_prompt = (
            "You are a children's author and Art Director. Output valid JSON. "
            "Structure: { \"title\": \"...\", \"moral\": \"...\", \"chapters\": [ { \"title\": \"...\", \"content\": \"...\", \"image_action_prompt\": \"...\" } ] }"
        )
        user_prompt = (
            f"Write a {request.genre} story with {request.chapters} chapters. "
            f"The main character is {MAIN_CHARACTER_VISUAL}. "
            "1. 'content': The story text (~100 words). "
            "2. 'image_action_prompt': Describe ONLY the action and background for the image. Do NOT describe the main character's appearance again, just what they are doing and where they are. (e.g., 'flying over a green forest', 'sitting on a branch talking to a squirrel')."
        )

        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        story_data = json.loads(chat_completion.choices[0].message.content)
        
        # Download images using the new consistency method
        for chapter in story_data["chapters"]:
            action_prompt = chapter.get('image_action_prompt', chapter.get('image_prompt', ''))
            img = download_image_hf(action_prompt)
            chapter["image"] = img if img else "https://placehold.co/512x512/png?text=Image+Unavailable"

        return story_data

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- LIBRARY ENDPOINTS ---
@app.post("/save_story")
async def save_story(story: StoryModel, current_user: str = Depends(get_current_user)):
    story_dict = story.dict()
    story_dict["user_email"] = current_user
    story_dict["created_at"] = datetime.utcnow()
    await app.mongodb.stories.insert_one(story_dict)
    return {"message": "Story saved to library!"}

@app.get("/my_stories")
async def get_my_stories(current_user: str = Depends(get_current_user)):
    cursor = app.mongodb.stories.find({"user_email": current_user}).sort("created_at", -1)
    stories = await cursor.to_list(length=100)
    for story in stories:
        story["_id"] = str(story["_id"])
    return stories