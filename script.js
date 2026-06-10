const prizes = [
  {
    name: "Valorant Points $25",
    shortName: "Valorant Points",
    sigil: "V",
    color: "#ff5d45",
    copy: "Your next shop rotation suddenly looks much more interesting.",
  },
  {
    name: "TFT Points $25",
    shortName: "TFT Points",
    sigil: "T",
    color: "#f7c948",
    copy: "The tactician treasury has approved your request.",
  },
  {
    name: "Riot Points $25",
    shortName: "Riot Points",
    sigil: "R",
    color: "#2f6fed",
    copy: "The wheel has spoken. Spend them with exceptional judgment.",
  },
  {
    name: "Duo with Gene Kai'sa",
    shortName: "Duo with Gene Kai'sa",
    sigil: "K",
    color: "#9c63e8",
    copy: "Queue up. The bot lane prophecy is now in motion.",
  },
  {
    name: "LARP in Terraria as Himmel",
    shortName: "Terraria Himmel LARP",
    sigil: "H",
    color: "#67b977",
    copy: "A hero would have done the side quest. Prepare the costumes.",
  },
];

const wheel = document.querySelector("#wheel");
const spinButton = document.querySelector("#spinButton");
const result = document.querySelector("#result");
const resultText = result.querySelector("strong");
const historyList = document.querySelector("#historyList");
const modal = document.querySelector("#winModal");
const modalClose = document.querySelector("#modalClose");
const modalTitle = document.querySelector("#modalTitle");
const modalCopy = document.querySelector("#modalCopy");
const modalSigil = document.querySelector("#modalSigil");
const reactionGif = document.querySelector("#reactionGif");
const spinAgain = document.querySelector("#spinAgain");
const rerollsValue = document.querySelector("#rerollsValue");
const spinHint = document.querySelector("#spinHint");

const MAX_REROLLS = 10;
const WINNABLE_PRIZE_INDEXES = [3, 4];
const PRIZE_CENTER_ANGLES = [0, 139.2, 249.6, 62.4, 76.8];
const HISTORY_STORAGE_KEY = "chaggBirthdayHistory";
const REACTION_ORDER_STORAGE_KEY = "chaggReactionOrder";
const REACTION_GIFS = Array.from(
  { length: 10 },
  (_, index) =>
    `assets/reactions/reaction-${String(index + 1).padStart(2, "0")}.gif`,
);
const reactionOrder = getReactionOrder();
let totalRotation = 0;
let isSpinning = false;
let rerollsRemaining = getStoredRerolls();
let hasSpun = rerollsRemaining < MAX_REROLLS;
let historyState = getStoredHistory();
let pullCount = historyState.pullCount;

function getStoredRerolls() {
  const storedValue = Number.parseInt(
    window.sessionStorage.getItem("riftRelicRerolls"),
    10,
  );

  if (Number.isInteger(storedValue) && storedValue >= 0 && storedValue <= MAX_REROLLS) {
    return storedValue;
  }

  return MAX_REROLLS;
}

function getReactionOrder() {
  try {
    const storedOrder = JSON.parse(
      window.sessionStorage.getItem(REACTION_ORDER_STORAGE_KEY),
    );
    const isValidOrder =
      Array.isArray(storedOrder) &&
      storedOrder.length === REACTION_GIFS.length &&
      new Set(storedOrder).size === REACTION_GIFS.length &&
      storedOrder.every(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < REACTION_GIFS.length,
      );

    if (isValidOrder) {
      return storedOrder;
    }
  } catch {
    window.sessionStorage.removeItem(REACTION_ORDER_STORAGE_KEY);
  }

  const shuffledOrder = REACTION_GIFS.map((_, index) => index);
  for (let index = shuffledOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [shuffledOrder[index], shuffledOrder[swapIndex]] = [
      shuffledOrder[swapIndex],
      shuffledOrder[index],
    ];
  }
  window.sessionStorage.setItem(
    REACTION_ORDER_STORAGE_KEY,
    JSON.stringify(shuffledOrder),
  );

  return shuffledOrder;
}

function getStoredHistory() {
  try {
    const storedHistory = JSON.parse(
      window.sessionStorage.getItem(HISTORY_STORAGE_KEY),
    );

    if (
      Number.isInteger(storedHistory?.pullCount) &&
      storedHistory.pullCount >= 0 &&
      Array.isArray(storedHistory.entries)
    ) {
      return {
        pullCount: storedHistory.pullCount,
        entries: storedHistory.entries
          .filter(
            (entry) =>
              Number.isInteger(entry?.pullNumber) &&
              typeof entry?.label === "string" &&
              typeof entry?.prizeName === "string" &&
              typeof entry?.time === "string",
          )
          .slice(0, 5),
      };
    }
  } catch {
    window.sessionStorage.removeItem(HISTORY_STORAGE_KEY);
  }

  return { pullCount: 0, entries: [] };
}

