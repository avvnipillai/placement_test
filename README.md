![Python](https://img.shields.io/badge/python-v3.9+-blue.svg)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-orange)
![License](https://img.shields.io/badge/license-MIT-green.svg)

# 🎓 Placement Panic Detector

A multi-agent AI pipeline powered by Google's **Gemini 2.5 Flash** that analyzes live job market signals and interview data to generate personalized, high-ROI 7-day placement preparation roadmaps for engineering students.

---

## 🏗️ Architecture & Multi-Agent Workflow

The system uses a modular, multi-agent framework where specialized agents collect signals independently before synthesizing a tailored strategy:
┌──────────────────────────────┐
              │      Interactive CLI         │
              │   (Student Profile Input)    │
              └──────────────┬───────────────┘
                             │
       ┌─────────────────────┴─────────────────────┐
       ▼                                           ▼
┌─────────────────────┐                     ┌─────────────────────┐
│   LinkedIn Agent    │                     │    Review Agent     │
│ (Job Market Signals)│                     │(Interview Insights) │
└──────────┬──────────┘                     └──────────┬──────────┘
│                                           │
└─────────────────────┬─────────────────────┘
▼
┌─────────────────────┐
│   Strategy Agent    │
│(Synthesizer & Plan) │
└──────────┬──────────┘
▼
┌─────────────────────┐
│ 7-Day Action Plan   │
└─────────────────────┘


### Agent Roles

* **`schemas.py`**: Defines strict Pydantic schemas (`CompanyJobSignal`, `InterviewInsight`, `StudentProfile`, `WeeklyPrepBrief`) enforcing structured JSON outputs across all models.
* **`agent_1_linkedin.py` (Market Signals Agent)**: Fetches and extracts required technical skills, eligible branches, and target roles from active job listings.
* **`agent_2_reviews.py` (Interview Insights Agent)**: Extracts CGPA cutoffs, top technical/DSA topics asked, and interview difficulty for target companies.
* **`agent_3_strategy.py` (Strategy Synthesizer)**: Compares the student's profile against company cutoffs, filters out low-ROI topics given remaining time, and generates an actionable 7-day prep brief.
* **`main.py`**: Interactive CLI orchestrator driving the full pipeline.

---

# Setup & Installation

### 1. Prerequisites
* Python 3.9+
* A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

# 2. Installation

Clone the repository:
```bash
git clone [https://github.com/vaaryapatel/placement-panic-detector.git](https://github.com/vaaryapatel/placement-panic-detector.git)
cd placement-panic-detector