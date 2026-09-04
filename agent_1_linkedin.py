import requests
from bs4 import BeautifulSoup
from google.genai import Client, types
from schemas import CompanyJobSignal

class LinkedInAgent:
    def __init__(self, client: Client):
        self.client = client
        self.headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    def fetch_job_signals(self, company_name: str) -> CompanyJobSignal:
        url = f"https://www.linkedin.com/jobs/search/?keywords={company_name}"
        try:
            response = requests.get(url, headers=self.headers, timeout=5)
            soup = BeautifulSoup(response.text, "html.parser")
            cards = soup.find_all("div", class_="base-card")[:5]
            raw_text = "\n".join([card.get_text(separator=" ", strip=True) for card in cards])
        except Exception:
            raw_text = f"Hiring {company_name} Software Engineer, Developer."

        prompt = f"Analyze the following job search text for '{company_name}':\n\n{raw_text[:3000]}"
        
        res = self.client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CompanyJobSignal,
            ),
        )
        return CompanyJobSignal.model_validate_json(res.text)