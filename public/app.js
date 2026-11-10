import { QUESTIONS } from './data/questions.js';
import { computeScores, matchResult, topDims, ALL_DIMS } from './data/scoring.js';

const $ = (s) => document.querySelector(s);
const LAST = QUESTIONS.length - 1;

const state = {
  index: 0,
  answers: [],
  result: null,
};

/* ---------- 视图切换 ---------- */
function show(id) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${id}`).classList.add('active');
  window.scrollTo({ top: 0 });
}

function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('err', isErr);
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ---------- 测试流程 ---------- */
// 两个入口（首页"开始测试" / 结果页"重新测试"）共用这一个重置函数，保证状态一定清空
function startQuiz() {
  state.index = 0;
  state.answers = new Array(QUESTIONS.length).fill(null);
  state.result = null;
  renderQuestion();
  show('quiz');
}

function renderQuestion() {
  const i = state.index;
  const q = QUESTIONS[i];

  $('#progress-text').textContent = `第 ${i + 1} / ${QUESTIONS.length} 题`;
  $('#progress-fill').style.width = `${((i + 1) / QUESTIONS.length) * 100}%`;

  $('#quiz-text').textContent = q.text;
  $('#options').innerHTML = q.options
    .map(
      (opt, j) => `
      <button class="option ${state.answers[i] === j ? 'selected' : ''}" data-j="${j}">
        <span class="key">${opt.key}</span><span>${opt.text}</span>
      </button>`
    )
    .join('');

  document.querySelectorAll('.option').forEach((btn) =>
    btn.addEventListener('click', () => pickOption(Number(btn.dataset.j)))
  );

  $('#btn-prev').disabled = i === 0;
  // 最后一题选完后不自动提交，必须手动点"生成我的报告"
  const allDone = state.answers.every((a) => a !== null);
  $('#btn-submit').classList.toggle('show', allDone);
}

function pickOption(j) {
  state.answers[state.index] = j;
  if (state.index < LAST) {
    state.index += 1;
    renderQuestion();
  } else {
    renderQuestion(); // 最后一题停在原地，允许改答案，等手动提交
  }
}

function submitQuiz() {
  const scores = computeScores(state.answers);
  const result = matchResult(scores);
  state.result = { ...result, scores };
  renderResult();
  show('result');
  saveResult(); // 先展示结果，再异步保存
}

/* ---------- 结果页 ---------- */
function renderResult() {
  const r = state.result;
  const card = $('#result-card');
  card.style.setProperty('--card-accent', r.color);
  card.style.setProperty('--card-accent-light', r.color + '33');

  // 角色图：优先 PNG（豆包正式图），其次 SVG 占位，都缺失则隐藏图片区保留文字
  const wrap = $('#result-img-wrap');
  const img = $('#result-img');
  wrap.classList.add('hidden');
  img.onload = () => wrap.classList.remove('hidden');
  img.onerror = () => {
    if (img.src.endsWith('.png')) img.src = `${r.image}.svg`;
    else wrap.classList.add('hidden');
  };
  img.src = `${r.image}.png`;

  $('#result-label').textContent = r.label;
  $('#result-name').textContent = r.name;
  $('#result-tagline').textContent = r.tagline;
  $('#result-keywords').innerHTML = r.keywords.map((k) => `<span class="chip">${k}</span>`).join('');
  $('#result-roast').textContent = r.roast;
  $('#result-behaviors').innerHTML = r.behaviors.map((b) => `<li>${b}</li>`).join('');
  $('#result-advice').innerHTML = r.advice.map((a) => `<li>${a}</li>`).join('');

  const top = topDims(r.scores, 6).filter(([, v]) => v > 0);
  const max = Math.max(...ALL_DIMS.map((d) => r.scores[d]), 1);
  $('#result-dims').innerHTML = top
    .map(
      ([dim, val]) => `
      <div class="dim-row">
        <span class="dim-name">${dim}</span>
        <span class="dim-bar"><span class="dim-fill" style="width:${(val / max) * 100}%"></span></span>
        <span class="dim-val">${val}</span>
      </div>`
    )
    .join('');
}

async function saveResult() {
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: state.answers }),
    });
    if (!res.ok) throw new Error('bad status');
    toast('测试结果已保存');
  } catch {
    toast('结果展示成功，但保存记录失败，请稍后再试', true);
  }
}

/* ---------- 统计页 ---------- */
async function showStats() {
  show('stats');
  $('#stats-list').innerHTML = '<div class="stats-empty">加载中……</div>';
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (!data.ok) throw new Error('bad');
    $('#stats-total').textContent = `已有 ${data.total} 人完成测试`;
    if (!data.byLabel.length) {
      $('#stats-list').innerHTML = '<div class="stats-empty">还没有测试记录，来当第一个吧</div>';
      return;
    }
    const max = Math.max(...data.byLabel.map((r) => r.count), 1);
    $('#stats-list').innerHTML = data.byLabel
      .map(
        (r, i) => `
        <div class="stat-row">
          <span class="stat-rank ${i < 3 ? 'top' : ''}">${i + 1}</span>
          <div class="stat-main">
            <div class="stat-names"><span class="stat-label">${r.label}</span><span class="stat-cn">${r.name}</span></div>
            <div class="stat-bar"><div class="stat-fill" style="width:${(r.count / max) * 100}%"></div></div>
          </div>
          <span class="stat-num">${r.count} 人<small>${r.pct}%</small></span>
        </div>`
      )
      .join('');
  } catch {
    $('#stats-list').innerHTML = '<div class="stats-empty">统计数据加载失败，请稍后再试</div>';
  }
}

/* ---------- 事件绑定 ---------- */
$('#btn-start').addEventListener('click', startQuiz);
$('#btn-retry').addEventListener('click', startQuiz);
$('#btn-prev').addEventListener('click', () => {
  if (state.index > 0) {
    state.index -= 1;
    renderQuestion();
  }
});
$('#btn-submit').addEventListener('click', submitQuiz);
$('#btn-stats').addEventListener('click', showStats);
$('#btn-stats2').addEventListener('click', showStats);
$('#btn-back').addEventListener('click', () => show('home'));
