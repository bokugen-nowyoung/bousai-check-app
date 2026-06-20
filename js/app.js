// app.js
// 画面遷移・状態管理・結果描画・localStorage連携

const STORAGE_KEY = "bousai_check_v1";

const state = {
  step: 0,           // 現在の質問インデックス
  answers: {},        // { questionId: value | [values] }
  result: null,       // diagnose() の結果
  planChecked: {}      // { measureId: true/false }
};

// ---------- DOM refs ----------
const screenIntro = document.getElementById("screen-intro");
const screenQuiz = document.getElementById("screen-quiz");
const screenResults = document.getElementById("screen-results");
const restartBtn = document.getElementById("restartBtn");

const quizCard = document.getElementById("quizCard");
const qIndexEl = document.getElementById("qIndex");
const qTotalEl = document.getElementById("qTotal");
const progressFill = document.getElementById("progressFill");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const summaryGrid = document.getElementById("summaryGrid");
const priorityList = document.getElementById("priorityList");
const planList = document.getElementById("planList");
const planProgressFill = document.getElementById("planProgressFill");
const planProgressLabel = document.getElementById("planProgressLabel");

// ---------- Init ----------
function init() {
  qTotalEl.textContent = QUESTIONS.length;
  loadFromStorage();

  document.getElementById("startBtn").addEventListener("click", startQuiz);
  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);
  restartBtn.addEventListener("click", restart);
  document.getElementById("printBtn").addEventListener("click", () => window.print());

  if (state.result) {
    showResults();
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch (e) {
    console.warn("storage load failed", e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("storage save failed", e);
  }
}

// ---------- Screen control ----------
function showScreen(el) {
  [screenIntro, screenQuiz, screenResults].forEach(s => s.hidden = (s !== el));
}

function startQuiz() {
  state.step = state.step || 0;
  showScreen(screenQuiz);
  restartBtn.hidden = false;
  renderQuestion();
}

function restart() {
  if (!confirm("回答をリセットして、はじめからやり直しますか？")) return;
  state.step = 0;
  state.answers = {};
  state.result = null;
  state.planChecked = {};
  saveToStorage();
  restartBtn.hidden = true;
  showScreen(screenIntro);
}

// ---------- Quiz rendering ----------
function renderQuestion() {
  const q = QUESTIONS[state.step];
  qIndexEl.textContent = state.step + 1;
  progressFill.style.width = `${((state.step) / QUESTIONS.length) * 100}%`;

  const current = state.answers[q.id];

  let optionsHtml = "";
  if (q.type === "counter") {
    const counts = current || {};
    optionsHtml = q.options.map(opt => {
      const val = counts[opt.value] || 0;
      return `
        <div class="counter-row" data-value="${opt.value}">
          <span class="counter-label"><span class="counter-emoji">${opt.emoji}</span>${opt.label}</span>
          <div class="counter-controls">
            <button type="button" class="counter-btn counter-minus" data-value="${opt.value}" ${val === 0 ? "disabled" : ""}>−</button>
            <span class="counter-num">${val}</span>
            <button type="button" class="counter-btn counter-plus" data-value="${opt.value}">＋</button>
          </div>
        </div>
      `;
    }).join("");
  } else {
    q.options.forEach(opt => {
      const isChecked = q.type === "multi"
        ? (current || []).includes(opt.value)
        : current === opt.value;
      const inputType = q.type === "multi" ? "checkbox" : "radio";
      optionsHtml += `
        <label class="option ${isChecked ? "is-selected" : ""}">
          <input type="${inputType}" name="q_${q.id}" value="${opt.value}" ${isChecked ? "checked" : ""}>
          <span class="option-label">${opt.label}</span>
        </label>
      `;
    });
  }

  quizCard.innerHTML = `
    <p class="quiz-eyebrow">Q${state.step + 1}</p>
    <h2 class="quiz-title">${q.title}</h2>
    ${q.type === "counter" || q.note ? `<p class="counter-note">${q.desc}</p>` : `<p class="quiz-desc">${q.desc}</p>`}
    <div class="options-list" data-type="${q.type}">${optionsHtml}</div>
  `;

  if (q.type === "counter") {
    quizCard.querySelectorAll(".counter-btn").forEach(btn => {
      btn.addEventListener("click", () => handleCounterChange(q, btn));
    });
  } else {
    quizCard.querySelectorAll("input").forEach(input => {
      input.addEventListener("change", () => handleAnswerChange(q));
    });
  }

  prevBtn.disabled = state.step === 0;
  updateNextButton(q);
}

function handleCounterChange(q, btn) {
  const key = btn.dataset.value;
  const counts = state.answers[q.id] || {};
  const isPlus = btn.classList.contains("counter-plus");
  counts[key] = Math.max(0, (counts[key] || 0) + (isPlus ? 1 : -1));
  state.answers[q.id] = counts;

  const row = btn.closest(".counter-row");
  row.querySelector(".counter-num").textContent = counts[key];
  row.querySelector(".counter-minus").disabled = counts[key] === 0;

  saveToStorage();
  updateNextButton(q);
}

function handleAnswerChange(q) {
  const inputs = quizCard.querySelectorAll(`input[name="q_${q.id}"]`);
  if (q.type === "multi") {
    let selected = Array.from(inputs).filter(i => i.checked).map(i => i.value);
    // 「確認したことがない」と他の選択肢を排他制御
    const lastChanged = document.activeElement?.value || event?.target?.value;
    if (selected.includes("not_checked") && selected.length > 1) {
      if (lastChanged === "not_checked") {
        selected = ["not_checked"];
      } else {
        selected = selected.filter(v => v !== "not_checked");
      }
      inputs.forEach(i => { i.checked = selected.includes(i.value); });
    }
    state.answers[q.id] = selected;
  } else {
    const selected = Array.from(inputs).find(i => i.checked);
    state.answers[q.id] = selected ? selected.value : undefined;
  }

  // toggle visual state
  quizCard.querySelectorAll(".option").forEach(label => {
    const input = label.querySelector("input");
    label.classList.toggle("is-selected", input.checked);
  });

  saveToStorage();
  updateNextButton(q);
}

function updateNextButton(q) {
  const val = state.answers[q.id];
  let enabled;
  if (q.type === "counter") {
    enabled = (val?.adult || 0) >= 1;
  } else if (q.type === "multi") {
    enabled = true;
  } else {
    enabled = !!val;
  }
  nextBtn.disabled = !enabled;
  nextBtn.textContent = state.step === QUESTIONS.length - 1 ? "結果を見る" : "次へ";
}

function goPrev() {
  if (state.step === 0) return;
  state.step -= 1;
  saveToStorage();
  renderQuestion();
}

function goNext() {
  const q = QUESTIONS[state.step];
  if ((q.type === "multi" || q.type === "counter") && state.answers[q.id] === undefined) {
    state.answers[q.id] = q.type === "counter" ? {} : [];
  }

  if (state.step === QUESTIONS.length - 1) {
    finishQuiz();
    return;
  }
  state.step += 1;
  saveToStorage();
  renderQuestion();
}

function finishQuiz() {
  state.result = diagnose(state.answers);
  state.planChecked = {};
  saveToStorage();
  showResults();
}

// ---------- Results rendering ----------
function showResults() {
  showScreen(screenResults);
  restartBtn.hidden = false;
  document.getElementById("printDate").textContent = new Date().toLocaleDateString("ja-JP");

  renderScore();
  renderSummary();
  renderPriorityList();
  renderPlan();
}

function renderScore() {
  const score = state.result.score;
  let message, level;
  if (score >= 90) { message = "素晴らしい！防災対策はよく整っています。定期的な見直しを続けましょう。"; level = "high"; }
  else if (score >= 70) { message = "基本的な備えはできています。いくつかの対策でさらに安心できます。"; level = "mid"; }
  else if (score >= 50) { message = "備えの基礎はあります。優先度の高い対策から取り組みましょう。"; level = "mid"; }
  else if (score >= 30) { message = "備えが不十分な点があります。一つずつ対策を進めましょう。"; level = "low"; }
  else { message = "備えがほとんどできていません。まずは基本から始めましょう。"; level = "low"; }

  document.getElementById("scoreCard").innerHTML = `
    <div class="score-card-inner level-${level}">
      <p class="score-label">現在の防災対策スコア</p>
      <p class="score-value"><span class="score-num">${score}</span> <span class="score-denom">/ 100</span></p>
      <p class="score-message">${message}</p>
    </div>
  `;
}

function renderSummary() {
  const items = state.result.summary;
  summaryGrid.innerHTML = items.map(item => `
    <li class="summary-bullet">・${item.label}：${item.value}</li>
  `).join("");
}

function renderPriorityList() {
  const measures = state.result.measures;
  if (measures.length === 0) {
    priorityList.innerHTML = `<p class="empty-note">大きな抜けは見当たりません。引き続き備蓄の鮮度などを定期的に見直しましょう。</p>`;
    return;
  }

  priorityList.innerHTML = measures.map((m, idx) => {
    const level = m.score >= 22 ? "high" : m.score >= 13 ? "mid" : "low";
    const levelLabel = level === "high" ? "優先度：高" : level === "mid" ? "優先度：中" : "優先度：低";
    return `
      <div class="priority-item level-${level}">
        <div class="priority-rank">${idx + 1}</div>
        <div class="priority-body">
          <p class="priority-tag">${levelLabel}</p>
          <h3 class="priority-title">${m.title}</h3>
          <p class="priority-detail">${m.detail}</p>
        </div>
      </div>
    `;
  }).join("");
}

function renderPlan() {
  const plan = state.result.plan;
  const total = plan.length;
  const doneCount = plan.filter(p => state.planChecked[p.id]).length;

  planProgressFill.style.width = total === 0 ? "0%" : `${(doneCount / total) * 100}%`;
  planProgressLabel.textContent = `${doneCount} / ${total} 完了`;

  planList.innerHTML = plan.map(p => {
    const checked = !!state.planChecked[p.id];
    return `
      <label class="plan-item ${checked ? "is-done" : ""}">
        <input type="checkbox" data-plan-id="${p.id}" ${checked ? "checked" : ""}>
        <span class="plan-week">第${p.order}週末</span>
        <span class="plan-text">
          <span class="plan-label">${p.label}</span>
        </span>
      </label>
    `;
  }).join("");

  planList.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      state.planChecked[cb.dataset.planId] = cb.checked;
      saveToStorage();
      renderPlan();
    });
  });
}

init();
