const STORAGE_KEY = "coop-arcade-date-night";

const stage = document.getElementById("gameStage");
const totalStarsEl = document.getElementById("totalStars");
const gamesClearedEl = document.getElementById("gamesCleared");
const favoriteGameEl = document.getElementById("favoriteGame");
const offlineBadge = document.getElementById("offlineBadge");
const installBtn = document.getElementById("installBtn");
const cardButtons = Array.from(document.querySelectorAll(".game-card"));

let installPrompt = null;
let activeCleanup = null;

const gameLabels = {
  bakery: "Bakery Co-op",
  pizza: "Pizza Co-op",
  puzzle: "Puzzle Co-op",
  racing: "Racing Co-op",
};

const initialState = {
  bestStars: {
    bakery: 0,
    pizza: 0,
    puzzle: 0,
    racing: 0,
  },
  bestMetrics: {
    bakery: 0,
    pizza: 0,
    puzzle: 0,
    racing: 0,
  },
};

let appState = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) {
      return structuredClone(initialState);
    }
    return {
      bestStars: {
        ...initialState.bestStars,
        ...saved.bestStars,
      },
      bestMetrics: {
        ...initialState.bestMetrics,
        ...saved.bestMetrics,
      },
    };
  } catch (error) {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function setActiveCard(gameId) {
  cardButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.game === gameId);
  });
}

function updateStats() {
  const entries = Object.entries(appState.bestStars);
  const totalStars = entries.reduce((sum, [, stars]) => sum + stars, 0);
  const cleared = entries.filter(([, stars]) => stars > 0).length;
  const favoriteEntry = Object.entries(appState.bestMetrics).sort((left, right) => right[1] - left[1])[0];

  totalStarsEl.textContent = String(totalStars);
  gamesClearedEl.textContent = `${cleared} / 4`;
  favoriteGameEl.textContent = favoriteEntry && favoriteEntry[1] > 0 ? gameLabels[favoriteEntry[0]] : "Pick a game";
}

function saveResult(gameId, stars, metric) {
  appState.bestStars[gameId] = Math.max(appState.bestStars[gameId], stars);
  appState.bestMetrics[gameId] = Math.max(appState.bestMetrics[gameId], metric);
  saveState();
  updateStats();
}

function cleanupActiveGame() {
  if (typeof activeCleanup === "function") {
    activeCleanup();
    activeCleanup = null;
  }
}

function mountGame(gameId) {
  cleanupActiveGame();
  setActiveCard(gameId);
  if (gameId === "bakery") {
    activeCleanup = mountBakeryGame();
  }
  if (gameId === "pizza") {
    activeCleanup = mountPizzaGame();
  }
  if (gameId === "puzzle") {
    activeCleanup = mountPuzzleGame();
  }
  if (gameId === "racing") {
    activeCleanup = mountRacingGame();
  }
}

function updateConnectionBadge() {
  const online = navigator.onLine;
  offlineBadge.textContent = online ? "Online and ready to cache" : "Offline mode";
  offlineBadge.classList.toggle("online", online);
  offlineBadge.classList.toggle("offline", !online);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  navigator.serviceWorker.register("./sw.js").catch(() => {
    offlineBadge.textContent = "Offline install unavailable";
    offlineBadge.classList.remove("online");
    offlineBadge.classList.add("offline");
  });
}

function enableInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!installPrompt) {
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installBtn.hidden = true;
  });
}

function renderWelcome() {
  stage.innerHTML = `
    <section class="welcome-card">
      <p class="eyebrow">Pick any mode</p>
      <h2>Ready for co-op play</h2>
      <p>
        Open the same link on any phone, let it load once, and it can keep running
        without internet after that. This version is tuned for shared-screen or
        pass-and-play co-op, and each phone saves its own best score locally.
      </p>
      <ul class="welcome-list">
        <li>Bakery: one player collects ingredients while the other keeps the oven safe.</li>
        <li>Pizza: build exact orders with split kitchen roles.</li>
        <li>Puzzle: memory matching with quick alternating turns.</li>
        <li>Racing: two drivers survive together with touch buttons.</li>
      </ul>
    </section>
  `;
}

function renderBanner({ eyebrow, title, message, metricText }) {
  return `
    <section class="game-layout">
      <section class="status-banner">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h2>${title}</h2>
          <p class="status-text">${message}</p>
        </div>
        <div class="status-pill">${metricText}</div>
      </section>
  `;
}

