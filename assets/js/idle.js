document.addEventListener("DOMContentLoaded", () => {
  const LS_KEY = "videoGameEmpire_final";

  // --- État initial ---
  const state = {
    games: 0,
    fans: 0,
    money: 0,
    prestigePoints: 0,      // points à dépenser
    prestigeTotal: 0,       // points cumulés
    multiplier: 1,
    perClick: 1,
    totalClicks: 0,
    critChance: 5,
    critMultiplier: 2,
    achievements: [],
  };

  // --- Producteurs ---
  const producers = [
    { id: "marketing", name: "Campagne marketing", baseCost: 100, cost: 100, count: 0, rate: 1, upgrades: [] },
    { id: "studio", name: "Meilleur studio", baseCost: 1100, cost: 1100, count: 0, rate: 8, upgrades: [] },
    { id: "devTeam", name: "Équipe de dev", baseCost: 12000, cost: 12000, count: 0, rate: 47, upgrades: [] },
    { id: "publisher", name: "Éditeur AAA", baseCost: 130000, cost: 130000, count: 0, rate: 260, upgrades: [] },
    { id: "franchise", name: "Franchise à succès", baseCost: 1400000, cost: 1400000, count: 0, rate: 1400, upgrades: [] },
  ];

  // --- Upgrades clic ---
  const clickUpgrades = [
    { requiredClicks: 50, extraGain: 1, critChanceBonus: 2, purchased: false },
    { requiredClicks: 200, extraGain: 2, critChanceBonus: 3, purchased: false },
    { requiredClicks: 500, extraGain: 5, critChanceBonus: 5, purchased: false },
  ];

  // --- Arbre de compétences prestige ---
  const prestigeSkills = [
    { id: "clickBoost", name: "Boost de clic", cost: 1, purchased: false, requires: [], apply: () => { state.perClick += 1; } },
    { id: "doubleProd", name: "Double production", cost: 2, purchased: false, requires: ["clickBoost"], apply: () => { producers.forEach(p => p.rate *= 2); } },
    { id: "critBoost", name: "Gain critique", cost: 1, purchased: false, requires: [], apply: () => { state.critChance += 5; } },
    { id: "autoFans", name: "Fans automatiques", cost: 3, purchased: false, requires: ["doubleProd"], apply: () => { state.fans += 50; } },
    { id: "studioDiscount", name: "Réduction producteurs", cost: 2, purchased: false, requires: ["clickBoost"], apply: () => { producers.forEach(p => p.cost *= 0.9); } },
  ];

  // --- DOM ---
  const $ = id => document.getElementById(id);
  const els = {
    games: $("games"),
    fans: $("fans"),
    money: $("money"),
    prestigePoints: $("prestige"),
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

  function calculatePrestigeGain() {
    // Racine carrée des jeux produits divisée par 1 000 000 pour ralentir le gain
    return Math.floor(Math.sqrt(state.games / 1000000));
  }

  function applySkills() {
    prestigeSkills.forEach(skill => { if(skill.purchased && skill.apply) skill.apply(); });
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

  function saveGame() {
    localStorage.setItem(LS_KEY, JSON.stringify({ state, producers, clickUpgrades, prestigeSkills }));
  }

  function loadGame() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed.state);
    parsed.producers?.forEach(saved => {
      const prod = producers.find(p => p.id === saved.id);
      if (prod) { prod.cost = saved.cost; prod.count = saved.count; }
    });
    parsed.clickUpgrades?.forEach((u, i) => { if(clickUpgrades[i]) clickUpgrades[i].purchased = u.purchased; });
    parsed.prestigeSkills?.forEach((s, i) => { if(prestigeSkills[i]) prestigeSkills[i].purchased = s.purchased; });
    applySkills();
  }

  // --- UI Producteurs ---
  producers.forEach(prod => {
    const li = document.createElement("li");
    li.dataset.id = prod.id;
    const label = document.createElement("div"); li.appendChild(label);
    const buyBtn = document.createElement("button"); buyBtn.classList.add("buy-btn"); buyBtn.textContent="Acheter";
    buyBtn.addEventListener("click", ()=>{
      if(state.money>=prod.cost){
        state.money-=prod.cost;
        prod.count++;
        prod.cost=Math.floor(prod.cost*1.10); // augmentation progressive correcte
        render(); saveGame();
      }
    });
    li.appendChild(buyBtn);
    els.upgrades.appendChild(li);
  });

  // --- UI Upgrades clic ---
  clickUpgrades.forEach((u,idx)=>{
    const li=document.createElement("li");
    const btn=document.createElement("button");
    btn.classList.add("click-upgrade-btn");
    btn.addEventListener("click",()=>{
      const prevPurchased=idx===0||clickUpgrades[idx-1].purchased;
      if(state.totalClicks>=u.requiredClicks&&prevPurchased&&!u.purchased){
        state.perClick+=u.extraGain;
        state.critChance+=u.critChanceBonus;
        u.purchased=true;
        render(); saveGame();
      }
    });
    li.appendChild(btn); els.clickUpgradesList.appendChild(li);
  });

  function showFloatingText(text,x,y){
    const span=document.createElement("span"); span.textContent=text;
    span.style.position="absolute"; span.style.left=`${x}px`; span.style.top=`${y}px`;
    span.style.pointerEvents="none"; span.style.color="lime"; span.style.fontWeight="bold"; span.style.transition="all 1s ease-out";
    document.body.appendChild(span);
    requestAnimationFrame(()=>{span.style.transform="translateY(-50px)"; span.style.opacity="0";});
    setTimeout(()=>span.remove(),1000);
  }

  function render(){
    els.games.textContent=Math.floor(state.games);
    els.money.textContent=Math.floor(state.money);
    els.fans.textContent=Math.floor(state.fans);
    els.prestigePoints.textContent=state.prestigePoints+" (Total: "+state.prestigeTotal+")";
    els.perClick.textContent=`${state.perClick} (x${state.multiplier.toFixed(2)} prestige)`;
    els.perSecond.textContent=`${totalRate().toFixed(1)} (x${state.multiplier.toFixed(2)})`;

    // producteurs
    producers.forEach(prod=>{
      const li=els.upgrades.querySelector(`li[data-id=${prod.id}]`);
      const label=li.querySelector(".label");
      const buyBtn=li.querySelector(".buy-btn");
      label.textContent=`${prod.name} — coût : $${Math.floor(prod.cost)} — possédé : ${prod.count} — Prod/unité : ${prod.rate}/s`;
      buyBtn.disabled=state.money<prod.cost;
    });

    // click upgrades
    const clickBtns=els.clickUpgradesList.querySelectorAll(".click-upgrade-btn");
    clickBtns.forEach((btn,idx)=>{
      const u=clickUpgrades[idx]; const prevPurchased=idx===0||clickUpgrades[idx-1].purchased;
      if(u.purchased){btn.textContent=`Upgrade ${idx+1} acheté`; btn.disabled=true;}
      else{btn.textContent=`Upgrade ${idx+1} (+${u.extraGain}/clic, +${u.critChanceBonus}% crit) — ${u.requiredClicks} clics`;
        btn.disabled=!(state.totalClicks>=u.requiredClicks&&prevPurchased);}
    });

    checkAchievements();
    els.achievements.innerHTML="";
    state.achievements.forEach(a=>{const li=document.createElement("li"); li.textContent=a; els.achievements.appendChild(li);});

    const prestigeGain=calculatePrestigeGain();
    els.prestigeBtn.disabled=prestigeGain<=0;
    els.prestigeNote.textContent=prestigeGain>0?`Prestige disponible : ${prestigeGain} points`:`Prestige requis : plus de jeux pour gagner du prestige`;
  }

  // --- Click principal ---
  els.makeGame.addEventListener("click", e=>{
    state.totalClicks++;
    let gain=state.perClick;
    if(Math.random()*100<state.critChance) gain*=state.critMultiplier;
    const totalGain=gain*state.multiplier;
    state.games+=totalGain;
    state.money+=totalGain;
    showFloatingText(`+${totalGain.toFixed(1)}`,e.pageX,e.pageY);
    render(); saveGame();
  });

  // --- Prestige avec arbre ---
  els.prestigeBtn.addEventListener("click", ()=>{
    const prestigeGain=calculatePrestigeGain();
    if(prestigeGain>0){
      state.prestigePoints+=prestigeGain;
      state.prestigeTotal+=prestigeGain;
      state.multiplier=1+0.2*state.prestigeTotal;

      // Reset complet sauf prestige
      state.games=0; state.money=0; state.fans=0; state.perClick=1; state.totalClicks=0;
      producers.forEach(p=>{p.count=0; p.cost=p.baseCost;});
      clickUpgrades.forEach(u=>u.purchased=false);
      applySkills();

      render(); saveGame();
      alert(`Vous avez gagné ${prestigeGain} points de prestige ! Débloquez vos compétences dans l'arbre.`);
      // Ici tu peux ouvrir un modal pour choisir les compétences
    }
  });

  // --- Reset complet ---
  els.resetBtn?.addEventListener("click", ()=>{
    if(!confirm("Reset complet : tout sera perdu (y compris le prestige).")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  });

  // --- Boucle ---
  let last=performance.now();
  function loop(now){
    const delta=(now-last)/1000; last=now;
    const gain=totalRate()*state.multiplier*delta;
    state.games+=gain; state.money+=gain; state.fans+=gain/10;
    render(); saveGame();
    requestAnimationFrame(loop);
  }

  loadGame(); render(); requestAnimationFrame(loop);
});
