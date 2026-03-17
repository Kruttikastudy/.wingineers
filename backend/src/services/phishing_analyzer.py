"""
URL Phishing Analyzer
Rule-based phishing detection with optional PhishTank API integration.
Computes a risk score (0-100) and confidence (0-1) with detailed reasons.
"""

import re
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

# Known suspicious TLDs frequently used in phishing
SUSPICIOUS_TLDS = {
    '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club',
    '.work', '.date', '.racing', '.download', '.win', '.bid',
    '.stream', '.trade', '.webcam', '.loan', '.party', '.click',
    '.link', '.info', '.zip', '.mov', '.php'
}

# URL shortener domains
URL_SHORTENERS = {
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
    'buff.ly', 'j.mp', 'rb.gy', 'shorturl.at', 'tiny.cc', 'cutt.ly',
    's.id', 'v.gd', 'clck.ru', 'qr.ae'
}

# Suspicious keywords commonly found in phishing URLs
SUSPICIOUS_KEYWORDS = [
    'login', 'verify', 'account', 'secure', 'update', 'banking',
    'signin', 'confirm', 'password', 'credential', 'authenticate',
    'wallet', 'suspend', 'restrict', 'unlock', 'alert', 'notification',
    'paypal', 'appleid', 'microsoft', 'amazon', 'netflix', 'facebook',
    'instagram', 'wellsfargo', 'chase', 'citi'
]

# Well-known legitimate domains (whitelist)
TRUSTED_DOMAINS = {
    'google.com', 'www.google.com', 'youtube.com', 'www.youtube.com',
    'facebook.com', 'www.facebook.com', 'twitter.com', 'x.com',
    'github.com', 'www.github.com', 'stackoverflow.com',
    'microsoft.com', 'www.microsoft.com', 'apple.com', 'www.apple.com',
    'amazon.com', 'www.amazon.com', 'wikipedia.org', 'en.wikipedia.org',
    'linkedin.com', 'www.linkedin.com', 'reddit.com', 'www.reddit.com',
    'instagram.com', 'www.instagram.com', 'netflix.com', 'www.netflix.com',
    'whatsapp.com', 'web.whatsapp.com', 'mail.google.com',
    'outlook.com', 'outlook.live.com', 'drive.google.com',
    'docs.google.com', 'localhost'
}

# Homoglyph characters (look-alikes used to spoof domains)
HOMOGLYPH_PATTERN = re.compile(r'[а-яА-ЯёЁ\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]')


