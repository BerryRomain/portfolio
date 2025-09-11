document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_v7";
  const PRESTIGE_THRESHOLD = 10000;

  // --- État initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    prestige: 0,
    multiplier: 1,
    perClick: 1,
    achievements: [],
  };

  // --- Producteurs ---
  const producers = [
    {
      id: "marketing",
      name: "Campagne marketing",
      baseCost: 20,
      cost: 20,
      count: 0,
      rate: 0.1,
      upgrades: [
        { required: 10, newRate: 0.2, costFans: 50, purchased: false },
        { required: 50, newRate: 0.3, costFans: 200, purchased: false },
      ]
    },
    {
      id: "studio",
      name: "Meilleur studio",
      baseCost: 65,
      cost: 65,
      count: 0,
      rate: 1,
      upgrades: [
        { required: 5, newRate: 1.5, costFans: 100, purchased: false },
        { required: 25, newRate: 2, costFans: 300, purchased: false },
      ]
    }
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

  // --- Calcul total rate ---
  function totalRate() {
    return producers.reduce((sum, p) => sum + (p.count * p.rate), 0);
  }

  // --- Vérification achievements ---
  function checkAchievements() {
    const list = [];
    if (state.games >= 10) list.push("10 jeux créés");
    if (state.games >= 100) list.push("100 jeux créés");
    if (state.money >= 1000) list.push("1k$ accumulés");
    if (state.fans >= 500) list.push("500 fans");
    if (totalRate() >= 50) list.push("50 jeux/s");
    state.achievements = list;
  }

  // --- Sauvegarde et chargement ---
  function saveGame() {
    const data = {
      state,
      producers: producers.map(p => ({
        id: p.id,
        cost: p.cost,
        count: p.count,
        upgrades: p.upgrades.map(u => ({ purchased: u.purchased }))
      }))
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
          prod.upgrades.forEach((u, i) => {
            if (saved.upgrades[i]) u.purchased = saved.upgrades[i].purchased;
          });
        }
      });
    }
  }

  // --- Construction initiale des producteurs + boutons ---
  producers.forEach(prod => {
    const li = document.createElement("li");
    li.dataset.id = prod.id;

    const topRow = document.createElement("div");
    topRow.style.display = "flex";
    topRow.style.justifyContent = "space-between";

    const label = document.createElement("div");
    label.className = "label";
    topRow.appendChild(label);

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
    topRow.appendChild(buyBtn);

    li.appendChild(topRow);

    const subList = document.createElement("div");
    subList.className = "sub-upgrades";
    prod.upgrades.forEach((u, idx) => {
      const upBtn = document.createElement("button");
      upBtn.dataset.idx = idx;
      upBtn.addEventListener("click", () => {
        const prevPurchased = idx === 0 || prod.upgrades[idx - 1].purchased;
        if (state.fans >= u.costFans && prod.count >= u.required && prevPurchased) {
          state.fans -= u.costFans;
          prod.rate = u.newRate;
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

  // --- Render ---
  function render() {
    els.games.textContent = Math.floor(state.games);
    els.money.textContent = Math.floor(state.money);
    els.fans.textContent = Math.floor(state.fans);
    els.prestige.textContent = state.prestige;
    els.perClick.textContent = `${state.perClick} (x${state.multiplier.toFixed(2)} pour ce prestige)`;
    els.perSecond.textContent = totalRate().toFixed(1);

    // MAJ producteurs et upgrades
    producers.forEach(prod => {
      const li = els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      const label = li.querySelector(".label");
      const buyBtn = li.querySelector("button");

      label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${prod.rate}/s`;
      buyBtn.disabled = state.money < prod.cost;

      const subList = li.querySelector(".sub-upgrades");
      [...subList.children].forEach((btn, idx) => {
        const u = prod.upgrades[idx];
        if (u.purchased) {
          btn.textContent = `Upgrade ${idx + 1} acheté`;
          btn.disabled = true;
        } else {
          const prevPurchased = idx === 0 || prod.upgrades[idx - 1].purchased;
          btn.textContent = `Upgrade ${idx + 1} (${u.newRate}/s) — ${u.costFans} fans`;
          btn.disabled = !(state.fans >= u.costFans && prod.count >= u.required && prevPurchased);
        }
      });
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

  // --- Clic principal ---
  els.makeGame.addEventListener("click", () => {
    const gain = state.perClick * state.multiplier;
    state.games += gain;
    state.money += gain;
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
        p.upgrades.forEach(u => u.purchased = false);
      });
      render();
      saveGame();
    }
  });

  // --- Reset complet ---
  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
    localStorage.removeItem(LS_KEY);
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    state.prestige = 0;
    state.multiplier = 1;
    state.perClick = 1;
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      p.upgrades.forEach(u => u.purchased = false);
    });
    render();
    saveGame();
  });

  // --- Tick fluide ---
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

  // --- Initialisation ---
  loadGame();
  render();
  requestAnimationFrame(loop);

  // Helpers debug
  window.gameDebug = () => ({ state, producers });
  window.forceRender = () => render();
});
