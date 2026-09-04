import os
from google.genai import Client
from dotenv import load_dotenv
from schemas import StudentProfile
from agent_1_linkedin import LinkedInAgent
from agent_2_reviews import ReviewAgent
from agent_3_strategy import StrategyAgent

load_dotenv()

def collect_student_inputs() -> tuple[StudentProfile, list[str]]:
    print("\n" + "="*50)
    print("      🎓 PLACEMENT PANIC DETECTOR INPUTS 🎓")
    print("="*50)
    
    branch = input("👉 Enter your Branch (e.g., Computer Science, ECE, Mechanical): ").strip()
    cgpa = float(input("👉 Enter your CGPA (e.g., 7.8): ").strip())
    target_role = input("👉 Enter your Target Role (e.g., Software Development Engineer, Data Analyst): ").strip()
    weeks = int(input("👉 Enter Weeks remaining for placements (e.g., 3): ").strip())
    
    companies_str = input("👉 Enter Target Companies (comma-separated, e.g., Amazon, TCS, Infosys): ").strip()
    target_companies = [c.strip() for c in companies_str.split(",") if c.strip()]
    
    student = StudentProfile(
        branch=branch,
        cgpa=cgpa,
        target_role=target_role,
        weeks_to_placement=weeks
    )
    return student, target_companies


def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY missing in .env file.")

    client = Client(api_key=api_key)

    # 1. Ask for user inputs dynamically
    student, target_companies = collect_student_inputs()

    # 2. Run agents with personalized input
    print("\n🔎 Agent 1 (LinkedIn Market Signals)...")
    a1 = LinkedInAgent(client)
    job_signals = [a1.fetch_job_signals(c) for c in target_companies]

    print("📊 Agent 2 (Interview Insights)...")
    a2 = ReviewAgent(client)
    interview_insights = [a2.fetch_interview_insights(c) for c in target_companies]

    print("🎯 Agent 3 (Strategy Generator)...")
    a3 = StrategyAgent(client)
    brief = a3.generate_brief(
        student=student,
        job_signals=job_signals,
        interview_insights=interview_insights
    )

    # 3. Print customized output
    print("\n" + "="*55)
    print(f"   WEEKLY STRATEGY BRIEF FOR {student.branch.upper()} ({student.cgpa} CGPA)")
    print("="*55)
    print(f"\n✅ Eligible Companies: {', '.join(brief.eligible_companies)}")
    print("\n🔥 PREPARE FOR THIS:")
    for topic in brief.high_priority_topics:
        print(f" - {topic}")
    print("\n🚫 SKIP FOR NOW:")
    for topic in brief.topics_to_skip_for_now:
        print(f" - {topic}")
    print("\n📅 7-DAY ACTION PLAN:")
    for step in brief.action_plan:
        print(f" [ ] {step}")

if __name__ == "__main__":
    main()