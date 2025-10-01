document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_final_v2";

  // --- État initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    crystals: 0,         // cristaux disponibles (à dépenser)
    crystalsTotal: 0,    // cristaux cumulés (nombre de fois qu'on a prestige)
    multiplier: 1,
    perClickBase: 1,     // base permanente (appliquée via skills)
    perClick: 1,         // valeur effective (recalculée via applySkills)
    totalClicks: 0,
    critChanceBase: 5,
    critChance: 5,       // valeur effective (appliquée via skills)
    critMultiplier: 2,
    achievements: [],
    nextPrestige: 5000000, // seuil initial (5 000 000)
    autoBuyLast: 0,      // timestamp pour auto-buyer
  };

  // --- Producteurs (avec baseRate pour recalculs sûrs) ---
  const producers = [
    { id: "marketing", name: "Campagne marketing", baseCost: 100, cost: 100, count: 0, baseRate: 1, rate: 1, upgrades: [
      { name: "Marketing Level 2", required: 10, newRate: 1.5, costFans: 50, purchased: false },
      { name: "Marketing Level 3", required: 50, newRate: 2, costFans: 200, purchased: false },
      { name: "Marketing Level 4", required: 100, newRate: 3, costFans: 500, purchased: false },
    ] },
    { id: "studio", name: "Meilleur studio", baseCost: 1100, cost: 1100, count: 0, baseRate: 8, rate: 8, upgrades: [
      { name: "Studio Level 2", required: 10, newRate: 10, costFans: 100, purchased: false },
      { name: "Studio Level 3", required: 50, newRate: 13, costFans: 400, purchased: false },
      { name: "Studio Level 4", required: 100, newRate: 16, costFans: 1000, purchased: false },
    ] },
    { id: "devTeam", name: "Équipe de dev", baseCost: 12000, cost: 12000, count: 0, baseRate: 47, rate: 47, upgrades: [
      { name: "Dev Team Level 2", required: 5, newRate: 60, costFans: 500, purchased: false },
      { name: "Dev Team Level 3", required: 25, newRate: 80, costFans: 1200, purchased: false },
      { name: "Dev Team Level 4", required: 50, newRate: 100, costFans: 3000, purchased: false },
    ] },
    { id: "publisher", name: "Éditeur AAA", baseCost: 130000, cost: 130000, count: 0, baseRate: 260, rate: 260, upgrades: [
      { name: "Publisher Level 2", required: 2, newRate: 300, costFans: 1000, purchased: false },
      { name: "Publisher Level 3", required: 5, newRate: 400, costFans: 3000, purchased: false },
      { name: "Publisher Level 4", required: 10, newRate: 500, costFans: 8000, purchased: false },
    ] },
    { id: "franchise", name: "Franchise à succès", baseCost: 1400000, cost: 1400000, count: 0, baseRate: 1400, rate: 1400, upgrades: [
      { name: "Franchise Level 2", required: 1, newRate: 1600, costFans: 5000, purchased: false },
      { name: "Franchise Level 3", required: 3, newRate: 2000, costFans: 12000, purchased: false },
      { name: "Franchise Level 4", required: 5, newRate: 2500, costFans: 30000, purchased: false },
    ] },
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
  // modest buffs: pas trop fortes
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
    achievements: $("achievements"),
    perClick: $("perClick"),
    perSecond: $("perSecond"),
    resetBtn: $("resetBtn"),
  };

  // Ajoute affichage de cristaux à côté de l'argent (si pas déjà présent)
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

  // --- UI: barre de progression & modal compétences ---
  // Create progress bar inside prestige panel
  const prestigePanel = els.prestigeBtn?.parentElement || document.querySelector(".panel:nth-child(3)");
  const progressWrapper = document.createElement("div");
  progressWrapper.style.marginTop = "10px";
  progressWrapper.innerHTML = `
    <div id="prestigeProgressBar" style="background:#111; border-radius:8px; height:14px; overflow:hidden; border:1px solid rgba(255,255,255,0.04);">
      <div id="prestigeProgressFill" style="height:100%; width:0%; transition: width 0.25s;"></div>
    </div>
    <div id="prestigeProgressText" style="font-size:13px; color:var(--muted); margin-top:6px;"></div>
    <button id="openSkillsBtn" style="margin-top:8px; display:none;">Ouvrir l'arbre des cristaux</button>
  `;
  if (prestigePanel) prestigePanel.appendChild(progressWrapper);
  const progressFill = document.getElementById("prestigeProgressFill");
  const progressText = document.getElementById("prestigeProgressText");
  const openSkillsBtn = document.getElementById("openSkillsBtn");

  // Modal pour l'arbre de compétences
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

  // --- Calculs ---
  function totalRate() {
    return producers.reduce((sum, p) => sum + p.count * p.rate, 0);
  }

  // prestige condition : here 1 cristal per prestige when games >= nextPrestige
  function canGainCrystal() {
    return state.games >= state.nextPrestige;
  }

  // --- Apply skills (recalculate perClick, rates, costs, crit) ---
  function applySkills() {
    // Reset derived values to base
    state.perClick = state.perClickBase;
    state.critChance = state.critChanceBase;
    // reset producers to baseRate
    producers.forEach(p => { p.rate = p.baseRate; p.cost = p.cost || p.baseCost; });

    // accumulation variables
    let prodMultiplier = 1;
    let costReduction = 1;
    let autobuyEnabled = false;

    // apply purchased skills
    skills.forEach(s => {
      if (!s.purchased) return;
      switch (s.id) {
        case "click_plus_1":
          state.perClick += 1;
          break;
        case "prod_plus_5":
          prodMultiplier *= 1.05;
          break;
        case "prod_plus_10":
          prodMultiplier *= 1.10;
          break;
        case "crit_plus_5":
          state.critChance += 5;
          break;
        case "cost_reduc_3":
          costReduction *= 0.97;
          break;
        case "autobuy_basic":
          autobuyEnabled = true;
          break;
      }
    });

    // apply production multiplier
    producers.forEach(p => {
      p.rate = p.baseRate * prodMultiplier;
      // also apply any purchased upgrades that changed rate earlier (these upgrades store newRate; we preserve them below on load/purchase)
      p.upgrades.forEach(u => {
        if (u.purchased && u.newRate > p.rate) p.rate = u.newRate * prodMultiplier;
      });
    });

    // apply cost reductions
    producers.forEach(p => {
      // ensure stored cost is at least baseCost * 1.10^count pattern — we keep current p.cost but apply reduction
      p.cost = Math.max(p.cost, p.baseCost * Math.pow(1.10, p.count));
      p.cost = Math.floor(p.cost * costReduction);
    });

    // set auto-buy flag and store it in state for use in loop
    state.autoBuyerEnabled = autobuyEnabled;
  }

  // --- Achievements (unchanged) ---
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

  // --- Save / Load ---
  function saveGame() {
    const payload = {
      state,
      producers,
      clickUpgrades,
      skills,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }

  function loadGame() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      // merge safe
      if (parsed.state) {
        Object.keys(parsed.state).forEach(k => {
          if (k in state) state[k] = parsed.state[k];
        });
      }
      // producers: restore cost/count/upgrades purchased
      parsed.producers?.forEach(saved => {
        const prod = producers.find(p => p.id === saved.id);
        if (prod) {
          prod.cost = saved.cost ?? prod.cost;
          prod.count = saved.count ?? prod.count;
          // keep baseRate intact; restore upgrades purchased flags
          prod.upgrades.forEach((u, i) => {
            if (saved.upgrades?.[i]) u.purchased = !!saved.upgrades[i].purchased;
          });
        }
      });
      // click upgrades
      parsed.clickUpgrades?.forEach((u, i) => { if (clickUpgrades[i]) clickUpgrades[i].purchased = !!u.purchased; });
      // skills
      parsed.skills?.forEach((s, i) => { if (skills[i]) skills[i].purchased = !!s.purchased; });
      // ensure derived values are recalculated
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
        // progression douce
        prod.cost = Math.floor(prod.cost * 1.10);
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
          // set new rate (we will re-apply skills after)
          u.purchased = true;
          // if newRate is stronger than current baseRate, reflect it in baseRate so it's preserved
          if (u.newRate > prod.baseRate) prod.baseRate = u.newRate;
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

  // --- UI upgrades de clics init ---
  clickUpgrades.forEach((u, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.classList.add("click-upgrade-btn");
    btn.addEventListener("click", () => {
      const prevPurchased = idx === 0 || clickUpgrades[idx - 1].purchased;
      if (state.totalClicks >= u.requiredClicks && prevPurchased && !u.purchased) {
        // apply
        state.perClickBase += u.extraGain; // store on base so skills don't conflict
        state.critChanceBase += u.critChanceBonus;
        u.purchased = true;
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
        // persist and apply
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
    // check prerequisites
    const ok = skill.requires.every(rid => {
      const req = skills.find(s => s.id === rid);
      return req && req.purchased;
    });
    return ok;
  }

  // open/close modal
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

  // --- Render ---
  function render() {
    els.games.textContent = Math.floor(state.games);
    els.money.textContent = Math.floor(state.money);
    els.fans.textContent = Math.floor(state.fans);
    els.prestigeSpan.textContent = state.crystals; // reuse prestige span? we also have crystals stat
    crystalsSpan.textContent = state.crystals;

    els.perClick.textContent = `${state.perClick} (x${state.multiplier.toFixed(2)} prestige)`;
    els.perSecond.textContent = `${totalRate().toFixed(1)} (x${state.multiplier.toFixed(2)})`;

    // producteurs: update label, button states, sub-upgrades
    producers.forEach(prod => {
      const li = els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      if (!li) return;
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
          btn.textContent = `${u.name} (${u.newRate}/s) — ${u.costFans} fans — req: ${u.required}`;
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

    // prestige progress bar
    const progress = Math.min(1, state.games / state.nextPrestige);
    if (progressFill) progressFill.style.width = `${Math.round(progress * 100)}%`;
    if (progressText) progressText.textContent = `${Math.floor(state.games)} / ${state.nextPrestige} jeux (${Math.round(progress * 100)}%)`;
    // show open skills button if we have crystals
    if (openSkillsBtn) openSkillsBtn.style.display = state.crystals > 0 ? "inline-block" : "none";

    // prestige btn enabled if we can gain at least one crystal
    const canPrest = canGainCrystal();
    els.prestigeBtn.disabled = !canPrest;
    els.prestigeNote.textContent = canPrest
      ? `Prestige disponible — clique pour gagner 1 cristal`
      : `Prestige requis : ${state.nextPrestige} jeux (actuellement ${Math.floor(state.games)})`;
  }

  // --- Main click ---
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

  // --- Prestige: 1 cristal per prestige, strong growth of threshold ---
  els.prestigeBtn.addEventListener("click", () => {
    if (!canGainCrystal()) return;
    // award 1 crystal
    state.crystals += 1;
    state.crystalsTotal += 1;
    // optionally recalc multiplier (we keep multiplier as numeric boost per crystalsTotal)
    // modest permanent multiplier per crystal: small so it's not OP
    state.multiplier = 1 + state.crystalsTotal * 0.15; // each crystal = +15% global
    // Reset progression except crystals and skills purchases
    state.games = 0;
    state.money = 0;
    state.fans = 0;
    state.totalClicks = 0;
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      // keep upgrades purchased flags (we want upgrades bought during a run to be lost on reset)
      p.upgrades.forEach(u => u.purchased = false);
    });
    clickUpgrades.forEach(u => u.purchased = false);
    // increase nextPrestige strongly
    state.nextPrestige = Math.max(5000000, Math.floor(state.nextPrestige * 2.5 + state.crystalsTotal * 500000));
    // apply skills (they are permanent)
    applySkills();

    render();
    saveGame();

    // show modal so user can spend crystal immediately if they want
    rebuildSkillList();
    skillModal.style.display = "block";
  });

  // --- Reset complet (wipe) ---
  els.resetBtn?.addEventListener("click", () => {
    if (!confirm("Reset complet : tout sera perdu (y compris les cristaux).")) return;
    localStorage.removeItem(LS_KEY);
    // restore defaults
    Object.assign(state, {
      games: 0, fans: 0, money: 0, crystals: 0, crystalsTotal: 0,
      multiplier: 1, perClickBase: 1, perClick: 1, totalClicks: 0,
      critChanceBase: 5, critChance: 5, critMultiplier: 2, achievements: [],
      nextPrestige: 5000000, autoBuyLast: 0
    });
    // restore producers (counts, costs, upgrades)
    producers.forEach(p => {
      p.count = 0;
      p.cost = p.baseCost;
      p.upgrades.forEach(u => u.purchased = false);
      p.baseRate = p.baseRate || p.rate;
      p.rate = p.baseRate;
    });
    // restore clickUpgrades and skills
    clickUpgrades.forEach(u => u.purchased = false);
    skills.forEach(s => s.purchased = false);
    applySkills();
    saveGame();
    setTimeout(() => location.reload(), 80);
  });

  // --- Auto-buy logic (if unlocked via skill) ---
  function tryAutoBuy() {
    if (!state.autoBuyerEnabled) return;
    const now = Date.now();
    if (!state.autoBuyLast) state.autoBuyLast = 0;
    if (now - state.autoBuyLast < 30000) return; // 30s cooldown
    // find cheapest producer affordable
    const affordable = producers.filter(p => state.money >= p.cost);
    if (affordable.length === 0) {
      // try to buy the cheapest even if not affordable? no -> skip
      state.autoBuyLast = now;
      return;
    }
    // buy the cheapest by cost
    affordable.sort((a, b) => a.cost - b.cost);
    const item = affordable[0];
    state.money -= item.cost;
    item.count++;
    item.cost = Math.floor(item.cost * 1.10);
    state.autoBuyLast = now;
    saveGame();
    render();
  }

  // --- Loop (main tick) ---
  let last = performance.now();
  function loop(now) {
    const delta = (now - last) / 1000;
    last = now;
    // passive gain
    const gain = totalRate() * state.multiplier * delta;
    state.games += gain;
    state.money += gain;
    state.fans += gain / 10;
    // try auto-buy occasionally
    tryAutoBuy();
    render();
    saveGame();
    requestAnimationFrame(loop);
  }

  // --- Init/load ---
  loadGame();
  applySkills();
  render();
  requestAnimationFrame(loop);
});

