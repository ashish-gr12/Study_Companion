from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
import logging
import uuid
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

from pypdf import PdfReader
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ----------------- Models -----------------
class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: "default")
    name: str = "Student"
    level: Literal["high_school", "undergrad", "grad", "self_learner"] = "undergrad"
    learning_style: Literal["visual", "example_driven", "concise", "deep_dive", "analogy"] = "example_driven"
    goals: str = "Build strong fundamentals and ace upcoming exams."
    weekly_goal_hours: int = 12


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    learning_style: Optional[str] = None
    goals: Optional[str] = None
    weekly_goal_hours: Optional[int] = None


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_index: int
    explanation: str


class KeyConcept(BaseModel):
    term: str
    definition: str
    importance: Literal["core", "important", "supplementary"] = "important"


class StudySet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source_type: Literal["pdf", "notes", "topic"]
    raw_text: str = ""
    explanation: str = ""
    concepts: List[KeyConcept] = []
    questions: List[QuizQuestion] = []
    progress: int = 0  # 0-100
    status: Literal["in_progress", "quiz_ready", "archived"] = "in_progress"
    score: Optional[int] = None
    study_minutes: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class QuizSubmitPayload(BaseModel):
    answers: List[int]  # indices, one per question


class ChatPayload(BaseModel):
    message: str


# ----------------- Helpers -----------------
def extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    chunks = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(chunks).strip()


def _strip_code_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        # remove first line and last fence
        t = re.sub(r"^```[a-zA-Z]*\n", "", t)
        t = re.sub(r"\n```$", "", t)
    return t.strip()


def profile_system_prefix(profile: dict) -> str:
    return (
        f"You are an adaptive AI study tutor. The learner profile is:\n"
        f"- Name: {profile.get('name','Student')}\n"
        f"- Level: {profile.get('level','undergrad')}\n"
        f"- Preferred learning style: {profile.get('learning_style','example_driven')}\n"
        f"- Goals: {profile.get('goals','')}\n"
        f"Always tailor tone, depth, and examples to this profile."
    )


async def get_profile_doc() -> dict:
    doc = await db.profile.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        defaults = UserProfile().model_dump()
        await db.profile.insert_one(defaults.copy())
        doc = defaults
    return doc


async def call_llm_json(system: str, user_text: str, session_id: str) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("openai", "gpt-5.2")
    resp = await chat.send_message(UserMessage(text=user_text))
    cleaned = _strip_code_fence(resp)
    # Try direct json, else find first {..}
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise ValueError(f"LLM returned non-JSON: {resp[:300]}")


