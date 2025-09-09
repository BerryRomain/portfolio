const state = {
  games: 0,
  fans: 0,
  money: 0,
  perClick: 1,
  perSecond: 0,
  prestige: 0,
  multiplier: 1,
  achievements: []
};

const upgrades = [
  { id: "marketing", name: "Campagne marketing", cost: 20, effect: () => { state.fans += 5; }, type: "special" },
  { id: "betterDev", name: "Meilleur studio", cost: 50, effect: () => { state.perClick += 1; }, type: "click" },
  { id: "devTeam", name: "Équipe de dev", cost: 100, effect: () => { state.perSecond += 2; }, type: "auto" },
  { id: "publisher", name: "Grand éditeur", cost: 500, effect: () => { state.perSecond += 10; state.fans += 50; }, type: "auto" },
  { id: "franchise", name: "Franchise à succès", cost: 2000, effect: () => { state.perClick += 10; state.perSecond += 25; }, type: "boost" },
];

const els = {
  games: document.getElementById("games"),
  fans: document.getElementById("fans"),
  money: document.getElementById("money"),
  prestige: document.getElementById("prestige"),
  makeGame: document.getElementById("makeGame"),
  prestigeBtn: document.getElementById("prestigeBtn"),
  upgrades: document.getElementById("upgrades"),
  achievements: document.getElementById("achievements")
};

function checkAchievements() {
  const list = [];
  if (state.games >= 10) list.push("10 jeux créés");
  if (state.games >= 100) list.push("100 jeux créés");
  if (state.money >= 1000) list.push("1k$ accumulés");
  if (state.fans >= 500) list.push("500 fans");
  if (state.perSecond >= 50) list.push("50 jeux/s");

  state.achievements = list;
}

function render() {
  els.games.textContent = state.games;
  els.fans.textContent = state.fans;
  els.money.textContent = state.money;
  els.prestige.textContent = state.prestige;

  els.upgrades.innerHTML = "";
  upgrades.forEach(upg => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `${upg.name} ($${upg.cost})`;
    btn.disabled = state.money < upg.cost;
    btn.onclick = () => {
      if (state.money >= upg.cost) {
        state.money -= upg.cost;
        upg.effect();
        upg.cost = Math.floor(upg.cost * 1.3);
        render();
      }
    };
    li.appendChild(btn);
    els.upgrades.appendChild(li);
  });

  checkAchievements();
  els.achievements.innerHTML = "";
  state.achievements.forEach(a => {
    const li = document.createElement("li");
    li.textContent = a;
    els.achievements.appendChild(li);
  });

  els.prestigeBtn.disabled = state.games < 1000;
}

els.makeGame.addEventListener("click", () => {
  state.games += state.perClick * state.multiplier;
  state.money += state.perClick * state.multiplier;
  render();
});

els.prestigeBtn.addEventListener("click", () => {
  if (state.games >= 1000) {
    state.prestige += 1;
    state.multiplier += 0.5; // Chaque prestige augmente le multiplicateur global
    // Reset soft
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    state.perClick = 1;
    state.perSecond = 0;
    upgrades.forEach(u => { u.cost = Math.floor(u.cost / Math.pow(1.3, state.prestige)); });
    render();
  }
});

// Automatisation
setInterval(() => {
  if (state.perSecond > 0) {
    state.games += state.perSecond * state.multiplier;
    state.money += state.perSecond * state.multiplier;
    state.fans += Math.floor((state.perSecond / 2) * state.multiplier);
    render();
  }
}, 1000);

render();
