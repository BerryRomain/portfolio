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

// Conditions de victoire possibles
const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontales
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticales
    [0, 4, 8], [2, 4, 6]            // Diagonales
];

// Met à jour l'affichage de l'état du jeu
statusDisplay.innerHTML = currentPlayerTurn();

// Fonctions de gestion du jeu

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

function checkWinner() {
    let roundWon = false;
    let winningCombo = null;

    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        const a = gameState[winCondition[0]];
        const b = gameState[winCondition[1]];
        const c = gameState[winCondition[2]];
        
        if (a === '' || b === '' || c === '') {
            continue;
        }
        
        if (a === b && b === c) {
            roundWon = true;
            winningCombo = winCondition;
            break;
        }
    }

    if (roundWon) {
        statusDisplay.innerHTML = winningMessage();
        gameActive = false;
        displayWinningLine(winningCombo);
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

function handlePlayerChange() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusDisplay.innerHTML = currentPlayerTurn();
}


function displayWinningLine(winningCombo) {
    const startCell = cells[winningCombo[0]];
    const endCell = cells[winningCombo[2]];

    const boardRect = board.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();
    
    const line = document.createElement('div');
    line.classList.add('winning-line');
    board.appendChild(line); 

    const startX = (startRect.left + startRect.right) / 2 - boardRect.left;
    const startY = (startRect.top + startRect.bottom) / 2 - boardRect.top;
    const endX = (endRect.left + endRect.right) / 2 - boardRect.left;
    const endY = (endRect.top + endRect.bottom) / 2 - boardRect.top;
    
    const width = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    line.style.top = `${startY}px`;
    line.style.left = `${startX}px`;
    line.style.width = `${width}px`;
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transformOrigin = `0 0`; 
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

// Écouteurs d'événements
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', handleRestartGame);