def analyze_url(url_string: str) -> Dict[str, Any]:
    """
    Analyze a URL for phishing indicators

    Args:
        url_string: The URL to analyze

    Returns:
        Dictionary with safe, riskScore, confidence, reasons, category, timestamp
    """
    reasons: List[str] = []
    risk_score = 0

    # Basic validation
    if not url_string or not isinstance(url_string, str):
        return {
            "url": url_string,
            "safe": False,
            "riskScore": 100,
            "confidence": 1.0,
            "reasons": ["Invalid or empty URL"],
            "category": "invalid",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    # Parse URL
    try:
        # Handle URLs without protocol
        url_with_protocol = url_string if url_string.startswith('http') else f'http://{url_string}'
        from urllib.parse import urlparse
        parsed = urlparse(url_with_protocol)
    except Exception:
        return {
            "url": url_string,
            "safe": False,
            "riskScore": 80,
            "confidence": 0.9,
            "reasons": ["Malformed URL that cannot be parsed"],
            "category": "malformed",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    hostname = parsed.hostname.lower() if parsed.hostname else ""
    full_url = url_string.lower()
    path = parsed.path.lower()

    # Whitelist check
    if hostname in TRUSTED_DOMAINS:
        return {
            "url": url_string,
            "safe": True,
            "riskScore": 0,
            "confidence": 0.95,
            "reasons": [],
            "category": "trusted",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    # Check 1: IP address instead of domain
    ipv4_regex = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
    if ipv4_regex.match(hostname):
        risk_score += 30
        reasons.append("URL uses an IP address instead of a domain name — common in phishing")

    # Check 2: Suspicious TLD
    tld = '.' + (hostname.split('.')[-1] if hostname else "")
    if tld in SUSPICIOUS_TLDS:
        risk_score += 20
        reasons.append(f'Uses suspicious top-level domain "{tld}" — frequently abused for phishing')

    # Check 3: Excessive subdomains
    subdomain_count = len(hostname.split('.')) - 2 if hostname else 0
    if subdomain_count > 2:
        risk_score += 15
        reasons.append(f"Excessive subdomains ({subdomain_count + 2} levels) — used to disguise real domain")

    # Check 4: URL shortener
    if hostname in URL_SHORTENERS:
        risk_score += 25
        reasons.append("URL shortener detected — hides the actual destination, often used in phishing")

    # Check 5: Homoglyph / IDN characters
    if HOMOGLYPH_PATTERN.search(url_string):
        risk_score += 35
        reasons.append("Contains homoglyph/Cyrillic characters — used to impersonate legitimate domains")

    # Check 6: Very long URL
    if len(url_string) > 100:
        risk_score += 10
        reasons.append(f"Unusually long URL ({len(url_string)} characters) — may be hiding malicious content")

    # Check 7: Suspicious keywords in URL
    found_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in full_url]
    if found_keywords:
        keyword_score = min(len(found_keywords) * 8, 25)
        risk_score += keyword_score
        reasons.append(f"Contains suspicious keywords: {', '.join(found_keywords)} — common in phishing URLs")

    # Check 8: @ symbol in URL
    if '@' in url_string:
        risk_score += 25
        reasons.append('Contains "@" symbol — can redirect to a different domain than displayed')

    # Check 9: Data URI
    if url_string.lower().startswith('data:'):
        risk_score += 40
        reasons.append("Data URI detected — can embed malicious content without a server")

    # Check 10: HTTPS check
    if parsed.scheme == 'http' and 'localhost' not in hostname:
        risk_score += 40
        reasons.append("Uses HTTP instead of HTTPS — connection is not encrypted and insecure")

    # Check 11: Port number in URL
    if parsed.port and parsed.port not in [80, 443]:
        risk_score += 10
        reasons.append(f"Non-standard port (:{parsed.port}) — unusual for legitimate websites")

    # Check 12: Double extension in path
    double_ext_regex = re.compile(r'\.\w{2,4}\.\w{2,4}$')
    if double_ext_regex.search(path):
        risk_score += 20
        reasons.append("Double file extension detected in path — common trick to disguise malware")

    # Check 13: Encoded characters abuse
    encoded_count = len(re.findall(r'%[0-9a-fA-F]{2}', url_string))
    if encoded_count > 5:
        risk_score += 15
        reasons.append(f"Heavy URL encoding ({encoded_count} encoded chars) — may be obfuscating content")

    # Check 14: Hyphen abuse in domain
    hyphens = hostname.count('-') if hostname else 0
    if hyphens > 3:
        risk_score += 15
        reasons.append(f"Excessive hyphens in domain ({hyphens}) — common in phishing domains")

    # Cap score at 100
    risk_score = min(risk_score, 100)

    # Compute confidence based on number of signals
    confidence = min(0.3 + len(reasons) * 0.12, 1.0)

    # Determine category
    category = "safe"
    if risk_score >= 70:
        category = "high_risk"
    elif risk_score >= 40:
        category = "medium_risk"
    elif risk_score >= 20:
        category = "low_risk"

    return {
        "url": url_string,
        "safe": risk_score < 40,
        "riskScore": risk_score,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "category": category,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


async def check_phishtank(url_string: str, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Check URL against PhishTank database with bounded retries.

    Args:
        url_string: URL to check
        api_key: PhishTank API key (optional)

    Returns:
        PhishTank result or None
    """
    import aiohttp

    params = {
        'url': url_string,
        'format': 'json'
    }
    if api_key:
        params['app_key'] = api_key

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://checkurl.phishtank.com/checkurl/',
                    data=params,
                    headers={'User-Agent': 'phishtank/wingineers'},
                    timeout=aiohttp.ClientTimeout(total=5),
                    ssl=True
                ) as response:
                    if response.status != 200:
                        logger.warning(f"PhishTank returned HTTP {response.status} (attempt {attempt + 1}/{max_retries + 1})")
                        if attempt < max_retries:
                            await asyncio.sleep(1 * (2 ** attempt))
                            continue
                        return None

                    data = await response.json()
                    return {
                        "inDatabase": data.get('results', {}).get('in_database') in [True, 'true'],
                        "isPhish": data.get('results', {}).get('valid') in [True, 'y'],
                        "phishDetailUrl": data.get('results', {}).get('phish_detail_page')
                    }
        except asyncio.TimeoutError:
            logger.warning(f"PhishTank request timed out (attempt {attempt + 1}/{max_retries + 1})")
        except Exception as e:
            logger.warning(f"PhishTank lookup failed: {e} (attempt {attempt + 1}/{max_retries + 1})")

        if attempt < max_retries:
            await asyncio.sleep(1 * (2 ** attempt))

    logger.warning("PhishTank lookup exhausted all retries")
    return None


async def full_analysis(url_string: str, phish_tank_api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Full analysis: rule-based + PhishTank
    """
    result = analyze_url(url_string)

    # Run PhishTank check if API key is available
    phish_tank_result = await check_phishtank(url_string, phish_tank_api_key)

    if phish_tank_result:
        result["phishTank"] = phish_tank_result
        result["external_checks_failed"] = False

        if phish_tank_result["isPhish"]:
            result["safe"] = False
            result["riskScore"] = max(result["riskScore"], 90)
            result["confidence"] = max(result["confidence"], 0.95)
            result["reasons"].append("⚠️ Confirmed phishing URL in PhishTank database")
            result["category"] = "high_risk"
        elif phish_tank_result["inDatabase"] and not phish_tank_result["isPhish"]:
            # In database but not confirmed as phish — lower risk slightly
            if result["riskScore"] > 20:
                result["riskScore"] = max(result["riskScore"] - 10, 0)
    else:
        # PhishTank lookup failed — flag degraded analysis
        result["external_checks_failed"] = True
        result["reasons"].append(
            "External threat intelligence (PhishTank) was unavailable — "
            "result is based on rule-based analysis only"
        )
        # Apply confidence penalty: we are less certain without external validation
        result["confidence"] = round(min(result["confidence"], 0.7), 2)

    return result
