let gridSize = 9;
let mineCount = 10;
let grid = [];
let revealedCount = 0;
let flagsLeft = mineCount;
let timer = 0;
let interval = null;
let gameActive = true;

window.onload = () => {
  const difficultySelect = document.getElementById("difficulty");
  difficultySelect.addEventListener("change", startGame); // Recommence si difficulté change
  startGame(); // Lancer la première partie
};

const gridElement = document.getElementById("grid");
const minesElement = document.getElementById("mines");
const timerElement = document.getElementById("timer");

function startGame() {
  const difficulty = document.getElementById("difficulty")?.value || "medium";

  // Ajuster taille et mines selon difficulté
  switch(difficulty) {
    case "easy":
      gridSize = 6;
      mineCount = 6;
      break;
    case "medium":
      gridSize = 9;
      mineCount = 10;
      break;
    case "hard":
      gridSize = 12;
      mineCount = 20;
      break;
    case "extreme": // 🔥 Nouveau mode
      gridSize = 16;
      mineCount = 50;
      break;
  }

  // Mettre à jour le texte de difficulté
  const difficultyText = { 
    easy: "Facile", 
    medium: "Moyen", 
    hard: "Difficile", 
    extreme: "Extrême 💀" 
  };
  const diffElement = document.getElementById("current-difficulty");
  if(diffElement) diffElement.textContent = `Difficulté actuelle : ${difficultyText[difficulty]}`;

  // Reset
  gridElement.innerHTML = "";
  grid = [];
  revealedCount = 0;
  flagsLeft = mineCount;
  timer = 0;
  gameActive = true;
  clearInterval(interval);
  interval = setInterval(updateTimer, 1000);
  minesElement.textContent = `Mines restantes: ${flagsLeft}`;
  timerElement.textContent = "Temps: 0s";

  // 🔹 Effacer le message précédent
  const messageDiv = document.getElementById("message");
  if(messageDiv) {
    messageDiv.textContent = "";
    messageDiv.style.color = "black";
  }

  // Calculer la taille des cases dynamiquement
  const cellSize = gridSize <= 9 ? 40 : gridSize <= 12 ? 30 : 25;
  gridElement.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
  gridElement.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;

  // Créer les cellules
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.lineHeight = `${cellSize}px`;
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener("click", () => revealCell(row, col));
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleFlag(row, col);
      });
      gridElement.appendChild(cell);

      grid[row][col] = { mine: false, revealed: false, flagged: false, element: cell, adjacentMines: 0 };
    }
  }

  // Placer les mines
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const r = Math.floor(Math.random() * gridSize);
    const c = Math.floor(Math.random() * gridSize);
    if (!grid[r][c].mine) {
      grid[r][c].mine = true;
      minesPlaced++;
    }
  }

  // Calculer les mines adjacentes
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!grid[r][c].mine) {
        grid[r][c].adjacentMines = countAdjacentMines(r, c);
      }
    }
  }
}

function countAdjacentMines(row, col) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && grid[nr][nc].mine) count++;
    }
  }
  return count;
}

function revealCell(row, col) {
  if (!gameActive) return;
  const cell = grid[row][col];
  if (cell.revealed || cell.flagged) return;

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
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) revealCell(r, c);
      }
    }
  } else {
    cell.element.textContent = cell.adjacentMines;
    cell.element.style.color = getNumberColor(cell.adjacentMines);
  }

  checkWin();
}

function toggleFlag(row, col) {
  const cell = grid[row][col];
  if (cell.revealed) return;
  if (cell.flagged) { 
    cell.flagged = false; 
    cell.element.textContent = ""; 
    flagsLeft++; 
  }
  else if (flagsLeft > 0) { 
    cell.flagged = true; 
    cell.element.textContent = "🚩"; 
    flagsLeft--; 
  }
  minesElement.textContent = `Mines restantes: ${flagsLeft}`;
}

function gameOver(won) {
  gameActive = false;
  clearInterval(interval);
  if (!won) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c].mine) {
          grid[r][c].element.classList.add("mine");
          grid[r][c].element.textContent = "💣";
        }
      }
    }
  }

  const messageDiv = document.getElementById("message");
  messageDiv.textContent = won ? "🎉 Bravo, vous avez gagné !" : "💥 Perdu ! Vous avez cliqué sur une mine.";
  messageDiv.style.color = won ? "green" : "red";
}

function checkWin() {
  if (revealedCount === gridSize * gridSize - mineCount) gameOver(true);
}

function updateTimer() { 
  timer++; 
  timerElement.textContent = `Temps: ${timer}s`; 
}

function getNumberColor(num) {
  switch(num){
    case 1: return "blue";
    case 2: return "green";
    case 3: return "red";
    case 4: return "darkblue";
    case 5: return "brown";
    case 6: return "cyan";
    case 7: return "black";
    case 8: return "gray";
    default: return "black";
  }



}


