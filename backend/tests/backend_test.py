"""Backend API tests for StudyMind AI study assistant."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://quiz-mentor-ai.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

# LLM calls can take 20-45s
LLM_TIMEOUT = 90


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


def _assert_no_mongo_id(obj):
    if isinstance(obj, dict):
        assert "_id" not in obj, f"Mongo _id leaked: {obj}"
        for v in obj.values():
            _assert_no_mongo_id(v)
    elif isinstance(obj, list):
        for v in obj:
            _assert_no_mongo_id(v)


# ---------- Profile ----------
class TestProfile:
    def test_get_profile_default(self, session):
        r = session.get(f"{API}/profile", timeout=15)
        assert r.status_code == 200
        data = r.json()
        _assert_no_mongo_id(data)
        assert data["id"] == "default"
        assert "name" in data
        assert "level" in data
        assert "learning_style" in data
        assert "goals" in data
        assert isinstance(data["weekly_goal_hours"], int)

    def test_put_profile_updates(self, session):
        payload = {
            "name": "TEST_Learner",
            "level": "grad",
            "learning_style": "analogy",
            "goals": "TEST_goal: learn fast",
            "weekly_goal_hours": 15,
        }
        r = session.put(f"{API}/profile", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        _assert_no_mongo_id(data)
        assert data["name"] == "TEST_Learner"
        assert data["level"] == "grad"
        assert data["learning_style"] == "analogy"
        assert data["weekly_goal_hours"] == 15

        # Verify persistence via GET
        r2 = session.get(f"{API}/profile", timeout=15)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["name"] == "TEST_Learner"
        assert d2["weekly_goal_hours"] == 15

        # Reset to reasonable defaults
        session.put(f"{API}/profile", json={
            "name": "Student", "level": "undergrad",
            "learning_style": "example_driven",
            "goals": "Build strong fundamentals and ace upcoming exams.",
            "weekly_goal_hours": 12
        }, timeout=15)


# ---------- Study Sets Creation ----------
@pytest.fixture(scope="module")
def topic_set_id(session):
    """Create a topic-based study set once for reuse."""
    r = session.post(
        f"{API}/study-sets",
        data={"source_type": "topic", "text": "Newton's Laws of Motion"},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, f"Create topic failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    return data["id"], data


class TestStudySetCreate:
    def test_create_topic_set(self, topic_set_id):
        sid, data = topic_set_id
        _assert_no_mongo_id(data)
        assert data["source_type"] == "topic"
        assert isinstance(data["explanation"], str) and len(data["explanation"]) > 50
        assert len(data["concepts"]) >= 5
        assert len(data["questions"]) == 5
        for q in data["questions"]:
            assert len(q["options"]) == 4
            assert 0 <= q["correct_index"] <= 3
            assert isinstance(q["question"], str) and q["question"]

    def test_create_notes_set(self, session):
        notes = (
            "Photosynthesis is the process by which green plants convert sunlight into chemical energy. "
            "It happens in chloroplasts using chlorophyll. Light-dependent reactions occur in thylakoids "
            "and produce ATP and NADPH. The Calvin cycle uses these to fix CO2 into glucose."
        )
        r = session.post(
            f"{API}/study-sets",
            data={"source_type": "notes", "text": notes, "title": "TEST_Notes Photosynthesis"},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        _assert_no_mongo_id(data)
        assert data["source_type"] == "notes"
        assert len(data["questions"]) == 5
        assert len(data["concepts"]) >= 5
        # Cleanup
        session.delete(f"{API}/study-sets/{data['id']}", timeout=15)

    def test_create_pdf_set(self, session):
        # Build a minimal PDF with actual extractable text using pypdf/reportlab-like bytes.
        try:
            from reportlab.pdfgen import canvas
            buf = io.BytesIO()
            c = canvas.Canvas(buf)
            c.drawString(100, 750, "Mitochondria are the powerhouse of the cell.")
            c.drawString(100, 730, "They produce ATP through oxidative phosphorylation.")
            c.drawString(100, 710, "The inner membrane contains the electron transport chain.")
            c.drawString(100, 690, "Krebs cycle occurs in the mitochondrial matrix.")
            c.save()
            pdf_bytes = buf.getvalue()
        except ImportError:
            pytest.skip("reportlab not available to craft PDF")

        files = {"file": ("TEST_mito.pdf", pdf_bytes, "application/pdf")}
        r = session.post(
            f"{API}/study-sets",
            data={"source_type": "pdf", "title": "TEST_Mitochondria"},
            files=files,
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        _assert_no_mongo_id(data)
        assert data["source_type"] == "pdf"
        assert len(data["questions"]) == 5
        # Cleanup
        session.delete(f"{API}/study-sets/{data['id']}", timeout=15)

    def test_create_invalid_source_type(self, session):
        r = session.post(f"{API}/study-sets", data={"source_type": "bogus", "text": "x"}, timeout=15)
        assert r.status_code == 400


# ---------- Study Sets Read ----------
class TestStudySetRead:
    def test_list_study_sets(self, session, topic_set_id):
        sid, _ = topic_set_id
        r = session.get(f"{API}/study-sets", timeout=15)
        assert r.status_code == 200
        data = r.json()
        _assert_no_mongo_id(data)
        assert isinstance(data, list)
        assert any(s["id"] == sid for s in data)
        sample = next(s for s in data if s["id"] == sid)
        for key in ("id", "title", "source_type", "progress", "status", "num_questions", "num_concepts"):
            assert key in sample, f"Missing field {key}"
        assert sample["num_questions"] == 5

    def test_get_study_set_by_id(self, session, topic_set_id):
        sid, _ = topic_set_id
        r = session.get(f"{API}/study-sets/{sid}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        _assert_no_mongo_id(data)
        assert data["id"] == sid
        assert "explanation" in data and "concepts" in data and "questions" in data

    def test_get_nonexistent_set_404(self, session):
        r = session.get(f"{API}/study-sets/not-a-real-id", timeout=15)
        assert r.status_code == 404


# ---------- Quiz Submit ----------
class TestQuizSubmit:
    def test_submit_all_correct(self, session, topic_set_id):
        sid, data = topic_set_id
        answers = [q["correct_index"] for q in data["questions"]]
        r = session.post(f"{API}/study-sets/{sid}/quiz/submit", json={"answers": answers}, timeout=20)
        assert r.status_code == 200
        res = r.json()
        _assert_no_mongo_id(res)
        assert res["score"] == 100
        assert res["correct"] == len(answers)
        assert res["total"] == len(answers)
        assert len(res["results"]) == len(answers)
        assert all(rr["is_correct"] for rr in res["results"])

    def test_submit_wrong_length(self, session, topic_set_id):
        sid, _ = topic_set_id
        r = session.post(f"{API}/study-sets/{sid}/quiz/submit", json={"answers": [0, 1]}, timeout=15)
        assert r.status_code == 400


# ---------- Chat ----------
class TestChat:
    def test_chat_returns_reply(self, session, topic_set_id):
        sid, _ = topic_set_id
        r = session.post(
            f"{API}/study-sets/{sid}/chat",
            json={"message": "Give me a one sentence summary."},
            timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        _assert_no_mongo_id(data)
        assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 5


# ---------- Stats ----------
class TestStats:
    def test_stats_returns_expected(self, session):
        r = session.get(f"{API}/stats", timeout=15)
        assert r.status_code == 200
        data = r.json()
        _assert_no_mongo_id(data)
        assert "weekly_hours" in data
        assert "weekly_goal_hours" in data
        assert "days_active" in data and isinstance(data["days_active"], list)
        assert "recommendation" in data and isinstance(data["recommendation"], str)


# ---------- Delete (end) ----------
class TestStudySetDelete:
    def test_delete_study_set_and_404_after(self, session, topic_set_id):
        sid, _ = topic_set_id
        r = session.delete(f"{API}/study-sets/{sid}", timeout=15)
        assert r.status_code == 200
        r2 = session.get(f"{API}/study-sets/{sid}", timeout=15)
        assert r2.status_code == 404

    def test_delete_nonexistent_404(self, session):
        r = session.delete(f"{API}/study-sets/nope-nope", timeout=15)
        assert r.status_code == 404
