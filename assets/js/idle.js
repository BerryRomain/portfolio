document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_v2";
  const PRESTIGE_THRESHOLD = 10000;

  const initialState = {
    games: 0,
    fans: 0,
    money: 0,
    perClick: 1,
    perSecond: 0,
    prestige: 0,
    multiplier: 1,
    achievements: [],
    fanMultiplier: 1,
    perSecondBonus: 1
  };

  const upgrades = [
    { id: "marketing", name: "Campagne marketing", baseCost: 20, cost: 20, effect: () => { state.fans += 5; }, type: "special" },
    { id: "betterDev", name: "Meilleur studio", baseCost: 50, cost: 50, effect: () => { state.perClick += 1; }, type: "click" },
    { id: "devTeam", name: "Équipe de dev", baseCost: 100, cost: 100, effect: () => { state.perSecond += 2; }, type: "auto" },
    { id: "publisher", name: "Grand éditeur", baseCost: 500, cost: 500, effect: () => { state.perSecond += 10; state.fans += 50; }, type: "auto" },
    { id: "fanEvent", name: "Fan Event", baseCost: 1000, requiredFans: 500, cost: 1000, effect: () => { state.perSecond += 20; }, type: "special" },
    { id: "franchise", name: "Franchise à succès", baseCost: 2000, cost: 2000, effect: () => { state.perClick += 10; state.perSecond += 25; }, type: "boost" },
  ];

  const state = { ...initialState };

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
    resetBtn: $("resetBtn")
  };

  const createFloatingText = (text, x, y) => {
    const el = document.createElement("div");
    el.textContent = text;
    el.className = "floating";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.color = "#8b5cf6";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
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

  function saveGame() {
    try {
      const data = {
        state: { ...state },
        upgradesCosts: upgrades.map(u => ({ id: u.id, cost: u.cost }))
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) { console.warn("Erreur sauvegarde :", e); }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.state) Object.assign(state, parsed.state);
      if (parsed.upgradesCosts) parsed.upgradesCosts.forEach(su => {
        const u = upgrades.find(x => x.id === su.id);
        if (u) u.cost = su.cost;
      });
    } catch (e) { console.warn("Erreur chargement :", e); }
  }

  function resetUpgradesToBase() {
    upgrades.forEach(u => u.cost = u.baseCost);
  }

  function updateFansBonus() {
    state.fanMultiplier = 1 + Math.floor(state.fans / 100) * 0.1;
    state.perSecondBonus = 1 + Math.floor(state.fans / 200) * 0.1;
  }

  function render() {
    if (els.games) els.games.textContent = Math.floor(state.games);
    if (els.fans) els.fans.textContent = `${Math.floor(state.fans)} (+${Math.floor((state.fanMultiplier-1)*100)}% perClick, +${Math.floor((state.perSecondBonus-1)*100)}% perSecond)`;
    if (els.money) els.money.textContent = Math.floor(state.money);
    if (els.prestige) els.prestige.textContent = state.prestige;
    if (els.perClick) els.perClick.textContent = state.perClick;
    if (els.perSecond) els.perSecond.textContent = state.perSecond;

    // Upgrades
    if (els.upgrades) {
      els.upgrades.innerHTML = "";
      upgrades.forEach(upg => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.gap = "12px";
        li.style.alignItems = "center";

        const label = document.createElement("div");
        let locked = upg.requiredFans && state.fans < upg.requiredFans;
        label.textContent = `${upg.name} — coût : $${Math.floor(upg.cost)}${locked ? " (requiert " + upg.requiredFans + " fans)" : ""}`;
        label.style.flex = "1";
        label.style.opacity = locked ? 0.5 : 1;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Acheter";
        btn.disabled = state.money < upg.cost || locked;
        btn.addEventListener("click", () => {
          if (state.money >= upg.cost && !locked) {
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
    }

    // Achievements
    checkAchievements();
    if (els.achievements) {
      els.achievements.innerHTML = "";
      state.achievements.forEach(a => {
        const li = document.createElement("li");
        li.textContent = a;
        els.achievements.appendChild(li);
      });
    }

    // Prestige UI
    const canPrestige = state.games >= PRESTIGE_THRESHOLD;
    if (els.prestigeBtn) els.prestigeBtn.disabled = !canPrestige;
    if (els.prestigeNote) els.prestigeNote.textContent = canPrestige
      ? `Prestige disponible — clique pour +0.5x permanent.`
      : `Prestige à ${PRESTIGE_THRESHOLD} jeux (actuellement ${Math.floor(state.games)}).`;

    saveGame();
  }

  // Click principal
  if (els.makeGame) {
    els.makeGame.addEventListener("click", e => {
      const gain = state.perClick * state.multiplier * state.fanMultiplier;
      state.games += gain;
      state.money += gain;
      createFloatingText(`+${Math.floor(gain)}`, e.pageX, e.pageY);
      render();
    });
  }

  // Prestige
  if (els.prestigeBtn) {
    els.prestigeBtn.addEventListener("click", () => {
      if (state.games >= PRESTIGE_THRESHOLD) {
        state.prestige += 1;
        state.multiplier += 0.5 + state.fans / 1000;
        state.games = 0;
        state.money = 0;
        state.fans = 0;
        state.perClick = initialState.perClick;
        state.perSecond = initialState.perSecond;
        resetUpgradesToBase();
        saveGame();
        render();
      }
    });
  }

  // Reset complet
  if (els.resetBtn) {
    els.resetBtn.addEventListener("click", () => {
      if (!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
      localStorage.removeItem(LS_KEY);
      Object.assign(state, initialState);
      resetUpgradesToBase();
      saveGame();
      render();
    });
  }

  // Boost temporaire via fans
  const fanBoostBtn = document.createElement("button");
  fanBoostBtn.textContent = "Boost Fans (×2 perClick 30s) - 100 fans";
  fanBoostBtn.style.position = "fixed";
  fanBoostBtn.style.bottom = "50px";
  fanBoostBtn.style.right = "12px";
  fanBoostBtn.style.zIndex = "999";
  fanBoostBtn.addEventListener("click", () => {
    if (state.fans >= 100) {
      state.fans -= 100;
      state.multiplier *= 2;
      setTimeout(() => { state.multiplier /= 2; }, 30000);
      render();
    } else alert("Pas assez de fans pour le boost !");
  });
  document.body.appendChild(fanBoostBtn);

  // Tick fluide
  let last = performance.now();
  function loop(now) {
    const delta = (now - last) / 1000;
    last = now;

    updateFansBonus();
    const gain = state.perSecond * state.multiplier * state.perSecondBonus * delta;
    state.games += gain;
    state.money += gain;
    state.fans += Math.floor(gain / 2);

    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  loadGame();
  render();
});
