document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_v6";
  const PRESTIGE_THRESHOLD = 10000;

  const state = {
    games: 0,
    fans: 0,
    money: 0,
    prestige: 0,
    multiplier: 1,
    perClick: 1,
    achievements: [],
  };

  const producers = [
    { id: "marketing", name: "Campagne marketing", baseCost: 20, cost: 20, count: 0, rate: 0.1 },
    { id: "studio", name: "Meilleur studio", baseCost: 65, cost: 65, count: 0, rate: 1 },
    { id: "devTeam", name: "Équipe de dev", baseCost: 130, cost: 130, count: 0, rate: 5 },
    { id: "publisher", name: "Grand éditeur", baseCost: 500, cost: 500, count: 0, rate: 20 },
    { id: "franchise", name: "Franchise à succès", baseCost: 2000, cost: 2000, count: 0, rate: 100 },
  ];

  const $ = id => document.getElementById(id);
  const els = {
    games: $("games"),
    fans: $("fans"),
    money: $("money"),
    prestige: $("prestige"),
    makeGame: $("makeGame"),
    prestigeBtn: $("prestigeBtn"),
    prestigeNote: $("prestigeNote"),
    upgrades: $("upgrades"),
    achievements: $("achievements"),
    perClick: $("perClick"),
    perSecond: $("perSecond"),
    resetBtn: $("resetBtn"),
  };

  if (!els.upgrades) {
    console.error("#upgrades introuvable ! Vérifie que le script est placé après le DOM.");
    return;
  }

  // Création des boutons une seule fois
  producers.forEach(prod => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.gap = "12px";
    li.style.alignItems = "center";

    const label = document.createElement("div");
    label.style.flex = "1";
    li.appendChild(label);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Acheter";
    li.appendChild(btn);

    els.upgrades.appendChild(li);

    
    btn.addEventListener("click", () => {
      if (state.money >= prod.cost) {
        state.money -= prod.cost;
        prod.count++;
        prod.cost = Math.floor(prod.baseCost * Math.pow(1.15, prod.count));
        render();
        saveGame();
      }
    });


    prod._label = label;
    prod._button = btn;
  });

  function totalRate() {
    return producers.reduce((sum, p) => sum + (p.count * p.rate), 0);
  }

  function checkAchievements() {
    const list = [];
    if (state.games >= 10) list.push("10 jeux créés");
    if (state.games >= 100) list.push("100 jeux créés");
    if (state.money >= 1000) list.push("1k$ accumulés");
    if (state.fans >= 500) list.push("500 fans");
    if (totalRate() >= 50) list.push("50 jeux/s");
    state.achievements = list;
  }

  function saveGame() {
    const data = {
      state,
      producers: producers.map(p => ({ id: p.id, cost: p.cost, count: p.count })),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  function loadGame() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed.state);
    if (parsed.producers) {
      parsed.producers.forEach(saved => {
        const prod = producers.find(p => p.id === saved.id);
        if (prod) {
          prod.cost = saved.cost;
          prod.count = saved.count;
        }
      });
    }
  }

  function render() {
    els.games.textContent = Math.floor(state.games);
    els.money.textContent = Math.floor(state.money);
    els.fans.textContent = Math.floor(state.fans);
    els.prestige.textContent = state.prestige;
    els.perClick.textContent = state.perClick;
    els.perSecond.textContent = totalRate().toFixed(1);


    producers.forEach(prod => {
      prod._label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count}`;
      prod._button.disabled = state.money < prod.cost;
    });


    checkAchievements();
    els.achievements.innerHTML = "";
    state.achievements.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      els.achievements.appendChild(li);
    });


    const canPrestige = state.games >= PRESTIGE_THRESHOLD;
    els.prestigeBtn.disabled = !canPrestige;
    els.prestigeNote.textContent = canPrestige
      ? `Prestige disponible — clique pour +0.5x permanent`
      : `Prestige à ${PRESTIGE_THRESHOLD} jeux (actuellement ${Math.floor(state.games)})`;
  }


  els.makeGame.addEventListener("click", () => {
    const gain = state.perClick * state.multiplier;
    state.games += gain;
    state.money += gain;
    render();
    saveGame();
  });


  els.prestigeBtn.addEventListener("click", () => {
    if (state.games >= PRESTIGE_THRESHOLD) {
      state.prestige++;
      state.multiplier += 0.5;
      state.games = 0;
      state.money = 0;
      state.fans = 0;
      producers.forEach(p => { p.count = 0; p.cost = p.baseCost; });
      render();
      saveGame();
    }
  });


  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
    localStorage.removeItem(LS_KEY);
    state.games = 0; state.money = 0; state.fans = 0; state.prestige = 0;
    state.multiplier = 1; state.perClick = 1;
    producers.forEach(p => { p.count = 0; p.cost = p.baseCost; });
    render();
    saveGame();
  });


  let last = performance.now();
  function loop(now) {
    const delta = (now - last) / 1000;
    last = now;

    const gain = totalRate() * state.multiplier * delta;
    state.games += gain;
    state.money += gain;
    state.fans += gain / 10;

    render();
    saveGame();
    requestAnimationFrame(loop);
  }


  loadGame();
  render();
  requestAnimationFrame(loop);
});
