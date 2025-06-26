/* =========  DATA  ========= */
const questions = [
  { id: 1,  text: "Spontaneous eye‑blink rate in 60 s (<11 / 11‑20 / >20)", range: [-1,0,1]},
  { id: 2,  text: "Baseline pupil size (smaller / same / larger)", range: [-1,0,1]},
  { id: 3,  text: "5‑min HRV vs weekly mean (>10 % lower / ±10 % / >10 % higher)", range: [-1,0,1]},
  { id: 4,  text: "Resting heart‑rate vs weekly mean (>8 bpm higher / ±8 bpm / >8 bpm lower)", range: [-1,0,1]},
  { id: 5,  text: "Fidgeting in last 5 min (rare / typical / frequent)", range: [-1,0,1]},
  { id: 6,  text: "Time‑to‑start boring task (>10 min / 2‑10 min / <2 min)", range: [-1,0,1]},
  { id: 7,  text: "Urge to check phone/snacks/socials (low / normal / high)", range: [-1,0,1]},
  { id: 8,  text: "Choice of novel option (familiar / tie / novel)", range: [-1,0,1]},
  { id: 9,  text: "Delay choice ($20 now / tie / $50 in a week)", range: [-1,0,1]},
  { id: 10, text: "Task‑switch impulses in last 30 min (<1 / 1‑3 / >3)", range: [-1,0,1]},
  { id: 11, text: "Minutes of deep focus without distraction (<10 / 10‑30 / >30)", range: [-1,0,1]},
  { id: 12, text: "Alternate uses for 'paperclip' in 2 min (<5 / 5‑10 / >10)", range: [-1,0,1]},
  { id: 13, text: "8‑digit recall accuracy (0‑4 / 5‑6 / 7‑8 correct)", range: [-1,0,1]},
  { id: 14, text: "Mood tone right now (flat / neutral / elevated)", range: [-1,0,1]},
  { id: 15, text: "Irritability / aggression today (more / baseline / less)", range: [-1,0,1]},
  { id: 16, text: "Social drive (withdrawn / usual / unusually chatty)", range: [-1,0,1]},
  { id: 17, text: "Reward 'hit' after small task (blunted / normal / intense)", range: [-1,0,1]},
  { id: 18, text: "Sleep last night vs average (worse / average / better)", range: [-1,0,1]},
  { id: 19, text: "Craving for calorie‑dense food in 3 h (low / normal / high)", range: [-1,0,1]},
  { id: 20, text: "Actual processed‑snack intake today (less / same / more)", range: [-1,0,1]},
  { id: 21, text: "Sexual desire last 6 h (down / baseline / high)", range: [-1,0,1]},
  { id: 22, text: "Appetite for new learning right now (low / average / keen)", range: [-1,0,1]},
  { id: 23, text: "Subjective time‑flow last 10 min (dragging / normal / flying)", range: [-1,0,1]},
  { id: 24, text: "Eye dryness / strain while reading screens (high / normal / low)", range: [-1,0,1]},
  { id: 25, text: "Body temperature / light sweats at rest (cool / normal / warm)", range: [-1,0,1]}
];

const guidance = {
  high: {
    heading: "Above Baseline",
    explainer: "Your tonic dopaminergic tone appears elevated. You may feel restless, novelty‑hungry or mildly agitated.",
    actions: [
      "Schedule 20‑30 min of screen‑free low‑stimulus downtime.",
      "Swap caffeinated or sugary drinks for water/herbal tea today.",
      "Take a slow 15 min walk without earbuds, focusing on breathing.",
      "Avoid fast‑reward loops (doom‑scrolling, rapid video reels) for the next few hours."
    ]
  },
  homeo: {
    heading: "Homeostatic Zone",
    explainer: "You’re sitting near your personal baseline. Focus and motivation are likely balanced.",
    actions: [
      "Maintain current sleep and exercise rhythm.",
      "Use pomodoros or 90‑min focus blocks to stay in the zone.",
      "Consider a short gratitude or mindfulness practice to reinforce stability."
    ]
  },
  low: {
    heading: "Below Baseline",
    explainer: "Markers suggest dopamine depletion. Common signs: lethargy, low drive, craving quick hits.",
    actions: [
      "Expose yourself to natural daylight or bright‑light lamp for 10‑15 min.",
      "Do 5‑10 min of moderate cardio (jump rope, brisk walk).",
      "Break tasks into micro‑goals and celebrate small wins.",
      "Prioritise 30‑60 min earlier bedtime tonight."
    ]
  }
};

/* =========  STATE ========= */
let currentQ = 0;
let scores = [];

/* =========  DOM  ========= */
const introCard     = document.getElementById("intro-card");
const questionCard  = document.getElementById("question-card");
const resultCard    = document.getElementById("result-card");
const qNumberEl     = document.getElementById("q-number");
const qTextEl       = document.getElementById("q-text");
const progressEl    = document.getElementById("progress");
const buttonsEl     = questionCard.querySelector(".buttons");
const scoreChartCtx = document.getElementById("score-chart");
const stateHeading  = document.getElementById("state-heading");
const stateExpl     = document.getElementById("state-explainer");
const actionList    = document.getElementById("action-list");
const beginBtn      = document.getElementById("begin");
const restartBtn    = document.getElementById("restart");

/* =========  FUNCTIONS  ========= */
function show(elem)  { elem.classList.remove("hidden"); }
function hide(elem)  { elem.classList.add("hidden"); }

function startTest() {
  currentQ = 0;
  scores = [];
  hide(introCard);
  hide(resultCard);
  show(questionCard);
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentQ];
  qNumberEl.textContent = `Question ${q.id}/25`;
  qTextEl.textContent   = q.text;
  progressEl.textContent = `Progress: ${currentQ + 1} / 25`;
}

function handleAnswer(score) {
  scores.push(Number(score));
  currentQ++;
  if (currentQ < questions.length) {
    renderQuestion();
  } else {
    finishTest();
  }
}

function finishTest() {
  const total = scores.reduce((a,b)=>a+b,0);
  hide(questionCard);
  renderResult(total);
  show(resultCard);
}

function renderResult(total) {
  /* 1. Display chart */
  createChart(total);

  /* 2. Text guidance */
  let zone;
  if (total >= 10) zone = "high";
  else if (total <= -10) zone = "low";
  else zone = "homeo";

  const g = guidance[zone];
  stateHeading.textContent = g.heading;
  stateExpl.textContent    = g.explainer;

  /* 3. Action list */
  actionList.innerHTML = "";
  g.actions.forEach(act=>{
    const li = document.createElement("li");
    li.textContent = act;
    actionList.appendChild(li);
  });
}

let chartInstance;
function createChart(total) {
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(scoreChartCtx, {
    type: "bar",
    data: {
      labels: ["Your score"],
      datasets: [{
        data: [total],
        borderWidth: 1,
        backgroundColor: total >= 10 ? "#ff9800"
                       : total <= -10 ? "#dd4b39"
                                       : "#4caf50"
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      scales: {
        x: {
          min: -25, max: 25,
          ticks: { stepSize: 5 }
        }
      },
      plugins: {
        legend: { display:false },
        tooltip: { enabled:false }
      }
    }
  });
}

/* =========  EVENT LISTENERS ========= */
beginBtn.addEventListener("click", startTest);
restartBtn.addEventListener("click", startTest);
buttonsEl.addEventListener("click", e=>{
  if (e.target.dataset.score !== undefined) {
    handleAnswer(e.target.dataset.score);
  }
});
