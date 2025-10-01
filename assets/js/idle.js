document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_final";

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
    nextPrestige: 1000000, // seuil initial plus difficile
  };

  // --- Producteurs ---
  const producers = [
    { id: "marketing", name: "Campagne marketing", baseCost: 100, cost: 100, count: 0, rate: 1, upgrades: [
      { name: "Marketing Level 2", required: 10, newRate: 1.5, costFans: 50, purchased: false },
      { name: "Marketing Level 3", required: 50, newRate: 2, costFans: 200, purchased: false },
      { name: "Marketing Level 4", required: 100, newRate: 3, costFans: 500, purchased: false },
    ] },
    { id: "studio", name: "Meilleur studio", baseCost: 1100, cost: 1100, count: 0, rate: 8, upgrades: [
      { name: "Studio Level 2", required: 10, newRate: 10, costFans: 100, purchased: false },
      { name: "Studio Level 3", required: 50, newRate: 13, costFans: 400, purchased: false },
      { name: "Studio Level 4", required: 100, newRate: 16, costFans: 1000, purchased: false },
    ] },
    { id: "devTeam", name: "Équipe de dev", baseCost: 12000, cost: 12000, count: 0, rate: 47, upgrades: [
      { name: "Dev Team Level 2", required: 5, newRate: 60, costFans: 500, purchased: false },
      { name: "Dev Team Level 3", required: 25, newRate: 80, costFans: 1200, purchased: false },
      { name: "Dev Team Level 4", required: 50, newRate: 100, costFans: 3000, purchased: false },
    ] },
    { id: "publisher", name: "Éditeur AAA", baseCost: 130000, cost: 130000, count: 0, rate: 260, upgrades: [
      { name: "Publisher Level 2", required: 2, newRate: 300, costFans: 1000, purchased: false },
      { name: "Publisher Level 3", required: 5, newRate: 400, costFans: 3000, purchased: false },
      { name: "Publisher Level 4", required: 10, newRate: 500, costFans: 8000, purchased: false },
    ] },
    { id: "franchise", name: "Franchise à succès", baseCost: 1400000, cost: 1400000, count: 0, rate: 1400, upgrades: [
      { name: "Franchise Level 2", required: 1, newRate: 1600, costFans: 5000, purchased: false },
      { name: "Franchise Level 3", required: 3, newRate: 2000, costFans: 12000, purchased: false },
      { name: "Franchise Level 4", required: 5, newRate: 2500, costFans: 30000, purchased: false },
    ] },
  ];

  // --- Upgrades de clics ---
  const clickUpgrades = [
    { name: "Souris améliorée", requiredClicks: 50, extraGain: 1, critChanceBonus: 2, purchased: false },
    { name: "Souris optique", requiredClicks: 200, extraGain: 2, critChanceBonus: 3, purchased: false },
    { name: "Clavier réactif", requiredClicks: 500, extraGain: 5, critChanceBonus: 5, purchased: false },
    { name: "Contrôleur avancé", requiredClicks: 1000, extraGain: 10, critChanceBonus: 10, purchased: false },
    { name: "Gants VR", requiredClicks: 2000, extraGain: 15, critChanceBonus: 15, purchased: false },
  ];

  // --- DOM ---
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

  // --- Calcul ---
  function totalRate() {
    return producers.reduce((sum, p) => sum + p.count * p.rate, 0);
  }

  // --- Prestige gain type Cookie Clicker ---
  function calculatePrestigeGain() {
    return Math.floor(Math.sqrt(state.games / 1000000));
  }

  // --- Achievements ---
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
    localStorage.setItem(LS_KEY, JSON.stringify({ state, producers, clickUpgrades }));
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
        prod.upgrades.forEach((u, i) => {
          if (saved.upgrades?.[i]) u.purchased = saved.upgrades[i].purchased;
        });
      }
    });
    parsed.clickUpgrades?.forEach((u, i) => {
      if (clickUpgrades[i]) clickUpgrades[i].purchased = u.purchased;
    });
  }

  // --- UI producteurs ---
  producers.forEach(prod => {
    const li = document.createElement("li");
    li.dataset.id = prod.id;

    const label = document.createElement("div");
    label.className = "label";
    li.appendChild(label);

    const buyBtn = document.createElement("button");
    buyBtn.classList.add("buy-btn");
    buyBtn.textContent = "Acheter";
    buyBtn.addEventListener("click", () => {
      if (state.money >= prod.cost) {
        state.money -= prod.cost;
        prod.count++;
        prod.cost = Math.floor(prod.cost * 1.10); // progression adoucie
        render();
        saveGame();
      }
    });
    li.appendChild(buyBtn);

    const subList = document.createElement("div");
    subList.className = "sub-upgrades";
    prod.upgrades.forEach((u, idx) => {
      const upBtn = document.createElement("button");
      upBtn.classList.add("sub-upgrade-btn");
      upBtn.addEventListener("click", () => {
        const prevPurchased = idx === 0 || prod.upgrades[idx - 1].purchased;
        if (state.fans >= u.costFans && prod.count >= u.required && prevPurchased) {
          state.fans -= u.costFans;
          if (u.newRate > prod.rate) prod.rate = u.newRate;
          u.purchased = true;
          render();
          saveGame();
        }
      });
      subList.appendChild(upBtn);
    });
    li.appendChild(subList);

    els.upgrades.appendChild(li);
  });

  // --- UI upgrades clic ---
  clickUpgrades.forEach((u, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.classList.add("click-upgrade-btn");
    btn.addEventListener("click", () => {
      const prevPurchased = idx === 0 || clickUpgrades[idx - 1].purchased;
      if (state.totalClicks >= u.requiredClicks && prevPurchased && !u.purchased) {
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

  // --- Feedback visuel ---
  function showFloatingText(text, x, y) {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.position = "absolute";
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.pointerEvents = "none";
    span.style.color = "lime";
    span.style.fontWeight = "bold";
    span.style.transition = "all 1s ease-out";
    document.body.appendChild(span);
    requestAnimationFrame(() => {
      span.style.transform = "translateY(-50px)";
      span.style.opacity = "0";
    });
    setTimeout(() => span.remove(), 1000);
  }

  // --- Render ---
  function render() {
    els.games.textContent = Math.floor(state.games);
    els.money.textContent = Math.floor(state.money);
    els.fans.textContent = Math.floor(state.fans);
    els.prestige.textContent = state.prestige;
    els.perClick.textContent = `${state.perClick} (x${state.multiplier.toFixed(2)} prestige)`;
    els.perSecond.textContent = `${totalRate().toFixed(1)} (x${state.multiplier.toFixed(2)})`;

    // producteurs
    producers.forEach(prod => {
      const li = els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      const label = li.querySelector(".label");
      const buyBtn = li.querySelector(".buy-btn");
      label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${prod.rate}/s`;
      buyBtn.disabled = state.money < prod.cost;

      const subBtns = li.querySelectorAll(".sub-upgrade-btn");
      subBtns.forEach((btn, idx) => {
        const u = prod.upgrades[idx];
        const prevPurchased = idx === 0 || prod.upgrades[idx - 1].purchased;
        if (u.purchased) {
          btn.textContent = `${u.name} acheté`;
          btn.disabled = true;
        } else {
          btn.textContent = `${u.name} (${u.newRate}/s) — ${u.costFans} fans`;
          btn.disabled = !(state.fans >= u.costFans && prod.count >= u.required && prevPurchased);
        }
      });
    });

    // click upgrades
    const clickBtns = els.clickUpgradesList.querySelectorAll(".click-upgrade-btn");
    clickBtns.forEach((btn, idx) => {
      const u = clickUpgrades[idx];
      const prevPurchased = idx === 0 || clickUpgrades[idx - 1].purchased;
      if (u.purchased) {
        btn.textContent = `${u.name} acheté`;
        btn.disabled = true;
      } else {
        btn.textContent = `${u.name} (+${u.extraGain}/clic, +${u.critChanceBonus}% crit) — ${u.requiredClicks} clics`;
        btn.disabled = !(state.totalClicks >= u.requiredClicks && prevPurchased);
      }
    });

    // achievements
    checkAchievements();
    els.achievements.innerHTML = "";
    state.achievements.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      els.achievements.appendChild(li);
    });

    // prestige
    const prestigeGain = calculatePrestigeGain();
    const canPrestige = prestigeGain > 0;
    els.prestigeBtn.disabled = !canPrestige;
    els.prestigeNote.textContent = canPrestige
      ? `Prestige disponible — clique pour +${prestigeGain}x permanent`
      : `Prestige à ${state.nextPrestige} jeux (actuellement ${Math.floor(state.games)})`;
  }

  // --- Click principal ---
  els.makeGame.addEventListener("click", e => {
    state.totalClicks++;
    let gain = state.perClick;
    if (Math.random() * 100 < state.critChance) gain *= state.critMultiplier;
    const totalGain = gain * state.multiplier;
    state.games += totalGain;
    state.money += totalGain;
    showFloatingText(`+${totalGain.toFixed(1)}`, e.pageX, e.pageY);
    render();
    saveGame();
  });

  // --- Prestige ---
  els.prestigeBtn.addEventListener("click", () => {
    const prestigeGain = calculatePrestigeGain();
    if (prestigeGain > 0) {
      state.prestige += prestigeGain;
      state.multiplier += prestigeGain * 0.5;
      // Reset
      state.games = 0; state.money = 0; state.fans = 0;
      producers.forEach(p => { p.count = 0; p.cost = p.baseCost; p.upgrades.forEach(u => u.purchased = false); });
      clickUpgrades.forEach(u => u.purchased = false);
      state.perClick = 1; state.totalClicks = 0;
      state.nextPrestige = Math.max(1000000, Math.floor(state.nextPrestige * 1.5));
      render();
      saveGame();
    }
  });

  // --- Reset complet ---
  els.resetBtn?.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
    localStorage.removeItem(LS_KEY);
    Object.assign(state, {
      games: 0, fans: 0, money: 0, prestige: 0,
      multiplier: 1, perClick: 1, totalClicks: 0,
      critChance: 5, critMultiplier: 2,
      achievements: [], nextPrestige: 1000000
    });
    producers.forEach(p => { p.count = 0; p.cost = p.baseCost; p.upgrades.forEach(u => u.purchased = false); });
    clickUpgrades.forEach(u => u.purchased = false);
    saveGame();
    setTimeout(() => location.reload(), 50);
  });

  // --- Boucle principale ---
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
