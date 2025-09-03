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
    let winningConditionIndex = -1; // Pour stocker l'index de la condition gagnante

    for (let i = 0; i < winningConditions.length; i++) {
        const winCondition = winningConditions[i];
        const a = gameState[winCondition[0]];
        const b = gameState[winCondition[1]];
        const c = gameState[winCondition[2]];
        
        // Si une cellule est vide, on continue
        if (a === '' || b === '' || c === '') {
            continue;
        }
        
        // On vérifie si les 3 symboles sont identiques
        if (a === b && b === c) {
            roundWon = true;
            winningConditionIndex = i; // On sauvegarde l'index
            break;
        }
    }

    if (roundWon) {
        statusDisplay.innerHTML = winningMessage();
        gameActive = false;
        // Appel de la fonction pour afficher la ligne gagnante
        displayWinningLine(winningConditions[winningConditionIndex]);
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


// Fonction pour afficher la ligne gagnante
function displayWinningLine(winCondition) {
    const boardRect = board.getBoundingClientRect(); // Position et taille du plateau
    const firstCell = cells[winCondition[0]].getBoundingClientRect(); // Position de la première cellule gagnante
    
    // Crée l'élément div pour la ligne
    const line = document.createElement('div');
    line.classList.add('winning-line');
    board.appendChild(line);

    // Calculs de positionnement et de rotation
    // Les valeurs (100px) représentent la taille d'une cellule + le gap pour le calcul précis
    const cellWidth = 100;
    const cellGap = 5;
    const totalCellSize = cellWidth + cellGap; // 105px

    // Définir la position et la rotation de la ligne en fonction de la condition de victoire
    if (winCondition[0] === 0 && winCondition[1] === 1 && winCondition[2] === 2) { // Première ligne horizontale
        line.classList.add('horizontal');
        line.style.top = `${totalCellSize / 2 - line.offsetHeight / 2}px`;
        line.style.left = `0px`;
    } else if (winCondition[0] === 3 && winCondition[1] === 4 && winCondition[2] === 5) { // Deuxième ligne horizontale
        line.classList.add('horizontal');
        line.style.top = `${totalCellSize + totalCellSize / 2 - line.offsetHeight / 2}px`;
        line.style.left = `0px`;
    } else if (winCondition[0] === 6 && winCondition[1] === 7 && winCondition[2] === 8) { // Troisième ligne horizontale
        line.classList.add('horizontal');
        line.style.top = `${totalCellSize * 2 + totalCellSize / 2 - line.offsetHeight / 2}px`;
        line.style.left = `0px`;
    } else if (winCondition[0] === 0 && winCondition[1] === 3 && winCondition[2] === 6) { // Première ligne verticale
        line.classList.add('vertical');
        line.style.left = `${totalCellSize / 2 - line.offsetWidth / 2}px`;
        line.style.top = `0px`;
    } else if (winCondition[0] === 1 && winCondition[1] === 4 && winCondition[2] === 7) { // Deuxième ligne verticale
        line.classList.add('vertical');
        line.style.left = `${totalCellSize + totalCellSize / 2 - line.offsetWidth / 2}px`;
        line.style.top = `0px`;
    } else if (winCondition[0] === 2 && winCondition[1] === 5 && winCondition[2] === 8) { // Troisième ligne verticale
        line.classList.add('vertical');
        line.style.left = `${totalCellSize * 2 + totalCellSize / 2 - line.offsetWidth / 2}px`;
        line.style.top = `0px`;
    } else if (winCondition[0] === 0 && winCondition[1] === 4 && winCondition[2] === 8) { // Diagonale de haut-gauche à bas-droite
        line.classList.add('diagonal');
        line.style.top = `${totalCellSize / 2 - line.offsetHeight / 2}px`;
        line.style.left = `0px`;
        line.style.transform = `rotate(45deg)`;
    } else if (winCondition[0] === 2 && winCondition[1] === 4 && winCondition[2] === 6) { // Diagonale de haut-droite à bas-gauche
        line.classList.add('diagonal');
        line.style.top = `${totalCellSize / 2 - line.offsetHeight / 2}px`;
        line.style.left = `${totalCellSize * 2}px`; // Commencer à droite du plateau
        line.style.transform = `rotate(-45deg)`;
    }
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

    // Supprimer toutes les lignes gagnantes existantes
    const existingLines = document.querySelectorAll('.winning-line');
    existingLines.forEach(line => line.remove());
}

// --- Écouteurs d'événements ---

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', handleRestartGame);