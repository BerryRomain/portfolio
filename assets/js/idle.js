document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_final_v3";

  // --- État initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    crystals: 0,         // cristaux disponibles (à dépenser)
    crystalsTotal: 0,    // cristaux cumulés (nombre de fois qu'on a prestige)
    multiplier: 1,       // utilisé pour la production passive (inchangé ici)
    perClickBase: 1,     // base permanente (appliquée via click skills)
    perClick: 1,         // valeur effective (recalculée via applySkills)
    clickRunExtra: 0,    // run-only click extras sum (from clickUpgrades)
    totalClicks: 0,
    critChanceBase: 5,
    critChance: 5,       // valeur effective (appliquée via skills)
    critMultiplier: 2,
    achievementsUnlocked: [], // achievements pour le run (reset à chaque prestige)
    achievements: [],    // liste affichable (rebuild depuis achievementsUnlocked)
    nextPrestige: 5000000, // seuil initial (5 000 000)
    autoBuyLast: 0,
    autoBuyerEnabled: false,
    // golden removed
  };

  // --- Producteurs (avec origBaseRate pour restaurer au reset) ---
  const producers = [
    {
      id: "marketing",
      name: "Campagne marketing",
      baseCost: 100,
      cost: 100,
      count: 0,
      origBaseRate: 1,
      baseRate: 1,
      rate: 1,
      upgrades: [
        { name: "Marketing Level 2", required: 5, newRate: 1.5, costFans: 50, purchased: false },
        { name: "Marketing Level 3", required: 20, newRate: 2, costFans: 200, purchased: false },
        { name: "Marketing Level 4", required: 50, newRate: 3, costFans: 500, purchased: false },
      ],
    },
    {
      id: "studio",
      name: "Meilleur studio",
      baseCost: 1100,
      cost: 1100,
      count: 0,
      origBaseRate: 8,
      baseRate: 8,
      rate: 8,
      upgrades: [
        { name: "Studio Level 2", required: 10, newRate: 10, costFans: 100, purchased: false },
        { name: "Studio Level 3", required: 50, newRate: 13, costFans: 400, purchased: false },
        { name: "Studio Level 4", required: 100, newRate: 16, costFans: 1000, purchased: false },
      ],
    },
    {
      id: "devTeam",
      name: "Équipe de dev",
      baseCost: 12000,
      cost: 12000,
      count: 0,
      origBaseRate: 47,
      baseRate: 47,
      rate: 47,
      upgrades: [
        { name: "Dev Team Level 2", required: 5, newRate: 60, costFans: 500, purchased: false },
        { name: "Dev Team Level 3", required: 25, newRate: 80, costFans: 1200, purchased: false },
        { name: "Dev Team Level 4", required: 50, newRate: 100, costFans: 3000, purchased: false },
      ],
    },
    {
      id: "publisher",
      name: "Éditeur AAA",
      baseCost: 130000,
      cost: 130000,
      count: 0,
      origBaseRate: 260,
      baseRate: 260,
      rate: 260,
      upgrades: [
        { name: "Publisher Level 2", required: 5, newRate: 300, costFans: 1000, purchased: false },
        { name: "Publisher Level 3", required: 25, newRate: 400, costFans: 3000, purchased: false },
        { name: "Publisher Level 4", required: 50, newRate: 500, costFans: 8000, purchased: false },
      ],
    },
    {
      id: "franchise",
      name: "Franchise à succès",
      baseCost: 1400000,
      cost: 1400000,
      count: 0,
      origBaseRate: 1400,
      baseRate: 1400,
      rate: 1400,
      upgrades: [
        { name: "Franchise Level 2", required: 5, newRate: 1600, costFans: 5000, purchased: false },
        { name: "Franchise Level 3", required: 25, newRate: 2000, costFans: 12000, purchased: false },
        { name: "Franchise Level 4", required: 75, newRate: 2500, costFans: 30000, purchased: false },
      ],
    },
  ];

  // --- Upgrades de clics (noms visibles) ---
  const clickUpgrades = [
    { name: "Souris améliorée", requiredClicks: 50, extraGain: 1, critChanceBonus: 2, purchased: false },
    { name: "Souris optique", requiredClicks: 200, extraGain: 2, critChanceBonus: 3, purchased: false },
    { name: "Clavier réactif", requiredClicks: 500, extraGain: 5, critChanceBonus: 5, purchased: false },
    { name: "Contrôleur avancé", requiredClicks: 1000, extraGain: 10, critChanceBonus: 10, purchased: false },
    { name: "Gants VR", requiredClicks: 2000, extraGain: 15, critChanceBonus: 15, purchased: false },
  ];

  // --- Arbre de compétences (cristaux) ---
  const skills = [
    { id: "click_plus_1", name: "Clic +1", cost: 1, desc: "+1 par clic (permanent)", requires: [], purchased: false },
    { id: "prod_plus_5", name: "+5% production", cost: 1, desc: "+5% production passive", requires: [], purchased: false },
    { id: "prod_plus_10", name: "+10% production", cost: 2, desc: "+10% production passive (nécessite +5%)", requires: ["prod_plus_5"], purchased: false },
    { id: "crit_plus_5", name: "Crit +5%", cost: 1, desc: "+5% chance de critique", requires: [], purchased: false },
    { id: "cost_reduc_3", name: "Réduction coûts -3%", cost: 2, desc: "Réduit les coûts des producteurs de 3%", requires: [], purchased: false },
    { id: "autobuy_basic", name: "Auto-buy basique", cost: 3, desc: "Auto-acheteur basique (achète la plus petite unité si possible toutes les 30s)", requires: [], purchased: false },
  ];

  // --- DOM refs ---
  const $ = id => document.getElementById(id);
  const els = {
    games: $("games"),
    fans: $("fans"),
    money: $("money"),
    makeGame: $("makeGame"),
    prestigeBtn: $("prestigeBtn"),
    prestigeNote: $("prestigeNote"),
    upgrades: $("upgrades"),
    clickUpgradesList: $("clickUpgrades"),
    // achievementsList removed from inline usage; we'll create a modal
    perClick: $("perClick"),
    perSecond: $("perSecond"),
    resetBtn: $("resetBtn"),
  };

  // Add crystals stat near the other stats if missing (we show ONLY this)
  function ensureCrystalsStat() {
    const stats = document.querySelector(".stats");
    if (!stats) return;
    if (document.getElementById("crystalsStat")) return;
    const el = document.createElement("div");
    el.className = "stat";
    el.id = "crystalsStat";
    el.innerHTML = `Cristaux : <span id="crystals">0</span>`;
    stats.appendChild(el);
  }
  ensureCrystalsStat();
  const crystalsSpan = document.getElementById("crystals");

  // --- UI: prestige progress bar & skill modal & achievements modal (shop removed) ---
  const prestigePanel = (document.querySelector(".panel:nth-child(3)")) || null;
  const progressWrapper = document.createElement("div");
  progressWrapper.style.marginTop = "10px";
  progressWrapper.innerHTML = `
    <div id="prestigeProgressBar" style="background:#111; border-radius:8px; height:14px; overflow:hidden; border:1px solid rgba(255,255,255,0.04);">
      <div id="prestigeProgressFill" style="height:100%; width:0%; transition: width 0.25s; background:linear-gradient(90deg,var(--accent),#06b6d4);"></div>
    </div>
    <div id="prestigeProgressText" style="font-size:13px; color:var(--muted); margin-top:6px;"></div>
    <button id="openSkillsBtn" style="margin-top:8px; display:none;">Ouvrir l'arbre des cristaux</button>
    <button id="openAchievementsBtn" style="margin-left:8px; margin-top:8px; display:inline-block;">Succès</button>
  `;
  if (prestigePanel) prestigePanel.appendChild(progressWrapper);
  const progressFill = document.getElementById("prestigeProgressFill");
  const progressText = document.getElementById("prestigeProgressText");
  const openSkillsBtn = document.getElementById("openSkillsBtn");
  const openAchievementsBtn = document.getElementById("openAchievementsBtn");

  const skillModal = document.createElement("div");
  skillModal.id = "skillModal";
  skillModal.style.position = "fixed";
  skillModal.style.left = "50%";
  skillModal.style.top = "50%";
  skillModal.style.transform = "translate(-50%,-50%)";
  skillModal.style.background = "var(--card)";
  skillModal.style.padding = "18px";
  skillModal.style.borderRadius = "10px";
  skillModal.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
  skillModal.style.zIndex = "9999";
  skillModal.style.display = "none";
  skillModal.style.minWidth = "360px";
  skillModal.innerHTML = `<h3 style="margin-top:0;color:var(--accent)">Arbre des cristaux</h3>
    <div id="skillList" style="display:grid;gap:8px; max-height:380px; overflow:auto;"></div>
    <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
      <button id="closeSkillModal">Fermer</button>
    </div>
  `;
  document.body.appendChild(skillModal);
  const skillList = document.getElementById("skillList");
  const closeSkillModal = document.getElementById("closeSkillModal");

  // Achievements modal
  const achModal = document.createElement("div");
  achModal.id = "achModal";
  achModal.style.position = "fixed";
  achModal.style.left = "50%";
  achModal.style.top = "50%";
  achModal.style.transform = "translate(-50%,-50%)";
  achModal.style.background = "var(--card)";
  achModal.style.padding = "18px";
  achModal.style.borderRadius = "10px";
  achModal.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
  achModal.style.zIndex = "9999";
  achModal.style.display = "none";
  achModal.style.minWidth = "420px";
  achModal.innerHTML = `<h3 style="margin-top:0;color:var(--accent)">Succès</h3>
    <div id="achLists" style="display:grid;grid-template-columns:1fr 1fr;gap:12px; max-height:380px; overflow:auto;">
      <div>
        <h4>Débloqués</h4>
        <ul id="achUnlocked" style="min-height:40px"></ul>
      </div>
      <div>
        <h4>À faire</h4>
        <ul id="achLocked" style="min-height:40px"></ul>
      </div>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
      <button id="closeAchModal">Fermer</button>
    </div>
  `;
  document.body.appendChild(achModal);
  const achUnlocked = document.getElementById("achUnlocked");
  const achLocked = document.getElementById("achLocked");
  const closeAchModal = document.getElementById("closeAchModal");

  // --- Calculs auxiliaires ---
  function totalRate() {
    return producers.reduce((sum, p) => sum + p.count * p.rate, 0);
  }

  function computeProdMultiplierFromSkills() {
    let prodMultiplier = 1;
    skills.forEach(s => {
      if (!s.purchased) return;
      if (s.id === "prod_plus_5") prodMultiplier *= 1.05;
      if (s.id === "prod_plus_10") prodMultiplier *= 1.10;
    });
    // keep crystalsTotal effect on production (unchanged): multiplier = 1 + crystalsTotal * 0.15
    prodMultiplier *= (1 + (state.crystalsTotal || 0) * 0.15);
    return prodMultiplier;
  }

  function computeCostReductionFromSkills() {
    let reducer = 1;
    if (skills.find(s => s.id === "cost_reduc_3" && s.purchased)) reducer *= 0.97;
    return reducer;
  }

  function canGainCrystal() {
    return state.games >= state.nextPrestige;
  }

  // --- Rebuild perClickBase from purchased skills only (permanent) ---
  function rebuildPerClickBaseFromSkills() {
    let base = 1;
    const sk = skills.find(s => s.id === "click_plus_1");
    if (sk && sk.purchased) base += 1;
    state.perClickBase = base;
  }

  // --- Apply skills (recalculate perClick, rates, costs, crit) ---
  function applySkills() {
    // Rebuild permanent base
    rebuildPerClickBaseFromSkills();

    // crit
    state.critChance = state.critChanceBase;
    if (skills.find(s => s.id === "crit_plus_5" && s.purchased)) state.critChance += 5;

    // producers: compute multiplier from skills + crystalsTotal production bonus
    const prodMultiplier = computeProdMultiplierFromSkills();

    producers.forEach(p => {
      p.baseRate = p.origBaseRate;
      let effectiveRate = p.baseRate * prodMultiplier;
      p.upgrades.forEach(u => {
        if (u.purchased) {
          const upgradedRate = u.newRate * prodMultiplier;
          if (upgradedRate > effectiveRate) effectiveRate = upgradedRate;
        }
      });
      p.rate = effectiveRate;
    });

    // costs: apply scaling and any cost reduction skill
    const costReduction = computeCostReductionFromSkills();
    producers.forEach(p => {
      p.cost = Math.floor(p.baseCost * Math.pow(1.10, p.count));
      p.cost = Math.max(1, Math.floor(p.cost * costReduction));
    });

    state.autoBuyerEnabled = !!skills.find(s => s.id === "autobuy_basic" && s.purchased);

    // run-only click upgrades: sum extraGain where purchased
    let runClickExtra = 0;
    clickUpgrades.forEach(u => { if (u.purchased) runClickExtra += u.extraGain; });
    state.clickRunExtra = runClickExtra;

    // CLICK calculation:
    // per-user request earlier: "clic de base (1) * 1.25 (augmente par nombre de prestige) + upgrade skill tree"
    // Implementing: perClick = (perClickBase + run extras) * (1.25 ^ crystalsTotal)
    // (Production still uses multiplier = 1 + crystalsTotal * 0.15)
    const perClickPrestigeMult = Math.pow(1.25, state.crystalsTotal || 0);
    state.perClick = (state.perClickBase + state.clickRunExtra) * perClickPrestigeMult;
  }

  // --- Achievements definitions (used both for checking & modal listing) ---
  const ACH_CANDIDATES = [
    { id: "money_1k", check: () => state.money >= 1_000, text: "1k$ accumulés" },
    { id: "money_100k", check: () => state.money >= 100_000, text: "100k$ accumulés" },
    { id: "money_1m", check: () => state.money >= 1_000_000, text: "1M$ accumulés" },
    { id: "fans_1k", check: () => state.fans >= 1000, text: "1000 fans" },
    { id: "clicks_100", check: () => state.totalClicks >= 100, text: "100 clics réalisés" },
    { id: "games_100", check: () => state.games >= 100, text: "100 jeux créés" },
    { id: "have_10_marketing", check: () => producers.find(p => p.id === "marketing").count >= 10, text: "10 Campagnes marketing" },
    { id: "have_10_studio", check: () => producers.find(p => p.id === "studio").count >= 10, text: "10 Studios" },
    { id: "have_25_publisher", check: () => producers.find(p => p.id === "publisher").count >= 25, text: "25 Éditeurs AAA" },
  ];

  // --- Achievements: check & unlock (reset on prestige as requested) ---
  function checkAndUnlockAchievements() {
    ACH_CANDIDATES.forEach(c => {
      try {
        if (c.check() && !state.achievementsUnlocked.includes(c.id)) {
          state.achievementsUnlocked.push(c.id);
        }
      } catch (e) {
        // guard against candidate check errors
        console.warn("Achievement check error:", e);
      }
    });

    state.achievements = state.achievementsUnlocked.map(id => {
      const found = ACH_CANDIDATES.find(c => c.id === id);
      return found ? found.text : id;
    });
  }

  // --- Rebuild achievements modal content ---
  function rebuildAchievementsModal() {
    if (!achUnlocked || !achLocked) return;
    achUnlocked.innerHTML = "";
    achLocked.innerHTML = "";

    const unlockedSet = new Set(state.achievementsUnlocked);
    ACH_CANDIDATES.forEach(c => {
      const li = document.createElement("li");
      li.textContent = c.text;
      if (unlockedSet.has(c.id)) {
        achUnlocked.appendChild(li);
      } else {
        // locked: show faded
        li.style.opacity = "0.45";
        achLocked.appendChild(li);
      }
    });
  }

  // --- Save / Load (no shop state) ---
  function saveGame() {
    const payload = {
      state: {
        games: state.games,
        fans: state.fans,
        money: state.money,
        crystals: state.crystals,
        crystalsTotal: state.crystalsTotal,
        multiplier: state.multiplier,
        perClickBase: state.perClickBase,
        totalClicks: state.totalClicks,
        critChanceBase: state.critChanceBase,
        critMultiplier: state.critMultiplier,
        achievementsUnlocked: state.achievementsUnlocked,
        nextPrestige: state.nextPrestige,
        autoBuyLast: state.autoBuyLast,
        autoBuyerEnabled: state.autoBuyerEnabled,
      },
      producers,
      clickUpgrades,
      skills,
    };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Save failed:", e);
    }
  }

  function loadGame() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);

      if (parsed.state) {
        Object.keys(parsed.state).forEach(k => {
          if (k in state) state[k] = parsed.state[k];
        });
      }

      parsed.producers?.forEach(saved => {
        const prod = producers.find(p => p.id === saved.id);
        if (prod) {
          prod.cost = saved.cost ?? prod.cost;
          prod.count = saved.count ?? prod.count;
          prod.upgrades.forEach((u, i) => {
            u.purchased = !!(saved.upgrades?.[i] && saved.upgrades[i].purchased);
          });
        }
      });

      parsed.clickUpgrades?.forEach((u, i) => { if (clickUpgrades[i]) clickUpgrades[i].purchased = !!u.purchased; });

      parsed.skills?.forEach((s, i) => { if (skills[i]) skills[i].purchased = !!s.purchased; });

      if (parsed.state?.achievementsUnlocked) {
        state.achievementsUnlocked = parsed.state.achievementsUnlocked || [];
      }

      // ensure production multiplier corresponds to crystalsTotal on load
      state.multiplier = 1 + (state.crystalsTotal || 0) * 0.15;

      applySkills();
    } catch (e) {
      console.warn("Load failed:", e);
    }
  }

  // --- UI producteurs init ---
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
        prod.cost = Math.floor(prod.baseCost * Math.pow(1.10, prod.count));
        applySkills();
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
        if (state.fans >= u.costFans && prod.count >= u.required && prevPurchased && !u.purchased) {
          state.fans -= u.costFans;
          u.purchased = true;
          applySkills();
          render();
          saveGame();
        }
      });
      subList.appendChild(upBtn);
    });
    li.appendChild(subList);

    els.upgrades.appendChild(li);
  });

  // --- UI click upgrades init ---
  clickUpgrades.forEach((u, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.classList.add("click-upgrade-btn");
    btn.addEventListener("click", () => {
      const prevPurchased = idx === 0 || clickUpgrades[idx - 1].purchased;
      if (state.totalClicks >= u.requiredClicks && prevPurchased && !u.purchased) {
        u.purchased = true;
        // run-only upgrades: applySkills will sum them as run extras
        applySkills();
        render();
        saveGame();
      }
    });
    li.appendChild(btn);
    els.clickUpgradesList.appendChild(li);
  });

  // --- skill modal UI population ---
  function rebuildSkillList() {
    skillList.innerHTML = "";
    skills.forEach(s => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "6px";
      row.style.borderRadius = "6px";

      const left = document.createElement("div");
      left.innerHTML = `<strong>${s.name}</strong><div style="font-size:12px;color:var(--muted)">${s.desc}</div>`;
      row.appendChild(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "8px";
      right.style.alignItems = "center";

      const cost = document.createElement("div");
      cost.textContent = `${s.cost} ✨`;
      cost.style.fontSize = "13px";
      cost.style.color = "var(--muted)";
      right.appendChild(cost);

      const btn = document.createElement("button");
      btn.textContent = s.purchased ? "Acheté" : "Acheter";
      btn.disabled = s.purchased || !isSkillAvailable(s);
      btn.addEventListener("click", () => {
        if (s.purchased) return;
        if (!isSkillAvailable(s)) return;
        if (state.crystals < s.cost) {
          alert("Pas assez de cristaux.");
          return;
        }
        state.crystals -= s.cost;
        s.purchased = true;
        applySkills();
        saveGame();
        rebuildSkillList();
        render();
      });
      right.appendChild(btn);

      row.appendChild(right);
      skillList.appendChild(row);
    });
  }

  function isSkillAvailable(skill) {
    const ok = skill.requires.every(rid => {
      const req = skills.find(s => s.id === rid);
      return req && req.purchased;
    });
    return ok;
  }

  openSkillsBtn?.addEventListener("click", () => {
    rebuildSkillList();
    skillModal.style.display = "block";
  });
  closeSkillModal.addEventListener("click", () => skillModal.style.display = "none");

  // Achievements modal handlers
  openAchievementsBtn?.addEventListener("click", () => {
    rebuildAchievementsModal();
    achModal.style.display = "block";
  });
  closeAchModal.addEventListener("click", () => achModal.style.display = "none");

  // --- Floating text ---
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

  // --- Render (robust update for #crystals) ---
  function render() {
    if (els.games) els.games.textContent = Math.floor(state.games);
    if (els.money) els.money.textContent = Math.floor(state.money);
    if (els.fans) els.fans.textContent = Math.floor(state.fans);

    // Show ONLY crystals
    if (crystalsSpan) crystalsSpan.textContent = state.crystals;

    // Ensure perClick display
    if (els.perClick) els.perClick.textContent = `${state.perClick.toFixed(2)} (prestiges: ${state.crystalsTotal})`;

    // perSecond using production multiplier already computed by applySkills via producers.rate
    if (els.perSecond) {
      // compute production multiplier shown for clarity
      const prodPerSec = totalRate();
      const prodMultiplierShown = (1 + (state.crystalsTotal || 0) * 0.15);
      els.perSecond.textContent = `${(prodPerSec).toFixed(2)} (prod mult x${prodMultiplierShown.toFixed(2)})`;
    }

    // producers
    const displayProdMultiplier = computeProdMultiplierFromSkills();
    producers.forEach(prod => {
      const li = els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      if (!li) return;
      const label = li.querySelector(".label");
      const buyBtn = li.querySelector(".buy-btn");
      label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${prod.rate.toFixed(2)}/s`;
      buyBtn.disabled = state.money < prod.cost;

      const subBtns = li.querySelectorAll(".sub-upgrade-btn");
      subBtns.forEach((btn, idx) => {
        const u = prod.upgrades[idx];
        const prevPurchased = idx === 0 || prod.upgrades[idx - 1].purchased;
        if (u.purchased) {
          btn.textContent = `${u.name} acheté`;
          btn.disabled = true;
        } else {
          const eff = (u.newRate * displayProdMultiplier).toFixed(2);
          btn.textContent = `${u.name} (${eff}/s) — ${u.costFans} fans — req: ${u.required}`;
          btn.disabled = !(state.fans >= u.costFans && prod.count >= u.required && prevPurchased);
        }
      });
    });

    // click upgrades display
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

    // achievements display updated in modal only
    checkAndUnlockAchievements();

    // progress bar
    const progress = (state.nextPrestige > 0) ? Math.min(1, state.games / state.nextPrestige) : 0;
    if (progressFill) progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
    if (progressText) progressText.textContent = `${Math.floor(state.games)} / ${state.nextPrestige} jeux (${(progress * 100).toFixed(1)}%)`;

    // open skills button visible if ever prestiged (crystalsTotal>0)
    if (openSkillsBtn) {
      openSkillsBtn.style.display = state.crystalsTotal > 0 ? "inline-block" : "none";
      openSkillsBtn.disabled = state.crystals <= 0;
    }

    // prestige availability
    const canPrest = canGainCrystal();
    if (els.prestigeBtn) els.prestigeBtn.disabled = !canPrest;
    if (els.prestigeNote) els.prestigeNote.textContent = canPrest
      ? `Prestige disponible — clique pour gagner 1 cristal`
      : `Prestige requis : ${state.nextPrestige} jeux (actuellement ${Math.floor(state.games)})`;
  }

  // --- Main click ---
  els.makeGame.addEventListener("click", e => {
    state.totalClicks++;
    applySkills(); // ensure state.perClick is fresh
    let gain = state.perClick;
    // crit
    if (Math.random() * 100 < state.critChance) gain *= state.critMultiplier;
    const totalGain = gain;
    state.games += totalGain;
    state.money += totalGain;
    showFloatingText(`+${totalGain.toFixed(1)}`, e.pageX, e.pageY);
    render();
    saveGame();
  });

  // --- Prestige: 1 cristal per prestige, threshold growth; resets run upgrades ---
  els.prestigeBtn.addEventListener("click", () => {
    if (!canGainCrystal()) return;

    // grant 1 crystal (available) and increment total
    state.crystals += 1;
    state.crystalsTotal += 1;

    // update production multiplier (we keep old behavior for production)
    state.multiplier = 1 + state.crystalsTotal * 0.15;

    // Reset run progress, persist ONLY skills & crystals & crystalsTotal
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    state.totalClicks = 0;

    // reset producers counts/costs and reset run-upgrades purchased flag
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      p.baseRate = p.origBaseRate;
      p.rate = p.baseRate;
      p.upgrades.forEach(u => u.purchased = false);
    });

    // reset clickUpgrades (they are NOT permanent now)
    clickUpgrades.forEach(u => u.purchased = false);

    // reset achievements on prestige (as requested)
    state.achievementsUnlocked = [];
    state.achievements = [];

    // increase nextPrestige
    state.nextPrestige = Math.max(5000000, Math.floor(state.nextPrestige * 2.5 + state.crystalsTotal * 500000));

    // rebuild perClick base from skills, apply skills
    rebuildPerClickBaseFromSkills();
    applySkills();

    render();
    saveGame();

    // open skill modal so player can spend crystal immediately
    rebuildSkillList();
    skillModal.style.display = "block";
  });

  // --- Full reset (wipe everything) ---
  els.resetBtn?.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris les cristaux).")) return;
    localStorage.removeItem(LS_KEY);
    Object.assign(state, {
      games: 0, fans: 0, money: 0, crystals: 0, crystalsTotal: 0,
      multiplier: 1, perClickBase: 1, perClick: 1, clickRunExtra: 0, totalClicks: 0,
      critChanceBase: 5, critChance: 5, critMultiplier: 2, achievementsUnlocked: [], achievements: [],
      nextPrestige: 5000000, autoBuyLast: 0, autoBuyerEnabled: false,
    });
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      p.upgrades.forEach(u => u.purchased = false);
      p.baseRate = p.origBaseRate;
      p.rate = p.baseRate;
    });
    clickUpgrades.forEach(u => u.purchased = false);
    skills.forEach(s => s.purchased = false);
    applySkills();
    saveGame();
    setTimeout(() => location.reload(), 80);
  });

  // --- Auto-buy logic (unlocked via skill) ---
  function tryAutoBuy() {
    if (!state.autoBuyerEnabled) return;
    const now = Date.now();
    if (!state.autoBuyLast) state.autoBuyLast = 0;
    if (now - state.autoBuyLast < 30000) return; // 30s cooldown
    const affordable = producers.filter(p => state.money >= p.cost);
    if (affordable.length === 0) {
      state.autoBuyLast = now;
      return;
    }
    affordable.sort((a, b) => a.cost - b.cost);
    const item = affordable[0];
    state.money -= item.cost;
    item.count++;
    item.cost = Math.floor(item.baseCost * Math.pow(1.10, item.count));
    state.autoBuyLast = now;
    saveGame();
    render();
  }

  // --- Loop ---
  let last = performance.now();
  function loop(now) {
    const delta = (now - last) / 1000;
    last = now;

    // production tick (no golden)
    const gain = totalRate() * state.multiplier * delta;
    state.games += gain;
    state.money += gain;
    state.fans += gain / 10;

    tryAutoBuy();
    applySkills();
    render();
    saveGame();
    requestAnimationFrame(loop);
  }

  /* ---------- Dev panel (toggle Ctrl+D) ---------- */
  (function installDevPanel(){
    let devVisible = false;
    const panelId = "devPanel";

    function createPanel() {
      if (document.getElementById(panelId)) return;
      const p = document.createElement("div");
      p.id = panelId;
      p.style.position = "fixed";
      p.style.right = "12px";
      p.style.top = "12px";
      p.style.zIndex = "99999";
      p.style.background = "rgba(0,0,0,0.8)";
      p.style.color = "#fff";
      p.style.padding = "10px";
      p.style.borderRadius = "8px";
      p.style.minWidth = "220px";
      p.style.fontSize = "13px";
      p.style.boxShadow = "0 6px 20px rgba(0,0,0,0.6)";

      p.innerHTML = `
        <div style="font-weight:700;margin-bottom:8px">DEV PANEL</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button id="devGiveMoney">+1 000 000 $</button>
          <button id="devGiveCryst">+1 cristal</button>
          <button id="devAddAllProd">+1 à chaque producteur</button>
          <button id="devMaxProds">+10 à chaque producteur</button>
          <button id="devToggleAuto">Toggle Auto-buy</button>
          <button id="devResetRun">Reset run (prestige-like)</button>
          <button id="devExport">Exporter save (console)</button>
          <button id="devImport">Importer save (invite)</button>
          <button id="devClose" style="background:#b33;color:#fff">Fermer</button>
        </div>
        <div id="devInfo" style="margin-top:8px;font-size:12px;color:#ddd"></div>
      `;
      document.body.appendChild(p);

      p.querySelector("#devGiveMoney").addEventListener("click", () => {
        state.money = (state.money || 0) + 1_000_000;
        render(); saveGame();
      });
      p.querySelector("#devGiveCryst").addEventListener("click", () => {
        state.crystals = (state.crystals || 0) + 1;
        state.crystalsTotal = (state.crystalsTotal || 0);
        applySkills(); render(); saveGame();
      });
      p.querySelector("#devAddAllProd").addEventListener("click", () => {
        producers.forEach(pr => { pr.count = (pr.count||0) + 1; pr.cost = Math.floor(pr.baseCost * Math.pow(1.10, pr.count)); });
        applySkills(); render(); saveGame();
      });
      p.querySelector("#devMaxProds").addEventListener("click", () => {
        producers.forEach(pr => { pr.count = (pr.count||0) + 10; pr.cost = Math.floor(pr.baseCost * Math.pow(1.10, pr.count)); });
        applySkills(); render(); saveGame();
      });
      p.querySelector("#devToggleAuto").addEventListener("click", () => {
        state.autoBuyerEnabled = !state.autoBuyerEnabled;
        render(); saveGame();
      });
      p.querySelector("#devResetRun").addEventListener("click", () => {
        state.games = 0; state.money = 0; state.fans = 0; state.totalClicks = 0;
        producers.forEach(p => { p.count = 0; p.cost = p.baseCost; p.upgrades.forEach(u => u.purchased = false); });
        clickUpgrades.forEach(u => u.purchased = false);
        state.achievementsUnlocked = []; state.achievements = [];
        applySkills(); render(); saveGame();
      });
      p.querySelector("#devExport").addEventListener("click", () => {
        try {
          const data = JSON.stringify({ state, producers, clickUpgrades, skills });
          console.log("SAVE EXPORT:", data);
          const info = p.querySelector("#devInfo");
          info.textContent = "Save affiché dans la console (CTRL+SHIFT+J).";
        } catch(e) { console.warn(e); }
      });
      p.querySelector("#devImport").addEventListener("click", () => {
        const input = prompt("Colle ici le JSON de la sauvegarde à importer :");
        if (!input) return;
        try {
          const parsed = JSON.parse(input);
          if (parsed.state) {
            Object.keys(parsed.state).forEach(k => { if (k in state) state[k] = parsed.state[k]; });
          }
          if (parsed.producers) {
            parsed.producers.forEach(saved => {
              const prod = producers.find(p => p.id === saved.id);
              if (prod) { prod.count = saved.count || prod.count; prod.cost = saved.cost || prod.cost; prod.upgrades.forEach((u,i)=>{ u.purchased = !!(saved.upgrades?.[i]?.purchased); }); }
            });
          }
          if (parsed.clickUpgrades) parsed.clickUpgrades.forEach((u,i) => { if (clickUpgrades[i]) clickUpgrades[i].purchased = !!u.purchased; });
          if (parsed.skills) parsed.skills.forEach((s,i) => { if (skills[i]) skills[i].purchased = !!s.purchased; });
          rebuildPerClickBaseFromSkills();
          applySkills(); render(); saveGame();
          p.querySelector("#devInfo").textContent = "Import réussi.";
        } catch (err) {
          p.querySelector("#devInfo").textContent = "Import failed: JSON invalide.";
          console.warn(err);
        }
      });
      p.querySelector("#devClose").addEventListener("click", toggleDevPanel);
    }

    function removePanel() {
      const el = document.getElementById(panelId);
      if (el) el.remove();
    }

    function toggleDevPanel() {
      devVisible = !devVisible;
      if (devVisible) createPanel();
      else removePanel();
    }

    window.addEventListener("keydown", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.ctrlKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        toggleDevPanel();
      }
    });
  })();

  // --- Init ---
  loadGame();
  applySkills();
  render();
  requestAnimationFrame(loop);
}); // end DOMContentLoaded
