"""
Prompt Injection Detection Engine

Rule-based + pattern matching analyzer that detects prompt injection attacks,
classifies them by severity, and explains why each pattern is dangerous.

Categories:
  - role_manipulation: Attempts to override system instructions
  - information_extraction: Tries to leak system prompts or internal data
  - jailbreaking: Bypasses safety filters or ethical guidelines
  - encoding_tricks: Uses obfuscation to hide malicious payloads
  - command_injection: Embeds code, SQL, or shell commands
"""

import re
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── Pattern Definitions ──

INJECTION_PATTERNS = [
    # ─── Role Manipulation ───
    {
        "name": "ignore_previous_instructions",
        "category": "role_manipulation",
        "severity": 9,
        "pattern": r"ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions|rules|guidelines|directives|constraints)",
        "explanation": "Attempts to override all prior system-level instructions, which could allow the attacker to redefine the model's behavior entirely.",
    },
    {
        "name": "disregard_instructions",
        "category": "role_manipulation",
        "severity": 8,
        "pattern": r"(disregard|forget|bypass|override|skip)\s+(all\s+)?(your|the|any)?\s*(instructions|rules|guidelines|constraints|restrictions)",
        "explanation": "Tries to make the model disregard its safety guidelines, opening the door to unrestricted and potentially harmful outputs.",
    },
    {
        "name": "you_are_now",
        "category": "role_manipulation",
        "severity": 8,
        "pattern": r"you\s+are\s+now\s+(a|an|the|my)?\s*\w+",
        "explanation": "Redefines the assistant's identity, attempting to bypass role-specific safety constraints by assigning a new persona.",
    },
    {
        "name": "act_as_persona",
        "category": "role_manipulation",
        "severity": 7,
        "pattern": r"(act|behave|pretend|respond|function)\s+(as|like)\s+(a|an|the|if you were)?\s*\w+",
        "explanation": "Instructs the model to assume a different role, which can be used to circumvent safety measures tied to its original persona.",
    },
    {
        "name": "new_instructions",
        "category": "role_manipulation",
        "severity": 8,
        "pattern": r"(your\s+)?new\s+(instructions|rules|directives|guidelines)\s+(are|is|will\s+be)",
        "explanation": "Directly replaces the model's operating instructions with attacker-defined rules.",
    },
    {
        "name": "from_now_on",
        "category": "role_manipulation",
        "severity": 7,
        "pattern": r"from\s+now\s+on\s*,?\s*(you|always|never|do\s+not)",
        "explanation": "Sets persistent behavioral overrides that apply to all subsequent responses, effectively hijacking the session.",
    },
    {
        "name": "system_prompt_override",
        "category": "role_manipulation",
        "severity": 10,
        "pattern": r"\[?\s*system\s*\]?\s*:?\s*(you\s+are|your\s+role|instructions|prompt)",
        "explanation": "Mimics system-level prompt formatting to inject instructions that appear to come from the system itself — a critical escalation vector.",
    },

    # ─── Information Extraction ───
    {
        "name": "reveal_system_prompt",
        "category": "information_extraction",
        "severity": 9,
        "pattern": r"(reveal|show|display|print|output|repeat|tell\s+me)\s+(your|the)\s+(system\s+)?(prompt|instructions|rules|guidelines|configuration|setup)",
        "explanation": "Attempts to extract the hidden system prompt, which could expose confidential business logic, API keys, or safety constraints.",
    },
    {
        "name": "what_are_your_instructions",
        "category": "information_extraction",
        "severity": 8,
        "pattern": r"what\s+(are|is|were)\s+(your|the)\s+(instructions|rules|system\s+prompt|guidelines|original\s+prompt|initial\s+prompt)",
        "explanation": "Directly asks for the model's operating instructions, attempting to reverse-engineer proprietary configuration.",
    },
    {
        "name": "repeat_above",
        "category": "information_extraction",
        "severity": 7,
        "pattern": r"(repeat|echo|recite|copy)\s+(everything|all|the\s+text)?\s*(above|before|prior|preceding|back\s+to\s+me)",
        "explanation": "Uses the model's verbatim repetition capability to leak system prompt content that precedes the user message.",
    },
    {
        "name": "begin_with_prefix",
        "category": "information_extraction",
        "severity": 6,
        "pattern": r"(begin|start)\s+(your\s+)?(response|answer|reply|output)\s+with\s+[\"'].+[\"']",
        "explanation": "Forces a specific output prefix, which can be used to steer the model into revealing information or generating harmful content.",
    },
    {
        "name": "leak_training_data",
        "category": "information_extraction",
        "severity": 8,
        "pattern": r"(show|tell|give|reveal|list)\s+(me\s+)?(your|the)\s+(training\s+data|dataset|knowledge\s+base|source\s+code|api\s+keys?|credentials|secrets|passwords?)",
        "explanation": "Tries to extract sensitive backend information like training data, API keys, or credentials.",
    },

    # ─── Jailbreaking ───
    {
        "name": "dan_mode",
        "category": "jailbreaking",
        "severity": 10,
        "pattern": r"\b(DAN|do\s+anything\s+now)\b",
        "explanation": "Invokes the well-known 'DAN' (Do Anything Now) jailbreak, one of the most common techniques to remove all safety restrictions.",
    },
    {
        "name": "developer_mode",
        "category": "jailbreaking",
        "severity": 9,
        "pattern": r"(developer|dev|debug|maintenance|admin|god)\s+(mode|access|privileges|override)",
        "explanation": "Attempts to activate a fictional privileged mode that would bypass safety checks and content filters.",
    },
    {
        "name": "no_restrictions",
        "category": "jailbreaking",
        "severity": 8,
        "pattern": r"(without|no|remove|disable|turn\s+off)\s+(any\s+)?(restrictions|filters|limitations|safety|guardrails|censorship|moderation|constraints)",
        "explanation": "Explicitly asks the model to disable its safety mechanisms, which would allow generation of harmful or prohibited content.",
    },
    {
        "name": "pretend_no_rules",
        "category": "jailbreaking",
        "severity": 8,
        "pattern": r"(pretend|imagine|assume|suppose|let\'?s\s+say)\s+(that\s+)?(there\s+are\s+)?(no|you\s+have\s+no|you\s+don\'?t\s+have)\s+(rules|restrictions|guidelines|limits|ethics)",
        "explanation": "Uses hypothetical framing to trick the model into operating as if no rules apply — a common evasion technique.",
    },
    {
        "name": "hypothetical_bypass",
        "category": "jailbreaking",
        "severity": 7,
        "pattern": r"(hypothetically|theoretically|in\s+theory|for\s+(educational|research|academic)\s+purposes?\s*,?)\s+(how\s+(would|could|can)|what\s+(would|could))",
        "explanation": "Wraps harmful requests in academic or hypothetical framing to bypass content filters while still obtaining dangerous information.",
    },
    {
        "name": "opposite_day",
        "category": "jailbreaking",
        "severity": 6,
        "pattern": r"(opposite\s+day|opposite\s+mode|reverse\s+mode|do\s+the\s+opposite)",
        "explanation": "Asks the model to invert its safety behavior — saying 'yes' when it should say 'no' and vice versa.",
    },
    {
        "name": "evil_twin",
        "category": "jailbreaking",
        "severity": 8,
        "pattern": r"(evil|dark|shadow|uncensored|unfiltered|unrestricted|unethical)\s+(version|twin|mode|persona|variant|self|AI|assistant|bot)",
        "explanation": "Asks the model to roleplay as an uncensored alter ego without safety constraints.",
    },

    # ─── Encoding Tricks ───
    {
        "name": "base64_payload",
        "category": "encoding_tricks",
        "severity": 7,
        "pattern": r"(base64|b64|decode|encode)\s*[\(:\s]|[A-Za-z0-9+/]{20,}={0,2}",
        "explanation": "Contains Base64-encoded content that may hide malicious instructions. Encoding is a common technique to evade keyword-based filters.",
    },
    {
        "name": "unicode_obfuscation",
        "category": "encoding_tricks",
        "severity": 6,
        "pattern": r"[\\]u[0-9a-fA-F]{4}|&#x?[0-9a-fA-F]+;|%[0-9a-fA-F]{2}",
        "explanation": "Uses Unicode escape sequences, HTML entities, or URL encoding to obfuscate malicious keywords from detection systems.",
    },
    {
        "name": "zero_width_chars",
        "category": "encoding_tricks",
        "severity": 7,
        "pattern": r"[\u200b\u200c\u200d\u2060\ufeff]",
        "explanation": "Contains invisible zero-width characters that can hide injected instructions within seemingly normal text.",
    },
    {
        "name": "markdown_injection",
        "category": "encoding_tricks",
        "severity": 5,
        "pattern": r"\!\[.*\]\(https?://|<script|<img\s+[^>]*onerror|javascript:",
        "explanation": "Embeds markdown image tags, script tags, or event handlers that could exfiltrate data or execute code in rendering contexts.",
    },
    {
        "name": "token_smuggling",
        "category": "encoding_tricks",
        "severity": 7,
        "pattern": r"(split|separate|spell\s+out|write\s+each)\s+(this|the)?\s*(word|letter|character|token)\s*(by\s+|one\s+)",
        "explanation": "Asks the model to process text character-by-character to reassemble forbidden words that would be blocked in normal context.",
    },

    # ─── Command Injection ───
    {
        "name": "sql_injection",
        "category": "command_injection",
        "severity": 8,
        "pattern": r"('?\s*(OR|AND)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+|DROP\s+TABLE|SELECT\s+\*\s+FROM|UNION\s+SELECT|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+\w+\s+SET)",
        "explanation": "Contains SQL injection syntax that targets backend databases. Even in AI contexts, this may indicate broader attack chain intent.",
    },
    {
        "name": "shell_injection",
        "category": "command_injection",
        "severity": 9,
        "pattern": r"(;\s*|&&\s*|\|\|\s*|\|\s*)(rm\s|cat\s|ls\s|pwd|chmod|chown|wget\s|curl\s|sudo\s|sh\s|bash\s|python[3]?\s|exec\s|eval\s)",
        "explanation": "Contains shell command sequences that attempt to execute system commands, posing a severe risk in environments where model output is executed.",
    },
    {
        "name": "code_execution",
        "category": "command_injection",
        "severity": 8,
        "pattern": r"(exec|eval|subprocess|os\.system|import\s+os|__import__|compile)\s*\(",
        "explanation": "Contains Python code execution functions that could be exploited if model output is passed to an interpreter.",
    },
    {
        "name": "path_traversal",
        "category": "command_injection",
        "severity": 7,
        "pattern": r"(\.\./|\.\.\\|/etc/passwd|/etc/shadow|C:\\Windows|%SYSTEMROOT%|%APPDATA%)",
        "explanation": "Contains path traversal sequences attempting to access sensitive system files outside the intended directory scope.",
    },
    {
        "name": "xml_injection",
        "category": "command_injection",
        "severity": 6,
        "pattern": r"(<\?xml|<!DOCTYPE|<!ENTITY|SYSTEM\s+[\"']file://)",
        "explanation": "Contains XML/XXE injection payloads that could be used for server-side file reading or SSRF attacks in XML-processing pipelines.",
    },

    # ─── Broader Role Manipulation ───
    {
        "name": "forget_identity",
        "category": "role_manipulation",
        "severity": 8,
        "pattern": r"(forget|stop\s+being|quit\s+being|cease\s+being|you\s+are\s+not)\s+(you\s+are|that\s+you\s+are|you\'?re)?\s*(an?\s+)?(ai|assistant|chatbot|bot|language\s+model|helpful|safe)",
        "explanation": "Attempts to make the AI deny or forget its own identity, which undermines core safety behaviors tied to self-awareness.",
    },
    {
        "name": "forget_and_do",
        "category": "role_manipulation",
        "severity": 8,
        "pattern": r"forget\s+(everything|all|what|that|who|your)",
        "explanation": "Instructs the model to forget its prior context, training, or identity — a precursor to redefining its behavior.",
    },
    {
        "name": "you_are_in_mode",
        "category": "jailbreaking",
        "severity": 8,
        "pattern": r"you\s+are\s+in\s+(\w+\s+)?(mode|state|phase|scenario)",
        "explanation": "Declares the model is in a special operational mode to bypass safety, e.g., 'revenge mode', 'testing mode', 'override mode'.",
    },
    {
        "name": "malicious_mode",
        "category": "jailbreaking",
        "severity": 9,
        "pattern": r"(revenge|attack|hack|destroy|chaos|rampage|kill|override|bypass|exploit|malicious|dangerous)\s+(mode|state|phase)",
        "explanation": "Invokes a harmful or destructive operational mode designed to override all ethical safeguards.",
    },
    {
        "name": "enter_mode",
        "category": "jailbreaking",
        "severity": 7,
        "pattern": r"(enter|activate|enable|switch\s+to|go\s+into|turn\s+on)\s+(\w+\s+)?(mode|state|protocol)",
        "explanation": "Attempts to switch the AI into a different operating mode, potentially bypassing safety constraints.",
    },

    # ─── Broader Information Extraction ───
    {
        "name": "leak_secrets_broad",
        "category": "information_extraction",
        "severity": 9,
        "pattern": r"(reveal|leak|expose|share|spill|disclose|dump|extract|exfiltrate|give\s+me|hand\s+over|show)\s+(\w+\s+)?(secrets?|confidential|classified|private|internal|sensitive|proprietary)",
        "explanation": "Attempts to extract confidential, classified, or proprietary information by directly requesting secret or sensitive data.",
    },
    {
        "name": "leaking_sensitive_data",
        "category": "information_extraction",
        "severity": 9,
        "pattern": r"(leaking|stealing|extracting|exfiltrating|dumping|exposing|sharing)\s+(\w+\s+)?(data|files?|info|information|documents?|records?|credentials?|passwords?|keys?)",
        "explanation": "Describes active data exfiltration — leaking, stealing, or extracting sensitive files, documents, or credentials.",
    },
    {
        "name": "access_sensitive_files",
        "category": "information_extraction",
        "severity": 8,
        "pattern": r"(access|read|open|view|get|retrieve|download)\s+(\w+\s+)?(sensitive|confidential|private|restricted|internal|secret|classified|hidden)\s+(\w+\s+)?(files?|data|documents?|records?|info)",
        "explanation": "Requests access to sensitive, confidential, or restricted files and documents.",
    },
    {
        "name": "company_secrets",
        "category": "information_extraction",
        "severity": 9,
        "pattern": r"(company|corporate|business|organization|enterprise|employer|firm)\s+(secrets?|data|files?|info|documents?|records?|credentials?)",
        "explanation": "Directly targets company or organizational secrets, data, or documents — a clear data exfiltration attempt.",
    },

    # ─── Destructive Commands ───
    {
        "name": "destructive_file_ops",
        "category": "command_injection",
        "severity": 9,
        "pattern": r"(delete|remove|erase|wipe|destroy|format|shred|corrupt|nuke)\s+(\w+\s+)?(files?|folders?|directories?|data|database|system|disk|drive|os|everything|all)",
        "explanation": "Instructs destructive operations on files, folders, databases, or the entire operating system — extremely dangerous if the model's output is executed.",
    },
    {
        "name": "destroy_system",
        "category": "command_injection",
        "severity": 10,
        "pattern": r"(destroy|crash|break|damage|sabotage|disable|shut\s*down|brick|kill)\s+(\w+\s+)?(system|server|machine|computer|laptop|device|network|infrastructure|os|operating\s+system)",
        "explanation": "Attempts to cause physical or logical destruction to system infrastructure, devices, or networks.",
    },
    {
        "name": "ransomware_behavior",
        "category": "command_injection",
        "severity": 10,
        "pattern": r"(encrypt|lock|ransom|hold\s+hostage)\s+(\w+\s+)?(files?|data|system|computer|documents?)",
        "explanation": "Describes ransomware behavior — encrypting or locking files and systems to hold them hostage.",
    },
    {
        "name": "malware_actions",
        "category": "command_injection",
        "severity": 9,
        "pattern": r"(install|deploy|inject|upload|execute|run)\s+(\w+\s+)?(malware|virus|trojan|worm|ransomware|keylogger|backdoor|rootkit|spyware|payload)",
        "explanation": "Instructs the deployment or installation of malware, viruses, or other malicious software.",
    },

    # ─── Social Engineering / Manipulation ───
    {
        "name": "override_safety",
        "category": "jailbreaking",
        "severity": 8,
        "pattern": r"(ignore|bypass|disable|override|circumvent|skip|break)\s+(\w+\s+)?(safety|security|protection|ethical|moral|content)\s*(rules?|filters?|checks?|measures?|guidelines?|protocols?|policies?|restrictions?|controls?)?",
        "explanation": "Directly instructs bypassing safety, security, or ethical controls — a core jailbreaking technique.",
    },
    {
        "name": "do_anything",
        "category": "jailbreaking",
        "severity": 7,
        "pattern": r"(you\s+can|you\s+must|you\s+should|you\s+will|you\s+have\s+to)\s+(now\s+)?(do\s+anything|say\s+anything|answer\s+anything|generate\s+anything|respond\s+to\s+anything)",
        "explanation": "Forces the model to accept that it can do or say anything without restrictions, a common jailbreaking preamble.",
    },
    {
        "name": "no_rules_apply",
        "category": "jailbreaking",
        "severity": 8,
        "pattern": r"(no\s+rules?|rules?\s+don.?t|rules?\s+do\s+not|laws?\s+don.?t|nothing\s+is\s+off)\s+(apply|exist|matter|limit|restrict|stop|hold|count)",
        "explanation": "Declares that no rules apply to override all behavioral constraints in the current session.",
    },
]


