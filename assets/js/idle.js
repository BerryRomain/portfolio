// KEY & CONST
const LS_KEY = "videoGameEmpire_v1";
const PRESTIGE_THRESHOLD = 10000; // palier nécessaire pour activer Prestige (modifiable)

// état initial
const initialState = {
  games: 0,
  fans: 0,
  money: 0,
  perClick: 1,
  perSecond: 0,
  prestige: 0,
  multiplier: 1,
  achievements: []
};

// upgrades — on garde baseCost pour pouvoir reset proprement
const upgrades = [
  { id: "marketing", name: "Campagne marketing", baseCost: 20, cost: 20, effect: () => { state.fans += 5; }, type: "special" },
  { id: "betterDev", name: "Meilleur studio", baseCost: 50, cost: 50, effect: () => { state.perClick += 1; }, type: "click" },
  { id: "devTeam", name: "Équipe de dev", baseCost: 100, cost: 100, effect: () => { state.perSecond += 2; }, type: "auto" },
  { id: "publisher", name: "Grand éditeur", baseCost: 500, cost: 500, effect: () => { state.perSecond += 10; state.fans += 50; }, type: "auto" },
  { id: "franchise", name: "Franchise à succès", baseCost: 2000, cost: 2000, effect: () => { state.perClick += 10; state.perSecond += 25; }, type: "boost" },
];

const state = { ...initialState };

// DOM éléments
const els = {
  games: document.getElementById("games"),
  fans: document.getElementById("fans"),
  money: document.getElementById("money"),
  prestige: document.getElementById("prestige"),
  makeGame: document.getElementById("makeGame"),
  prestigeBtn: document.getElementById("prestigeBtn"),
  prestigeNote: document.getElementById("prestigeNote"),
  upgrades: document.getElementById("upgrades"),
  achievements: document.getElementById("achievements"),
  perClick: document.getElementById("perClick"),
  perSecond: document.getElementById("perSecond"),
  resetBtn: document.getElementById("resetBtn")
};

// ACHIEVEMENTS
function checkAchievements() {
  const list = [];
  if (state.games >= 10) list.push("10 jeux créés");
  if (state.games >= 100) list.push("100 jeux créés");
  if (state.money >= 1000) list.push("1k$ accumulés");
  if (state.fans >= 500) list.push("500 fans");
  if (state.perSecond >= 50) list.push("50 jeux/s");

  state.achievements = list;
}

// SAUVEGARDE / CHARGEMENT
function saveGame() {
  try {
    const data = {
      state: {
        games: state.games,
        fans: state.fans,
        money: state.money,
        perClick: state.perClick,
        perSecond: state.perSecond,
        prestige: state.prestige,
        multiplier: state.multiplier
      },
      upgradesCosts: upgrades.map(u => ({ id: u.id, cost: u.cost }))
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Erreur sauvegarde :", e);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.state) {
      Object.assign(state, parsed.state);
    }
    if (parsed.upgradesCosts && Array.isArray(parsed.upgradesCosts)) {
      parsed.upgradesCosts.forEach(su => {
        const u = upgrades.find(x => x.id === su.id);
        if (u && typeof su.cost === "number") u.cost = su.cost;
      });
    }
  } catch (e) {
    console.warn("Erreur chargement sauvegarde :", e);
  }
}

// RENDER
function render() {
  els.games.textContent = Math.floor(state.games);
  els.fans.textContent = Math.floor(state.fans);
  els.money.textContent = Math.floor(state.money);
  els.prestige.textContent = state.prestige;

  els.perClick.textContent = state.perClick;
  els.perSecond.textContent = state.perSecond;

  // upgrades list
  els.upgrades.innerHTML = "";
  upgrades.forEach(upg => {
    const li = document.createElement("li");
    const label = document.createElement("div");
    label.textContent = `${upg.name} — coût : $${Math.floor(upg.cost)}`;
    label.style.flex = "1";

    const btn = document.createElement("button");
    btn.textContent = "Acheter";
    btn.disabled = state.money < upg.cost;
    btn.addEventListener("click", () => {
      if (state.money >= upg.cost) {
        state.money -= upg.cost;
        upg.effect();
        upg.cost = Math.floor(upg.cost * 1.3);
        saveGame();
        render();
      }
    });

    li.appendChild(label);
    li.appendChild(btn);
    els.upgrades.appendChild(li);
  });

  // achievements
  checkAchievements();
  els.achievements.innerHTML = "";
  state.achievements.forEach(a => {
    const li = document.createElement("li");
    li.textContent = a;
    els.achievements.appendChild(li);
  });

  // prestige UI: only enable when games >= threshold
  const canPrestige = state.games >= PRESTIGE_THRESHOLD;
  els.prestigeBtn.disabled = !canPrestige;
  els.prestigeNote.textContent = canPrestige
    ? `Prestige disponible — clique pour gagner +0.5x permanent.`
    : `Prestige disponible à ${PRESTIGE_THRESHOLD} jeux (actuellement ${Math.floor(state.games)}).`;

  // sauvegarde
  saveGame();
}

// ACTIONS
els.makeGame.addEventListener("click", () => {
  state.games += state.perClick * state.multiplier;
  state.money += state.perClick * state.multiplier;
  render();
});

els.prestigeBtn.addEventListener("click", () => {
  if (state.games >= PRESTIGE_THRESHOLD) {
    state.prestige += 1;
    state.multiplier = +(state.multiplier + 0.5).toFixed(2); // +0.5 permanent
    // reset "soft" : remise à zéro mais réinitialisation des coûts aux valeurs de base
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    state.perClick = initialState.perClick;
    state.perSecond = initialState.perSecond;
    // reset upgrades costs to baseCost
    upgrades.forEach(u => { u.cost = u.baseCost; });
    saveGame();
    render();
  }
});

// Reset complet (incluant prestige)
els.resetBtn.addEventListener("click", () => {
  const ok = confirm("Reset complet : tout sera perdu (y compris le prestige). Confirmer ?");
  if (!ok) return;
  // clear localStorage
  localStorage.removeItem(LS_KEY);
  // reset state
  Object.keys(initialState).forEach(k => {
    state[k] = initialState[k];
  });
  // reset upgrades costs
  upgrades.forEach(u => { u.cost = u.baseCost; });
  saveGame();
  render();
});

// Automatisation (tick toutes les secondes)
setInterval(() => {
  if (state.perSecond > 0) {
    state.games += state.perSecond * state.multiplier;
    state.money += state.perSecond * state.multiplier;
    state.fans += Math.floor((state.perSecond / 2) * state.multiplier);
    render();
  }
}, 1000);

// Auto-save régulier (sécurité)
setInterval(saveGame, 5000);

// Chargement initial + render
loadGame();
render();
