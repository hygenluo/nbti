import { QUESTIONS, DIRECTIONS } from './questions.js';
import { RESULTS } from './results.js';

export const ALL_DIMS = Object.values(DIRECTIONS).flat();

export function emptyScores() {
  const s = {};
  for (const d of ALL_DIMS) s[d] = 0;
  return s;
}

// answers: 长度为 20 的数组，元素为选项下标 0/1/2
export function computeScores(answers) {
  const scores = emptyScores();
  answers.forEach((choice, i) => {
    const opt = QUESTIONS[i]?.options?.[choice];
    if (!opt) return;
    for (const [dim, pts] of Object.entries(opt.scores)) {
      scores[dim] = (scores[dim] || 0) + pts;
    }
  });
  return scores;
}

export function topDims(scores, n = 5) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, n);
}

// 每个维度的理论最高分（用于归一化，避免高覆盖维度天然占优）
export const MAX_SCORES = (() => {
  const max = emptyScores();
  for (const q of QUESTIONS) {
    for (const dim of ALL_DIMS) {
      max[dim] += Math.max(0, ...q.options.map((o) => o.scores[dim] || 0));
    }
  }
  return max;
})();

// 归一化到 0~1，让各维度在匹配时权重可比
function normalize(scores) {
  const n = {};
  for (const dim of ALL_DIMS) n[dim] = MAX_SCORES[dim] ? (scores[dim] || 0) / MAX_SCORES[dim] : 0;
  return n;
}

// 按各标签的维度画像加权匹配，得分最高者胜出
export function matchResult(scores) {
  const n = normalize(scores);
  let best = null;
  let bestVal = -Infinity;
  for (const r of RESULTS) {
    let v = 0;
    for (const [dim, w] of Object.entries(r.dims)) v += n[dim] * w;
    if (v > bestVal) {
      bestVal = v;
      best = r;
    }
  }
  return best;
}

export function isValidAnswers(answers) {
  return (
    Array.isArray(answers) &&
    answers.length === QUESTIONS.length &&
    answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 2)
  );
}
