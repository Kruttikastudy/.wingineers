"""
Mitigation Report API Routes

Endpoints:
  POST /api/mitigation/report  — Aggregate threat data + LLM-generated mitigation advice
  POST /api/mitigation/pdf     — Generate downloadable PDF from report data
"""

import json
import logging
import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import aiohttp
import asyncio

from ..config import settings
from ..services.threats_manager import threats_manager
from ..services.voice_history_manager import voice_history_manager
from ..services.user_profile import user_profile_manager
from ..services.feedback_store import feedback_store

logger = logging.getLogger(__name__)
router = APIRouter()

_LLM_TIMEOUT = 30


# ── Request / Response Models ──

class MitigationReportRequest(BaseModel):
    user_id: Optional[str] = "browser_default"


class MitigationReportResponse(BaseModel):
    generated_at: str
    executive_summary: str
    overall_risk_score: int
    overall_risk_level: str
    threat_breakdown: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    risk_trend_analysis: str
    raw_stats: Dict[str, Any]


class PDFReportRequest(BaseModel):
    generated_at: str
    executive_summary: str
    overall_risk_score: int
    overall_risk_level: str
    threat_breakdown: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    risk_trend_analysis: str


# ── LLM System Prompt ──

MITIGATION_SYSTEM_PROMPT = """You are a cybersecurity analyst for the LUMINA cyber defense platform. You receive aggregated threat intelligence data and must produce a comprehensive mitigation report in JSON format.

Your output MUST be valid JSON with this exact schema:
{
  "executive_summary": "<2-4 sentence executive summary of the overall threat landscape>",
  "overall_risk_score": <integer 0-100>,
  "overall_risk_level": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "threat_breakdown": [
    {
      "category": "<phishing|voice|deepfake>",
      "total_incidents": <int>,
      "high_risk_count": <int>,
      "medium_risk_count": <int>,
      "low_risk_count": <int>,
      "trend": "increasing" | "stable" | "decreasing"
    }
  ],
  "recommendations": [
    {
      "priority": "critical" | "high" | "medium" | "low",
      "title": "<short actionable title>",
      "description": "<1-2 sentence specific mitigation step>",
      "category": "<which threat category this addresses>"
    }
  ],
  "risk_trend_analysis": "<2-3 sentence analysis of risk trends over time>"
}

Rules:
- Base your analysis ONLY on the data provided
- Provide 4-8 specific, actionable recommendations
- Rank recommendations by urgency (critical first)
- Be factual and professional, not alarmist
- If data is sparse, note it and recommend baseline monitoring
- Always include all three categories (phishing, voice, deepfake) in threat_breakdown even if some have zero incidents"""


