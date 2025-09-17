document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_final";
  const PRESTIGE_THRESHOLD = 10000;

  // --- État initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    prestige: 0,
    multiplier: 1,
    perClick: 1,
    totalClicks: 0,
    critChance: 5,
    critMultiplier: 2,
    achievements: [],
  };

  // --- Producteurs ---
  const producers = [
    { id: "marketing", name: "Campagne marketing", baseCost: 20, cost: 20, count: 0, rate: 0.1 },
    { id: "studio", name: "Meilleur studio", baseCost: 65, cost: 65, count: 0, rate: 1 },
    { id: "devTeam", name: "Équipe de dev", baseCost: 130, cost: 130, count: 0, rate: 5 },
    { id: "publisher", name: "Grand éditeur", baseCost: 500, cost: 500, count: 0, rate: 20 },
    { id: "franchise", name: "Franchise à succès", baseCost: 2000, cost: 2000, count: 0, rate: 100 },
  ];

  // --- Améliorations de clic ---
  const clickUpgrades = [
    { requiredClicks: 50, extraGain: 1, critChanceBonus: 2, purchased: false },
    { requiredClicks: 200, extraGain: 2, critChanceBonus: 3, purchased: false },
    { requiredClicks: 500, extraGain: 5, critChanceBonus: 5, purchased: false },
    { requiredClicks: 1000, extraGain: 10, critChanceBonus: 10, purchased: false },
  ];

  // --- Helpers ---
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
    clickUpgradesList: $("clickUpgrades"),
    achievements: $("achievements"),
    perClick: $("perClick"),
    perSecond: $("perSecond"),
    resetBtn: $("resetBtn"),
  };

  function totalRate() {
    return producers.reduce((sum, p) => sum + p.count * p.rate, 0);
  }

  function checkAchievements() {
    const list = [];
    if (state.games >= 10) list.push("10 jeux créés");
    if (state.games >= 100) list.push("100 jeux créés");
    if (state.money >= 1000) list.push("1k$ accumulés");
    if (state.fans >= 500) list.push("500 fans");
    if (totalRate() >= 50) list.push("50 jeux/s");
    if (state.totalClicks >= 500) list.push("500 clics réalisés");
    state.achievements = list;
  }

  // --- Sauvegarde ---
  function saveGame() {
    localStorage.setItem(LS_KEY, JSON.stringify({
      state,
      producers: producers.map(p => ({
        id: p.id,
        cost: p.cost,
        count: p.count
      })),
      clickUpgrades
    }));
  }

  function loadGame() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed.state);
    parsed.producers?.forEach(saved => {
      const prod = producers.find(p => p.id === saved.id);
      if (prod) {
        prod.cost = saved.cost;
        prod.count = saved.count;
      }
    });
    parsed.clickUpgrades?.forEach((u, i) => {
      if (clickUpgrades[i]) clickUpgrades[i].purchased = u.purchased;
    });
  }

  // --- Init UI Producers ---
  producers.forEach(prod => {
    const li = document.createElement("li");
    li.dataset.id = prod.id;

    const label = document.createElement("span");
    label.className = "label";
    li.appendChild(label);

    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Acheter";
    buyBtn.addEventListener("click", () => {
      if (state.money >= prod.cost) {
        state.money -= prod.cost;
        prod.count++;
        prod.cost = Math.floor(prod.baseCost * Math.pow(1.15, prod.count));
        render();
        saveGame();
      }
    });
    li.appendChild(buyBtn);

    els.upgrades.appendChild(li);
  });

  // --- Init UI Click Upgrades ---
  clickUpgrades.forEach((u, idx) => {
    const li = document.createElement("li");
    li.dataset.id = "click" + idx;

    const btn = document.createElement("button");
    btn.textContent = `Upgrade ${idx+1} (+${u.extraGain}/clic, +${u.critChanceBonus}% crit) — ${u.requiredClicks} clics`;
    btn.addEventListener("click", () => {
      const prevPurchased = idx === 0 || clickUpgrades[idx - 1].purchased;
      if (!u.purchased && state.totalClicks >= u.requiredClicks && prevPurchased) {
        state.perClick += u.extraGain;
        state.critChance += u.critChanceBonus;
        u.purchased = true;
        render();
        saveGame();
      }
    });

    li.appendChild(btn);
    els.clickUpgradesList.appendChild(li);
  });

  // --- Render ---
  function render() {
    els.games.textContent = Math.floor(state.games);
    els.money.textContent = Math.floor(state.money);
    els.fans.textContent = Math.floor(state.fans);
    els.prestige.textContent = state.prestige;
    els.perClick.textContent = `${state.perClick}`;
    els.perSecond.textContent = totalRate().toFixed(1);

    // producers
    producers.forEach(prod => {
      const li = els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      const label = li.querySelector(".label");
      const buyBtn = li.querySelector("button");
      label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${prod.rate}/s`;
      buyBtn.disabled = state.money < prod.cost;
    });

    // click upgrades
    [...els.clickUpgradesList.children].forEach((li, idx) => {
      const u = clickUpgrades[idx];
      const btn = li.querySelector("button");
      const prevPurchased = idx === 0 || clickUpgrades[idx - 1].purchased;
      if (u.purchased) {
        btn.textContent = `Upgrade ${idx+1} acheté`;
        btn.disabled = true;
      } else {
        btn.disabled = !(state.totalClicks >= u.requiredClicks && prevPurchased);
      }
    });

    // succès
    checkAchievements();
    els.achievements.innerHTML = "";
    state.achievements.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      els.achievements.appendChild(li);
    });

    // prestige
    const canPrestige = state.games >= PRESTIGE_THRESHOLD;
    els.prestigeBtn.disabled = !canPrestige;
    els.prestigeNote.textContent = canPrestige
      ? `Prestige disponible — clique pour +0.5x permanent`
      : `Prestige à ${PRESTIGE_THRESHOLD} jeux (actuellement ${Math.floor(state.games)})`;
  }

  // --- Click principal ---
  els.makeGame.addEventListener("click", () => {
    state.totalClicks++;
    let gain = state.perClick;
    if (Math.random() * 100 < state.critChance) gain *= state.critMultiplier;
    state.games += gain * state.multiplier;
    state.money += gain * state.multiplier;
    render();
    saveGame();
  });

  // --- Prestige ---
  els.prestigeBtn.addEventListener("click", () => {
    if (state.games >= PRESTIGE_THRESHOLD) {
      state.prestige++;
      state.multiplier += 0.5;
      state.games = 0;
      state.money = 0;
      state.fans = 0;
      producers.forEach(p => {
        p.count = 0;
        p.cost = p.baseCost;
      });
      clickUpgrades.forEach(u => u.purchased = false);
      state.perClick = 1;
      state.totalClicks = 0;
      render();
      saveGame();
    }
  });

  // --- Reset ---
  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  });

  // --- Boucle ---
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
