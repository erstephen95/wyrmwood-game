const game = {
  skills: {
    woodcutting: { name: "Woodcutting", xp: 0, level: 1, goal: null },
    mining: { name: "Mining", xp: 0, level: 1, goal: null },
    combat: { name: "Combat", xp: 0, level: 1, goal: null },
  },
  resources: {
    pine: { name: "Pine", skill: "woodcutting", unlockLevel: 1, amount: 0, interval: 2000 },
    birch: { name: "Birch", skill: "woodcutting", unlockLevel: 10, amount: 0, interval: 2500 },
    oak: { name: "Oak", skill: "woodcutting", unlockLevel: 20, amount: 0, interval: 3000 },
    ash: { name: "Ash", skill: "woodcutting", unlockLevel: 30, amount: 0, interval: 3500 },
    maple: { name: "Maple", skill: "woodcutting", unlockLevel: 40, amount: 0, interval: 4000 },
    teak: { name: "Teak", skill: "woodcutting", unlockLevel: 50, amount: 0, interval: 4500 },
    walnut: { name: "Walnut", skill: "woodcutting", unlockLevel: 60, amount: 0, interval: 5000 },
    yew: { name: "Yew", skill: "woodcutting", unlockLevel: 70, amount: 0, interval: 5500 },
    ebony: { name: "Ebony", skill: "woodcutting", unlockLevel: 80, amount: 0, interval: 6000 },
    mahogany: { name: "Mahogany", skill: "woodcutting", unlockLevel: 90, amount: 0, interval: 6500 },
    dragonwood: { name: "Dragonwood", skill: "woodcutting", unlockLevel: 99, amount: 0, interval: 7000 },
    stone: { name: "Stone", skill: "mining", unlockLevel: 1, amount: 0, interval: 2000 },
    iron: { name: "Iron", skill: "mining", unlockLevel: 2, amount: 0, interval: 2500 },
    goblin: { name: "Goblin", skill: "combat", unlockLevel: 1, interval: 2000 },
    wolf: { name: "Wolf", skill: "combat", unlockLevel: 2, interval: 2500 },
  },
  activeAction: null,
  activeActionKey: null,
  activeTab: "woodcutting",
  journal: JSON.parse(localStorage.getItem("journal")) || [
  { type: "story", text: `[${formatTimestamp()}] Your adventure begins! You reach the edge of a vast forest...` },
  ],
  journalFilter: "all",
  progressStartTime: 0,
  loopRunning: false,
};

const skillList = document.getElementById("skillList");
const resourceList = document.getElementById("resourceList");
const actionList = document.getElementById("actionList");
const journalDiv = document.getElementById("journal");
const activeActivity = document.getElementById("activeActivity");
const progressBar = document.getElementById("progressBar");
const filterButtons = document.querySelectorAll(".filter-btn");
const tabs = document.querySelectorAll(".tab");

function saveGame() {
  localStorage.setItem(
    "gameState",
    JSON.stringify({ skills: game.skills, resources: game.resources }),
  );
  localStorage.setItem("journal", JSON.stringify(game.journal));
}

function loadGame() {
  const saved = JSON.parse(localStorage.getItem("gameState"));
  if (saved) {
    game.skills = saved.skills;
    game.resources = saved.resources;
  }
}

loadGame();

function xpToLevel(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function renderSkills() {
  skillList.innerHTML = ""; // Clear the skill list each time
  for (const key in game.skills) {
    const skill = game.skills[key];

    // XP required for the current and previous level
    const prevLevelXP = (skill.level - 1) ** 2 * 50;
    const currentLevelXP = (skill.level) ** 2 * 50;

    // XP since last level
    const xpSinceLastLevel = skill.xp - prevLevelXP;

    // Total XP needed for this level
    const levelXPRequired = currentLevelXP - prevLevelXP;

    // Progress bar fraction
    const progress = Math.min((xpSinceLastLevel / levelXPRequired) * 100, 100);

    const div = document.createElement("div");
    div.innerHTML = `
      <span class="level">${skill.name} (Lvl ${skill.level})</span>
      <div class="skill-xp-container">
        <div class="skill-xp-bar" style="width: ${progress}%" data-skill="${key}"></div>
      </div>
    `;

    skillList.appendChild(div);
  }
  saveGame();
}

function renderResources() {
  resourceList.innerHTML = "";
  for (const key in game.resources) {
    const res = game.resources[key];
    if (res.skill === "combat") continue;
    const skill = game.skills[res.skill];
    if (skill.level < res.unlockLevel - 1) continue;
    if (res.amount < 1) continue;
    const div = document.createElement("div");
    div.textContent = `${res.name}: ${res.amount}`;
    resourceList.appendChild(div);
  }
  saveGame();
}

function updateJournalEntry(message, type = "story") {
  const timestamp = formatTimestamp();
  game.journal.push({ type, text: `[${timestamp}] ${message}` });
  renderJournal();
  saveGame();
}


function renderJournal() {
  journalDiv.innerHTML = "";
  game.journal.forEach((entry) => {
    if (game.journalFilter === "all" || game.journalFilter === entry.type) {
      const div = document.createElement("div");
      div.textContent = entry.text;
      div.className = `journal-entry ${entry.type}`;
      journalDiv.appendChild(div);
    }
  });
  journalDiv.scrollTop = journalDiv.scrollHeight;
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    game.journalFilter = btn.dataset.filter;
    renderJournal();
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    game.activeTab = tab.dataset.tab;
    renderActions();
    updateTabIndicators(); // <-- New
  });
});

