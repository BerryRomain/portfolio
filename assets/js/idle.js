document.addEventListener("DOMContentLoaded", () => {
  try {
    // --- Constantes / clés ---
    const LS_KEY = "videoGameEmpire_v1";
    const PRESTIGE_THRESHOLD = 10000; // modifier si tu veux un palier différent

    // --- Etat initial ---
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

    // --- Upgrades (baseCost conservé pour reset propre) ---
    const upgrades = [
      { id: "marketing", name: "Campagne marketing", baseCost: 20, cost: 20, effect: () => { state.fans += 5; }, type: "special" },
      { id: "betterDev", name: "Meilleur studio", baseCost: 50, cost: 50, effect: () => { state.perClick += 1; }, type: "click" },
      { id: "devTeam", name: "Équipe de dev", baseCost: 100, cost: 100, effect: () => { state.perSecond += 2; }, type: "auto" },
      { id: "publisher", name: "Grand éditeur", baseCost: 500, cost: 500, effect: () => { state.perSecond += 10; state.fans += 50; }, type: "auto" },
      { id: "franchise", name: "Franchise à succès", baseCost: 2000, cost: 2000, effect: () => { state.perClick += 10; state.perSecond += 25; }, type: "boost" },
    ];

    // --- State (copie de initialState) ---
    const state = { ...initialState };

    // --- DOM Elements (vérification) ---
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

    // Vérifie que les éléments essentiels existent
    if (!els.makeGame) console.warn("Warning: #makeGame introuvable dans le DOM.");
    if (!els.upgrades) console.warn("Warning: #upgrades introuvable dans le DOM.");
    if (!els.games || !els.money || !els.fans) console.warn("Warning: certains compteurs DOM introuvables.");

    // --- Fonctions utiles ---
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
          // On s'assure de garder des nombres
          const ps = parsed.state;
          state.games = Number(ps.games) || 0;
          state.fans = Number(ps.fans) || 0;
          state.money = Number(ps.money) || 0;
          state.perClick = Number(ps.perClick) || initialState.perClick;
          state.perSecond = Number(ps.perSecond) || initialState.perSecond;
          state.prestige = Number(ps.prestige) || 0;
          state.multiplier = Number(ps.multiplier) || 1;
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

    function resetUpgradesToBase() {
      upgrades.forEach(u => u.cost = u.baseCost);
    }

    // --- Render (affichage) ---
    function render() {
      // protège l'affichage
      if (els.games) els.games.textContent = Math.floor(state.games);
      if (els.fans) els.fans.textContent = Math.floor(state.fans);
      if (els.money) els.money.textContent = Math.floor(state.money);
      if (els.prestige) els.prestige.textContent = state.prestige;
      if (els.perClick) els.perClick.textContent = state.perClick;
      if (els.perSecond) els.perSecond.textContent = state.perSecond;

      // upgrades
      if (els.upgrades) {
        els.upgrades.innerHTML = "";
        upgrades.forEach(upg => {
          const li = document.createElement("li");
          li.style.display = "flex";
          li.style.gap = "12px";
          li.style.alignItems = "center";

          const label = document.createElement("div");
          label.textContent = `${upg.name} — coût : $${Math.floor(upg.cost)}`;
          label.style.flex = "1";

          const btn = document.createElement("button");
          btn.type = "button";
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
      }

      // achievements
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
      if (els.prestigeBtn) {
        els.prestigeBtn.disabled = !canPrestige;
      }
      if (els.prestigeNote) {
        els.prestigeNote.textContent = canPrestige
          ? `Prestige disponible — clique pour +0.5x permanent.`
          : `Prestige à ${PRESTIGE_THRESHOLD} jeux (actuellement ${Math.floor(state.games)}).`;
      }

      // Assure que le bouton makeGame est cliquable (si présent)
      if (els.makeGame) {
        els.makeGame.disabled = false;              // ne devrait pas être désactivé
        els.makeGame.style.pointerEvents = "auto"; // force clickable si overlay CSS
      }

      // Sauvegarde
      saveGame();
    }

    // --- Actions des boutons ---
    if (els.makeGame) {
      els.makeGame.addEventListener("click", (e) => {
        // petit feedback visuel optionnel
        try {
          state.games += state.perClick * state.multiplier;
          state.money += state.perClick * state.multiplier;
          render();
        } catch (err) {
          console.error("Erreur lors du clic makeGame :", err);
        }
      });
    } else {
      console.error("Élément makeGame introuvable — le bouton n'existe pas dans le DOM.");
    }

    if (els.prestigeBtn) {
      els.prestigeBtn.addEventListener("click", () => {
        if (state.games >= PRESTIGE_THRESHOLD) {
          state.prestige += 1;
          state.multiplier = +(state.multiplier + 0.5).toFixed(2);
          // soft reset
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

    // Reset complet (bas droite)
    if (els.resetBtn) {
      els.resetBtn.addEventListener("click", () => {
        const ok = confirm("Reset complet : tout sera perdu (y compris le prestige). Confirmer ?");
        if (!ok) return;
        localStorage.removeItem(LS_KEY);
        // reset état
        Object.keys(initialState).forEach(k => state[k] = initialState[k]);
        resetUpgradesToBase();
        saveGame();
        render();
      });
    }

    // --- Automatisation (tick toutes les secondes) ---
    setInterval(() => {
      if (state.perSecond > 0) {
        state.games += state.perSecond * state.multiplier;
        state.money += state.perSecond * state.multiplier;
        state.fans += Math.floor((state.perSecond / 2) * state.multiplier);
        render();
      }
    }, 1000);

    // Auto-save périodique
    setInterval(saveGame, 5000);

    // Load + first render
    loadGame();
    render();

    console.log("idle.js initialisé correctement.");
  } catch (e) {
    console.error("Erreur critique dans idle.js :", e);
  }
});
