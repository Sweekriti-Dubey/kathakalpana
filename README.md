# Kathakalpana 📖✨

**Kathakalpana** (Story Imagination) is an interactive web application that uses Artificial Intelligence to generate personalized children's stories complete with illustrations, audio narration, and persistent character consistency.

![Project Status](https://img.shields.io/badge/Status-Live-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Live Demo
*(Optional: Add your Vercel/Render link here once deployed)*
[Link to Live App](#)

## ✨ Features

- **🎨 AI Illustration with Consistency:** Solves the common AI problem of "changing faces" by enforcing character consistency across all chapter illustrations.
- **📝 Llama-3 Storytelling:** Generates creative, genre-specific stories with morals using Groq's high-speed inference.
- **🔊 Text-to-Speech:** Integrated audio player that reads stories aloud for children.
- **🔐 Secure Authentication:** Full Signup/Login system using JWT (JSON Web Tokens) and bcrypt encryption.
- **📚 Personal Library:** Users can save their favorite stories to MongoDB and read them later.
- **📱 Responsive Design:** Built with React and tailored for both desktop and tablet reading experiences.

## 🛠️ Tech Stack

### **Frontend**
- **React.js (Vite):** Fast, component-based UI.
- **CSS3:** Custom styling for a magical, kid-friendly aesthetic.
- **Axios:** For handling API requests.
- **Lucide React:** Beautiful, lightweight icons.

### **Backend**
- **FastAPI (Python):** High-performance async backend.
- **MongoDB (Motor):** NoSQL database for storing users and JSON-structured stories.
- **AI Models:**
  - *Text:* Llama-3-70b (via Groq Cloud).
  - *Images:* Stable Diffusion XL (via Hugging Face Inference API).
- **Authentication:** OAuth2 with Password Bearer & Python-Jose.

⚙️ Installation & Setup

Follow these steps to run the project locally.

1. Clone the Repository: 

git clone [https://github.com/Sweekriti-Dubey/kathakalpana.git](https://github.com/Sweekriti-Dubey/kathakalpana.git)
cd kathakalpana

-------------------------------------------------------------------------
2. Backend Setup: 

The backend handles the AI logic and database connections.
cd backend

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate
# Activate it (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
The backend will run at http://127.0.0.1:8000

-------------------------------------------------------------------------
3. Frontend Setup
Open a new terminal window for the frontend.

Bash

cd frontend

# Install dependencies
npm install

# Start the React app
npm run dev
-------------------------------------------------------------------------
The frontend will run at http://localhost:5173

🔑 Environment Variables
To run this project, you must create a .env file inside the backend folder with the following keys:

---Code snippet---
-------------------------------------------------------------------------
GROQ_API_KEY=your_groq_api_key_here
HF_TOKEN=your_hugging_face_token_here
MONGO_URL=your_mongodb_connection_string_here
-------------------------------------------------------------------------

📸 Usage Guide
1. Sign Up/Login: Create a secure account to access the generator.
2. Create: Enter a story topic (e.g., "A brave puppy in space") and    select the length.
3. Read & Listen: Enjoy the generated story with images and audio.
4. Save: Click the "Save to Library" button to keep the story forever.
-------------------------------------------------------------------------
🤝 Contributing
Contributions are welcome! If you have ideas for new features (like PDF export or multiple character styles), feel free to fork the repository and submit a pull request.