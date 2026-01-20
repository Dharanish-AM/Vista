/**
 * Vista - Minimal Productive New Tab
 * Focused on speed (<300ms) and simplicity.
 */

// --- Constants & Config ---
// --- Constants & Config ---
const CONFIG = {
  DEFAULT_THEME: "system",
};

// --- State Management ---
const state = {
  theme: "system",
  stars: true,
};

// --- Utils ---
const $ = (selector) => document.querySelector(selector);
const saveState = () => {
  // Only save what's necessary to persist
  const toSave = {
    theme: state.theme,
    stars: state.stars,
  };
  chrome.storage.sync.set(toSave);
};

const applyTheme = () => {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = state.theme;
  const target = document.documentElement;

  if (theme === "light") {
    target.setAttribute("data-theme", "light");
  } else if (theme === "dark") {
    target.removeAttribute("data-theme");
  } else {
    // system
    if (prefersLight) target.setAttribute("data-theme", "light");
    else target.removeAttribute("data-theme");
  }
};

const applyStars = () => {
  document.body.classList.toggle("no-stars", !state.stars);
};

// --- Modules ---

/** Clock & Date */
const Clock = {
  init() {
    this.timeDisplay = $("#time-display");
    this.dateDisplay = $("#date-display");
    this.greeting = $("#greeting");
    this.update();
    setInterval(() => this.update(), 1000);
  },

  update() {
    const now = new Date();
    // 12-hour format
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");

    h = h % 12;
    h = h ? h : 12;

    // Updated to show Seconds as requested
    this.timeDisplay.innerHTML = `${h}:${m}<span class="seconds">:${s}</span>`;

    if (this.dateDisplay) {
      const day = now.toLocaleDateString("en-US", { weekday: "long" });
      const month = now.toLocaleDateString("en-US", { month: "short" });
      const date = now.getDate();
      this.dateDisplay.textContent = `${day}, ${month} ${date}`;
    }

    if (this.greeting) {
      const hour = now.getHours();
      let message = "Hello";

      if (hour >= 5 && hour < 12) message = "Good morning";
      else if (hour >= 12 && hour < 17) message = "Good afternoon";
      else if (hour >= 17 && hour < 22) message = "Good evening";
      else message = "Up late?";

      this.greeting.textContent = message;
    }
  },
};

/** Quotes */
const Quotebar = {
  init() {
    this.el = $("#quote-display");
    this.update();
    // Update quote every hour to stay relatable?
    setInterval(() => this.update(), 60 * 60 * 1000);
  },
  update() {
    if (!this.el) return;
    // Safety check if QUOTES is missing
    if (typeof QUOTES === "undefined") {
      this.el.textContent = "Time to focus.";
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    let bucket = [];

    if (hour >= 5 && hour < 12) bucket = QUOTES.morning;
    else if (hour >= 12 && hour < 17) bucket = QUOTES.afternoon;
    else if (hour >= 17 && hour < 22) bucket = QUOTES.evening;
    else bucket = QUOTES.night;

    // Mix in general quotes occasionally for variety?
    // Let's just stick to time-based + random selection for now.
    const randomIndex = Math.floor(Math.random() * bucket.length);

    // Trigger a quick fade animation on swap
    this.el.classList.remove("quote-fade");
    // Force reflow to restart animation
    void this.el.offsetWidth;
    this.el.textContent = bucket[randomIndex];
    this.el.classList.add("quote-fade");
  },
};

/** Settings */
const Settings = {
  init() {
    this.toggle = $("#settings-toggle");
    this.panel = $("#settings-panel");
    this.close = $("#settings-close");
    this.themeButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
    this.starsToggle = $("#stars-toggle");

    this.bind();
    this.sync();

    // React to system theme changes when in system mode
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    this.mediaQuery.addEventListener("change", () => {
      if (state.theme === "system") applyTheme();
    });
  },

  bind() {
    this.toggle?.addEventListener("click", () => this.panel?.classList.toggle("open"));
    this.close?.addEventListener("click", () => this.panel?.classList.remove("open"));

    this.themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.themeOption;
        state.theme = value;
        applyTheme();
        this.sync();
        saveState();
      });
    });

    this.starsToggle?.addEventListener("click", () => {
      state.stars = !state.stars;
      applyStars();
      this.sync();
      saveState();
    });

    document.addEventListener("click", (e) => {
      if (!this.panel || !this.toggle) return;
      if (this.panel.contains(e.target) || this.toggle.contains(e.target)) return;
      this.panel.classList.remove("open");
    });
  },

  sync() {
    this.themeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.themeOption === state.theme);
    });

    if (this.starsToggle) {
      this.starsToggle.classList.toggle("active", state.stars);
      const label = this.starsToggle.querySelector(".toggle-label");
      if (label) label.textContent = state.stars ? "Stars on" : "Stars off";
      this.starsToggle.setAttribute("aria-pressed", state.stars ? "true" : "false");
    }
  },
};

// --- Boot ---
document.addEventListener("DOMContentLoaded", () => {
  // Load state
  chrome.storage.sync.get(null, (items) => {
    // Only theme persistence might matter now, but user said "others nothing".
    // Assuming we keep the code for theme if we ever add settings back, or just default system.
    if (items && items.theme) state.theme = items.theme;
    if (items && typeof items.stars === "boolean") state.stars = items.stars;

    applyTheme();
    applyStars();

    // Init Modules
    Clock.init();
    Quotebar.init();
    Settings.init();
  });
});
