/* =======================================================================
   dopamine‑baseline‑check  •  app.js
   -----------------------------------------------------------------------
   • 25‑question self‑assessment (–1 / 0 / +1 answers)
   • Stores up to N = 9 most‑recent results in a cookie
   • Result view shows a trend line + bullet points (oldest→latest)
     ─ baseline (score 0) drawn soft‑blue with “Baseline” label + tooltip
   • “View previous results” button shows history without retaking quiz
   ======================================================================= */

/* ---------- 0.  Cookie helpers --------------------------------------- */
function setCookie(name, value, days = 365) {
  const d = new Date(); d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}
function getCookie(name) {
  const p = name + "=";
  const hit = document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith(p));
  return hit ? decodeURIComponent(hit.slice(p.length)) : "";
}

/* ---------- 1.  Question bank  (25 simplified prompts) --------------- */
const questions = [
  /* Energy & Arousal */
  { id: 1,  text: "Right now my physical ENERGY feels…",              opts:["Sluggish","Steady","Bouncy"] },
  { id: 2,  text: "Urge to MOVE or fidget…",                          opts:["Low","Average","Can’t sit still"] },
  { id: 3,  text: "How I felt getting up this morning…",              opts:["Slow & foggy","Normal","Wide‑awake fast"] },
  { id: 4,  text: "Body temperature sense…",                          opts:["Cool","Neutral","Warm / slightly sweaty"] },
  { id: 5,  text: "Need for CAFFEINE so far today…",                  opts:["Stronger","Typical","Haven’t wanted any"] },

  /* Motivation & Drive */
  { id: 6,  text: "Starting a boring task feels…",                    opts:["Ugh, later","OK","I’ll start now"] },
  { id: 7,  text: "Once started I STICK with tasks…",                 opts:["Quit easily","Average","Laser‑locked"] },
  { id: 8,  text: "Desire to try something NEW…",                     opts:["Prefer familiar","No preference","Craving novelty"] },
  { id: 9,  text: "I’m jumping between tasks…",                       opts:["Hardly","Some","A lot"] },
  { id:10,  text: "Small reward now vs bigger later…",                opts:["Take it now","Depends","Happy to wait"] },

  /* Mood & Affect */
  { id:11,  text: "Overall MOOD tone…",                               opts:["Flat / down","Fine","Upbeat"] },
  { id:12,  text: "Irritability…",                                    opts:["Touchy","Usual","Extra patient"] },
  { id:13,  text: "Social drive (talking, messaging)…",               opts:["Withdrawn","Normal","Very chatty"] },
  { id:14,  text: "Pleasure from small wins…",                        opts:["Barely notice","Normal","Feels great"] },
  { id:15,  text: "Craving comfort FOOD…",                            opts:["High","Normal","Low"] },

  /* Reward‑Seeking */
  { id:16,  text: "Urge to check phone / socials…",                   opts:["Constant tug","Normal","Rare"] },
  { id:17,  text: "Snacking on sweets / chips today…",                opts:["More than usual","Normal","Less"] },
  { id:18,  text: "Interest in SEX / romance thoughts…",              opts:["Down","Normal","Elevated"] },
  { id:19,  text: "Impulse to BUY stuff online…",                     opts:["Strong","Typical","Little"] },
  { id:20,  text: "Desire for fast media / gaming…",                  opts:["High","Normal","Low"] },

  /* Cognitive Control */
  { id:21,  text: "Ability to FOCUS on one thing…",                   opts:["Drifts fast","Average","Sustained"] },
  { id:22,  text: "Creative idea FLOW…",                              opts:["Stuck","Normal","Pouring out"] },
  { id:23,  text: "Working memory (hold a number)…",                  opts:["Slips quickly","Normal","Feels sharp"] },
  { id:24,  text: "Sense of TIME passing…",                           opts:["Dragging","Normal","Flies"] },
  { id:25,  text: "Mental FATIGUE right now…",                        opts:["Heavy","Moderate","Light"] }
];

/* ---------- 2.  Guidance blocks ------------------------------------- */
const guidance = {
  high: {
    heading: "You’re ABOVE baseline",
    explainer:
      "Your dopamine tone looks elevated—restless energy, novelty craving, or mild agitation may be present.",
    actions: [
      "Schedule 20 min of screen‑free quiet time.",
      "Swap caffeine or sugary drinks for water.",
      "Take a slow walk focusing on breathing.",
      "Avoid doom‑scrolling for the next few hours."
    ]
  },
  homeo: {
    heading: "In the HOMEOSTATIC zone",
    explainer:
      "You’re near your personal set‑point. Focus and motivation are balanced—keep doing what you’re doing!",
    actions: [
      "Stick with your current sleep and exercise rhythm.",
      "Use 90‑min focus blocks or Pomodoros.",
      "Take a 2‑min gratitude pause to reinforce stability."
    ]
  },
  low: {
    heading: "You’re BELOW baseline",
    explainer:
      "Markers suggest a dip—lethargy, low drive, or stronger cravings for quick hits.",
    actions: [
      "Get sunlight or bright‑lamp exposure for 10‑15 min.",
      "Do 5‑10 min of moderate cardio.",
      "Break tasks into tiny wins and celebrate each.",
      "Aim for 30 min earlier bedtime tonight."
    ]
  }
};