function finishMarkup(summary, buttonText = "Play again") {
  return `
      <section class="control-card">
        <p class="stage-note">${summary}</p>
        <button class="primary-btn" data-action="restart">${buttonText}</button>
      </section>
    </section>
  `;
}

function mountBakeryGame() {
  const pantry = [
    "Flour",
    "Butter",
    "Sugar",
    "Berry",
    "Apple",
    "Chocolate",
    "Cream",
    "Yeast",
    "Vanilla",
  ];
  const recipes = [
    { name: "Berry Tart", temp: 188, ingredients: { Flour: 2, Butter: 1, Berry: 2, Sugar: 1 } },
    { name: "Apple Bun", temp: 198, ingredients: { Flour: 2, Yeast: 1, Apple: 2, Sugar: 1 } },
    { name: "Choco Puff", temp: 205, ingredients: { Flour: 1, Butter: 1, Chocolate: 2, Cream: 1 } },
    { name: "Vanilla Cloud", temp: 182, ingredients: { Flour: 1, Sugar: 2, Vanilla: 1, Cream: 2 } },
  ];

  const state = {
    time: 45,
    temp: 186,
    baked: 0,
    currentRecipe: null,
    collected: {},
    finished: false,
    message: "Player 1 taps ingredients. Player 2 keeps the oven close to the target zone.",
  };

  stage.innerHTML = `
    ${renderBanner({
      eyebrow: "Bakery co-op",
      title: "Bakery Rush",
      message: "Collect what the recipe needs, then bake while the oven is still in the safe zone.",
      metricText: "Goal: 4 perfect bakes",
    })}
      <section class="score-grid">
        <article class="mini-card">
          <span class="mini-label">Time left</span>
          <strong class="mini-value" id="bakeryTime">45.0s</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Perfect bakes</span>
          <strong class="mini-value" id="bakeryScore">0</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Oven temp</span>
          <strong class="mini-value" id="bakeryTemp">186 C</strong>
          <div class="zone-track">
            <div class="zone-fill" id="bakeryZone"></div>
          </div>
        </article>
      </section>
      <section class="bakery-board">
        <article class="control-card">
          <span class="mini-label">Current recipe</span>
          <h3 id="bakeryRecipe">Loading recipe...</h3>
          <ul id="bakeryNeeds" class="recipe-list"></ul>
          <p class="stage-note" id="bakeryMessage">${state.message}</p>
        </article>
        <article class="control-card">
          <span class="mini-label">Oven team</span>
          <div class="temp-controls">
            <button class="temp-btn" data-temp="-8">Cool oven</button>
            <button class="temp-btn" data-temp="8">Heat oven</button>
            <button class="primary-btn" id="bakeBtn">Bake batch</button>
          </div>
          <div class="meter-shell">
            <div class="meter-fill" id="bakeryReady"></div>
          </div>
        </article>
      </section>
      <section class="control-card">
        <span class="mini-label">Pantry taps</span>
        <div class="ingredient-grid" id="bakeryPantry"></div>
      </section>
    </section>
  `;

  const timeEl = document.getElementById("bakeryTime");
  const scoreEl = document.getElementById("bakeryScore");
  const tempEl = document.getElementById("bakeryTemp");
  const recipeEl = document.getElementById("bakeryRecipe");
  const needsEl = document.getElementById("bakeryNeeds");
  const messageEl = document.getElementById("bakeryMessage");
  const pantryEl = document.getElementById("bakeryPantry");
  const bakeBtn = document.getElementById("bakeBtn");
  const readyEl = document.getElementById("bakeryReady");
  const zoneEl = document.getElementById("bakeryZone");

  pantryEl.innerHTML = pantry
    .map((item) => `<button class="ingredient-btn" data-ingredient="${item}">${item}</button>`)
    .join("");

  function pickRecipe() {
    state.currentRecipe = structuredClone(randomItem(recipes));
    state.collected = {};
    for (const ingredient of Object.keys(state.currentRecipe.ingredients)) {
      state.collected[ingredient] = 0;
    }
  }

  function readyPercent() {
    const ingredients = Object.entries(state.currentRecipe.ingredients);
    const totalNeeded = ingredients.reduce((sum, [, amount]) => sum + amount, 0);
    const totalCollected = ingredients.reduce(
      (sum, [ingredient]) => sum + Math.min(state.collected[ingredient] || 0, state.currentRecipe.ingredients[ingredient]),
      0,
    );
    return totalNeeded === 0 ? 0 : (totalCollected / totalNeeded) * 100;
  }

  function updateZone() {
    const minTemp = 160;
    const maxTemp = 220;
    const safeMin = clamp(state.currentRecipe.temp - 10, minTemp, maxTemp);
    const width = 20 / (maxTemp - minTemp);
    const left = ((safeMin - minTemp) / (maxTemp - minTemp)) * 100;
    zoneEl.style.left = `${left}%`;
    zoneEl.style.width = `${width * 100}%`;
  }

  function updateBakeryView() {
    timeEl.textContent = `${state.time.toFixed(1)}s`;
    scoreEl.textContent = String(state.baked);
    tempEl.textContent = `${Math.round(state.temp)} C`;
    recipeEl.textContent = `${state.currentRecipe.name} at ${state.currentRecipe.temp} C`;
    messageEl.textContent = state.message;
    readyEl.style.width = `${readyPercent()}%`;
    needsEl.innerHTML = Object.entries(state.currentRecipe.ingredients)
      .map(([ingredient, amount]) => {
        const progress = `${state.collected[ingredient] || 0}/${amount}`;
        return `<li>${ingredient}: ${progress}</li>`;
      })
      .join("");

    const safe = Math.abs(state.temp - state.currentRecipe.temp) <= 10;
    bakeBtn.disabled = readyPercent() < 100;
    pantryEl.querySelectorAll("[data-ingredient]").forEach((button) => {
      const ingredient = button.dataset.ingredient;
      const needed = state.currentRecipe.ingredients[ingredient];
      const current = state.collected[ingredient] || 0;
      button.classList.toggle("ready", Boolean(needed) && current >= needed);
    });
    stage.querySelector(".zone-track").style.boxShadow = safe
      ? "0 0 0 2px rgba(31, 138, 112, 0.22)"
      : "0 0 0 1px rgba(77, 54, 44, 0.12)";
    updateZone();
  }

  function finishBakery() {
    if (state.finished) {
      return;
    }
    state.finished = true;
    clearInterval(timerId);
    const stars = state.baked >= 4 ? 3 : state.baked >= 2 ? 2 : state.baked >= 1 ? 1 : 0;
    saveResult("bakery", stars, state.baked);
    stage.innerHTML = `
      ${renderBanner({
        eyebrow: "Bakery finished",
        title: "Shift complete",
        message: `You finished ${state.baked} perfect bakes. Your best result is saved on this phone.`,
        metricText: `${stars} star run`,
      })}
        ${finishMarkup("Tip: stay near the target temperature before tapping Bake.")}
    `;
    stage.querySelector("[data-action='restart']").addEventListener("click", () => mountGame("bakery"));
  }

  pantryEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ingredient]");
    if (!button || state.finished) {
      return;
    }
    const ingredient = button.dataset.ingredient;
    const needed = state.currentRecipe.ingredients[ingredient];
    if (!needed) {
      state.time = clamp(state.time - 1.4, 0, 60);
      state.message = `${ingredient} is not needed. Time penalty.`;
      updateBakeryView();
      return;
    }
    if ((state.collected[ingredient] || 0) < needed) {
      state.collected[ingredient] += 1;
      state.message = `${ingredient} added. Keep the oven steady.`;
    } else {
      state.message = `${ingredient} is already complete for this batch.`;
    }
    updateBakeryView();
  });

  stage.querySelectorAll("[data-temp]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.finished) {
        return;
      }
      state.temp = clamp(state.temp + Number(button.dataset.temp), 155, 225);
      state.message = "Oven adjusted.";
      updateBakeryView();
    });
  });

  bakeBtn.addEventListener("click", () => {
    if (state.finished || readyPercent() < 100) {
      return;
    }
    if (Math.abs(state.temp - state.currentRecipe.temp) <= 10) {
      state.baked += 1;
      state.time = clamp(state.time + 6, 0, 60);
      state.message = "Perfect bake. New order coming in.";
      if (state.baked >= 4) {
        updateBakeryView();
        finishBakery();
        return;
      }
      pickRecipe();
    } else {
      state.time = clamp(state.time - 5, 0, 60);
      state.message = "Bake missed the temperature zone. Batch reset.";
      pickRecipe();
    }
    updateBakeryView();
  });

  pickRecipe();
  updateBakeryView();

  const timerId = setInterval(() => {
    if (state.finished) {
      return;
    }
    state.time = clamp(state.time - 0.2, 0, 60);
    state.temp = clamp(state.temp + (Math.random() * 4 - 2), 155, 225);
    if (state.time <= 0) {
      finishBakery();
      return;
    }
    updateBakeryView();
  }, 200);

  return () => clearInterval(timerId);
}