def _aggregate_data(user_id: str) -> Dict[str, Any]:
    """Aggregate data from all threat sources."""
    # Phishing threats
    threats_data = threats_manager.get_threats(limit=500)
    phishing_stats = threats_data.get("stats", {})

    # Voice history
    voice_history = voice_history_manager.get_history()
    high_risk_voice = sum(1 for c in voice_history if c.get("overall_risk", 0) > 60)
    medium_risk_voice = sum(1 for c in voice_history if 30 < c.get("overall_risk", 0) <= 60)
    low_risk_voice = sum(1 for c in voice_history if c.get("overall_risk", 0) <= 30)
    avg_voice_risk = (
        round(sum(c.get("overall_risk", 0) for c in voice_history) / len(voice_history), 1)
        if voice_history else 0
    )

    # User profile
    profile = user_profile_manager.get_profile_summary(user_id)

    # Feedback
    fb_stats = feedback_store.get_stats()

    return {
        "phishing": {
            "total": phishing_stats.get("total", 0),
            "high_risk": phishing_stats.get("highRisk", 0),
            "medium_risk": phishing_stats.get("mediumRisk", 0),
            "low_risk": phishing_stats.get("lowRisk", 0),
            "today": phishing_stats.get("today", 0),
        },
        "voice": {
            "total_calls": len(voice_history),
            "high_risk_calls": high_risk_voice,
            "medium_risk_calls": medium_risk_voice,
            "low_risk_calls": low_risk_voice,
            "avg_risk": avg_voice_risk,
        },
        "user_profile": {
            "vulnerability_score": profile.get("vulnerability_score", 0),
            "total_scans": profile.get("total_scans", 0),
            "total_threats": profile.get("total_threats", 0),
        },
        "feedback": {
            "total": fb_stats.get("total", 0),
            "fp_rate": fb_stats.get("fp_rate", 0),
            "fn_rate": fb_stats.get("fn_rate", 0),
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def _generate_fallback_report(aggregated: Dict[str, Any]) -> Dict[str, Any]:
    """Template-based fallback when LLM is unavailable."""
    phishing = aggregated["phishing"]
    voice = aggregated["voice"]
    profile = aggregated["user_profile"]

    total_incidents = phishing["total"] + voice["total_calls"]
    high_risk_total = phishing["high_risk"] + voice["high_risk_calls"]

    if high_risk_total > 10:
        risk_score, risk_level = 80, "CRITICAL"
    elif high_risk_total > 5:
        risk_score, risk_level = 65, "HIGH"
    elif total_incidents > 10:
        risk_score, risk_level = 45, "MODERATE"
    else:
        risk_score, risk_level = 20, "LOW"

    return {
        "executive_summary": (
            f"LUMINA has detected {total_incidents} total security incidents across all monitored channels. "
            f"{high_risk_total} of these are classified as high-risk. "
            f"Your vulnerability score stands at {profile['vulnerability_score']:.0f}/100. "
            f"Immediate attention is recommended for high-risk phishing threats."
        ),
        "overall_risk_score": risk_score,
        "overall_risk_level": risk_level,
        "threat_breakdown": [
            {
                "category": "phishing",
                "total_incidents": phishing["total"],
                "high_risk_count": phishing["high_risk"],
                "medium_risk_count": phishing["medium_risk"],
                "low_risk_count": phishing["low_risk"],
                "trend": "stable",
            },
            {
                "category": "voice",
                "total_incidents": voice["total_calls"],
                "high_risk_count": voice["high_risk_calls"],
                "medium_risk_count": voice["medium_risk_calls"],
                "low_risk_count": voice["low_risk_calls"],
                "trend": "stable",
            },
            {
                "category": "deepfake",
                "total_incidents": 0,
                "high_risk_count": 0,
                "medium_risk_count": 0,
                "low_risk_count": 0,
                "trend": "stable",
            },
        ],
        "recommendations": [
            {
                "priority": "critical" if phishing["high_risk"] > 0 else "high",
                "title": "Review high-risk phishing URLs",
                "description": f"There are {phishing['high_risk']} high-risk phishing URLs detected. Review and block them at the gateway immediately.",
                "category": "phishing",
            },
            {
                "priority": "high",
                "title": "Enable multi-factor authentication",
                "description": "MFA neutralizes over 90% of credential-theft phishing attacks. Enable it for all accounts.",
                "category": "phishing",
            },
            {
                "priority": "high" if voice["high_risk_calls"] > 0 else "medium",
                "title": "Monitor voice call patterns",
                "description": f"{voice['high_risk_calls']} high-risk voice calls detected. Consider implementing call screening for unknown numbers.",
                "category": "voice",
            },
            {
                "priority": "medium",
                "title": "Establish deepfake detection baseline",
                "description": "Set up regular media scanning to establish a baseline for deepfake detection across your organization.",
                "category": "deepfake",
            },
        ],
        "risk_trend_analysis": (
            f"Based on {total_incidents} incidents analyzed, the threat landscape shows "
            f"{'elevated' if high_risk_total > 5 else 'moderate'} activity levels. "
            f"Phishing remains the primary attack vector with {phishing['total']} detected URLs. "
            f"Continued monitoring and proactive mitigation measures are recommended."
        ),
    }


async def _call_llm(aggregated: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Call Featherless LLM to generate mitigation report."""
    if not settings.FEATHERLESS_API_KEY:
        logger.warning("[Mitigation] No FEATHERLESS_API_KEY — using fallback report")
        return None

    user_prompt = (
        "Generate a comprehensive mitigation report based on this aggregated threat intelligence data:\n\n"
        + json.dumps(aggregated, indent=2)
    )

    headers = {
        "Authorization": f"Bearer {settings.FEATHERLESS_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.FEATHERLESS_MODEL,
        "messages": [
            {"role": "system", "content": MITIGATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1500,
        "response_format": {"type": "json_object"},
    }

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.featherless.ai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=_LLM_TIMEOUT),
                ) as response:
                    if response.status == 429 or response.status >= 500:
                        logger.warning(f"[Mitigation] LLM retryable error {response.status} (attempt {attempt + 1})")
                        if attempt < max_retries:
                            await asyncio.sleep(1 * (2 ** attempt))
                            continue
                        return None

                    if response.status != 200:
                        error_text = await response.text()
                        logger.warning(f"[Mitigation] LLM API returned {response.status}: {error_text[:200]}")
                        return None

                    data = await response.json()
                    content = data["choices"][0]["message"]["content"]
                    result = json.loads(content)

                    # Validate required fields
                    required = ["executive_summary", "overall_risk_score", "overall_risk_level",
                                "threat_breakdown", "recommendations", "risk_trend_analysis"]
                    if not all(k in result for k in required):
                        logger.warning(f"[Mitigation] LLM response missing required fields")
                        return None

                    result["overall_risk_score"] = max(0, min(100, int(result["overall_risk_score"])))
                    logger.info(f"[Mitigation] LLM report generated: {result['overall_risk_level']} ({result['overall_risk_score']})")
                    return result

        except asyncio.TimeoutError:
            logger.warning(f"[Mitigation] LLM timeout (attempt {attempt + 1})")
            if attempt < max_retries:
                await asyncio.sleep(1 * (2 ** attempt))
                continue
            return None
        except aiohttp.ClientError as e:
            logger.warning(f"[Mitigation] LLM network error (attempt {attempt + 1}): {e}")
            if attempt < max_retries:
                await asyncio.sleep(1 * (2 ** attempt))
                continue
            return None
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"[Mitigation] LLM response parse error: {e}")
            return None

    return None


# ── Endpoints ──

@router.post("/mitigation/report", response_model=MitigationReportResponse, tags=["Mitigation"])
async def generate_mitigation_report(request: MitigationReportRequest):
    """
    Aggregate all threat data and generate an LLM-powered mitigation report.
    Falls back to template-based report if LLM is unavailable.
    """
    try:
        aggregated = _aggregate_data(request.user_id)

        # Try LLM first, fallback to template
        llm_result = await _call_llm(aggregated)
        report = llm_result if llm_result else _generate_fallback_report(aggregated)

        return MitigationReportResponse(
            generated_at=aggregated["timestamp"],
            executive_summary=report["executive_summary"],
            overall_risk_score=report["overall_risk_score"],
            overall_risk_level=report["overall_risk_level"],
            threat_breakdown=report["threat_breakdown"],
            recommendations=report["recommendations"],
            risk_trend_analysis=report["risk_trend_analysis"],
            raw_stats=aggregated,
        )

    except Exception as e:
        logger.error(f"[Mitigation] Report generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate mitigation report")


@router.post("/mitigation/pdf", tags=["Mitigation"])
async def generate_pdf(request: PDFReportRequest):
    """Generate and download a PDF mitigation report."""
    try:
        from ..services.pdf_generator import generate_mitigation_pdf
        pdf_bytes = generate_mitigation_pdf(request.model_dump())
        buffer = io.BytesIO(pdf_bytes)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="LUMINA_Mitigation_Report_{timestamp}.pdf"'
            },
        )
    except Exception as e:
        logger.error(f"[Mitigation] PDF generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")
