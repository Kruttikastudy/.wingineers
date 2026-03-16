/**
 * URL Phishing Analyzer
 * Rule-based phishing detection with optional PhishTank API integration.
 * Computes a risk score (0-100) and confidence (0-1) with detailed reasons.
 */

// ── Known suspicious TLDs frequently used in phishing ──
const SUSPICIOUS_TLDS = new Set([
  '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club',
  '.work', '.date', '.racing', '.download', '.win', '.bid',
  '.stream', '.trade', '.webcam', '.loan', '.party', '.click',
  '.link', '.info', '.zip', '.mov', '.php'
]);

// ── URL shortener domains ──
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd',
  'buff.ly', 'j.mp', 'rb.gy', 'shorturl.at', 'tiny.cc', 'cutt.ly',
  's.id', 'v.gd', 'clck.ru', 'qr.ae'
]);

// ── Suspicious keywords commonly found in phishing URLs ──
const SUSPICIOUS_KEYWORDS = [
  'login', 'verify', 'account', 'secure', 'update', 'banking',
  'signin', 'confirm', 'password', 'credential', 'authenticate',
  'wallet', 'suspend', 'restrict', 'unlock', 'alert', 'notification',
  'paypal', 'appleid', 'microsoft', 'amazon', 'netflix', 'facebook',
  'instagram', 'wellsfargo', 'chase', 'citi'
];

// ── Well-known legitimate domains (whitelist) ──
const TRUSTED_DOMAINS = new Set([
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
]);

// ── Homoglyph characters (look-alikes used to spoof domains) ──
const HOMOGLYPHS = /[а-яА-ЯёЁ\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]/;

/**
 * Analyze a URL for phishing indicators
 * @param {string} urlString - The URL to analyze
 * @returns {object} Analysis result with safe, riskScore, confidence, reasons
 */
