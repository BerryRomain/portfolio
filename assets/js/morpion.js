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
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

// Met à jour l'affichage de l'état du jeu
statusDisplay.innerHTML = currentPlayerTurn();

// --- Fonctions de gestion du jeu ---

// Gère le clic sur une cellule
function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-cell-index'));

    // On vérifie si la cellule est déjà jouée ou si le jeu est terminé
    if (gameState[clickedCellIndex] !== "" || !gameActive) {
        return;
    }

    // On met à jour l'état du jeu et on affiche le symbole
    gameState[clickedCellIndex] = currentPlayer;
    clickedCell.innerHTML = currentPlayer;

    // On vérifie si quelqu'un a gagné ou s'il y a match nul
    checkWinner();
}

// Vérifie si un joueur a gagné ou si c'est un match nul
function checkWinner() {
    let roundWon = false;
    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        const a = gameState[winCondition[0]];
        const b = gameState[winCondition[1]];
        const c = gameState[winCondition[2]];
        
        // Si une cellule est vide, on continue
        if (a === '' || b === '' || c === '') {
            continue;
        }
        
        if (a === b && b === c) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        statusDisplay.innerHTML = winningMessage();
        gameActive = false;
        return;
    }

    // On vérifie s'il y a un match nul (si toutes les cellules sont remplies)
    let roundDraw = !gameState.includes("");
    if (roundDraw) {
        statusDisplay.innerHTML = drawMessage();
        gameActive = false;
        return;
    }

    // Si personne n'a gagné, on change de joueur
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
}

// --- Écouteurs d'événements ---

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', handleRestartGame);