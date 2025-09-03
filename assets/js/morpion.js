// On sélectionne les éléments HTML du jeu
const board = document.querySelector('.board');
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.querySelector('#status');
const restartButton = document.querySelector('#restartButton');

// État initial du jeu
let gameActive = true;
let currentPlayer = "X";
let gameState = ["", "", "", "", "", "", "", "", ""];

// Messages affichés à l'utilisateur
const winningMessage = () => `Le joueur ${currentPlayer} a gagné ! 🎉`;
const drawMessage = () => `C'est un match nul ! 🤝`;
const currentPlayerTurn = () => `C'est le tour du joueur ${currentPlayer}`;

// Conditions de victoire avec leurs angles de rotation
const winningConditions = [
    { combo: [0, 1, 2], angle: 0 },
    { combo: [3, 4, 5], angle: 0 },
    { combo: [6, 7, 8], angle: 0 },
    { combo: [0, 3, 6], angle: 90 },
    { combo: [1, 4, 7], angle: 90 },
    { combo: [2, 5, 8], angle: 90 },
    { combo: [0, 4, 8], angle: 45 },
    { combo: [2, 4, 6], angle: -45 }
];

// Met à jour l'affichage de l'état du jeu
statusDisplay.innerHTML = currentPlayerTurn();

// --- Fonctions de gestion du jeu ---

// Gère le clic sur une cellule
function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    if (gameState[clickedCellIndex] !== "" || !gameActive) {
        return;
    }

    gameState[clickedCellIndex] = currentPlayer;
    clickedCell.innerHTML = currentPlayer;

    checkWinner();
}

// Fonction pour afficher la ligne gagnante
function displayWinningLine(winCondition) {
    const boardRect = board.getBoundingClientRect();
    const firstCell = cells[winCondition.combo[0]].getBoundingClientRect();
    
    // Crée l'élément div pour la ligne
    const line = document.createElement('div');
    line.classList.add('winning-line');
    document.body.appendChild(line);

    // Positionne et stylise la ligne
    line.style.left = `${firstCell.left}px`;
    line.style.top = `${firstCell.top}px`;
    line.style.width = `${boardRect.width}px`;
    line.style.transform = `rotate(${winCondition.angle}deg)`;
    
    // Ajustements pour les différentes orientations
    if (winCondition.angle === 0) {
        line.style.top = `${firstCell.top + firstCell.height / 2}px`;
        line.style.left = `${boardRect.left}px`;
    } else if (winCondition.angle === 90) {
        line.style.top = `${boardRect.top}px`;
        line.style.left = `${firstCell.left + firstCell.width / 2}px`;
        line.style.height = `${boardRect.height}px`;
        line.style.width = '5px';
    } else if (winCondition.angle === 45) {
        const length = Math.sqrt(Math.pow(boardRect.width, 2) + Math.pow(boardRect.height, 2));
        line.style.width = `${length}px`;
        line.style.top = `${boardRect.top}px`;
        line.style.left = `${boardRect.left}px`;
    } else if (winCondition.angle === -45) {
        const length = Math.sqrt(Math.pow(boardRect.width, 2) + Math.pow(boardRect.height, 2));
        line.style.width = `${length}px`;
        line.style.top = `${boardRect.top}px`;
        line.style.left = `${boardRect.right}px`;
        line.style.transformOrigin = 'right center';
    }
}

// Vérifie si un joueur a gagné ou si c'est un match nul
function checkWinner() {
    let roundWon = false;
    let winningCondition = null;

    for (let i = 0; i < winningConditions.length; i++) {
        const winCombo = winningConditions[i].combo;
        const a = gameState[winCombo[0]];
        const b = gameState[winCombo[1]];
        const c = gameState[winCombo[2]];
        
        if (a === '' || b === '' || c === '') {
            continue;
        }
        
        if (a === b && b === c) {
            roundWon = true;
            winningCondition = winningConditions[i];
            break;
        }
    }

    if (roundWon) {
        statusDisplay.innerHTML = winningMessage();
        gameActive = false;
        displayWinningLine(winningCondition);
        return;
    }

    let roundDraw = !gameState.includes("");
    if (roundDraw) {
        statusDisplay.innerHTML = drawMessage();
        gameActive = false;
        return;
    }

    handlePlayerChange();
}

// Change le joueur actuel (de X à O, et vice-versa)
function handlePlayerChange() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusDisplay.innerHTML = currentPlayerTurn();
}

// Réinitialise le jeu
function handleRestartGame() {
    gameActive = true;
    currentPlayer = "X";
    gameState = ["", "", "", "", "", "", "", "", ""];
    statusDisplay.innerHTML = currentPlayerTurn();
    cells.forEach(cell => cell.innerHTML = "");

    const existingLines = document.querySelectorAll('.winning-line');
    existingLines.forEach(line => line.remove());
}

// --- Écouteurs d'événements ---

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', handleRestartGame);