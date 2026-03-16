import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fullAnalysis, analyzeUrl } from './urlAnalyzer.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── File-based threat store ──
const THREATS_FILE = path.join(process.cwd(), 'threats.json');
let threats = [];
let threatIdCounter = 1;

try {
  if (fs.existsSync(THREATS_FILE)) {
    threats = JSON.parse(fs.readFileSync(THREATS_FILE, 'utf-8'));
    if (threats.length > 0) {
      threatIdCounter = Math.max(...threats.map(t => t.id || 0)) + 1;
    }
  }
} catch (e) {
  console.error('Failed to load threats:', e);
}

function saveThreats() {
  try {
    fs.writeFileSync(THREATS_FILE, JSON.stringify(threats, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save threats:', e);
  }
}

// ── Routes ──

/**
 * POST /api/analyze-url
 * Analyze a URL for phishing indicators
 * Body: { url: string }
 * Returns: { id, url, safe, riskScore, confidence, reasons, category, timestamp }
 */
app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const phishTankKey = process.env.PHISHTANK_API_KEY || '';
    const result = await fullAnalysis(url, phishTankKey);

    // Store threat if not safe
    if (!result.safe) {
      const threat = {
        id: threatIdCounter++,
        ...result
      };
      threats.unshift(threat); // newest first

      // Keep only last 500 threats in memory
      if (threats.length > 500) threats.length = 500;
      saveThreats();

      return res.json(threat);
    }

    return res.json({ id: null, ...result });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Internal server error during analysis' });
  }
});

/**
 * GET /api/threats
 * Get all stored threats (newest first)
 * Query params: ?limit=50&offset=0&category=high_risk
 */
app.get('/api/threats', (req, res) => {
  try {
    let filtered = [...threats];
    const { limit = 50, offset = 0, category, search } = req.query;

    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }

    // Search by URL
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => t.url.toLowerCase().includes(searchLower));
    }

    const total = filtered.length;
    const paged = filtered.slice(Number(offset), Number(offset) + Number(limit));

    // Stats
    const stats = {
      total: threats.length,
      highRisk: threats.filter(t => t.category === 'high_risk').length,
      mediumRisk: threats.filter(t => t.category === 'medium_risk').length,
      lowRisk: threats.filter(t => t.category === 'low_risk').length,
      today: threats.filter(t => {
        const d = new Date(t.timestamp);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length
    };

    res.json({ threats: paged, total, stats });
  } catch (err) {
    console.error('Threats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch threats' });
  }
});

/**
 * GET /api/threats/:id
 * Get a single threat by ID
 */
app.get('/api/threats/:id', (req, res) => {
  const id = Number(req.params.id);
  const threat = threats.find(t => t.id === id);

  if (!threat) {
    return res.status(404).json({ error: 'Threat not found' });
  }

  res.json(threat);
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    threatsTracked: threats.length,
    timestamp: new Date().toISOString()
  });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n🛡️  Phishing Detection API running on http://localhost:${PORT}`);
  console.log(`   POST /api/analyze-url   — Analyze a URL`);
  console.log(`   GET  /api/threats        — List detected threats`);
  console.log(`   GET  /api/threats/:id    — Get threat details`);
  console.log(`   GET  /api/health         — Health check\n`);
});
