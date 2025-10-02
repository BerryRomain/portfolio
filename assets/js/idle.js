document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_final_v3";

  // --- État initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    crystals: 0,         // cristaux disponibles (à dépenser)
    crystalsTotal: 0,    // cristaux cumulés (nombre de fois qu'on a prestige)
    multiplier: 1,       // permanent multiplier derived from crystalsTotal
    perClickBase: 1,     // base permanente (appliquée via click upgrades & skills)
    perClick: 1,         // valeur effective recalculée (perClickBase * multiplier)
    totalClicks: 0,
    critChanceBase: 5,
    critChance: 5,       // valeur effective (appliquée via skills)
    critMultiplier: 2,
    achievementsUnlocked: [], // achievements définitivement unlocked (persist until full reset)
    achievements: [],    // for display building each tick
    nextPrestige: 5000000, // seuil initial (5 000 000)
    autoBuyLast: 0,      // timestamp pour auto-buyer
    autoBuyerEnabled: false,
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
      // paliers ajustés à 5 / 25 / 50
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
      // paliers beaucoup plus difficiles
      upgrades: [
        { name: "Franchise Level 2", required: 5, newRate: 1600, costFans: 5000, purchased: false },
        { name: "Franchise Level 3", required: 25, newRate: 2000, costFans: 12000, purchased: false },
        { name: "Franchise Level 4", required: 75, newRate: 2500, costFans: 30000, purchased: false },
      ],
    },
  ];

  // --- Upgrades de clics (noms visibles) ---
  // Ces upgrades augmentent PERMANEMMENT perClickBase (elles ne sont pas reset au prestige)
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
    prestigeSpan: $("prestige"),
    makeGame: $("makeGame"),
    prestigeBtn: $("prestigeBtn"),
    prestigeNote: $("prestigeNote"),
    upgrades: $("upgrades"),
    clickUpgradesList: $("clickUpgrades"),
    achievementsList: $("achievements"),
    perClick: $("perClick"),
    perSecond: $("perSecond"),
    resetBtn: $("resetBtn"),
  };

  // Add crystals stat near the other stats if missing
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

  // --- UI: prestige progress bar & skill modal ---
  const prestigePanel = els.prestigeBtn?.parentElement || document.querySelector(".panel:nth-child(3)");
  const progressWrapper = document.createElement("div");
  progressWrapper.style.marginTop = "10px";
  progressWrapper.innerHTML = `
    <div id="prestigeProgressBar" style="background:#111; border-radius:8px; height:14px; overflow:hidden; border:1px solid rgba(255,255,255,0.04);">
      <div id="prestigeProgressFill" style="height:100%; width:0%; transition: width 0.25s; background:linear-gradient(90deg,var(--accent),#06b6d4);"></div>
    </div>
    <div id="prestigeProgressText" style="font-size:13px; color:var(--muted); margin-top:6px;"></div>
    <button id="openSkillsBtn" style="margin-top:8px; display:none;">Ouvrir l'arbre des cristaux</button>
  `;
  if (prestigePanel) prestigePanel.appendChild(progressWrapper);
  const progressFill = document.getElementById("prestigeProgressFill");
  const progressText = document.getElementById("prestigeProgressText");
  const openSkillsBtn = document.getElementById("openSkillsBtn");

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
    <div id="skillList" style="display:grid;gap:8px;"></div>
    <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
      <button id="closeSkillModal">Fermer</button>
    </div>
  `;
  document.body.appendChild(skillModal);
  const skillList = document.getElementById("skillList");
  const closeSkillModal = document.getElementById("closeSkillModal");

  // --- Calculs auxiliaires ---
  function totalRate() {
    // total passive rate (already processed by applySkills into p.rate)
    return producers.reduce((sum, p) => sum + p.count * p.rate, 0);
  }

  function computeProdMultiplierFromSkills() {
    // recompute prod multiplier based on purchased skills (used for display of upgrades)
    let prodMultiplier = 1;
    skills.forEach(s => {
      if (!s.purchased) return;
      if (s.id === "prod_plus_5") prodMultiplier *= 1.05;
      if (s.id === "prod_plus_10") prodMultiplier *= 1.10;
    });
    return prodMultiplier;
  }

  function canGainCrystal() {
    return state.games >= state.nextPrestige;
  }

  // --- Apply skills (recalculate perClickBase/perClick, rates, costs, crit) ---
  function applySkills() {
    // ---- Ensure perClickBase remains the PERMANENT value (upgrades and skills add to it)
    // Do NOT overwrite perClickBase here except from explicit permanent upgrades/skills.
    // First set perClick to base (it'll be multiplied by prestige multiplier below)
    state.perClick = state.perClickBase;
    state.critChance = state.critChanceBase;

    // reset producers to original baseRate & ensure cost consistent
    producers.forEach(p => {
      p.baseRate = p.origBaseRate;
      p.rate = p.baseRate;
      p.cost = p.cost ?? p.baseCost;
    });

    // accumulation vars
    let prodMultiplier = 1;
    let costReduction = 1;
    let autobuyEnabled = false;

    // apply skills (permanent effects)
    skills.forEach(s => {
      if (!s.purchased) return;
      switch (s.id) {
        case "click_plus_1":
          // this skill is permanent and should affect perClickBase only if not already accounted for
          // To be safe: ensure perClickBase includes it (only add once)
          // (we assume initial perClickBase = 1, and buying the skill sets s.purchased true)
          // We won't force-add here; instead buying the skill will explicitly increase perClickBase.
          break;
        case "prod_plus_5":
          prodMultiplier *= 1.05;
          break;
        case "prod_plus_10":
          prodMultiplier *= 1.10;
          break;
        case "crit_plus_5":
          state.critChance = state.critChanceBase + 5;
          break;
        case "cost_reduc_3":
          costReduction *= 0.97;
          break;
        case "autobuy_basic":
          autobuyEnabled = true;
          break;
      }
    });

    // Apply production multiplier to producers and to their upgrades
    producers.forEach(p => {
      // base effective rate after skill multipliers
      let effectiveRate = p.baseRate * prodMultiplier;

      // if run-upgrades purchased, they can replace base rate (also multiplied)
      p.upgrades.forEach(u => {
        if (u.purchased) {
          const upgradedRate = u.newRate * prodMultiplier;
          if (upgradedRate > effectiveRate) effectiveRate = upgradedRate;
        }
      });

      p.rate = effectiveRate;
    });

    // apply cost reductions; ensure cost follows scaling pattern before reduction
    producers.forEach(p => {
      p.cost = Math.max(p.cost ?? p.baseCost, Math.floor(p.baseCost * Math.pow(1.10, p.count)));
      p.cost = Math.floor(p.cost * costReduction);
    });

    state.autoBuyerEnabled = autobuyEnabled;

    // finally, perClick should be the PERMANENT base multiplied by prestige multiplier
    state.perClick = state.perClickBase * state.multiplier;
  }

  // --- Achievements (persistent) ---
  function checkAndUnlockAchievements() {
    // list of candidates (id, condition, text)
    const candidates = [
      { id: "money_1k", check: () => state.money >= 1_000, text: "1k$ accumulés" },
      { id: "money_100k", check: () => state.money >= 100_000, text: "100k$ accumulés" },
      { id: "money_1m", check: () => state.money >= 1_000_000, text: "1M$ accumulés" },
      { id: "fans_1k", check: () => state.fans >= 1000, text: "1000 fans" },
      { id: "clicks_100", check: () => state.totalClicks >= 100, text: "100 clics réalisés" },
      { id: "games_100", check: () => state.games >= 100, text: "100 jeux créés" },
      { id: "have_10_marketing", check: () => producers.find(p => p.id === "marketing").count >= 10, text: "10 Campagnes marketing" },
      { id: "have_10_studio", check: () => producers.find(p => p.id === "studio").count >= 10, text: "10 Studios" },
      { id: "have_25_publisher", check: () => producers.find(p => p.id === "publisher").count >= 25, text: "25 Éditeurs AAA" },
      { id: "first_prestige", check: () => state.crystalsTotal >= 1, text: "Premier prestige" },
      // add more as desired...
    ];

    candidates.forEach(c => {
      if (c.check() && !state.achievementsUnlocked.includes(c.id)) {
        state.achievementsUnlocked.push(c.id);
      }
    });

    // build display achievements from unlocked ids
    state.achievements = state.achievementsUnlocked.map(id => {
      const found = candidates.find(c => c.id === id);
      return found ? found.text : id;
    });
  }

  // --- Save / Load ---
  function saveGame() {
    const payload = {
      state,
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
          // restore purchased flags for producer run-upgrades
          prod.upgrades.forEach((u, i) => {
            if (saved.upgrades?.[i]) u.purchased = !!saved.upgrades[i].purchased;
          });
        }
      });
      parsed.clickUpgrades?.forEach((u, i) => { if (clickUpgrades[i]) clickUpgrades[i].purchased = !!u.purchased; });
      parsed.skills?.forEach((s, i) => { if (skills[i]) skills[i].purchased = !!s.purchased; });
      if (parsed.state?.achievementsUnlocked) {
        state.achievementsUnlocked = parsed.state.achievementsUnlocked;
      }

      // important: if clickUpgrades were purchased in save we must ensure perClickBase accounts for them
      // some older saves may have perClickBase stored already; if not, compute from purchased clickUpgrades
      if (!parsed.state || typeof parsed.state.perClickBase === "undefined") {
        // rebuild perClickBase from clickUpgrades and base 1
        let base = 1;
        clickUpgrades.forEach(u => { if (u.purchased) base += u.extraGain; });
        state.perClickBase = base;
      }

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
        // scale cost with 10% after buy (we store cost persistently)
        prod.cost = Math.floor(prod.cost * 1.10);
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
        // make this click upgrade permanent: increase perClickBase
        state.perClickBase += u.extraGain;
        state.critChanceBase += u.critChanceBonus;
        u.purchased = true;
        applySkills(); // will recalc perClick = perClickBase * multiplier
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
        // Buying: apply persistent effects
        state.crystals -= s.cost;
        s.purchased = true;
        // Some skills affect permanent bases (click_plus_1). Apply effect properly:
        if (s.id === "click_plus_1") {
          // ensure perClickBase increases by exactly 1
          state.perClickBase += 1;
        }
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

  // --- Render (robust update for #prestige and #crystals) ---
  function render() {
    // core stats
    if (els.games) els.games.textContent = Math.floor(state.games);
    if (els.money) els.money.textContent = Math.floor(state.money);
    if (els.fans) els.fans.textContent = Math.floor(state.fans);

    // Update both prestige span and crystals stat if present
    const prestigeEl = document.getElementById("prestige");
    if (prestigeEl) prestigeEl.textContent = state.crystals;
    if (crystalsSpan) crystalsSpan.textContent = state.crystals;

    // Recompute perClick display (perClick already set by applySkills to perClickBase*multiplier)
    if (els.perClick) els.perClick.textContent = `${state.perClick.toFixed(2)} (x${state.multiplier.toFixed(2)} prestige)`;

    // perSecond: show totalRate * multiplier (passive production includes p.rate already factoring skills)
    if (els.perSecond) els.perSecond.textContent = `${(totalRate() * state.multiplier).toFixed(2)} (x${state.multiplier.toFixed(2)})`;

    // producers
    // compute prodMultiplier for display of upgrade effective rates
    const displayProdMultiplier = computeProdMultiplierFromSkills();
    producers.forEach(prod => {
      const li = els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      if (!li) return;
      const label = li.querySelector(".label");
      const buyBtn = li.querySelector(".buy-btn");
      label.textContent = `${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${(prod.rate).toFixed(2)}/s`;
      buyBtn.disabled = state.money < prod.cost;

      const subBtns = li.querySelectorAll(".sub-upgrade-btn");
      subBtns.forEach((btn, idx) => {
        const u = prod.upgrades[idx];
        const prevPurchased = idx === 0 || prod.upgrades[idx - 1].purchased;
        if (u.purchased) {
          btn.textContent = `${u.name} acheté`;
          btn.disabled = true;
        } else {
          // show effective rate if bought (accounting for prod multiplier)
          const eff = (u.newRate * displayProdMultiplier).toFixed(2);
          btn.textContent = `${u.name} (${eff}/s) — ${u.costFans} fans — req: ${u.required}`;
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

    // achievements display
    checkAndUnlockAchievements();
    if (els.achievementsList) {
      els.achievementsList.innerHTML = "";
      state.achievements.forEach(a => {
        const li = document.createElement("li");
        li.textContent = a;
        els.achievementsList.appendChild(li);
      });
    }

    // prestige progress
    const progress = (state.nextPrestige > 0) ? Math.min(1, state.games / state.nextPrestige) : 0;
    if (progressFill) progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
    if (progressText) progressText.textContent = `${Math.floor(state.games)} / ${state.nextPrestige} jeux (${(progress * 100).toFixed(1)}%)`;

    // open skills button visible if ever prestiged (crystalsTotal>0) so player can view tree
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
    // ensure perClick is up-to-date (applySkills sets perClick = perClickBase * multiplier)
    // but to be safe, recalc here:
    state.perClick = state.perClickBase * state.multiplier;
    let gain = state.perClick;
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

    // grant 1 crystal (you could scale with floor(games/nextPrestige) if desired)
    state.crystals += 1;
    state.crystalsTotal += 1;

    // update permanent multiplier derived from crystalsTotal
    state.multiplier = 1 + state.crystalsTotal * 0.15;

    // Reset run progress, but persist skills & crystals & achievementsUnlocked & perClickBase & clickUpgrades
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    state.totalClicks = 0;

    // reset producers counts/costs and reset run-upgrades purchased flag (these are run-specific)
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      p.baseRate = p.origBaseRate;
      p.rate = p.baseRate;
      p.upgrades.forEach(u => u.purchased = false);
    });

    // NOTE: clickUpgrades are permanent in this design -> do NOT reset clickUpgrades
    // clickUpgrades.forEach(u => u.purchased = false); // <-- intentionally omitted

    // increase nextPrestige strongly (configurable)
    state.nextPrestige = Math.max(5000000, Math.floor(state.nextPrestige * 2.5 + state.crystalsTotal * 500000));

    // re-apply permanent skills (they remain purchased across prestiges)
    applySkills();

    // Important: immediately update display for both prestige and crystals
    render();
    saveGame();

    // open skill modal so player can spend crystal immediately (but they can also open it later)
    rebuildSkillList();
    skillModal.style.display = "block";
  });

  // --- Full reset (wipe everything) ---
  els.resetBtn?.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris les cristaux).")) return;
    localStorage.removeItem(LS_KEY);
    Object.assign(state, {
      games: 0, fans: 0, money: 0, crystals: 0, crystalsTotal: 0,
      multiplier: 1, perClickBase: 1, perClick: 1, totalClicks: 0,
      critChanceBase: 5, critChance: 5, critMultiplier: 2, achievementsUnlocked: [], achievements: [],
      nextPrestige: 5000000, autoBuyLast: 0, autoBuyerEnabled: false
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
    item.cost = Math.floor(item.cost * 1.10);
    state.autoBuyLast = now;
    saveGame();
    render();
  }

  // --- Loop ---
  let last = performance.now();
  function loop(now) {
    const delta = (now - last) / 1000;
    last = now;
    // passive gain already uses p.rate which includes prod multipliers from skills
    const gain = totalRate() * state.multiplier * delta;
    state.games += gain;
    state.money += gain;
    state.fans += gain / 10;
    tryAutoBuy();
    render();
    saveGame();
    requestAnimationFrame(loop);
  }

  // --- Init ---
  loadGame();
  // make sure perClickBase includes any click upgrades loaded (if saved state didn't have it)
  // (applySkills will set perClick = perClickBase * multiplier)
  applySkills();
  render();
  requestAnimationFrame(loop);
});
