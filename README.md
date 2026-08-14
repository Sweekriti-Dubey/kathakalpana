<p align="center">
  <img src="frontend/src/assets/images/owllogo2.png" alt="KathaKalpana Logo" width="120" />
</p>

<h1 align="center">KathaKalpana — AI-Powered Children's Story Generator</h1>

<p align="center">
  <em>Where imagination meets AI. A full-stack platform that generates illustrated, multi-chapter stories for children — complete with a virtual pet, vocabulary quizzes, and parental controls.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-BaaS-3FCF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LLaMA_3.3-F55036" />
  <img src="https://img.shields.io/badge/HuggingFace-FLUX.1-FFD21E?logo=huggingface&logoColor=black" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
</p>

---

## ✨ Features at a Glance

### 📖 AI Story Generation
- **Free-text prompts** — describe any story idea ("A wizard lost in time", "Talking samosas on a space mission") and the AI writes a complete multi-chapter story with a moral.
- **Configurable chapters** (1–10) and **7 languages** (English, Hindi, Spanish, French, German, Japanese, Arabic).
- Powered by **Groq's LLaMA 3.3 70B** model with structured JSON output for reliable parsing.
- **NDJSON streaming** delivers the story text first, then progressively streams each chapter's illustration for real-time feedback.

### 🎨 AI-Generated Illustrations
- Every story gets **consistent character illustrations** generated via the **Hugging Face FLUX.1-schnell** model.
- Uses a **character-seed system** to maintain visual consistency of protagonists across chapters.
- Images are uploaded to **Supabase Storage** and served via signed URLs.
- Toggle image generation on/off per story.

### 📚 Immersive Story Reader
- **Chapter-by-chapter navigation** with animated page-flip transitions and a progress bar.
- **Full-view immersive mode** (Escape to exit) with two reading modes:
  - 📖 Current Chapter view
  - 📚 All Chapters scroll view
- **Text-to-Speech (TTS) narration** using the Web Speech API — one tap to listen to any chapter.
- Save stories to your personal library for offline re-reading.
- **Tap-to-define vocabulary** — click any word in a story to instantly get an AI-generated, child-friendly definition (via Groq), with an option to save the word to your Word Vault.

### 🧠 Vocabulary Learning System
- **Word Vault** — a personal collection of saved words with definitions, accessible anytime.
- **Practice Quiz** — adaptive 5-question MCQ quizzes generated from saved words.
  - Tracks `wrong_count` per word and prioritises frequently missed or parent-highlighted words.
  - Confetti celebration on a perfect score! 🎉
- **Parent Vocabulary Dashboard** — parents can view their kid's saved words and mark specific words as "Important" (⭐) to ensure they appear first in quizzes.

### 🐲 Virtual Pet System ("Chotuu")
- Each kid profile gets a **virtual companion pet** that grows as they read.
- **XP-based leveling** — earn 20 XP per story completion.
- **3 evolution stages**: 🥚 Egg → 🐣 Hatchling → 🦉 Adult.
- **Food feeding mechanic** — choose a snack (Panipuri, Burger, Pizza, or Apple) to feed your pet after finishing a story.
- Animated Lottie pet, confetti on evolution milestones, and a dedicated Pet Dashboard.

### 👨‍👩‍👧‍👦 Multi-Profile Household System
- **Netflix-style profile selector** — "Who is reading today?" screen with gradient avatar cards.
- Support for **multiple kid profiles** under one parent account.
- Easily **add new kids** with age range, screen time limits, daily goals, and a custom pet name.
- **PIN-gated parent access** — the parent dashboard requires a 4-digit PIN set during onboarding.
- **Profile switching** at any time via the navbar badge.

### 🛡️ Parent Dashboard & Parental Controls
A full sidebar-navigation dashboard for parents with:

| Tab | Description |
|---|---|
| **Dashboard** | Stat cards (stories finished, weekly progress), per-kid reading breakdown, recently saved stories grid |
| **Saved Stories** | All saved stories across kids in a visual card grid with deletion |
| **New Words Learnt** | Per-kid vocabulary table with word, meaning, quiz mistakes count, and highlight toggle |
| **Settings** | Daily screen time limit, content age-rating filter (G/PG/PG-13), weekly reading goal |
| **Manage Account** | Edit/delete kid profiles, change age ranges, update goals, **Danger Zone**: delete entire account |

