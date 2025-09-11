// idle.js (remplace le fichier précédent)
document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_v8";
  const PRESTIGE_THRESHOLD = 10000;

  // --- Etat initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    prestige: 0,
    multiplier: 1,
    perClick: 1,
    achievements: [],
  };

  // --- Producteurs (avec baseCost/baseRate pour reset propre) ---
  const producers = [
    {
      id: "marketing",
      name: "Campagne marketing",
      baseCost: 20,
      cost: 20,
      count: 0,
      baseRate: 0.1,
      rate: 0.1,
      upgrades: [
        { required: 10, newRate: 0.2, costFans: 50, purchased: false },
        { required: 50, newRate: 0.3, costFans: 200, purchased: false },
        { required: 100, newRate: 0.5, costFans: 500, purchased: false },
      ]
    },
    {
      id: "studio",
      name: "Meilleur studio",
      baseCost: 65,
      cost: 65,
      count: 0,
      baseRate: 1,
      rate: 1,
      upgrades: [
        { required: 5, newRate: 1.5, costFans: 100, purchased: false },
        { required: 25, newRate: 2, costFans: 300, purchased: false },
        { required: 50, newRate: 3, costFans: 700, purchased: false },
      ]
    },
    {
      id: "devTeam",
      name: "Équipe de dev",
      baseCost: 130,
      cost: 130,
      count: 0,
      baseRate: 5,
      rate: 5,
      upgrades: [
        { required: 3, newRate: 7, costFans: 300, purchased: false },
        { required: 10, newRate: 10, costFans: 800, purchased: false },
      ]
    },
    {
      id: "publisher",
      name: "Grand éditeur",
      baseCost: 500,
      cost: 500,
      count: 0,
      baseRate: 20,
      rate: 20,
      upgrades: [
        { required: 2, newRate: 30, costFans: 500, purchased: false },
        { required: 5, newRate: 50, costFans: 1200, purchased: false },
      ]
    },
    {
      id: "franchise",
      name: "Franchise à succès",
      baseCost: 2000,
      cost: 2000,
      count: 0,
      baseRate: 100,
      rate: 100,
      upgrades: [
        { required: 1, newRate: 150, costFans: 1000, purchased: false },
        { required: 3, newRate: 200, costFans: 3000, purchased: false },
      ]
    }
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
    achievements: $("achievements"),
    perClick: $("perClick"),
    perSecond: $("perSecond"),
    resetBtn: $("resetBtn"),
  };

  if (!els.upgrades) {
    console.error("#upgrades introuvable — vérifie ton HTML ou le placement du script.");
    return;
  }

  // --- Helpers ---
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
    try {
      const data = {
        state: {
          games: state.games,
          fans: state.fans,
          money: state.money,
          prestige: state.prestige,
          multiplier: state.multiplier,
          perClick: state.perClick,
        },
        producers: producers.map(p => ({
          id: p.id,
          cost: Number(p.cost),
          count: Number(p.count),
          rate: Number(p.rate),
          upgrades: p.upgrades.map(u => ({ purchased: !!u.purchased }))
        }))
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
        const s = parsed.state;
        state.games = Number(s.games) || 0;
        state.fans = Number(s.fans) || 0;
        state.money = Number(s.money) || 0;
        state.prestige = Number(s.prestige) || 0;
        state.multiplier = Number(s.multiplier) || 1;
        state.perClick = Number(s.perClick) || 1;
      }
      if (parsed.producers && Array.isArray(parsed.producers)) {
        parsed.producers.forEach(saved => {
          const p = producers.find(x => x.id === saved.id);
          if (!p) return;
          p.cost = Number(saved.cost) || p.baseCost;
          p.count = Number(saved.count) || 0;
          p.rate = Number(saved.rate) || p.baseRate;
          if (saved.upgrades && Array.isArray(saved.upgrades)) {
            saved.upgrades.forEach((su, i) => {
              if (p.upgrades[i]) p.upgrades[i].purchased = !!su.purchased;
            });
          }
        });
      }
    } catch (e) {
      console.warn("Erreur chargement :", e);
    }
  }

  // --- Render (re-crée les li chaque fois mais on utilise delegation pour click) ---
  function render() {
    // Stats
    els.games.textContent = Math.floor(state.games);
    els.money.textContent = Math.floor(state.money);
    els.fans.textContent = Math.floor(state.fans);
    els.prestige.textContent = state.prestige;
    els.perClick.textContent = `${state.perClick} (x${state.multiplier.toFixed(2)} pour ce prestige)`;
    els.perSecond.textContent = totalRate().toFixed(1);

    // Upgrades area
    els.upgrades.innerHTML = "";
    producers.forEach((prod, pIndex) => {
      const li = document.createElement("li");
      li.dataset.prodIndex = pIndex;
      li.style.display = "flex";

      li.style.flexDirection = "column";
      li.style.gap = "6px";

      // Top row (label + buy button)
      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.alignItems = "center";
      top.style.gap = "12px";

      const label = document.createElement("div");
      label.style.flex = "1";
      label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${prod.rate}/s`;
      top.appendChild(label);

      const buyBtn = document.createElement("button");
      buyBtn.textContent = "Acheter";
      buyBtn.dataset.action = "buy";
      buyBtn.dataset.prodIndex = pIndex;
      buyBtn.disabled = state.money < prod.cost;
      top.appendChild(buyBtn);

      li.appendChild(top);

      // Sub-upgrades (one button per upgrade)
      const sub = document.createElement("div");
      sub.className = "sub-upgrades";
      prod.upgrades.forEach((u, uIndex) => {
        const upBtn = document.createElement("button");
        upBtn.style.fontSize = "13px";
        upBtn.dataset.action = "upgrade";
        upBtn.dataset.prodIndex = pIndex;
        upBtn.dataset.upIndex = uIndex;


        
        if (u.purchased) {
          upBtn.textContent = `Upgrade ${uIndex + 1} acheté — Prod/unité: ${u.newRate}/s`;
          upBtn.disabled = true;
        } else {
          const prevPurchased = uIndex === 0 ? true : !!prod.upgrades[uIndex - 1].purchased;
          upBtn.textContent = `Upgrade ${uIndex + 1} (${u.newRate}/s) — ${u.costFans} fans (req: ${u.required})`;
          upBtn.disabled = !(prevPurchased && prod.count >= u.required && state.fans >= u.costFans);
        }

        sub.appendChild(upBtn);
      });
      li.appendChild(sub);

      els.upgrades.appendChild(li);
    });

    // Achievements
    checkAchievements();

    els.achievements.innerHTML = "";
    state.achievements.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      els.achievements.appendChild(li);
    });

    // Prestige UI
    const canPrestige = state.games >= PRESTIGE_THRESHOLD;
    els.prestigeBtn.disabled = !canPrestige;
    els.prestigeNote.textContent = canPrestige
      ? `Prestige disponible — clique pour +0.5x permanent`

      : `Prestige à ${PRESTIGE_THRESHOLD} jeux (actuellement ${Math.floor(state.games)})`;
  }

  // --- Delegated click handler for upgrades area ---
  els.upgrades.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const pIndex = Number(btn.dataset.prodIndex);
    if (Number.isNaN(pIndex) || !producers[pIndex]) return;
    const prod = producers[pIndex];

    if (action === "buy") {
      // Acheter un producteur
      if (state.money >= prod.cost) {
        state.money -= prod.cost;
        prod.count++;
        // increase cost exponentially
        prod.cost = Math.floor(prod.baseCost * Math.pow(1.15, prod.count));
        render();
        saveGame();
        return;
      } else {
        // debug
        console.log("Achat refusé — pas assez d'argent", { money: state.money, cost: prod.cost });
      }
    } else if (action === "upgrade") {
      const uIndex = Number(btn.dataset.upIndex);
      if (Number.isNaN(uIndex) || !prod.upgrades[uIndex]) return;
      const u = prod.upgrades[uIndex];
      const prevPurchased = uIndex === 0 ? true : !!prod.upgrades[uIndex - 1].purchased;
      if (!prevPurchased) {
        console.log("Upgrade précédente non achetée");
        return;
      }
      if (prod.count < u.required) {
        console.log("Pas assez de producteurs pour cet upgrade", { have: prod.count, required: u.required });
        return;
      }
      if (state.fans < u.costFans) {
        console.log("Pas assez de fans pour upgrade", { fans: state.fans, costFans: u.costFans });
        return;
      }
      // appliquer upgrade
      state.fans -= u.costFans;
      prod.rate = u.newRate;
      u.purchased = true;
      render();
      saveGame();
      return;
    }
  });

  // --- Main click (création de jeu) ---
  els.makeGame.addEventListener("click", () => {
    const gain = state.perClick * state.multiplier;
    state.games += gain;
    state.money += gain;
    render();
    saveGame();
  });

  // --- Prestige ---
  els.prestigeBtn.addEventListener("click", () => {
    if (state.games < PRESTIGE_THRESHOLD) return;
    state.prestige++;
    state.multiplier += 0.5;
    // soft reset
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      p.rate = p.baseRate;
      p.upgrades.forEach(u => u.purchased = false);
    });
    render();
    saveGame();
  });

  // --- Reset complet ---
  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
    localStorage.removeItem(LS_KEY);
    state.games = 0; state.money = 0; state.fans = 0;
    state.prestige = 0; state.multiplier = 1; state.perClick = 1;
    producers.forEach(p => {
      p.count = 0; p.cost = p.baseCost; p.rate = p.baseRate;
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
    state.fans += gain / 10; // 1 fan pour 10 jeux
    render();
    saveGame();
    requestAnimationFrame(loop);
  }

  // --- Init ---
  loadGame();
  render();
  requestAnimationFrame(loop);

  // Debug helper (optionnel) : tape `gameDebug()` dans la console pour voir l'état
  window.gameDebug = () => ({ state: JSON.parse(JSON.stringify(state)), producers: JSON.parse(JSON.stringify(producers)) });
});
