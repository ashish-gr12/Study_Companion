# StudyMind AI — PRD

## Original problem statement
Develop a generative AI-powered study assistant that adapts to a student's personal learning context. The system should accept inputs such as notes, PDFs, or topics and provide personalized explanations, identify important concepts, and generate quizzes or practice questions. Web app.

## User choices (from clarifying questions)
- AI model: **GPT-5.2** (OpenAI, via Emergent Universal LLM Key)
- Auth: **None** (single-session)
- Inputs supported: **PDF upload + Paste notes + Topic**
- Personalization: **Level + Learning style + Goals + Weekly hour target**
- Design: **Closely follow provided DEEPWORK screenshot** — dark teal sidebar, light content, pill buttons

## User personas
- Undergraduate / graduate students preparing for exams
- Self-learners consuming articles, papers, or lecture notes
- High-schoolers looking for adaptive explanations

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (GPT-5.2) + pypdf
- **Frontend**: React 19 + Tailwind + shadcn/ui + react-router + sonner
- **LLM calls** via `LlmChat.with_model("openai", "gpt-5.2")`, structured JSON for study-set generation

## Implemented (2026-02-XX)
- Personal profile (name/level/learning_style/goals/weekly_goal_hours) CRUD
- Study-set generation from **Topic**, **Pasted notes**, **PDF** (text extraction via pypdf, 50 MB cap)
- Personalized markdown **Explanation** tailored to learner profile
- **Key concepts** extraction with importance ranking (core/important/supplementary)
- **5-question MCQ quiz** per set with correct-answer explanations
- Quiz submit → score, per-question feedback, progress & status updates
- **Ask AI** chat about each study set (profile-aware, grounded in source material)
- **Dashboard** with hero card, upload/paste cards, recent sets, weekly goal, smart recommendation
- **Library** with status filters (all/in_progress/quiz_ready/archived), delete
- **Practice** page listing quizzable sets
- **Analysis** page with weekly-hours, avg score, completed sets, per-set performance bars
- Global search in top bar
- DEEPWORK visual system: Outfit/Manrope fonts, dark navy sidebar, teal pill CTAs, grain textures
- 100% pass on backend (15/15 pytest) and frontend critical flows

## Not yet built / backlog
- **P0**: none
- **P1**:
  - Auth (Emergent Google login or JWT) to enable multi-user library
  - Streaming LLM responses for the chat tab (currently blocking)
  - Flashcard/spaced-repetition mode alongside quiz
  - Highlighted source snippets tied to each concept (citation popovers)
- **P2**:
  - Image/diagram generation for visual learners
  - Audio summary (OpenAI TTS) of the explanation
  - Collaborative study sets / sharing
  - Mobile-optimised responsive polish
  - Export study set to PDF/Anki

## Known behaviours (by design)
- Quiz status mapping: score<70 → `quiz_ready`, 70–89 → `in_progress`, ≥90 → `archived`
- LLM generation latency: 15–45 s per study-set creation
- Single default profile (no auth) — resets per environment

## Next tasks
1. (Optional) Add streaming chat for faster perceived responses
2. (Optional) Add multi-user auth layer
3. (Optional) Flashcard mode + spaced repetition scheduling