function mountPizzaGame() {
  const orders = [
    { name: "Garden Duo", crust: "Thin", sauce: "Classic", cheese: "Regular", toppings: ["Basil", "Mushroom"] },
    { name: "Sunset Slice", crust: "Pan", sauce: "Spicy", cheese: "Extra", toppings: ["Pepper", "Olive"] },
    { name: "Pesto Glow", crust: "Thin", sauce: "Pesto", cheese: "Light", toppings: ["Tomato", "Basil"] },
    { name: "Stuffed Night", crust: "Stuffed", sauce: "Classic", cheese: "Extra", toppings: ["Mushroom", "Olive"] },
  ];
  const crusts = ["Thin", "Pan", "Stuffed"];
  const sauces = ["Classic", "Pesto", "Spicy"];
  const cheeses = ["Light", "Regular", "Extra"];
  const toppings = ["Basil", "Pepper", "Olive", "Mushroom", "Tomato"];

  const state = {
    time: 50,
    points: 0,
    perfectOrders: 0,
    currentOrder: null,
    finished: false,
    message: "One player handles the crust and sauce. The other matches cheese and toppings.",
    build: {
      crust: "Thin",
      sauce: "Classic",
      cheese: "Regular",
      toppings: [],
    },
  };

  stage.innerHTML = `
    ${renderBanner({
      eyebrow: "Pizza co-op",
      title: "Pizza Pair Kitchen",
      message: "Match the full order card before time runs out. Exact builds score the most.",
      metricText: "Goal: 12 points",
    })}
      <section class="score-grid">
        <article class="mini-card">
          <span class="mini-label">Time left</span>
          <strong class="mini-value" id="pizzaTime">50.0s</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Kitchen points</span>
          <strong class="mini-value" id="pizzaPoints">0</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Perfect orders</span>
          <strong class="mini-value" id="pizzaPerfect">0</strong>
        </article>
      </section>
      <section class="pizza-board">
        <article class="control-card">
          <span class="mini-label">Target order</span>
          <h3 id="pizzaTitle">Loading order...</h3>
          <ul class="summary-list" id="pizzaTarget"></ul>
          <p class="stage-note" id="pizzaMessage">${state.message}</p>
        </article>
        <article class="control-card">
          <span class="mini-label">Your pizza</span>
          <ul class="summary-list" id="pizzaBuild"></ul>
          <div class="meter-shell">
            <div class="meter-fill" id="pizzaMeter"></div>
          </div>
        </article>
      </section>
      <section class="controls-grid">
        <article class="control-card">
          <span class="mini-label">Crust</span>
          <div class="choice-group" id="pizzaCrusts"></div>
        </article>
        <article class="control-card">
          <span class="mini-label">Sauce</span>
          <div class="choice-group" id="pizzaSauces"></div>
        </article>
        <article class="control-card">
          <span class="mini-label">Cheese</span>
          <div class="choice-group" id="pizzaCheeses"></div>
        </article>
      </section>
      <section class="control-card">
        <span class="mini-label">Toppings</span>
        <div class="topping-grid" id="pizzaToppings"></div>
        <div class="temp-controls">
          <button class="secondary-btn" id="pizzaReset">Clear pizza</button>
          <button class="primary-btn" id="pizzaServe">Serve order</button>
        </div>
      </section>
    </section>
  `;

  const timeEl = document.getElementById("pizzaTime");
  const pointsEl = document.getElementById("pizzaPoints");
  const perfectEl = document.getElementById("pizzaPerfect");
  const titleEl = document.getElementById("pizzaTitle");
  const targetEl = document.getElementById("pizzaTarget");
  const buildEl = document.getElementById("pizzaBuild");
  const messageEl = document.getElementById("pizzaMessage");
  const meterEl = document.getElementById("pizzaMeter");
  const crustsEl = document.getElementById("pizzaCrusts");
  const saucesEl = document.getElementById("pizzaSauces");
  const cheesesEl = document.getElementById("pizzaCheeses");
  const toppingsEl = document.getElementById("pizzaToppings");
  const resetBtn = document.getElementById("pizzaReset");
  const serveBtn = document.getElementById("pizzaServe");

  function renderChoiceGroup(container, type, options, activeValue) {
    container.innerHTML = options
      .map((option) => {
        const selected = type === "toppings"
          ? state.build.toppings.includes(option)
          : activeValue === option;
        return `<button class="choice-btn ${selected ? "selected" : ""}" data-type="${type}" data-value="${option}">${option}</button>`;
      })
      .join("");
  }

  function orderProgress() {
    let matched = 0;
    if (state.build.crust === state.currentOrder.crust) {
      matched += 1;
    }
    if (state.build.sauce === state.currentOrder.sauce) {
      matched += 1;
    }
    if (state.build.cheese === state.currentOrder.cheese) {
      matched += 1;
    }
    const exactToppings =
      state.build.toppings.length === state.currentOrder.toppings.length &&
      state.build.toppings.every((item) => state.currentOrder.toppings.includes(item));
    if (exactToppings) {
      matched += 1;
    }
    return matched;
  }

  function renderPizzaView() {
    timeEl.textContent = `${state.time.toFixed(1)}s`;
    pointsEl.textContent = String(state.points);
    perfectEl.textContent = String(state.perfectOrders);
    titleEl.textContent = state.currentOrder.name;
    targetEl.innerHTML = `
      <li>Crust: ${state.currentOrder.crust}</li>
      <li>Sauce: ${state.currentOrder.sauce}</li>
      <li>Cheese: ${state.currentOrder.cheese}</li>
      <li>Toppings: ${state.currentOrder.toppings.join(", ")}</li>
    `;
    buildEl.innerHTML = `
      <li>Crust: ${state.build.crust}</li>
      <li>Sauce: ${state.build.sauce}</li>
      <li>Cheese: ${state.build.cheese}</li>
      <li>Toppings: ${state.build.toppings.length ? state.build.toppings.join(", ") : "None"}</li>
    `;
    meterEl.style.width = `${orderProgress() * 25}%`;
    messageEl.textContent = state.message;
    renderChoiceGroup(crustsEl, "crust", crusts, state.build.crust);
    renderChoiceGroup(saucesEl, "sauce", sauces, state.build.sauce);
    renderChoiceGroup(cheesesEl, "cheese", cheeses, state.build.cheese);
    renderChoiceGroup(toppingsEl, "toppings", toppings, null);
  }

  function nextOrder() {
    state.currentOrder = structuredClone(randomItem(orders));
    state.build = {
      crust: "Thin",
      sauce: "Classic",
      cheese: "Regular",
      toppings: [],
    };
  }

  function finishPizza() {
    if (state.finished) {
      return;
    }
    state.finished = true;
    clearInterval(timerId);
    const stars = state.points >= 12 ? 3 : state.points >= 8 ? 2 : state.points >= 4 ? 1 : 0;
    saveResult("pizza", stars, state.points);
    stage.innerHTML = `
      ${renderBanner({
        eyebrow: "Kitchen finished",
        title: "Service ended",
        message: `You earned ${state.points} kitchen points with ${state.perfectOrders} perfect pizzas.`,
        metricText: `${stars} star run`,
      })}
        ${finishMarkup("Tip: toppings only count if the set matches exactly with no extras.")}
    `;
    stage.querySelector("[data-action='restart']").addEventListener("click", () => mountGame("pizza"));
  }

  function handlePizzaClick(event) {
    const choice = event.target.closest("[data-type]");
    if (choice && !state.finished) {
      const { type, value } = choice.dataset;
      if (type === "toppings") {
        if (state.build.toppings.includes(value)) {
          state.build.toppings = state.build.toppings.filter((item) => item !== value);
        } else {
          state.build.toppings = [...state.build.toppings, value];
        }
      } else {
        state.build[type] = value;
      }
      renderPizzaView();
      return;
    }

    if (event.target === resetBtn && !state.finished) {
      state.build = {
        crust: "Thin",
        sauce: "Classic",
        cheese: "Regular",
        toppings: [],
      };
      state.message = "Pizza cleared.";
      renderPizzaView();
      return;
    }

    if (event.target === serveBtn && !state.finished) {
      const matched = orderProgress();
      state.points += matched;
      if (matched === 4) {
        state.perfectOrders += 1;
        state.time = clamp(state.time + 4, 0, 60);
        state.message = "Perfect pizza. Bonus time added.";
      } else if (matched >= 3) {
        state.message = "Close match. Keep refining the kitchen teamwork.";
      } else {
        state.message = "Order was off. Study the target card before serving.";
      }
      if (state.points >= 12) {
        renderPizzaView();
        finishPizza();
        return;
      }
      nextOrder();
      renderPizzaView();
    }
  }

  stage.addEventListener("click", handlePizzaClick);

  nextOrder();
  renderPizzaView();

  const timerId = setInterval(() => {
    if (state.finished) {
      return;
    }
    state.time = clamp(state.time - 0.2, 0, 60);
    if (state.time <= 0) {
      finishPizza();
      return;
    }
    renderPizzaView();
  }, 200);

  return () => {
    clearInterval(timerId);
    stage.removeEventListener("click", handlePizzaClick);
  };
}

