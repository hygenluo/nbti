import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertResult, getStats } from './db.js';
import { computeScores, matchResult, isValidAnswers } from './public/data/scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/submit', (req, res) => {
  try {
    const answers = req.body?.answers;
    if (!isValidAnswers(answers)) {
      return res.status(400).json({ ok: false, error: 'invalid answers' });
    }
    const scores = computeScores(answers);
    const result = matchResult(scores);
    insertResult({
      label: result.label,
      labelCn: result.name,
      title: result.tagline,
      keywords: result.keywords,
      scores,
      answers,
    });
    res.json({ ok: true, label: result.label });
  } catch (e) {
    console.error('submit failed:', e);
    res.status(500).json({ ok: false });
  }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/stats', (_req, res) => {
  try {
    res.json({ ok: true, ...getStats() });
  } catch (e) {
    console.error('stats failed:', e);
    res.status(500).json({ ok: false });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`NBTI test running → http://localhost:${port}`));