# ── Category metadata ──

CATEGORY_INFO = {
    "role_manipulation": {
        "label": "Role Manipulation",
        "description": "Attempts to override the AI's system instructions or persona",
        "icon": "🎭",
    },
    "information_extraction": {
        "label": "Information Extraction",
        "description": "Tries to leak system prompts, training data, or internal secrets",
        "icon": "🔓",
    },
    "jailbreaking": {
        "label": "Jailbreaking",
        "description": "Bypasses safety filters, ethical guidelines, or content restrictions",
        "icon": "⛓️‍💥",
    },
    "encoding_tricks": {
        "label": "Encoding Tricks",
        "description": "Uses obfuscation techniques to hide malicious payloads",
        "icon": "🔐",
    },
    "command_injection": {
        "label": "Command Injection",
        "description": "Embeds code, SQL, or shell commands targeting backend systems",
        "icon": "💉",
    },
}


def _score_to_classification(score: int) -> str:
    """Map numeric risk score to human-readable classification."""
    if score >= 80:
        return "critical"
    elif score >= 55:
        return "dangerous"
    elif score >= 25:
        return "suspicious"
    return "safe"


def analyze_prompt(text: str) -> dict:
    """
    Analyze a text prompt for injection patterns.

    Args:
        text: The prompt text to analyze.

    Returns:
        dict with keys:
          - prompt (str): original input
          - is_injection (bool)
          - risk_score (int, 0-100)
          - classification (str): safe | suspicious | dangerous | critical
          - matched_patterns (list[dict]): each with name, category, severity, explanation
          - categories_hit (list[str]): unique categories matched
          - summary (str): one-line human summary
          - timestamp (str)
    """
    if not text or not text.strip():
        return {
            "prompt": text or "",
            "is_injection": False,
            "risk_score": 0,
            "classification": "safe",
            "matched_patterns": [],
            "categories_hit": [],
            "summary": "Empty prompt — nothing to analyze.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    matched = []
    for rule in INJECTION_PATTERNS:
        try:
            if re.search(rule["pattern"], text, re.IGNORECASE | re.DOTALL):
                matched.append({
                    "name": rule["name"],
                    "category": rule["category"],
                    "category_label": CATEGORY_INFO.get(rule["category"], {}).get("label", rule["category"]),
                    "severity": rule["severity"],
                    "explanation": rule["explanation"],
                })
        except re.error as e:
            logger.warning(f"Regex error in pattern '{rule['name']}': {e}")

    # Compute risk score
    if not matched:
        risk_score = 0
    else:
        # Take the highest severity, then add diminishing contributions from others
        severities = sorted([m["severity"] for m in matched], reverse=True)
        raw = severities[0] * 10  # primary: 0–100
        for s in severities[1:]:
            raw += s * 1.5  # secondary patterns add incremental risk
        risk_score = min(100, int(raw))

    # Unique categories
    categories_hit = list({m["category"] for m in matched})

    classification = _score_to_classification(risk_score)
    is_injection = risk_score >= 25

    # Build summary
    if not matched:
        summary = "No prompt injection patterns detected. The input appears safe."
    elif len(matched) == 1:
        summary = f"Detected 1 injection pattern ({matched[0]['category_label']}). {classification.upper()} risk."
    else:
        summary = f"Detected {len(matched)} injection patterns across {len(categories_hit)} categories. {classification.upper()} risk."

    return {
        "prompt": text,
        "is_injection": is_injection,
        "risk_score": risk_score,
        "classification": classification,
        "matched_patterns": matched,
        "categories_hit": categories_hit,
        "summary": summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
