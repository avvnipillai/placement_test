from typing import List
from google.genai import Client, types
from schemas import StudentProfile, CompanyJobSignal, InterviewInsight, WeeklyPrepBrief

class StrategyAgent:
    def __init__(self, client: Client):
        self.client = client

    def generate_brief(
        self, 
        student: StudentProfile, 
        job_signals: List[CompanyJobSignal], 
        interview_insights: List[InterviewInsight]
    ) -> WeeklyPrepBrief:
        prompt = f"""
        You are a Placement Strategy Advisor.

        STUDENT PROFILE:
        - Branch: {student.branch}
        - CGPA: {student.cgpa}
        - Target Role: {student.target_role}
        - Preparation Time Remaining: {student.weeks_to_placement} weeks

        LIVE JOB MARKET SIGNALS:
        {[s.model_dump() for s in job_signals]}

        INTERVIEW INSIGHTS:
        {[i.model_dump() for i in interview_insights]}

        TASK:
        1. Filter companies where student meets CGPA/branch cutoffs.
        2. Identify high-priority topics requested across eligible companies.
        3. Identify low-ROI topics to SKIP given remaining time.
        4. Provide a 7-day action plan.
        """

        res = self.client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=WeeklyPrepBrief,
            ),
        )
        return WeeklyPrepBrief.model_validate_json(res.text)