// demineur.js - version améliorée : dark mode, best times, chrono précis (démarre au 1er clic)

let gridSize = 9;
let mineCount = 10;
let grid = [];
let revealedCount = 0;
let flagsLeft = mineCount;

let timerInterval = null;
let timerStart = null;
let elapsedBeforePause = 0;
let timerRunning = false;

let gameActive = true;
let currentDifficulty = "medium";

const gridElement = document.getElementById("grid");
const minesElement = document.getElementById("mines");
const timerElement = document.getElementById("timer");
const messageElement = document.getElementById("message");
const difficultySelect = document.getElementById("difficulty");
const newGameButton = document.getElementById("new-game");
const diffDisplay = document.getElementById("current-difficulty");
const bestTimeDisplay = document.getElementById("bestTime");
const darkToggle = document.getElementById("darkToggle");

// key for localStorage
const STORAGE_BEST_KEY = "demineur_best_times_v1";
const STORAGE_DARK_KEY = "demineur_dark_mode_v1";

// load saved dark mode preference
(function applySavedDarkMode(){
  try {
    const dark = localStorage.getItem(STORAGE_DARK_KEY);
    if (dark === "true") { document.body.classList.add("dark"); darkToggle.checked = true; }
  } catch(e){}
})();

// react to toggle
darkToggle?.addEventListener("change", (e) => {
  if (e.target.checked) document.body.classList.add("dark");
  else document.body.classList.remove("dark");
  try { localStorage.setItem(STORAGE_DARK_KEY, e.target.checked ? "true" : "false"); } catch(e){}
});

// start a new game when difficulty changes
difficultySelect?.addEventListener("change", () => {
  startGame();
});

// new game button
newGameButton?.addEventListener("click", () => {
  startGame();
});

// initialize on page load
window.addEventListener("load", () => {
  startGame();
  updateBestTimeDisplay();
});