export function analyzeUrl(urlString) {
  const reasons = [];
  let riskScore = 0;

  // ── Basic validation ──
  if (!urlString || typeof urlString !== 'string') {
    return {
      url: urlString,
      safe: false,
      riskScore: 100,
      confidence: 1.0,
      reasons: ['Invalid or empty URL'],
      category: 'invalid',
      timestamp: new Date().toISOString()
    };
  }

  let parsed;
  try {
    // Handle URLs without protocol
    const urlWithProtocol = urlString.match(/^https?:\/\//) ? urlString : `http://${urlString}`;
    parsed = new URL(urlWithProtocol);
  } catch {
    return {
      url: urlString,
      safe: false,
      riskScore: 80,
      confidence: 0.9,
      reasons: ['Malformed URL that cannot be parsed'],
      category: 'malformed',
      timestamp: new Date().toISOString()
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const fullUrl = parsed.href.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  // ── Whitelist check ──
  if (TRUSTED_DOMAINS.has(hostname)) {
    return {
      url: urlString,
      safe: true,
      riskScore: 0,
      confidence: 0.95,
      reasons: [],
      category: 'trusted',
      timestamp: new Date().toISOString()
    };
  }

  // ── Check 1: IP address instead of domain ──
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    riskScore += 30;
    reasons.push('URL uses an IP address instead of a domain name — common in phishing');
  }

  // ── Check 2: Suspicious TLD ──
  const tld = '.' + hostname.split('.').pop();
  if (SUSPICIOUS_TLDS.has(tld)) {
    riskScore += 20;
    reasons.push(`Uses suspicious top-level domain "${tld}" — frequently abused for phishing`);
  }

  // ── Check 3: Excessive subdomains ──
  const subdomainCount = hostname.split('.').length - 2;
  if (subdomainCount > 2) {
    riskScore += 15;
    reasons.push(`Excessive subdomains (${subdomainCount + 2} levels) — used to disguise real domain`);
  }

  // ── Check 4: URL shortener ──
  if (URL_SHORTENERS.has(hostname)) {
    riskScore += 25;
    reasons.push('URL shortener detected — hides the actual destination, often used in phishing');
  }

  // ── Check 5: Homoglyph / IDN characters ──
  if (HOMOGLYPHS.test(urlString)) {
    riskScore += 35;
    reasons.push('Contains homoglyph/Cyrillic characters — used to impersonate legitimate domains');
  }

  // ── Check 6: Very long URL ──
  if (urlString.length > 100) {
    riskScore += 10;
    reasons.push(`Unusually long URL (${urlString.length} characters) — may be hiding malicious content`);
  }

  // ── Check 7: Suspicious keywords in URL ──
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter(kw => fullUrl.includes(kw));
  if (foundKeywords.length > 0) {
    const keywordScore = Math.min(foundKeywords.length * 8, 25);
    riskScore += keywordScore;
    reasons.push(`Contains suspicious keywords: ${foundKeywords.join(', ')} — common in phishing URLs`);
  }

  // ── Check 8: @ symbol in URL ──
  if (urlString.includes('@')) {
    riskScore += 25;
    reasons.push('Contains "@" symbol — can redirect to a different domain than displayed');
  }

  // ── Check 9: Data URI ──
  if (urlString.toLowerCase().startsWith('data:')) {
    riskScore += 40;
    reasons.push('Data URI detected — can embed malicious content without a server');
  }

  // ── Check 10: HTTPS check ──
  if (parsed.protocol === 'http:' && !hostname.includes('localhost')) {
    riskScore += 40;
    reasons.push('Uses HTTP instead of HTTPS — connection is not encrypted and insecure');
  }

  // ── Check 11: Port number in URL ──
  if (parsed.port && !['80', '443', ''].includes(parsed.port)) {
    riskScore += 10;
    reasons.push(`Non-standard port (:${parsed.port}) — unusual for legitimate websites`);
  }

  // ── Check 12: Double extension in path (e.g., .pdf.exe) ──
  const doubleExtRegex = /\.\w{2,4}\.\w{2,4}$/;
  if (doubleExtRegex.test(path)) {
    riskScore += 20;
    reasons.push('Double file extension detected in path — common trick to disguise malware');
  }

  // ── Check 13: Encoded characters abuse ──
  const encodedCount = (urlString.match(/%[0-9a-fA-F]{2}/g) || []).length;
  if (encodedCount > 5) {
    riskScore += 15;
    reasons.push(`Heavy URL encoding (${encodedCount} encoded chars) — may be obfuscating content`);
  }

  // ── Check 14: Hyphen abuse in domain ──
  const hyphens = (hostname.match(/-/g) || []).length;
  if (hyphens > 3) {
    riskScore += 15;
    reasons.push(`Excessive hyphens in domain (${hyphens}) — common in phishing domains`);
  }

  // Cap score at 100
  riskScore = Math.min(riskScore, 100);

  // Compute confidence based on number of signals
  const confidence = Math.min(0.3 + reasons.length * 0.12, 1.0);

  // Determine category
  let category = 'safe';
  if (riskScore >= 70) category = 'high_risk';
  else if (riskScore >= 40) category = 'medium_risk';
  else if (riskScore >= 20) category = 'low_risk';

  return {
    url: urlString,
    safe: riskScore < 40,
    riskScore,
    confidence: parseFloat(confidence.toFixed(2)),
    reasons,
    category,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check URL against PhishTank database
 * @param {string} urlString - URL to check
 * @param {string} apiKey - PhishTank API key
 * @returns {object|null} PhishTank result or null
 */
export async function checkPhishTank(urlString, apiKey) {
  // We can still allow requests without an API key, it will just be rate-limited according to PhishTank docs
  try {
    const params = new URLSearchParams();
    params.append('url', urlString);
    params.append('format', 'json');
    if (apiKey) {
      params.append('app_key', apiKey);
    }

    const response = await fetch('http://checkurl.staging.phishtank.com/checkurl/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'phishtank/wingineers' // Using a descriptive user agent as requested by their docs
      },
      body: params.toString(),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      inDatabase: data.results?.in_database === true || data.results?.in_database === 'true',
      isPhish: data.results?.valid === true || data.results?.valid === 'y',
      phishDetailUrl: data.results?.phish_detail_page || null
    };
  } catch (err) {
    console.error('PhishTank lookup failed:', err.message);
    return null;
  }
}

/**
 * Full analysis: rule-based + PhishTank
 */
export async function fullAnalysis(urlString, phishTankApiKey) {
  const ruleResult = analyzeUrl(urlString);

  // Run PhishTank check if API key is available
  const phishTankResult = await checkPhishTank(urlString, phishTankApiKey);

  if (phishTankResult) {
    ruleResult.phishTank = phishTankResult;

    if (phishTankResult.isPhish) {
      ruleResult.safe = false;
      ruleResult.riskScore = Math.max(ruleResult.riskScore, 90);
      ruleResult.confidence = Math.max(ruleResult.confidence, 0.95);
      ruleResult.reasons.push('⚠️ Confirmed phishing URL in PhishTank database');
      ruleResult.category = 'high_risk';
    } else if (phishTankResult.inDatabase && !phishTankResult.isPhish) {
      // In database but not confirmed as phish — lower risk slightly
      if (ruleResult.riskScore > 20) {
        ruleResult.riskScore = Math.max(ruleResult.riskScore - 10, 0);
      }
    }
  }

  return ruleResult;
}