function mountPuzzleGame() {
  const symbols = ["Whisk", "Dough", "Frost", "Slice", "Cherry", "Kart"];
  const deck = shuffle([...symbols, ...symbols]).map((label, index) => ({
    id: `${label}-${index}`,
    label,
    matched: false,
    revealed: false,
  }));

  const state = {
    time: 55,
    moves: 0,
    matches: 0,
    flipped: [],
    locked: false,
    finished: false,
    message: "Player 1 flips first. Player 2 flips second.",
  };

  stage.innerHTML = `
    ${renderBanner({
      eyebrow: "Puzzle co-op",
      title: "Memory Match Relay",
      message: "Take turns revealing cards and clear all pairs before the countdown ends.",
      metricText: "Goal: 6 matches",
    })}
      <section class="score-grid">
        <article class="mini-card">
          <span class="mini-label">Time left</span>
          <strong class="mini-value" id="puzzleTime">55.0s</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Matches</span>
          <strong class="mini-value" id="puzzleMatches">0 / 6</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Moves</span>
          <strong class="mini-value" id="puzzleMoves">0</strong>
        </article>
      </section>
      <section class="control-card">
        <span class="mini-label">Team prompt</span>
        <p class="stage-note" id="puzzleMessage">${state.message}</p>
      </section>
      <section class="control-card">
        <div class="puzzle-grid" id="puzzleGrid"></div>
      </section>
    </section>
  `;

  const timeEl = document.getElementById("puzzleTime");
  const matchesEl = document.getElementById("puzzleMatches");
  const movesEl = document.getElementById("puzzleMoves");
  const messageEl = document.getElementById("puzzleMessage");
  const gridEl = document.getElementById("puzzleGrid");
  let flipTimeout = null;

  function renderPuzzleView() {
    timeEl.textContent = `${state.time.toFixed(1)}s`;
    matchesEl.textContent = `${state.matches} / 6`;
    movesEl.textContent = String(state.moves);
    messageEl.textContent = state.message;
    gridEl.innerHTML = deck
      .map((card, index) => {
        const visible = card.revealed || card.matched;
        const classes = ["tile-btn"];
        if (card.revealed) {
          classes.push("revealed");
        }
        if (card.matched) {
          classes.push("matched");
        }
        return `
          <button
            class="${classes.join(" ")}"
            data-index="${index}"
            ${card.matched ? "disabled" : ""}
          >
            ${visible ? card.label : "Flip"}
          </button>
        `;
      })
      .join("");
  }

  function finishPuzzle() {
    if (state.finished) {
      return;
    }
    state.finished = true;
    clearInterval(timerId);
    clearTimeout(flipTimeout);
    const stars =
      state.matches === 6 && state.time > 15 ? 3 :
      state.matches === 6 ? 2 :
      state.matches >= 3 ? 1 :
      0;
    saveResult("puzzle", stars, state.matches);
    stage.innerHTML = `
      ${renderBanner({
        eyebrow: "Puzzle finished",
        title: "Board cleared",
        message: `You found ${state.matches} pairs in ${state.moves} moves.`,
        metricText: `${stars} star run`,
      })}
        ${finishMarkup("Tip: keep one person on first-flip memory and one on second-flip decisions.")}
    `;
    stage.querySelector("[data-action='restart']").addEventListener("click", () => mountGame("puzzle"));
  }

  gridEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button || state.locked || state.finished) {
      return;
    }
    const index = Number(button.dataset.index);
    const card = deck[index];
    if (card.revealed || card.matched) {
      return;
    }

    card.revealed = true;
    state.flipped.push(index);
    state.message = state.flipped.length === 1 ? "Player 2: find the matching card." : "Checking match...";
    renderPuzzleView();

    if (state.flipped.length === 2) {
      state.locked = true;
      state.moves += 1;
      const [firstIndex, secondIndex] = state.flipped;
      const firstCard = deck[firstIndex];
      const secondCard = deck[secondIndex];
      if (firstCard.label === secondCard.label) {
        flipTimeout = setTimeout(() => {
          firstCard.matched = true;
          secondCard.matched = true;
          state.matches += 1;
          state.flipped = [];
          state.locked = false;
          state.message = state.matches === 6
            ? "Perfect board clear."
            : "Match found. Player 1 starts the next pair.";
          renderPuzzleView();
          if (state.matches === 6) {
            finishPuzzle();
          }
        }, 420);
      } else {
        flipTimeout = setTimeout(() => {
          firstCard.revealed = false;
          secondCard.revealed = false;
          state.flipped = [];
          state.locked = false;
          state.message = "Missed pair. Player 1 starts again.";
          renderPuzzleView();
        }, 780);
      }
    }
  });

  renderPuzzleView();

  const timerId = setInterval(() => {
    if (state.finished) {
      return;
    }
    state.time = clamp(state.time - 0.2, 0, 60);
    if (state.time <= 0) {
      finishPuzzle();
      return;
    }
    renderPuzzleView();
  }, 200);

  return () => {
    clearInterval(timerId);
    clearTimeout(flipTimeout);
  };
}

