"""
Email Malicious Content Analyzer
Combines Intent/Sentiment, URL Analysis, and Header Anomaly Detection
using HuggingFace models for comprehensive phishing detection.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from transformers import pipeline
import asyncio

logger = logging.getLogger(__name__)

# Urgency/phishing keywords commonly found in malicious emails
URGENCY_KEYWORDS = [
    "verify immediately", "confirm identity", "act now", "click here",
    "urgent action", "suspended", "restricted", "unusual activity",
    "confirm password", "update payment", "verify account", "click link",
    "expires", "confirm credential", "verify now", "24 hours",
    "asap", "immediately", "don't delay", "verify email"
]

# Known brands used in spoofing attacks
BRAND_NAMES = ["apple", "microsoft", "google", "paypal", "amazon", "netflix", "facebook", "twitter"]

# Suspicious sender patterns
SUSPICIOUS_SENDER_PATTERNS = ["noreply", "donotreply", "no-reply", "notification", "alert"]


class EmailAnalyzer:
    """
    Analyzes emails for malicious content using three detection methods:
    1. Intent & Sentiment (via DistilBERT phishing classifier)
    2. URL & Link Analysis (rule-based + URL classifier)
    3. Header Anomaly Detection (rule-based heuristics)
    """

    def __init__(self):
        """Initialize HuggingFace models at startup"""
        self.phishing_model = None
        self.url_classifier = None
        self._load_models()

    def _load_models(self):
        """Load pretrained HuggingFace models"""
        try:
            # DistilBERT-based phishing detection model (intent/sentiment analysis)
            self.phishing_model = pipeline(
                "text-classification",
                model="cybersectony/phishing-email-detection-distilbert_v2.4.1",
                device=-1  # CPU mode (auto-switches to GPU if available)
            )
            logger.info("✓ Phishing detection model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load phishing model: {e}")

        try:
            # URL malicious classifier (benign/phishing/malware/defacement)
            self.url_classifier = pipeline(
                "text-classification",
                model="CrabInHoney/urlbert-tiny-v3-malicious-url-classifier",
                device=-1
            )
            logger.info("✓ URL classifier model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load URL classifier: {e}")

    async def analyze_email(
        self,
        subject: str,
        sender: str,
        body_text: str,
        links: List[str],
        headers: Optional[Dict] = None,
        phishing_analyzer=None
    ) -> Dict[str, Any]:
        """
        Complete email analysis combining intent, URLs, and header checks

        Args:
            subject: Email subject line
            sender: Sender email address
            body_text: Email body text content
            links: List of extracted URLs from email
            headers: Optional raw email headers dict
            phishing_analyzer: Optional existing phishing analyzer instance (for URL analysis)

        Returns:
            Dictionary with safe, riskScore, confidence, reasons, category, timestamp, analysis
        """
        reasons = []
        component_scores = {"sentiment": 0, "url_worst": 0, "header": 0}

        # 1. Intent & Sentiment Analysis
        intent_result = await self._analyze_intent(subject, body_text)
        component_scores["sentiment"] = intent_result["score"]
        reasons.extend(intent_result["reasons"])

        # 2. URL & Link Analysis
        url_result = await self._analyze_urls(links, phishing_analyzer)
        component_scores["url_worst"] = url_result["worst_score"]
        reasons.extend(url_result["reasons"])

        # 3. Header Anomaly Detection
        header_result = self._analyze_headers(sender, headers)
        component_scores["header"] = header_result["score"]
        reasons.extend(header_result["reasons"])

        # Combined scoring: weighted average with critical signal override
        final_score = max(
            component_scores["sentiment"] * 0.4,  # Intent/sentiment weight
            component_scores["url_worst"] * 0.5,  # URL analysis weight (highest)
            component_scores["header"] * 0.3      # Header anomaly weight
        )

        # Critical signals: if any component has high confidence malicious signal
        if (component_scores["url_worst"] >= 80 or
            (intent_result.get("critical") and component_scores["sentiment"] >= 70)):
            final_score = max(final_score, 85)

        final_score = min(int(final_score), 100)
        confidence = min(0.3 + len(reasons) * 0.08, 1.0)

        # Determine risk category
        if final_score >= 70:
            category = "high_risk"
        elif final_score >= 40:
            category = "medium_risk"
        elif final_score >= 20:
            category = "low_risk"
        else:
            category = "safe"

        return {
            "safe": final_score < 40,
            "riskScore": final_score,
            "confidence": round(confidence, 2),
            "reasons": reasons[:8],  # Cap at 8 reasons for clarity
            "category": category,
            "timestamp": datetime.utcnow().isoformat(),
            "analysis": {
                "sentiment_score": component_scores["sentiment"],
                "url_score": component_scores["url_worst"],
                "header_score": component_scores["header"],
                "num_links": len(links),
                "num_reasons": len(reasons)
            }
        }

    async def _analyze_intent(self, subject: str, body_text: str) -> Dict[str, Any]:
        """
        Analyze phishing intent via urgency keywords and ML model

        Returns dict with score, reasons, and critical flag
        """
        combined_text = f"{subject} {body_text}"
        reasons = []
        base_score = 0
        critical = False

        # Rule 1: Detect urgency keywords (common phishing tactics)
        found_urgency = []
        combined_lower = combined_text.lower()
        for keyword in URGENCY_KEYWORDS:
            if keyword in combined_lower:
                found_urgency.append(keyword)
                base_score += 8  # Small increment per keyword

        if found_urgency:
            reasons.append(f"Urgency tactics detected: '{found_urgency[0]}', '{found_urgency[1] if len(found_urgency) > 1 else 'verify now'}'")
            base_score = min(base_score, 35)  # Cap at 35 for keywords alone

        # Rule 2: Run HuggingFace phishing detection model
        if self.phishing_model:
            try:
                # Truncate to 512 tokens for model efficiency
                truncated = combined_text[:512]
                result = self.phishing_model(truncated)
                label = result[0]["label"]
                score = result[0]["score"]

                # Model outputs LABEL_1 for phishing, LABEL_0 for safe
                if label == "LABEL_1":  # Phishing detected
                    model_score = int(score * 100)
                    base_score = max(base_score, model_score)
                    critical = score > 0.85
                    reasons.append(f"Phishing model detected suspicious intent ({score:.0%} confidence)")

            except Exception as e:
                logger.warning(f"Phishing model inference failed: {e}")

        return {
            "score": min(base_score, 100),
            "reasons": reasons,
            "critical": critical
        }

    async def _analyze_urls(
        self,
        links: List[str],
        phishing_analyzer=None
    ) -> Dict[str, Any]:
        """
        Analyze all extracted URLs from email body

        Uses existing phishing_analyzer.full_analysis() for each URL
        """
        reasons = []
        worst_score = 0
        suspicious_urls = []

        if not links:
            return {"worst_score": 0, "reasons": []}

        # Analyze each URL using existing phishing analyzer
        if phishing_analyzer:
            try:
                for url in links:
                    try:
                        # Call existing async URL analyzer
                        analysis = await phishing_analyzer.full_analysis(url)
                        score = analysis.get("riskScore", 0)

                        if score > worst_score:
                            worst_score = score

                        if score >= 40:  # Flag suspicious URLs
                            suspicious_urls.append((url[:40] + "..." if len(url) > 40 else url, score))

                    except Exception as e:
                        logger.debug(f"URL analysis failed for {url}: {e}")

                if suspicious_urls:
                    reasons.append(f"Found {len(suspicious_urls)} suspicious link(s)")
                    for url, score in suspicious_urls[:2]:
                        reasons.append(f"  • {url} (risk: {score}/100)")
            except Exception as e:
                logger.warning(f"URL analysis batch failed: {e}")

        return {
            "worst_score": worst_score,
            "reasons": reasons
        }

    def _analyze_headers(self, sender: str, headers: Optional[Dict]) -> Dict[str, Any]:
        """
        Analyze email headers for spoofing and anomaly indicators

        Uses rule-based heuristics for deterministic header checks
        """
        reasons = []
        base_score = 0

        if not sender:
            return {"score": 0, "reasons": []}

        sender_lower = sender.lower()

        # Check 1: Brand impersonation
        for brand in BRAND_NAMES:
            if brand in sender_lower:
                # Check if actual domain is different from brand
                if "@" in sender:
                    domain = sender.split("@")[1].lower()
                    if brand not in domain:
                        base_score += 25
                        reasons.append(f"Potential {brand.title()} domain spoofing (sender: {domain})")
                        break

        # Check 2: Suspicious sender patterns
        for pattern in SUSPICIOUS_SENDER_PATTERNS:
            if pattern in sender_lower:
                base_score += 10
                reasons.append(f"Suspicious sender pattern: '{pattern}'")
                break

        # Check 3: Suspicious TLD in sender domain
        if "@" in sender:
            domain = sender.split("@")[1].lower()
            suspicious_tlds = [".tk", ".ml", ".ga", ".cf", ".gq"]
            for tld in suspicious_tlds:
                if domain.endswith(tld):
                    base_score += 30
                    reasons.append(f"Suspicious TLD detected in sender domain: {domain}")
                    break

        # Check 4: Free email service for corporate communication
        free_services = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
        if "@" in sender:
            domain = sender.split("@")[1].lower()
            if domain in free_services and any(keyword in sender_lower for keyword in ["bank", "finance", "security", "admin"]):
                base_score += 15
                reasons.append("Corporate language from free email provider")

        return {
            "score": min(base_score, 100),
            "reasons": reasons
        }


# Global instance (lazy-loaded at first use)
_analyzer_instance = None


def get_email_analyzer() -> EmailAnalyzer:
    """Singleton getter for EmailAnalyzer"""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = EmailAnalyzer()
    return _analyzer_instance
