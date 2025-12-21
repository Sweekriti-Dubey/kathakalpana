import os
import random
import json
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
MONGO_URL = os.getenv("MONGO_URL")

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_this_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

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
    image_prompt: str
    image_seed: int

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


# --- STORY GENERATION ---
@app.post("/generate")
def generate_story(request: StoryRequest, current_user: str = Depends(get_current_user)):
    try:
        client = Groq(api_key=GROQ_API_KEY)
        
        system_prompt = (
            "You are a children's author. Output valid JSON only. "
            "MANDATORY JSON STRUCTURE: \n"
            "{\n"
            "  \"title\": \"Story Title\",\n"
            "  \"moral\": \"A short moral message\",\n"
            "  \"chapters\": [\n"
            "    { \"title\": \"...\", \"content\": \"...\", \"image_prompt\": \"...\" }\n"
            "  ]\n"
            "}\n"
            "Do not include any text outside this JSON structure. "
            "Ensure 'chapters' is always an array of objects."
            )
        
        user_prompt = f"Write a {request.genre} story with {request.chapters} chapters."

        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.8, # Slightly higher for more "interesting" vocabulary
            response_format={"type": "json_object"}
        )

        story_data = json.loads(chat_completion.choices[0].message.content)

        if "chapters" in story_data:
            for chapter in story_data["chapters"]:
                chapter["image_seed"] = random.randint(10000, 99999)

        return story_data
    except Exception as e:
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

@app.get("/")
def read_root():
    return {"status": "alive", "message": "The backend is running!"}