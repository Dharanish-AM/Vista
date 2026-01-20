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
};

// --- Utils ---
const $ = (selector) => document.querySelector(selector);
const saveState = () => {
  // Only save what's necessary to persist
  const toSave = {
    theme: state.theme,
  };
  chrome.storage.sync.set(toSave);
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
    this.el.textContent = bucket[randomIndex];
  },
};

// --- Boot ---
document.addEventListener("DOMContentLoaded", () => {
  // Load state
  chrome.storage.sync.get(null, (items) => {
    // Only theme persistence might matter now, but user said "others nothing".
    // Assuming we keep the code for theme if we ever add settings back, or just default system.
    if (items && items.theme) state.theme = items.theme;

    // Init Modules
    Clock.init();
    Quotebar.init();
  });
});
