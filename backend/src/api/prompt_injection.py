"""
Prompt Injection Detection API Routes

Endpoints:
  POST /api/analyze-prompt — Analyze text for prompt injection patterns
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.prompt_injection_analyzer import analyze_prompt, CATEGORY_INFO

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzePromptRequest(BaseModel):
    prompt: str


class MatchedPattern(BaseModel):
    name: str
    category: str
    category_label: str
    severity: int
    explanation: str


class AnalyzePromptResponse(BaseModel):
    prompt: str
    is_injection: bool
    risk_score: int
    classification: str
    matched_patterns: list[MatchedPattern]
    categories_hit: list[str]
    summary: str
    timestamp: str


@router.post("/analyze-prompt", response_model=AnalyzePromptResponse, tags=["Prompt Injection"])
async def analyze_prompt_endpoint(request: AnalyzePromptRequest):
    """
    Analyze a text prompt for prompt injection patterns.

    Detects role manipulation, information extraction, jailbreaking,
    encoding tricks, and command injection attempts.

    Returns: Classification with risk score, matched patterns, and explanations.
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt text is required")

    try:
        result = analyze_prompt(request.prompt)
        return AnalyzePromptResponse(**result)
    except Exception as e:
        logger.error(f"Prompt injection analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during analysis")


@router.get("/prompt-injection/categories", tags=["Prompt Injection"])
async def get_categories():
    """
    Get all prompt injection pattern categories with descriptions.
    """
    return CATEGORY_INFO