async def call_llm_text(system: str, user_text: str, session_id: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model("openai", "gpt-5.2")
    resp = await chat.send_message(UserMessage(text=user_text))
    return resp.strip()


async def generate_study_set_content(title: str, source_type: str, raw_text: str, profile: dict) -> dict:
    """Generate explanation, concepts, and quiz via a single LLM call."""
    system = profile_system_prefix(profile) + (
        "\nYou generate structured study material. Always return STRICT JSON only, "
        "no markdown, no code fences."
    )

    if source_type == "topic":
        content_block = f"TOPIC: {title}\n\nProvide comprehensive study material on this topic."
    else:
        snippet = raw_text[:12000]  # cap
        content_block = f"TITLE: {title}\n\nSOURCE MATERIAL:\n{snippet}"

    prompt = f"""{content_block}

Produce a JSON object with this exact schema:
{{
  "title": "short clean title (<=60 chars)",
  "explanation": "markdown-formatted personalized explanation tailored to the learner profile. Use headings (##), bullet lists, and short paragraphs. 400-700 words.",
  "concepts": [
    {{"term": "...", "definition": "one-sentence crisp definition", "importance": "core|important|supplementary"}}
  ],
  "questions": [
    {{"question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "why the answer is correct"}}
  ]
}}

Rules:
- 6-10 concepts covering the material.
- Exactly 5 multiple-choice questions, 4 options each, index 0-3.
- Questions should be specific to the material (not generic), varying in difficulty.
- Explanation must adapt style to learner (visual/example_driven/concise/deep_dive/analogy).
Return ONLY the JSON object."""

    data = await call_llm_json(system, prompt, session_id=f"study-gen-{uuid.uuid4()}")

    # Normalize
    concepts = []
    for c in data.get("concepts", []):
        concepts.append(KeyConcept(
            term=c.get("term", ""),
            definition=c.get("definition", ""),
            importance=c.get("importance", "important") if c.get("importance") in ("core", "important", "supplementary") else "important",
        ).model_dump())

    questions = []
    for q in data.get("questions", []):
        opts = q.get("options", [])
        if len(opts) < 4:
            opts = (opts + ["N/A"] * 4)[:4]
        else:
            opts = opts[:4]
        ci = int(q.get("correct_index", 0))
        if ci < 0 or ci > 3:
            ci = 0
        questions.append(QuizQuestion(
            id=str(uuid.uuid4()),
            question=q.get("question", ""),
            options=opts,
            correct_index=ci,
            explanation=q.get("explanation", ""),
        ).model_dump())

    return {
        "title": data.get("title") or title,
        "explanation": data.get("explanation", ""),
        "concepts": concepts,
        "questions": questions,
    }


# ----------------- Profile Endpoints -----------------
@api_router.get("/profile", response_model=UserProfile)
async def get_profile():
    doc = await get_profile_doc()
    return UserProfile(**doc)


@api_router.put("/profile", response_model=UserProfile)
async def update_profile(payload: ProfileUpdate):
    doc = await get_profile_doc()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    doc.update(updates)
    await db.profile.update_one({"id": "default"}, {"$set": doc}, upsert=True)
    return UserProfile(**doc)


# ----------------- Study Sets -----------------
@api_router.post("/study-sets", response_model=StudySet)
async def create_study_set(
    source_type: str = Form(...),
    title: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    if source_type not in ("pdf", "notes", "topic"):
        raise HTTPException(status_code=400, detail="source_type must be pdf|notes|topic")

    raw_text = ""
    resolved_title = title or ""

    if source_type == "pdf":
        if not file:
            raise HTTPException(status_code=400, detail="PDF file is required")
        data = await file.read()
        try:
            raw_text = extract_pdf_text(data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
        if not raw_text:
            raise HTTPException(status_code=400, detail="No extractable text in PDF")
        if not resolved_title:
            resolved_title = (file.filename or "PDF Study Set").rsplit(".", 1)[0]
    elif source_type == "notes":
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Notes text required")
        raw_text = text.strip()
        if not resolved_title:
            resolved_title = raw_text[:50] + ("..." if len(raw_text) > 50 else "")
    else:  # topic
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Topic required")
        resolved_title = text.strip()[:80]
        raw_text = ""

    profile = await get_profile_doc()
    try:
        gen = await generate_study_set_content(resolved_title, source_type, raw_text, profile)
    except Exception as e:
        logger.exception("LLM generation failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    study_set = StudySet(
        title=gen["title"],
        source_type=source_type,  # type: ignore
        raw_text=raw_text[:50000],
        explanation=gen["explanation"],
        concepts=[KeyConcept(**c) for c in gen["concepts"]],
        questions=[QuizQuestion(**q) for q in gen["questions"]],
        progress=25,
        status="in_progress",
        study_minutes=0,
    )
    doc = study_set.model_dump()
    await db.study_sets.insert_one(doc.copy())
    # Remove any _id if present
    doc.pop("_id", None)
    return study_set


@api_router.get("/study-sets")
async def list_study_sets():
    cursor = db.study_sets.find({}, {"_id": 0}).sort("updated_at", -1)
    items = await cursor.to_list(500)
    # return lightweight list
    lite = []
    for s in items:
        lite.append({
            "id": s["id"],
            "title": s["title"],
            "source_type": s["source_type"],
            "progress": s.get("progress", 0),
            "status": s.get("status", "in_progress"),
            "score": s.get("score"),
            "num_questions": len(s.get("questions", [])),
            "num_concepts": len(s.get("concepts", [])),
            "study_minutes": s.get("study_minutes", 0),
            "created_at": s.get("created_at"),
            "updated_at": s.get("updated_at"),
        })
    return lite


@api_router.get("/study-sets/{set_id}", response_model=StudySet)
async def get_study_set(set_id: str):
    doc = await db.study_sets.find_one({"id": set_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return StudySet(**doc)


@api_router.delete("/study-sets/{set_id}")
async def delete_study_set(set_id: str):
    res = await db.study_sets.delete_one({"id": set_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@api_router.post("/study-sets/{set_id}/quiz/submit")
async def submit_quiz(set_id: str, payload: QuizSubmitPayload):
    doc = await db.study_sets.find_one({"id": set_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    questions = doc.get("questions", [])
    if len(payload.answers) != len(questions):
        raise HTTPException(status_code=400, detail="Answers length mismatch")

    correct = 0
    results = []
    for q, ans in zip(questions, payload.answers):
        is_correct = ans == q["correct_index"]
        if is_correct:
            correct += 1
        results.append({
            "question_id": q["id"],
            "selected": ans,
            "correct_index": q["correct_index"],
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
        })

    score = round((correct / max(len(questions), 1)) * 100)
    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = "quiz_ready" if score < 70 else ("archived" if score >= 90 else "in_progress")
    new_progress = max(doc.get("progress", 0), min(100, 50 + int(score / 2)))

    await db.study_sets.update_one(
        {"id": set_id},
        {"$set": {
            "score": score,
            "status": new_status,
            "progress": new_progress,
            "updated_at": now_iso,
            "study_minutes": doc.get("study_minutes", 0) + 15,
        }},
    )

    # log a study session
    await db.study_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "study_set_id": set_id,
        "minutes": 15,
        "score": score,
        "at": now_iso,
    })

    return {
        "score": score,
        "correct": correct,
        "total": len(questions),
        "results": results,
    }


@api_router.post("/study-sets/{set_id}/chat")
async def chat_about_set(set_id: str, payload: ChatPayload):
    doc = await db.study_sets.find_one({"id": set_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    profile = await get_profile_doc()

    material = doc.get("raw_text") or doc.get("explanation", "")
    material = material[:8000]
    system = profile_system_prefix(profile) + (
        "\nYou answer follow-up questions about a specific study set. "
        "Be precise, reference the material, and adapt tone to learner style. "
        "Use concise markdown."
    )
    user_text = f"STUDY SET TITLE: {doc.get('title')}\n\nMATERIAL:\n{material}\n\nQUESTION: {payload.message}"
    try:
        reply = await call_llm_text(system, user_text, session_id=f"chat-{set_id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    # log study time
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.study_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "study_set_id": set_id,
        "minutes": 3,
        "score": None,
        "at": now_iso,
    })
    await db.study_sets.update_one(
        {"id": set_id},
        {"$set": {"updated_at": now_iso},
         "$inc": {"study_minutes": 3}},
    )

    return {"reply": reply}


# ----------------- Stats -----------------
@api_router.get("/stats")
async def get_stats():
    profile = await get_profile_doc()
    # Gather sessions in last 7 days
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    sessions = await db.study_sessions.find({}, {"_id": 0}).to_list(1000)
    weekly_minutes = 0
    days_active = set()
    for s in sessions:
        try:
            at = datetime.fromisoformat(s["at"])
            if at >= week_ago:
                weekly_minutes += int(s.get("minutes") or 0)
                days_active.add(at.weekday())  # 0=Mon
        except Exception:
            continue

    hours = round(weekly_minutes / 60, 1)
    goal = profile.get("weekly_goal_hours", 12)

    # Recommendation: find weakest concept from lowest scoring quiz
    rec_text = "Paste your notes or upload a PDF to start a personalized study set."
    sets = await db.study_sets.find({"score": {"$ne": None}}, {"_id": 0}).sort("updated_at", -1).to_list(20)
    if sets:
        worst = min(sets, key=lambda x: x.get("score", 100))
        if worst.get("score", 100) < 80 and worst.get("concepts"):
            core_terms = [c["term"] for c in worst["concepts"] if c.get("importance") == "core"][:2]
            term_str = ", ".join(core_terms) if core_terms else worst["concepts"][0]["term"]
            rec_text = f'You seem to struggle with "{term_str}" in "{worst["title"]}". We\'ve generated targeted practice you can retry.'

    return {
        "weekly_hours": hours,
        "weekly_goal_hours": goal,
        "days_active": sorted(list(days_active)),
        "recommendation": rec_text,
        "weakest_set_id": sets[0]["id"] if sets else None,
    }


@api_router.get("/")
async def root():
    return {"service": "StudyMind AI", "status": "ok"}


# Mount router and CORS
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
