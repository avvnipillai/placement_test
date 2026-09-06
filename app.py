import os
import random
import traceback

from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

from schemas import StudentProfile, CompanyJobSignal, InterviewInsight, WeeklyPrepBrief
from agent_1_linkedin import LinkedInAgent
from agent_2_reviews import ReviewAgent
from agent_3_strategy import StrategyAgent

load_dotenv()

app = Flask(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_client = None

if GEMINI_API_KEY:
    try:
        from google.genai import Client
        _client = Client(api_key=GEMINI_API_KEY)
    except Exception:
        traceback.print_exc()
        _client = None


# ---------------------------------------------------------------------------
# Offline fallback so the site always returns a real-feeling result even
# without a GEMINI_API_KEY configured, or if a live agent call fails
# (LinkedIn/Google blocking scrapes, network errors on a free Render tier).
# ---------------------------------------------------------------------------

TOPIC_BANK = ["Arrays & Strings", "Linked Lists", "Trees & Graphs", "Dynamic Programming",
              "SQL & Joins", "DBMS Fundamentals", "Operating Systems", "System Design Basics",
              "OOP Concepts", "Bit Manipulation", "Recursion & Backtracking", "Hashing"]

SKIP_BANK = ["Advanced Compiler Design", "Low-level Assembly Optimization",
             "Rare Graph Algorithms (Suffix Automaton)", "Legacy Framework Internals"]


def _mock_brief(student: StudentProfile, companies: list[str]) -> WeeklyPrepBrief:
    rng = random.Random(student.branch + student.target_role + str(companies))
    eligible = [c for c in companies if student.cgpa >= 7.0] or companies[: max(1, len(companies) - 1)] or companies
    topics = rng.sample(TOPIC_BANK, k=min(5, len(TOPIC_BANK)))
    skip = rng.sample(SKIP_BANK, k=min(2, len(SKIP_BANK)))
    days = min(7, max(3, student.weeks_to_placement * 2))
    plan = []
    for i in range(1, 8):
        topic = topics[(i - 1) % len(topics)]
        if i <= days:
            plan.append(f"Day {i}: Deep-dive {topic} — solve 8-10 problems + review company tags")
        else:
            plan.append(f"Day {i}: Mock interview, resume polish & rest")
    return WeeklyPrepBrief(
        eligible_companies=eligible,
        high_priority_topics=topics,
        topics_to_skip_for_now=skip,
        action_plan=plan,
    )


def _mock_job_signal(company: str) -> CompanyJobSignal:
    return CompanyJobSignal(
        company_name=company,
        target_roles=["Software Engineer", "SDE-1", "Analyst"],
        eligible_branches=["Computer Science", "IT", "ECE"],
        required_skills=["Python", "SQL", "Data Structures", "System Design"],
    )


def _mock_interview_insight(company: str) -> InterviewInsight:
    return InterviewInsight(
        company_name=company,
        cgpa_cutoff=7.0,
        top_topics=["Arrays", "Graphs", "DBMS", "OS"],
        interview_difficulty="Medium",
    )


def run_pipeline(student: StudentProfile, companies: list[str]):
    """Try the real Gemini-powered multi-agent pipeline; fall back gracefully."""
    if not _client:
        return _mock_brief(student, companies), False

    try:
        a1 = LinkedInAgent(_client)
        a2 = ReviewAgent(_client)
        a3 = StrategyAgent(_client)

        job_signals = [a1.fetch_job_signals(c) for c in companies]
        interview_insights = [a2.fetch_interview_insights(c) for c in companies]
        brief = a3.generate_brief(student, job_signals, interview_insights)
        return brief, True
    except Exception:
        traceback.print_exc()
        return _mock_brief(student, companies), False


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True, silent=True) or {}

    branch = str(data.get("branch", "")).strip()
    target_role = str(data.get("target_role", "")).strip()
    companies = [c.strip() for c in data.get("companies", []) if str(c).strip()]

    try:
        cgpa = float(data.get("cgpa", 0))
        weeks = int(data.get("weeks", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "CGPA and weeks must be numbers."}), 400

    if not branch or not target_role:
        return jsonify({"error": "Branch and target role are required."}), 400
    if not companies:
        return jsonify({"error": "Add at least one target company."}), 400
    if not (0 <= cgpa <= 10):
        return jsonify({"error": "CGPA must be between 0 and 10."}), 400
    if weeks <= 0:
        return jsonify({"error": "Weeks remaining must be a positive number."}), 400

    student = StudentProfile(
        branch=branch, cgpa=cgpa, target_role=target_role, weeks_to_placement=weeks
    )

    brief, live_mode = run_pipeline(student, companies)

    return jsonify({
        "student": student.model_dump(),
        "companies": companies,
        "brief": brief.model_dump(),
        "live_mode": live_mode,
    })


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok", "live_mode": bool(_client)})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