function mountRacingGame() {
  stage.innerHTML = `
    ${renderBanner({
      eyebrow: "Racing co-op",
      title: "Twin Track Sprint",
      message: "Each driver uses their own buttons. Dodge cones together until the timer ends.",
      metricText: "Goal: survive 35 seconds",
    })}
      <section class="score-grid">
        <article class="mini-card">
          <span class="mini-label">Time left</span>
          <strong class="mini-value" id="raceTime">35.0s</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Team hearts</span>
          <strong class="mini-value" id="raceLives">3</strong>
        </article>
        <article class="mini-card">
          <span class="mini-label">Distance</span>
          <strong class="mini-value" id="raceDistance">0 m</strong>
        </article>
      </section>
      <section class="race-layout">
        <article class="race-shell">
          <canvas id="raceCanvas" width="360" height="520" aria-label="Racing game area"></canvas>
          <div class="race-legend">
            <span>Left driver car: coral</span>
            <span>Right driver car: teal</span>
          </div>
        </article>
        <article class="controls-grid">
          <section class="lane-group">
            <strong>Left driver</strong>
            <div class="lane-controls">
              <button class="lane-btn left-driver selected" data-driver="left" data-lane="0">Lane A</button>
              <button class="lane-btn left-driver" data-driver="left" data-lane="1">Lane B</button>
            </div>
          </section>
          <section class="lane-group">
            <strong>Right driver</strong>
            <div class="lane-controls">
              <button class="lane-btn right-driver selected" data-driver="right" data-lane="0">Lane A</button>
              <button class="lane-btn right-driver" data-driver="right" data-lane="1">Lane B</button>
            </div>
          </section>
        </article>
      </section>
    </section>
  `;

  const canvas = document.getElementById("raceCanvas");
  const context = canvas.getContext("2d");
  const timeEl = document.getElementById("raceTime");
  const livesEl = document.getElementById("raceLives");
  const distanceEl = document.getElementById("raceDistance");

  const state = {
    leftLane: 0,
    rightLane: 0,
    obstacles: [],
    time: 35,
    lives: 3,
    distance: 0,
    flash: 0,
    spawnCooldown: 0,
    running: true,
    lastTimestamp: 0,
  };

  const carY = 430;
  let animationId = 0;

  function laneX(driver, laneIndex) {
    const lanes = driver === "left" ? [72, 138] : [222, 288];
    return lanes[laneIndex];
  }

  function renderButtons() {
    stage.querySelectorAll("[data-driver]").forEach((button) => {
      const selected =
        (button.dataset.driver === "left" && Number(button.dataset.lane) === state.leftLane) ||
        (button.dataset.driver === "right" && Number(button.dataset.lane) === state.rightLane);
      button.classList.toggle("selected", selected);
    });
  }

  function drawCar(x, y, color) {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(x - 18, y, 36, 62, 12);
    context.fill();
    context.fillStyle = "#f8f2ea";
    context.fillRect(x - 10, y + 8, 20, 16);
    context.fillRect(x - 10, y + 36, 20, 12);
  }

  function drawTrack() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#2f2724";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#4f433f";
    context.fillRect(25, 0, 135, canvas.height);
    context.fillRect(200, 0, 135, canvas.height);

    context.fillStyle = "#f0e5d7";
    for (let y = -40; y < canvas.height + 40; y += 44) {
      context.fillRect(177, (y + state.distance * 2) % (canvas.height + 44) - 44, 6, 24);
      context.fillRect(91, (y + state.distance * 2) % (canvas.height + 44) - 44, 4, 18);
      context.fillRect(264, (y + state.distance * 2) % (canvas.height + 44) - 44, 4, 18);
    }

    drawCar(laneX("left", state.leftLane), carY, "#d46a51");
    drawCar(laneX("right", state.rightLane), carY, "#2e9e8d");

    state.obstacles.forEach((obstacle) => {
      context.fillStyle = "#f1b341";
      const x = laneX(obstacle.driver, obstacle.lane);
      context.beginPath();
      context.roundRect(x - 18, obstacle.y, 36, 44, 10);
      context.fill();
      context.fillStyle = "#8e4b27";
      context.fillRect(x - 4, obstacle.y + 10, 8, 24);
    });

    if (state.flash > 0) {
      context.fillStyle = `rgba(255, 255, 255, ${0.16 * state.flash})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function updateHud() {
    timeEl.textContent = `${state.time.toFixed(1)}s`;
    livesEl.textContent = String(state.lives);
    distanceEl.textContent = `${Math.floor(state.distance)} m`;
  }

  function finishRace() {
    if (!state.running) {
      return;
    }
    state.running = false;
    cancelAnimationFrame(animationId);
    const stars = state.time > 0 && state.lives === 3 ? 3 : state.time > 0 && state.lives >= 1 ? 2 : state.distance >= 250 ? 1 : 0;
    saveResult("racing", stars, Math.floor(state.distance));
    stage.innerHTML = `
      ${renderBanner({
        eyebrow: "Race finished",
        title: "Sprint over",
        message: `Your team reached ${Math.floor(state.distance)} meters and finished with ${state.lives} hearts.`,
        metricText: `${stars} star run`,
      })}
        ${finishMarkup("Tip: each driver should claim a lane button and avoid switching at the same time.")}
    `;
    stage.querySelector("[data-action='restart']").addEventListener("click", () => mountGame("racing"));
  }

  function handleLanePress(event) {
    const button = event.target.closest("[data-driver]");
    if (!button || !state.running) {
      return;
    }
    const lane = Number(button.dataset.lane);
    if (button.dataset.driver === "left") {
      state.leftLane = lane;
    }
    if (button.dataset.driver === "right") {
      state.rightLane = lane;
    }
    renderButtons();
  }

  function spawnObstacle() {
    const driver = Math.random() < 0.5 ? "left" : "right";
    const lane = Math.random() < 0.5 ? 0 : 1;
    state.obstacles.push({
      driver,
      lane,
      y: -55,
      speed: 220 + Math.random() * 85,
    });
  }

  function checkCollision(obstacle) {
    if (obstacle.y < carY - 36 || obstacle.y > carY + 58) {
      return false;
    }
    const activeLane = obstacle.driver === "left" ? state.leftLane : state.rightLane;
    return obstacle.lane === activeLane;
  }

  function frame(timestamp) {
    if (!state.running) {
      return;
    }
    if (!state.lastTimestamp) {
      state.lastTimestamp = timestamp;
    }
    const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.032);
    state.lastTimestamp = timestamp;
    state.time = clamp(state.time - delta, 0, 40);
    state.distance += delta * 26;
    state.flash = clamp(state.flash - delta * 2.5, 0, 1);
    state.spawnCooldown -= delta;

    if (state.spawnCooldown <= 0) {
      spawnObstacle();
      state.spawnCooldown = 0.5 + Math.random() * 0.5;
    }

    state.obstacles = state.obstacles.filter((obstacle) => {
      obstacle.y += obstacle.speed * delta;
      if (checkCollision(obstacle)) {
        state.lives -= 1;
        state.flash = 1;
        return false;
      }
      return obstacle.y < canvas.height + 50;
    });

    updateHud();
    drawTrack();

    if (state.lives <= 0 || state.time <= 0) {
      finishRace();
      return;
    }

    animationId = requestAnimationFrame(frame);
  }

  stage.addEventListener("click", handleLanePress);
  renderButtons();
  updateHud();
  drawTrack();
  animationId = requestAnimationFrame(frame);

  return () => {
    state.running = false;
    cancelAnimationFrame(animationId);
    stage.removeEventListener("click", handleLanePress);
  };
}

cardButtons.forEach((button) => {
  button.addEventListener("click", () => mountGame(button.dataset.game));
});

window.addEventListener("online", updateConnectionBadge);
window.addEventListener("offline", updateConnectionBadge);

updateStats();
updateConnectionBadge();
renderWelcome();
registerServiceWorker();
enableInstallPrompt();
