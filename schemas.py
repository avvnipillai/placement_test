from pydantic import BaseModel, Field
from typing import List, Optional

class CompanyJobSignal(BaseModel):
    company_name: str
    target_roles: List[str] = Field(description="Roles listed in job postings")
    eligible_branches: List[str] = Field(description="Branches mentioned")
    required_skills: List[str] = Field(description="Core technical skills requested")

class InterviewInsight(BaseModel):
    company_name: str
    cgpa_cutoff: Optional[float] = Field(description="Minimum CGPA criteria if mentioned")
    top_topics: List[str] = Field(description="Top technical/DSA topics asked in interviews")
    interview_difficulty: str = Field(description="Easy, Medium, or Hard")

class StudentProfile(BaseModel):
    branch: str
    cgpa: float
    target_role: str
    weeks_to_placement: int

class WeeklyPrepBrief(BaseModel):
    eligible_companies: List[str]
    high_priority_topics: List[str]
    topics_to_skip_for_now: List[str]
    action_plan: List[str]