function getActionPrefix(skillName) {
  switch (skillName) {
    case "Woodcutting":
      return "Chopping";
    case "Mining":
      return "Mining";
    case "Combat":
      return "Fighting";
    default:
      return "";
  }
}

function startAction(item, button, key) {
  // If the current action is already active, stop it
  if (game.activeAction === item) {
    // Reset progress and set active action to null (idle)
    game.activeAction = null;
    game.activeActionKey = null;
    activeActivity.textContent = `ACTIVE ACTIVITY: None`; // Idle state
    progressBar.style.width = "0%"; // Reset progress bar

    // Remove active button state
    document.querySelectorAll("button.activeButton").forEach(b => b.classList.remove("activeButton"));
    
    game.loopRunning = false; // Stop the loop
    return; // Exit the function
  }

  // Proceed with starting the new action
  game.activeAction = item;
  game.activeActionKey = key;

  // Clear any active button styles
  document.querySelectorAll("button.activeButton").forEach(b =>
    b.classList.remove("activeButton")
  );
  if (button) button.classList.add("activeButton");

  game.progressStartTime = performance.now();

  const actionPrefix = getActionPrefix(game.skills[item.skill].name);
  activeActivity.textContent = `ACTIVE ACTIVITY: ${actionPrefix} ${item.name}`;

  updateTabIndicators();

  if (!game.loopRunning) {
    game.loopRunning = true;
    requestAnimationFrame(gameLoop);
  }
}

function gameLoop(now) {
  if (!game.activeAction) {
    progressBar.style.width = "0%";
    game.loopRunning = false;
    return; // Stop the loop if no active action
  }

  const item = game.activeAction;
  const elapsed = now - game.progressStartTime;
  const duration = item.interval;

  let progress = elapsed / duration;

  if (progress >= 1) {
    progressBar.style.width = "100%";

    const skillObj = game.skills[item.skill];
    skillObj.xp += 10;
    skillObj.level = xpToLevel(skillObj.xp);

    if (item.amount !== undefined) {
      item.amount += 1;
      updateJournalEntry(
        `Gained 10 XP in ${skillObj.name} and obtained 1 ${item.name}`,
        "xp",
      );
    } else {
      updateJournalEntry(
        `Gained 10 XP in ${skillObj.name} and defeated a ${item.name}`,
        "xp",
      );
    }

    renderSkills();
    renderResources();
    updateTooltips();

    game.progressStartTime = now;
    progress = 0;
  }

  progressBar.style.width = `${progress * 100}%`;
  requestAnimationFrame(gameLoop);
}

function renderActions() {
  actionList.innerHTML = ""; // Reset button container

  let keys = [];
  if (game.activeTab === "woodcutting") {
    keys = ["pine", "birch", "oak", "ash", "maple", "teak", "walnut", "yew", "ebony", "mahogany", "dragonwood"];
  } else if (game.activeTab === "mining") {
    keys = ["stone", "iron"];
  } else if (game.activeTab === "combat") {
    keys = ["goblin", "wolf"];
  } else if (game.activeTab === "reset") {
    const btn = document.createElement("button");
    btn.textContent = "Reset Progress";
    btn.className = "unlocked";
    btn.addEventListener("click", () => {
      localStorage.clear();
      location.reload();
    });
    actionList.appendChild(btn);
    return; // exit early from the reset tab
  }

  let nextTierShown = false;

  keys.forEach((key) => {
    const item = game.resources[key];
    const skill = game.skills[item.skill];

    // Skip buttons far beyond the next tier
    if (skill.level < item.unlockLevel && nextTierShown) return;

    const btn = document.createElement("button");
    btn.textContent = `${getActionPrefix(skill.name)} ${item.name}`;

    if (skill.level >= item.unlockLevel) {
      // Already unlocked
      btn.className = "unlocked";
      btn.addEventListener("click", () => startAction(item, btn, key));
    } else if (!nextTierShown) {
      // Next unlockable tier
      btn.className = "nextTier";
      btn.dataset.key = key;

      const levelsNeeded = item.unlockLevel - skill.level;
      const targetXP = (item.unlockLevel - 1) ** 2 * 50;
      const xpNeeded = targetXP - skill.xp;
      btn.dataset.tooltip = `Requires ${skill.name} level ${item.unlockLevel} (${levelsNeeded} more level${levelsNeeded > 1 ? "s" : ""}, ${xpNeeded} XP)`;

      nextTierShown = true;
    }

    actionList.appendChild(btn);
  });
}

function updateTooltips() {
  document.querySelectorAll("button.nextTier").forEach((btn) => {
    const key = btn.dataset.key;
    if (!key) return;
    const item = game.resources[key];
    const skill = game.skills[item.skill];
    const levelsNeeded = item.unlockLevel - skill.level;
    const targetXP = (item.unlockLevel - 1) ** 2 * 50;
    const xpNeeded = targetXP - skill.xp;
    btn.dataset.tooltip = `Requires ${skill.name} level ${item.unlockLevel} (${levelsNeeded} more level${levelsNeeded > 1 ? "s" : ""}, ${xpNeeded} XP)`;
  });
}

function updateTabIndicators() {
  tabs.forEach(tab => {
    tab.classList.remove("hasAction");
    if (
      game.activeAction &&
      tab.dataset.tab === game.activeAction.skill &&
      tab.dataset.tab !== game.activeTab
    ) {
      tab.classList.add("hasAction");
    }
  });
}

function formatTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Initial render
renderSkills();
renderResources();
renderJournal();
renderActions();

