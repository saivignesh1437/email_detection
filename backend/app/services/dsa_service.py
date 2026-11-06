"""
DSA Engine HTTP Client Service
Connects FastAPI to the standalone Java DSA API (Aho-Corasick & Damerau-Levenshtein).
"""
import logging
from typing import Any
import requests
from backend.app.config import DSA_ENGINE_URL

logger = logging.getLogger(__name__)

def check_dsa_health() -> dict[str, Any]:
    """Checks whether the Java DSA API is online."""
    try:
        resp = requests.get(f"{DSA_ENGINE_URL}/health", timeout=2.0)
        if resp.status_code == 200:
            return resp.json()
        return {"status": "unhealthy", "code": resp.status_code}
    except Exception as e:
        logger.warning("Java DSA health check failed: %s", e)
        return {"status": "offline", "error": str(e)}

def analyze_email_dsa(subject: str, body: str) -> dict[str, Any]:
    """
    Invokes the Java DSA API /analyze endpoint with email subject and body.
    Returns:
        score: int
        risk: str ('LOW', 'MEDIUM', 'HIGH')
        classification: str ('SPAM', 'NOT SPAM')
        keywords: list[str]
        exact_matches: list[str]
        fuzzy_matches: list[str]
    """
    try:
        resp = requests.post(
            f"{DSA_ENGINE_URL}/analyze",
            json={"subject": subject, "body": body},
            headers={"Content-Type": "application/json"},
            timeout=5.0
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "score": int(data.get("score", 0)),
                "risk": str(data.get("risk", "LOW")),
                "classification": str(data.get("classification", "NOT SPAM")),
                "keywords": data.get("keywords", []),
                "exact_matches": data.get("exact_matches", []),
                "fuzzy_matches": data.get("fuzzy_matches", []),
                "available": True
            }
        else:
            logger.error("Java DSA API returned status %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"DSA API responded with HTTP {resp.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error("Failed to connect to Java DSA engine at %s: %s", DSA_ENGINE_URL, e)
        # Graceful fallback if DSA engine is unreachable
        return {
            "score": 0,
            "risk": "LOW",
            "classification": "NOT SPAM",
            "keywords": [],
            "exact_matches": [],
            "fuzzy_matches": [],
            "available": False,
            "error": "Java DSA engine unreachable"
        }