### ⏱️ Screen Time Management
- **Configurable daily limits** per kid (15–180 min, stored as per-day JSONB).
- **Live countdown warning** — a floating badge when < 5 minutes remain.
- **Full-screen soft-lock overlay** — a friendly "Time for a Sweet Break! 🌟" screen when the limit is reached.

### 📈 Reading Streaks & Weekly Goals
- **Consecutive-day reading streaks** tracked per user in the database.
- **Weekly story goals** — configurable target with progress messages on story completion (e.g., "Read 3 more to complete your weekly goal!").
- 🌟 Celebration message when the weekly goal is met.

### 🚀 Guided Onboarding
A **4-step wizard** for first-time users:
1. **Welcome** — Parent name + 4-digit admin PIN
2. **Kid Profile** — Kid's name + age range selection (3-5, 6-8, 9-12)
3. **Healthy Habits** — Screen time slider + daily story goal
4. **Pet Name** — Name the companion pet (defaults to "Chotuu")

### 🎨 Theming & UX Polish
- **Dark/Light mode** toggle with CSS custom properties.
- Glassmorphism navbar with backdrop blur.
- Intersection Observer-based scroll animations on the homepage.
- Code-splitting with `React.lazy` + `Suspense` for fast initial loads.
- Responsive design from mobile to desktop.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Story    │ │  Reader  │ │  Quiz    │ │ Parent │ │
│  │Generator │ │  + TTS   │ │  System  │ │Dashboard│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │             │            │            │      │
│  ┌────┴─────────────┴────────────┴────────────┴────┐ │
│  │        Supabase Client + ProfileContext          │ │
│  └──────────────────┬──────────────────────────────┘ │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS
┌─────────────────────┼───────────────────────────────┐
│          Supabase Edge Functions (Deno)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │generate-story│ │complete-read │ │  pet-status   │ │
│  │  (Groq + HF) │ │ (XP+Streak)  │ │              │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  get-meaning  │ │  save-story   │ │ setup-account│ │
│  │   (Groq)      │ │              │ │ create-profile│ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  my-stories   │ │ get-profiles  │ │delete-account│ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────┐
│           Supabase (Postgres + Auth + Storage)       │
│  Tables: profiles, profiles_v2, pet_stats, stories,  │
│          saved_words, reading_history, kid_profiles,  │
│          kid_settings, parent_account                 │
│  RLS: Row Level Security on all user-facing tables    │
│  Storage: story-images bucket with signed URLs        │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Styling** | Tailwind CSS, custom CSS variables for theming |
| **State** | React Context API (ProfileContext, ThemeContext) |
| **Routing** | React Router v6 with lazy-loaded routes |
| **Backend** | Supabase Edge Functions (Deno runtime) |
| **Database** | Supabase (PostgreSQL) with RLS, triggers, and RPCs |
| **Auth** | Supabase Auth (email/password, session refresh) |
| **Storage** | Supabase Storage (story images with signed URLs) |
| **AI — Text** | Groq API (LLaMA 3.3 70B Versatile) |
| **AI — Images** | Hugging Face Inference API (FLUX.1-schnell) |
| **AI — Definitions** | Groq API (LLaMA 3.3 70B) for word meanings |
| **TTS** | Web Speech API (browser-native) |
| **Animations** | Lottie (dotlottie-react), canvas-confetti, CSS keyframes |
| **UI Libraries** | Lucide React (icons), Floating UI (tooltips), Axios |

---

## 📁 Project Structure

