const CONFIG = {
  DEFAULT_THEME: "dark",
};

const state = {
  theme: "dark",
};

const $ = (selector) => document.querySelector(selector);
const saveState = () => {
  const toSave = {
    theme: state.theme,
  };
  chrome.storage.sync.set(toSave);
};

const applyTheme = () => {
  const theme = state.theme;
  const target = document.documentElement;

  if (theme === "dark") {
    target.removeAttribute("data-theme");
  } else {
    target.setAttribute("data-theme", theme);
  }
};

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
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");

    h = h % 12;
    h = h ? h : 12;

    this.timeDisplay.innerHTML = `${h}:${m}<span class="seconds">:${s}</span>`;

    const secondsEl = this.timeDisplay.querySelector(".seconds");
    if (secondsEl) {
      secondsEl.classList.remove("tick");
      void secondsEl.offsetWidth;
      secondsEl.classList.add("tick");
    }

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

const Quotebar = {
  init() {
    this.el = $("#quote-display");
    this.update();
    setInterval(() => this.update(), 60 * 60 * 1000);
  },
  update() {
    if (!this.el) return;
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

    const randomIndex = Math.floor(Math.random() * bucket.length);

    this.el.classList.remove("quote-fade");
    void this.el.offsetWidth;
    this.el.textContent = bucket[randomIndex];
    this.el.classList.add("quote-fade");
  },
};

const Settings = {
  init() {
    this.toggle = $("#settings-toggle");
    this.panel = $("#settings-panel");
    this.backdrop = $("#settings-backdrop");
    this.close = $("#settings-close");
    this.themeOptions = $("#theme-options");

    this.bind();
    this.render();
  },

  bind() {
    this.toggle?.addEventListener("click", () => this.open());
    this.close?.addEventListener("click", () => this.close_panel());
    this.backdrop?.addEventListener("click", () => this.close_panel());

    this.themeOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const theme = e.target.dataset.value;
        state.theme = theme;
        saveState();
        applyTheme();
        this.render();
      });
    });
  },

  render() {
    this.themeOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === state.theme);
    });
  },

  open() {
    this.panel?.classList.add("open");
    this.backdrop?.classList.add("open");
  },

  close_panel() {
    this.panel?.classList.remove("open");
    this.backdrop?.classList.remove("open");
  },
};

document.addEventListener("DOMContentLoaded", () => {
  // Load state
  chrome.storage.sync.get(null, (items) => {
    if (items && items.theme) state.theme = items.theme;

    applyTheme();

    Clock.init();
    Quotebar.init();
    Settings.init();
  });
});
