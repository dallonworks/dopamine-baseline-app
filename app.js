/* =========================================================
   dopamine‑baseline‑check ─ app.js
   ---------------------------------------------------------
   • Presents 25 simplified self‑report questions
   • Tallies –1 / 0 / +1 answers
   • Displays a vertical bar chart where the Y‑axis is
     dopamine score (‑25 → +25) and 0 is mid‑axis
   ========================================================= */
/* =========================================================
   dopamine‑baseline‑check ─ app.js  (history‑enabled)
   ========================================================= */

/* ---------- 0.  Tiny cookie helpers ---------------------- */
function setCookie (name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}
function getCookie (name) {
  const prefix = name + "=";
  return document.cookie.split(";").map(c => c.trim())
          .filter(c => c.startsWith(prefix))
          .map(c => decodeURIComponent(c.substring(prefix.length)))[0] || "";
}

/* ---------- 1.  Question bank (unchanged) ---------------- */
const questions = [
  /* Energy & Arousal */
  { id: 1,  text: "Right now my physical ENERGY feels…",        opts:["Sluggish","Steady","Bouncy"] },
  { id: 2,  text: "Urge to MOVE or fidget…",                    opts:["Low","Average","Can’t sit still"] },
  { id: 3,  text: "How I felt getting up this morning…",        opts:["Slow & foggy","Normal","Wide‑awake fast"] },
  { id: 4,  text: "Body temperature sense…",                    opts:["Cool","Neutral","Warm / slightly sweaty"] },
  { id: 5,  text: "Need for CAFFEINE so far today…",            opts:["Stronger","Typical","Haven’t wanted any"] },

  /* Motivation & Drive */
  { id: 6,  text: "Starting a boring task feels…",              opts:["Ugh, later","OK","I’ll start now"] },
  { id: 7,  text: "Once started I STICK with tasks…",           opts:["Quit easily","Average","Laser‑locked"] },
  { id: 8,  text: "Desire to try something NEW…",               opts:["Prefer familiar","No preference","Craving novelty"] },
  { id: 9,  text: "I’m jumping between tasks…",                 opts:["Hardly","Some","A lot"] },
  { id:10,  text: "Small reward now vs bigger later…",          opts:["Take it now","Depends","Happy to wait"] },

  /* Mood & Affect */
  { id:11,  text: "Overall MOOD tone…",                         opts:["Flat / down","Fine","Upbeat"] },
  { id:12,  text: "Irritability…",                              opts:["Touchy","Usual","Extra patient"] },
  { id:13,  text: "Social drive (talking, messaging)…",         opts:["Withdrawn","Normal","Very chatty"] },
  { id:14,  text: "Pleasure from small wins…",                  opts:["Barely notice","Normal","Feels great"] },
  { id:15,  text: "Craving comfort FOOD…",                      opts:["High","Normal","Low"] },

  /* Reward‑Seeking */
  { id:16,  text: "Urge to check phone / socials…",             opts:["Constant tug","Normal","Rare"] },
  { id:17,  text: "Snacking on sweets / chips today…",          opts:["More than usual","Normal","Less"] },
  { id:18,  text: "Interest in SEX / romance today…",           opts:["Down","Normal","High"] },
  { id:19,  text: "Impulse to BUY stuff online…",               opts:["Strong","Typical","Little"] },
  { id:20,  text: "Desire for fast media / gaming…",            opts:["High","Normal","Low"] },

  /* Cognitive Control */
  { id:21,  text: "Ability to FOCUS on one thing…",             opts:["Drifts fast","Average","Sustained"] },
  { id:22,  text: "Creative idea FLOW…",                        opts:["Stuck","Normal","Pouring out"] },
  { id:23,  text: "Working memory (hold a number)…",            opts:["Slips quickly","Normal","Feels sharp"] },
  { id:24,  text: "Sense of TIME passing…",                     opts:["Dragging","Normal","Flies"] },
  { id:25,  text: "Mental FATIGUE right now…",                  opts:["Heavy","Moderate","Light"] }
];

/* ---------- 2.  Guidance blocks (unchanged) --------------- */
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

/* ---------- 3.  State ------------------------------------- */
let currentQ = 0;
let scores   = [];
let chartInst;

/* ---------- 4.  DOM grabs --------------------------------- */
const introCard   = document.getElementById("intro-card");
const questionCard= document.getElementById("question-card");
const resultCard  = document.getElementById("result-card");

const qNumberEl   = document.getElementById("q-number");
const qTextEl     = document.getElementById("q-text");
const progressEl  = document.getElementById("progress");
const buttonsWrap = questionCard.querySelector(".buttons");