```
kathakalpana/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Root app with routing, nav, auth
│   │   ├── components/
│   │   │   ├── Login.tsx            # Auth flows + onboarding wizard
│   │   │   ├── StoryGenerator.tsx   # Story creation form
│   │   │   ├── StoryReader.tsx      # Immersive chapter reader + TTS
│   │   │   ├── Library.tsx          # Saved stories grid
│   │   │   ├── PetDashBoard.tsx     # Virtual pet stats + evolution
│   │   │   ├── Quiz.tsx             # Vocabulary practice quiz
│   │   │   ├── WordVault.tsx        # Saved words collection
│   │   │   ├── WordTooltipPanel.tsx  # Floating word definition tooltip
│   │   │   ├── ParentDashboard.tsx  # Full parent portal with sidebar
│   │   │   ├── ProfileSelector.tsx  # Netflix-style profile picker
│   │   │   ├── AddKidModal.tsx      # Add new kid profile modal
│   │   │   ├── ScreenTimeTracker.tsx # Screen time limit enforcement
│   │   │   ├── ThemeToggle.tsx      # Dark/light mode switch
│   │   │   └── TitleContainer.tsx   # Homepage hero section
│   │   ├── contexts/
│   │   │   ├── ProfileContext.tsx   # Multi-profile state management
│   │   │   └── ThemeContext.tsx     # Theme state management
│   │   ├── hooks/
│   │   │   └── useWordTooltip.ts   # Word lookup hook with caching
│   │   ├── utils/
│   │   │   └── tokenizeContent.ts  # Text tokenizer for clickable words
│   │   ├── lib/
│   │   │   └── supabaseClient.ts   # Supabase client initialisation
│   │   └── types.ts                # TypeScript interfaces
│   └── public/
│       └── assets/food/            # Pet food images
├── supabase/
│   ├── functions/
│   │   ├── generate-story/         # Story text (Groq) + images (HF)
│   │   ├── complete-reading/       # XP, streak, pet evolution
│   │   ├── pet-status/             # Pet stats retrieval
│   │   ├── get-meaning/            # AI word definitions (Groq)
│   │   ├── save-story/             # Persist story to DB
│   │   ├── my-stories/             # Fetch user's saved stories
│   │   ├── get-profiles/           # Fetch household profiles
│   │   ├── create-profile/         # Add new kid profile
│   │   ├── setup-account/          # First-time onboarding
│   │   └── delete-account/         # Full account deletion (admin)
│   ├── schema_patch.sql            # DB schema, RLS, triggers, RPCs
│   └── storage_policies.sql        # Storage bucket policies
└── docker-compose.yml              # Local Supabase development
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Supabase** project (free tier works)
- **Groq** API key ([console.groq.com](https://console.groq.com))
- **Hugging Face** API key ([huggingface.co/settings/tokens](https://huggingface.co/settings/tokens))

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/kathakalpana.git
cd kathakalpana/frontend
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Run the SQL files in the **SQL Editor**:
   - `supabase/schema_patch.sql` — tables, RLS policies, triggers
   - `supabase/schema_patch_v2.sql` — v2 profile system
   - `supabase/storage_policies.sql` — storage bucket policies
3. Create a storage bucket called `story-images` (public or private with signed URLs).
4. Deploy edge functions:
   ```bash
   supabase functions deploy generate-story
   supabase functions deploy complete-reading
   supabase functions deploy pet-status
   supabase functions deploy get-meaning
   supabase functions deploy save-story
   supabase functions deploy my-stories
   supabase functions deploy get-profiles
   supabase functions deploy create-profile
   supabase functions deploy setup-account
   supabase functions deploy delete-account
   ```
5. Set secrets for edge functions:
   ```bash
   supabase secrets set GROQ_API_KEY=<your-groq-key>
   supabase secrets set HUGGINGFACE_API_KEY=<your-hf-key>
   ```

### 3. Configure Environment

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
```

### 4. Run Locally

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🗄️ Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `profiles` | User-level data (streak count, last read date) |
| `profiles_v2` | Multi-profile system (parent + kid profiles per user) |
| `kid_profiles` | Kid-specific metadata (age range, reading level) |
| `kid_settings` | Parental controls (screen time, goals, filters) |
| `parent_account` | Parent PIN storage for dashboard access |
| `pet_stats` | Per-profile virtual pet (XP, level, evolution stage) |
| `stories` | Saved stories with chapter content (JSONB) |
| `saved_words` | Vocabulary words with meanings and quiz stats |
| `reading_history` | Reading completion log for analytics |

All tables use **Row Level Security (RLS)** — users can only access their own data.

---

## 🔑 Environment Variables

### Frontend (Vite)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_SUPABASE_FUNCTIONS_URL` | Base URL for Edge Functions |

### Edge Functions (Supabase Secrets)

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for story generation + word definitions |
| `HUGGINGFACE_API_KEY` | Hugging Face key for image generation |
| `SUPABASE_URL` | Auto-provided by Supabase runtime |
| `SUPABASE_ANON_KEY` | Auto-provided by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase runtime |
| `STORY_IMAGES_BUCKET` | Storage bucket name (default: `story-images`) |

---

## 📜 License

This project is for educational and portfolio purposes.

---

<p align="center">Made with ❤️ for little storytellers</p>
