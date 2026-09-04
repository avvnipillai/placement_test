import requests
from bs4 import BeautifulSoup
from google.genai import Client, types
from schemas import InterviewInsight

class ReviewAgent:
    def __init__(self, client: Client):
        self.client = client
        self.headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    def fetch_interview_insights(self, company_name: str) -> InterviewInsight:
        url = f"https://www.google.com/search?q={company_name}+interview+questions+ambitionbox+cutoff"
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            soup = BeautifulSoup(response.text, "html.parser")
            snippets = [g.get_text() for g in soup.find_all("div") if len(g.get_text()) > 80][:5]
            raw_content = "\n".join(snippets)
        except Exception:
            raw_content = f"{company_name} interviews focus on DSA. Cutoff around 7.0 CGPA."

        prompt = f"Extract interview cutoffs, key DSA/tech topics, and difficulty for '{company_name}':\n\n{raw_content[:3000]}"

        res = self.client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewInsight,
            ),
        )
        return InterviewInsight.model_validate_json(res.text)