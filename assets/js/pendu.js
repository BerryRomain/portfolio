// Dictionnaire de mots à deviner
const mots = [
  "JAVASCRIPT",
  "HTML",
  "CSS",
  "ALGORITHME",
  "DEVELOPPEMENT",
  "PORTFOLIO",
  "PROGRAMMATION",
  "ORDINATEUR",
  "CYBERSECURITE",
  "INTERNET",
  "LOGICIEL",
  "VARIABLE",
  "FONCTION",
  "RESEAU",
  "SECURITE",
  "INFORMATIQUE",
  "APPLICATION",
  "NAVIGATEUR",
  "SERVEUR"
];

// Sélection des éléments HTML
const wordDisplay = document.querySelector("#wordDisplay");
const message = document.querySelector("#message");
const keyboard = document.querySelector("#keyboard");
const restartButton = document.querySelector("#restartButton");
const lives = document.querySelectorAll(".lives span");

// Variables d'état du jeu
let motAdeviner = "";
let motCache = [];
let viesRestantes = 7;
let lettresUtilisees = [];
let jeuTermine = false;

// --- Fonctions de gestion du jeu ---

// Initialise le jeu
function initialiserJeu() {
    // 1. Choisir un mot au hasard
    motAdeviner = mots[Math.floor(Math.random() * mots.length)];

    // 2. Créer le mot caché (tirets)
    motCache = Array(motAdeviner.length).fill("-");
    
    // 3. Réinitialiser les variables
    viesRestantes = 7;
    lettresUtilisees = [];
    jeuTermine = false;

    // 4. Mettre à jour l'affichage
    afficherMot();
    afficherVies();
    afficherMessage("");
    creerClavier();
    restartButton.style.display = "none";
}

// Affiche le mot caché (avec les lettres trouvées)
function afficherMot() {
    wordDisplay.textContent = motCache.join(" ");
}

// Affiche le message de victoire ou de défaite
function afficherMessage(texte) {
    message.textContent = texte;
}


function afficherVies() {
  lives.forEach((life, index) => {
    const estActive = index < viesRestantes;

    // Met à jour l'emoji pour un feedback visuel net
    life.textContent = estActive ? "❤️" : "🤍";

    // Met à jour les classes (couleur/état)
    if (estActive) {
      life.classList.add("active");
      life.classList.remove("lost");
    } else {
      life.classList.remove("active");
      life.classList.add("lost");
    }
  });
}



// Crée le clavier virtuel
function creerClavier() {
    keyboard.innerHTML = "";
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const lettre of alphabet) {
        const key = document.createElement("button");
        key.classList.add("key");
        key.textContent = lettre;
        key.addEventListener("click", () => handleGuess(lettre));
        keyboard.appendChild(key);
    }
}

// Gère la proposition d'une lettre
function handleGuess(lettre) {
    if (jeuTermine || lettresUtilisees.includes(lettre)) {
        return;
    }

    lettresUtilisees.push(lettre);

    const keyElement = document.querySelector(`.key:nth-child(${lettre.charCodeAt(0) - 64})`);

    // Vérifie si la lettre est dans le mot
    if (motAdeviner.includes(lettre)) {
        keyElement.classList.add("correct");
        for (let i = 0; i < motAdeviner.length; i++) {
            if (motAdeviner[i] === lettre) {
                motCache[i] = lettre;
            }
        }
        afficherMot();
    } else {
        keyElement.classList.add("wrong");
        viesRestantes--;
        afficherVies();
    }
    
    keyElement.disabled = true;

    checkGameStatus();
}

// Vérifie si le joueur a gagné ou perdu
function checkGameStatus() {
    // Cas de la victoire
    if (motCache.join("") === motAdeviner) {
        afficherMessage("Félicitations, vous avez gagné ! 🎉");
        jeuTermine = true;
        restartButton.style.display = "block";
    } 
    // Cas de la défaite
    else if (viesRestantes === 0) {
        afficherMessage(`Dommage, vous avez perdu. Le mot était : ${motAdeviner}`);
        jeuTermine = true;
        restartButton.style.display = "block";
    }
}

// --- Événements et initialisation ---

// Ajoute l'écouteur d'événement pour le bouton de redémarrage
restartButton.addEventListener("click", initialiserJeu);

// Initialisation du jeu au chargement de la page
initialiserJeu();