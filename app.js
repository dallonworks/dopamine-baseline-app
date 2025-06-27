/* =========================================================
   dopamine‑baseline‑check ─ app.js  (9‑point history + baseline label)
   ========================================================= */

/* ---------- 0.  Tiny cookie helpers ---------------------- */
function setCookie(name, value, days = 365) {
  const d = new Date(); d.setTime(d.getTime() + days*864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}
function getCookie(name) {
  const p = name + "=", c = document.cookie.split(";").map(v=>v.trim());
  const hit = c.find(v => v.startsWith(p)); return hit ? decodeURIComponent(hit.slice(p.length)) : "";
}

/* ---------- 1.  Question bank (unchanged) ---------------- */
const questions = [ /* … same 25 items as before … */ ];

/* ---------- 2.  Guidance blocks (unchanged) -------------- */
const guidance = { /* …same as previous code… */ };

/* ---------- 3.  State ----------------------------------- */
let currentQ = 0, scores = [], chartInst;

/* ---------- 4.  DOM grabs -------------------------------- */
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
const prevBtn     = document.getElementById("prevResults");

const baselineLbl = document.getElementById("baselineLbl");   // NEW

/* ---------- 5.  Helper functions ------------------------- */
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

/* ---------- 6.  History helpers -------------------------- */
function readHistory() {
  try { return JSON.parse(getCookie("dopamineHistory") || "[]"); }
  catch { return []; }
}
function writeHistory(arr) { setCookie("dopamineHistory", JSON.stringify(arr)); }

/* ---------- 7.  Quiz flow -------------------------------- */
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
  [-1,0,1].forEach((val,i)=>{
    const b=document.createElement("button");
    b.dataset.score=val; b.textContent=q.opts[i]; buttonsWrap.appendChild(b);
  });
  progressEl.textContent = `Progress: ${currentQ+1} / 25`;
}
function handleAnswer(score){
  scores.push(+score);
  currentQ < questions.length-1 ? (++currentQ,renderQuestion()) : finishTest();
}
function finishTest(){
  const total = scores.reduce((a,b)=>a+b,0);
  const hist = readHistory();
  hist.push({ts:Date.now(),score:total});
  hist.sort((a,b)=>a.ts-b.ts);
  writeHistory(hist.slice(-9));                   // keep last 9
  hide(questionCard); renderResult(readHistory()); show(resultCard); show(prevBtn);
}

/* ---------- 8.  Chart rendering -------------------------- */
function renderResult(history){
  if(!history.length) return;

  const latest = history.at(-1);
  const zone   = latest.score>=10?"high": latest.score<=-10?"low":"homeo";
  const g      = guidance[zone];
  stateHead.textContent=g.heading; stateExpl.textContent=g.explainer;
  actionList.innerHTML=g.actions.map(a=>`<li>${a}</li>`).join("");

  /* datasets */
  const labels = history.map(h=>new Date(h.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  const data   = history.map(h=>h.score);
  const colors = history.map((h,i)=> i===history.length-1
        ? (zone==="high"?"#ff9800":zone==="low"?"#dd4b39":"#4caf50")
        : "#888");

  /* custom plugin draws blue baseline + repositions HTML label */
  const baselinePlugin={
    id:"baseline",
    afterDraw(chart){
      const y = chart.scales.y.getPixelForValue(0);
      const {ctx,scales:{x}} = chart;
      ctx.save(); ctx.strokeStyle="#9ecbff"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x.left,y); ctx.lineTo(x.right,y); ctx.stroke(); ctx.restore();

      /* position HTML label */
      baselineLbl.style.top = `${chart.canvas.getBoundingClientRect().top + y - chart.canvas.parentElement.getBoundingClientRect().top - 8}px`;
      show(baselineLbl);
    }
  };

  chartInst && chartInst.destroy();
  chartInst=new Chart(scoreCtx,{
    type:"line",
    data:{
      labels,
      datasets:[{
        data,
        borderColor:"#ccc", fill:false, tension:0,
        pointBackgroundColor:colors,
        pointRadius:data.map((_,i)=>i===data.length-1?6:4)
      }]
    },
    options:{
      responsive:true,
      scales:{
        y:{min:-25,max:25,ticks:{stepSize:5}},
        x:{title:{display:true,text:"Today (oldest ↔ newest)"}}
      },
      plugins:{legend:{display:false},tooltip:{enabled:true}}
    },
    plugins:[baselinePlugin]
  });
}

/* ---------- 9.  Show previous results -------------------- */
function showPrev() {
  const h=readHistory(); if(!h.length) return;
  hide(introCard); renderResult(h); show(resultCard);
}

/* ----------10.  Event listeners -------------------------- */
beginBtn  .addEventListener("click", startTest);
restartBtn.addEventListener("click", ()=>{ hide(resultCard); show(introCard); });
questionCard.addEventListener("click",e=>{
  if(e.target.dataset.score!==undefined) handleAnswer(e.target.dataset.score);
});
prevBtn.addEventListener("click", showPrev);

/* ----------11.  First load ------------------------------- */
if(readHistory().length) show(prevBtn);
