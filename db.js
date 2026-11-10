import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
// DB_PATH 可指向持久卷路径（如 /data/nbti.db），本地默认当前目录
const dbPath = process.env.DB_PATH || path.join(dir, 'nbti.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    label_cn TEXT NOT NULL,
    title TEXT NOT NULL,
    keywords TEXT NOT NULL,
    scores TEXT NOT NULL,
    answers TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO test_results (label, label_cn, title, keywords, scores, answers)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export function insertResult({ label, labelCn, title, keywords, scores, answers }) {
  insertStmt.run(
    label,
    labelCn,
    title,
    JSON.stringify(keywords),
    JSON.stringify(scores),
    JSON.stringify(answers)
  );
}

const totalStmt = db.prepare('SELECT COUNT(*) AS c FROM test_results');
const byLabelStmt = db.prepare(
  'SELECT label, label_cn AS name, COUNT(*) AS count FROM test_results GROUP BY label ORDER BY count DESC'
);

export function getStats() {
  const total = totalStmt.get().c;
  const byLabel = byLabelStmt.all().map((r) => ({
    label: r.label,
    name: r.name,
    count: r.count,
    pct: total ? Math.round((r.count * 1000) / total) / 10 : 0,
  }));
  return { total, byLabel };
}