function createHistoryItem(entry) {
  const item = document.createElement("li");
  const number = document.createElement("span");
  const name = document.createElement("span");
  const time = document.createElement("span");

  number.className = "history-index";
  number.textContent = `#${String(entry.pullNumber).padStart(2, "0")}`;
  name.className = "history-name";
  name.textContent = `${entry.label} · ${entry.prizeName}`;
  time.className = "history-time";
  time.textContent = entry.time;
  item.append(number, name, time);

  return item;
}

function renderHistory() {
  if (historyState.entries.length === 0) {
    return;
  }

  historyList.replaceChildren(
    ...historyState.entries.map(createHistoryItem),
  );
}

function updateRerollControls() {
  const hasRerolls = rerollsRemaining > 0;
  rerollsValue.textContent = `${rerollsRemaining} / ${MAX_REROLLS}`;
  spinButton.disabled = isSpinning || !hasRerolls;
  spinButton.querySelector("span:first-child").innerHTML = hasRerolls
    ? !hasSpun
      ? "FIRST<br>SPIN"
      : "REROLL<br>RESULT"
    : "NO REROLLS<br>LEFT";
  spinHint.textContent =
    !hasSpun
      ? "Your next spin reveals a result"
      : "Rerolling replaces your current result";
  spinAgain.disabled = !hasRerolls;
  spinAgain.textContent = hasRerolls
    ? "REROLL THIS RESULT"
    : "NO REROLLS LEFT";
}

function secureRandomIndex(max) {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return Math.floor((values[0] / 2 ** 32) * max);
  }

  return Math.floor(Math.random() * max);
}

function addHistory(prize, isReroll) {
  pullCount += 1;
  const time = new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const entry = {
    pullNumber: pullCount,
    label: isReroll ? "Reroll" : "First spin",
    prizeName: prize.name,
    time,
  };

  historyState = {
    pullCount,
    entries: [entry, ...historyState.entries].slice(0, 5),
  };
  window.sessionStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(historyState),
  );
  renderHistory();
}

function openModal(prize) {
  const reactionIndex = Math.max(0, pullCount - 1) % REACTION_GIFS.length;
  modalTitle.textContent = prize.name;
  modalCopy.textContent = prize.copy;
  modalSigil.textContent = prize.sigil;
  modalSigil.style.background = prize.color;
  reactionGif.src = REACTION_GIFS[reactionOrder[reactionIndex]];
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modalClose.focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  spinButton.focus();
}

function finishSpin(prize, isReroll) {
  isSpinning = false;
  updateRerollControls();
  result.classList.remove("is-spinning");
  resultText.textContent = prize.name;
  addHistory(prize, isReroll);
  openModal(prize);
}

function spin() {
  if (
    isSpinning ||
    rerollsRemaining === 0 ||
    modal.classList.contains("is-open")
  ) {
    return;
  }

  isSpinning = true;
  const isReroll = hasSpun;
  hasSpun = true;
  rerollsRemaining -= 1;
  window.sessionStorage.setItem("riftRelicRerolls", rerollsRemaining);
  rerollsValue.textContent = `${rerollsRemaining} / ${MAX_REROLLS}`;
  spinButton.disabled = true;
  spinButton.querySelector("span:first-child").innerHTML =
    isReroll ? "REROLLING..." : "SPINNING...";
  result.classList.add("is-spinning");
  resultText.textContent = "Consulting birthday fate...";

  const selectedIndex =
    WINNABLE_PRIZE_INDEXES[secureRandomIndex(WINNABLE_PRIZE_INDEXES.length)];
  const targetAngle = (360 - PRIZE_CENTER_ANGLES[selectedIndex]) % 360;
  const currentAngle = ((totalRotation % 360) + 360) % 360;
  const alignment = (targetAngle - currentAngle + 360) % 360;
  totalRotation += 5 * 360 + alignment;

  wheel.style.transform = `rotate(${totalRotation}deg)`;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(
    () => finishSpin(prizes[selectedIndex], isReroll),
    reducedMotion ? 50 : 4900,
  );
}

spinButton.addEventListener("click", spin);
spinAgain.addEventListener("click", () => {
  closeModal();
  window.setTimeout(spin, 180);
});
modalClose.addEventListener("click", closeModal);
modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }

  if (
    event.code === "Space" &&
    !["INPUT", "TEXTAREA", "BUTTON"].includes(document.activeElement.tagName)
  ) {
    event.preventDefault();
    spin();
  }
});

renderHistory();
updateRerollControls();