// format ms -> mm:ss.mmm
function formatTime(ms) {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}.${String(millis).padStart(3,"0")}`;
}

// retrieve best times object from localStorage
function loadBestTimes(){
  try{
    const raw = localStorage.getItem(STORAGE_BEST_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}

function saveBestTimes(obj){
  try{ localStorage.setItem(STORAGE_BEST_KEY, JSON.stringify(obj)); }catch(e){}
}

function updateBestTimeDisplay(){
  const bests = loadBestTimes();
  const key = currentDifficulty;
  if (bests && bests[key] != null) {
    bestTimeDisplay.textContent = formatTime(bests[key]);
  } else {
    bestTimeDisplay.textContent = "—";
  }
}

// Timer control: start only on first reveal
function startTimerIfNeeded(){
  if (timerRunning) return;
  timerRunning = true;
  timerStart = performance.now();
  // reset any previous elapsed
  elapsedBeforePause = 0;
  timerInterval = setInterval(() => {
    const now = performance.now();
    const elapsed = Math.floor(now - timerStart + elapsedBeforePause);
    timerElement.textContent = `Temps: ${formatTime(elapsed)}`;
  }, 50);
}

function stopTimer(){
  if (!timerRunning) return;
  timerRunning = false;
  clearInterval(timerInterval);
  const now = performance.now();
  const elapsed = Math.floor(now - timerStart + elapsedBeforePause);
  return elapsed;
}

function resetTimerDisplay(){
  timerRunning = false;
  clearInterval(timerInterval);
  timerStart = null;
  elapsedBeforePause = 0;
  timerElement.textContent = `Temps: 00:00.000`;
}

// set up a new game
function startGame(){
  currentDifficulty = document.getElementById("difficulty")?.value || "medium";

  // set grid size and mineCount per difficulty
  switch(currentDifficulty) {
    case "easy":
      gridSize = 6; mineCount = 6; break;
    case "medium":
      gridSize = 9; mineCount = 10; break;
    case "hard":
      gridSize = 12; mineCount = 20; break;
    case "extreme":
      gridSize = 16; mineCount = 50; break;
    default:
      gridSize = 9; mineCount = 10;
  }

  // update difficulty text
  const difficultyText = { easy: "Facile", medium: "Moyen", hard: "Difficile", extreme: "Extrême 💀" };
  if (diffDisplay) diffDisplay.textContent = `Difficulté actuelle : ${difficultyText[currentDifficulty] || currentDifficulty}`;

  // reset state
  gridElement.innerHTML = "";
  grid = [];
  revealedCount = 0;
  flagsLeft = mineCount;
  gameActive = true;
  resetTimerDisplay();
  minesElement.textContent = `Mines restantes: ${flagsLeft}`;
  messageElement.textContent = "";
  messageElement.style.color = "";

  // compute cell size dynamically
  const cellSize = gridSize <= 9 ? 40 : gridSize <= 12 ? 32 : 26;
  gridElement.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
  gridElement.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;

  // create grid
  for (let r = 0; r < gridSize; r++){
    grid[r] = [];
    for (let c = 0; c < gridSize; c++){
      const el = document.createElement("div");
      el.className = "cell";
      el.style.width = `${cellSize}px`;
      el.style.height = `${cellSize}px`;
      el.style.lineHeight = `${cellSize}px`;
      el.dataset.row = r;
      el.dataset.col = c;
      // left click
      el.addEventListener("click", () => revealCell(r, c));
      // right click toggle flag
      el.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        toggleFlag(r, c);
      });
      gridElement.appendChild(el);
      grid[r][c] = { mine: false, revealed: false, flagged: false, element: el, adjacentMines: 0 };
    }
  }

  // place mines
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * gridSize);
    const c = Math.floor(Math.random() * gridSize);
    if (!grid[r][c].mine) { grid[r][c].mine = true; placed++; }
  }

  // compute adjacent counts
  for (let r=0;r<gridSize;r++){
    for (let c=0;c<gridSize;c++){
      if (!grid[r][c].mine) grid[r][c].adjacentMines = countAdjacentMines(r,c);
    }
  }

  updateBestTimeDisplay();
}

// count adjacent mines utility
function countAdjacentMines(row, col){
  let cnt = 0;
  for (let dr=-1; dr<=1; dr++){
    for (let dc=-1; dc<=1; dc++){
      if (dr===0 && dc===0) continue;
      const nr = row+dr, nc = col+dc;
      if (nr>=0 && nr<gridSize && nc>=0 && nc<gridSize && grid[nr][nc].mine) cnt++;
    }
  }
  return cnt;
}

function revealCell(row, col){
  if (!gameActive) return;
  const cell = grid[row][col];
  if (!cell || cell.revealed || cell.flagged) return;

  // start timer on first user reveal
  startTimerIfNeeded();

  cell.revealed = true;
  revealedCount++;
  cell.element.classList.add("revealed");

  if (cell.mine) {
    cell.element.classList.add("mine");
    cell.element.textContent = "💣";
    gameOver(false);
    return;
  }

  if (cell.adjacentMines === 0) {
    // flood fill reveal
    for (let r = row-1; r<=row+1; r++){
      for (let c = col-1; c<=col+1; c++){
        if (r>=0 && r<gridSize && c>=0 && c<gridSize){
          if (!grid[r][c].revealed) revealCell(r,c);
        }
      }
    }
  } else {
    cell.element.textContent = cell.adjacentMines;
    const cls = `num-${cell.adjacentMines}`;
    cell.element.classList.add(cls);
  }

  checkWin();
}

function toggleFlag(row, col){
  if (!gameActive) return;
  const cell = grid[row][col];
  if (!cell || cell.revealed) return;
  if (cell.flagged) {
    cell.flagged = false;
    cell.element.classList.remove("flagged");
    cell.element.textContent = "";
    flagsLeft++;
  } else {
    if (flagsLeft <= 0) return;
    cell.flagged = true;
    cell.element.classList.add("flagged");
    cell.element.textContent = "🚩";
    flagsLeft--;
  }
  minesElement.textContent = `Mines restantes: ${flagsLeft}`;
}

function gameOver(won){
  gameActive = false;
  const elapsed = stopTimer(); // ms or undefined
  // reveal all mines on lose
  if (!won) {
    for (let r=0;r<gridSize;r++){
      for (let c=0;c<gridSize;c++){
        if (grid[r][c].mine) {
          grid[r][c].element.classList.add("mine");
          grid[r][c].element.textContent = "💣";
        }
      }
    }
  } else {
    // on win, mark flags for aesthetics
    for (let r=0;r<gridSize;r++){
      for (let c=0;c<gridSize;c++){
        if (grid[r][c].flagged && grid[r][c].mine) {
          grid[r][c].element.classList.add("flagged");
        }
      }
    }
  }

  if (won) {
    messageElement.textContent = `🎉 Bravo, vous avez gagné !`;
    messageElement.style.color = "green";
    // save best time if better
    if (elapsed != null) {
      const bests = loadBestTimes();
      const prev = bests[currentDifficulty];
      if (prev == null || elapsed < prev) {
        bests[currentDifficulty] = elapsed;
        saveBestTimes(bests);
        updateBestTimeDisplay();
        messageElement.textContent += ` Nouveau meilleur temps : ${formatTime(elapsed)} !`;
      } else {
        messageElement.textContent += ` Temps : ${formatTime(elapsed)}. Meilleur : ${formatTime(prev)}.`;
      }
    }
  } else {
    messageElement.textContent = `💥 Perdu ! Vous avez cliqué sur une mine.`;
    messageElement.style.color = "red";
  }
}

function checkWin(){
  if (revealedCount === gridSize * gridSize - mineCount) {
    gameOver(true);
  }
}
