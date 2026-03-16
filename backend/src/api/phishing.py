"""
Phishing Detection API Routes
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from ..services.phishing_analyzer import full_analysis
from ..services.email_analyzer import get_email_analyzer
from ..services.threats_manager import threats_manager
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzeURLRequest(BaseModel):
    url: str


class AnalyzeEmailRequest(BaseModel):
    subject: str
    sender: str
    body_text: str
    links: list[str] = []
    headers: dict | None = None


class EmailAnalysisResponse(BaseModel):
    safe: bool
    riskScore: int
    confidence: float
    reasons: list[str]
    category: str
    timestamp: str
    analysis: dict


class PhishingResponse(BaseModel):
    url: str
    safe: bool
    riskScore: int
    confidence: float
    reasons: list[str]
    category: str
    timestamp: str
    id: int | None = None
    phishTank: dict | None = None


@router.post("/analyze-url", response_model=PhishingResponse, tags=["Phishing"])
async def analyze_url(request: AnalyzeURLRequest):
    """
    Analyze a URL for phishing indicators.

    Returns: Phishing analysis result with risk score and reasons
    """
    if not request.url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        result = await full_analysis(request.url, settings.PHISHTANK_API_KEY)
        threat = threats_manager.add_threat(result)
        return PhishingResponse(**threat)
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during analysis")


@router.post("/analyze-email", response_model=EmailAnalysisResponse, tags=["Phishing"])
async def analyze_email(request: AnalyzeEmailRequest):
    """
    Analyze an email for phishing, malicious links, and header anomalies.

    Performs three parallel analyses:
    - Intent & Sentiment: Detects phishing language and urgency tactics
    - URL Analysis: Checks all embedded links for malware/phishing
    - Header Anomaly: Detects domain spoofing and suspicious sender patterns

    Returns: Combined risk score with detailed reasons for detection
    """
    if not request.subject and not request.body_text:
        raise HTTPException(status_code=400, detail="Email subject or body is required")

    try:
        from ..services import phishing_analyzer as url_analyzer
        analyzer = get_email_analyzer()
        result = await analyzer.analyze_email(
            subject=request.subject,
            sender=request.sender,
            body_text=request.body_text,
            links=request.links,
            headers=request.headers,
            phishing_analyzer=url_analyzer
        )

        print(f"[API] Email Analysis - Score: {result.get('riskScore')}, Category: {result.get('category')}, Sender: {request.sender}")
        return EmailAnalysisResponse(**result)
    except Exception as e:
        logger.error(f"Email analysis error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during analysis")


@router.get("/threats", tags=["Phishing"])
async def get_threats(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """
    Get all stored threats with filtering, pagination, and stats.

    Query params:
    - limit: Number of threats to return (1-500, default 50)
    - offset: Starting offset (default 0)
    - category: Filter by category (high_risk, medium_risk, low_risk, trusted, invalid, malformed)
    - search: Search by URL
    """
    try:
        return threats_manager.get_threats(
            limit=limit,
            offset=offset,
            category=category,
            search=search
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Threats fetch error: {e}\n{tb}")
        # Write to file for debugging
        with open("error_log.txt", "w") as f:
            f.write(f"Error: {e}\n\nTraceback:\n{tb}\n\nParams: limit={limit} offset={offset} category={category} search={search}")
        raise HTTPException(status_code=500, detail="Failed to fetch threats")


@router.get("/threats/{threat_id}", tags=["Phishing"])
async def get_threat(threat_id: int):
    """
    Get a single threat by ID.
    """
    threat = threats_manager.get_threat(threat_id)

    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")

    return threat