/* ---------- 3.  State ---------------------------------------------- */
let currentQ = 0;
let scores   = [];
let chartInst;

/* ---------- 4.  DOM elements --------------------------------------- */
const introCard    = document.getElementById("intro-card");
const questionCard = document.getElementById("question-card");
const resultCard   = document.getElementById("result-card");

const qNumberEl   = document.getElementById("q-number");
const qTextEl     = document.getElementById("q-text");
const progressEl  = document.getElementById("progress");
const buttonsWrap = questionCard.querySelector(".buttons");

const scoreCtx   = document.getElementById("score-chart");
const stateHead  = document.getElementById("state-heading");
const stateExpl  = document.getElementById("state-explainer");
const actionList = document.getElementById("action-list");

const beginBtn   = document.getElementById("begin");
const restartBtn = document.getElementById("restart");
const prevBtn    = document.getElementById("prevResults");

const baselineLbl = document.getElementById("baselineLbl");  // Baseline label

/* ---------- 5.  Helpers ------------------------------------------- */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

function readHistory() {
  try { return JSON.parse(getCookie("dopamineHistory") || "[]"); }
  catch { return []; }
}
function writeHistory(arr) { setCookie("dopamineHistory", JSON.stringify(arr)); }

/* ---------- 6.  Quiz flow ----------------------------------------- */
function startTest() {
  currentQ = 0; scores = [];
  hide(resultCard); hide(introCard); show(questionCard);
  renderQuestion();
}
function renderQuestion() {
  const q = questions[currentQ];
  qNumberEl.textContent = `Question ${q.id} / 25`;
  qTextEl.textContent   = q.text;

  buttonsWrap.innerHTML = "";
  [-1, 0, 1].forEach((val, idx) => {
    const b = document.createElement("button");
    b.dataset.score = val;
    b.textContent   = q.opts[idx];
    buttonsWrap.appendChild(b);
  });

  progressEl.textContent = `Progress: ${currentQ + 1} / 25`;
}
function handleAnswer(score) {
  scores.push(+score);
  currentQ < questions.length - 1 ? (++currentQ, renderQuestion()) : finishTest();
}
function finishTest() {
  const total = scores.reduce((a, b) => a + b, 0);

  /* Update history (keep last 9) */
  const history = readHistory();
  history.push({ ts: Date.now(), score: total });
  history.sort((a, b) => a.ts - b.ts);
  writeHistory(history.slice(-9));

  hide(questionCard);
  renderResult(readHistory());
  show(resultCard);
  show(prevBtn);
}

/* ---------- 7.  Results / Chart ----------------------------------- */
function renderResult(history) {
  if (!history.length) return;

  const latest = history.at(-1);
  const zone   = latest.score >= 10 ? "high"
              : latest.score <= -10 ? "low"
              : "homeo";
  const g = guidance[zone];

  stateHead.textContent = g.heading;
  stateExpl.textContent = g.explainer;
  actionList.innerHTML  = g.actions.map(a => `<li>${a}</li>`).join("");

  /* Dataset prep */
  const labels = history.map(h =>
      new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const data   = history.map(h => h.score);
  const colors = history.map((h, i) =>
      i === history.length - 1
        ? (zone === "high" ? "#ff9800" : zone === "low" ? "#dd4b39" : "#4caf50")
        : "#888");

  /* Custom plugin: baseline line + move label */
  const baselinePlugin = {
    id: "baselineGuide",
    afterDraw(chart) {
      const y0 = chart.scales.y.getPixelForValue(0);
      const { ctx, scales: { x } } = chart;

      ctx.save();
      ctx.strokeStyle = "#9ecbff";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(x.left, y0);
      ctx.lineTo(x.right, y0);
      ctx.stroke();
      ctx.restore();

      /* Position baseline label */
      const canvasTop = chart.canvas.getBoundingClientRect().top;
      const parentTop = chart.canvas.parentElement.getBoundingClientRect().top;
      baselineLbl.style.top = `${y0 + canvasTop - parentTop - 8}px`;
      show(baselineLbl);
    }
  };

  /* Build chart */
  if (chartInst) chartInst.destroy();
  chartInst = new Chart(scoreCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: "#ccc",
        fill: false,
        tension: 0,
        pointBackgroundColor: colors,
        pointRadius: data.map((_, i) => i === data.length - 1 ? 6 : 4)
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: -25, max: 25, ticks: { stepSize: 5 } },
        x: { title: { display: true, text: "Today (oldest ↔ newest)" } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    },
    plugins: [baselinePlugin]
  });
}

/* ---------- 8.  Show previous results ----------------------------- */
function showPrevious() {
  const h = readHistory();
  if (!h.length) return;
  hide(introCard);
  renderResult(h);
  show(resultCard);
}

/* ---------- 9.  Event listeners ---------------------------------- */
beginBtn  .addEventListener("click", startTest);
restartBtn.addEventListener("click", () => { hide(resultCard); show(introCard); });
questionCard.addEventListener("click", e => {
  if (e.target.dataset.score !== undefined) handleAnswer(e.target.dataset.score);
});
prevBtn   .addEventListener("click", showPrevious);

/* ----------10.  First‑load setup ---------------------------------- */
if (readHistory().length) show(prevBtn);