const scoreCtx    = document.getElementById("score-chart");
const stateHead   = document.getElementById("state-heading");
const stateExpl   = document.getElementById("state-explainer");
const actionList  = document.getElementById("action-list");

const beginBtn    = document.getElementById("begin");
const restartBtn  = document.getElementById("restart");
const prevBtn     = document.getElementById("prevResults");   // new

/* ---------- 5.  Helper functions -------------------------- */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* ---------- 6.  History handling -------------------------- */
function readHistory () {
  const raw = getCookie("dopamineHistory");
  try   { return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function writeHistory (arr) {
  setCookie("dopamineHistory", JSON.stringify(arr));
}

/* ---------- 7.  Quiz flow --------------------------------- */
function startTest() {
  currentQ = 0;
  scores   = [];
  hide(resultCard); hide(introCard); show(questionCard);
  renderQuestion();
}
function renderQuestion() {
  const q = questions[currentQ];
  qNumberEl.textContent = `Question ${q.id} / 25`;
  qTextEl.textContent   = q.text;

  buttonsWrap.innerHTML = "";
  [-1, 0, 1].forEach((val, idx) => {
    const b   = document.createElement("button");
    b.dataset.score = val;
    b.textContent   = q.opts[idx];
    buttonsWrap.appendChild(b);
  });
  progressEl.textContent = `Progress: ${currentQ + 1} / 25`;
}
function handleAnswer(score) {
  scores.push(Number(score));
  currentQ++;
  if (currentQ < questions.length) renderQuestion();
  else finishTest();
}
function finishTest() {
  const total = scores.reduce((a, b) => a + b, 0);

  /* ---- store history (keep last 3) ---- */
  const history = readHistory();
  history.push({ ts: Date.now(), score: total });
  history.sort((a, b) => a.ts - b.ts);
  const trimmed = history.slice(-3);
  writeHistory(trimmed);

  hide(questionCard);
  renderResult(trimmed);
  show(resultCard);
  show(prevBtn);                         // make sure button visible now
}

/* ---------- 8.  Result rendering & chart ------------------ */
function renderResult(historyArr) {
  const latest = historyArr[historyArr.length - 1];
  const zone   = latest.score >= 10 ? "high"
               : latest.score <= -10 ? "low"
               : "homeo";
  const g      = guidance[zone];

  stateHead.textContent = g.heading;
  stateExpl.textContent = g.explainer;
  actionList.innerHTML  = g.actions.map(a => `<li>${a}</li>`).join("");

  /* ---- build dataset ---- */
  const labels = historyArr.map(h =>
      new Date(h.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
  const data   = historyArr.map(h => h.score);
  const colors = historyArr.map((h,i) =>
      i === historyArr.length - 1 ?     // highlight latest
        (zone === "high" ? "#ff9800" :
         zone === "low"  ? "#dd4b39" : "#4caf50")
      : "#888888");

  /* ---- custom plugin to draw soft‑blue baseline ---- */
  const baselinePlugin = {
    id: "baseline",
    afterDraw(chart) {
      const y = chart.scales.y.getPixelForValue(0);
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = "#9ecbff";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(chart.scales.x.left, y);
      ctx.lineTo(chart.scales.x.right, y);
      ctx.stroke();
      ctx.restore();
    }
  };

  if (chartInst) chartInst.destroy();
  chartInst = new Chart(scoreCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Score",
        data,
        fill: false,
        tension: 0,
        borderColor: "#cccccc",
        pointBackgroundColor: colors,
        pointRadius: data.map((_,i)=> i===data.length-1 ? 6 : 4),
        pointBorderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: -25, max: 25,
          ticks: { stepSize: 5 }
        },
        x: { title: { display: true, text: "Today (oldest ↔ newest)" } }
      },
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: true }      // show value on tap / hover
      }
    },
    plugins: [baselinePlugin]
  });
}

/* ---------- 9.  Show trend on demand ---------------------- */
function showPreviousResults() {
  const hist = readHistory();
  if (!hist.length) return;             // nothing yet
  hide(introCard);
  renderResult(hist.slice(-3));
  show(resultCard);
}

/* ---------- 10. Event listeners --------------------------- */
beginBtn  .addEventListener("click", startTest);
restartBtn.addEventListener("click", () => {
  hide(resultCard); show(introCard);
});
questionCard.addEventListener("click", e => {
  if (e.target.dataset.score !== undefined) handleAnswer(e.target.dataset.score);
});
prevBtn   .addEventListener("click", showPreviousResults);

/* ---------- 11.  On first load ---------------------------- */
if (readHistory().length) show(prevBtn);

