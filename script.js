const CONFIG = {
  DEFAULT_THEME: "dark",
  DEFAULT_FONT: "jetbrains",
  DEFAULT_TIME_FORMAT: "12h",
  DEFAULT_SHOW_SECONDS: true,
  DEFAULT_SHORTCUTS: [
    { title: "GitHub", url: "https://github.com", icon: "github-logo" },
    {
      title: "LinkedIn",
      url: "https://www.linkedin.com",
      icon: "linkedin-logo",
    },
    { title: "Gmail", url: "https://mail.google.com", icon: "envelope-simple" },
  ],
};

const state = {
  theme: CONFIG.DEFAULT_THEME,
  font: CONFIG.DEFAULT_FONT,
  timeFormat: CONFIG.DEFAULT_TIME_FORMAT,
  showSeconds: CONFIG.DEFAULT_SHOW_SECONDS,
  focus: "",
  shortcuts: [...CONFIG.DEFAULT_SHORTCUTS],
};

const $ = (selector) => document.querySelector(selector);
const saveState = () => {
  const toSave = {
    theme: state.theme,
    font: state.font,
    timeFormat: state.timeFormat,
    showSeconds: state.showSeconds,
    focus: state.focus,
    shortcuts: state.shortcuts,
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

const applyFont = () => {
  const font = state.font || CONFIG.DEFAULT_FONT;
  document.documentElement.setAttribute("data-font", font);
};

const Clock = {
  init() {
    this.timeDisplay = $("#time-display");
    this.dateDisplay = $("#date-display");
    this.greeting = $("#greeting");
    this.lastGreeting = "";
    this.update();
    setInterval(() => this.update(), 1000);
  },

  update() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");

    if (state.timeFormat === "12h") {
      h = h % 12;
      h = h ? h : 12;
    }

    const hourStr =
      state.timeFormat === "12h"
        ? h.toString().padStart(2, "0")
        : h.toString().padStart(2, "0");

    const secondsMarkup = state.showSeconds
      ? `<span class="seconds">:${s}</span>`
      : "";

    this.timeDisplay.innerHTML = `${hourStr}:${m}${secondsMarkup}`;

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

      if (this.lastGreeting !== message) {
        this.greeting.classList.remove("greeting-fade");
        void this.greeting.offsetWidth;
        this.greeting.textContent = message;
        this.greeting.classList.add("greeting-fade");
        this.lastGreeting = message;
      }
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

const Weather = {
  init() {
    this.el = $("#weather-chip");
    if (!this.el) return;
    this.fetchWeather();
    setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
  },

  async fetchWeather() {
    this.el.classList.add("hidden");

    const getFromCoords = async (lat, lon) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`,
        );
        if (!response.ok) throw new Error("Weather fetch failed");
        const data = await response.json();
        this.render(data.current);
      } catch (err) {
        console.error(err);
        this.showError();
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          getFromCoords(position.coords.latitude, position.coords.longitude);
        },
        async (error) => {
          console.warn(`GPS failed (${error.code}), trying IP fallback...`);
          if (error.code === 1) {
            this.showError(true);
            return;
          }
          try {
            const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
            if (!ipRes.ok) throw new Error("IP Geo failed");
            const ipData = await ipRes.json();
            getFromCoords(ipData.latitude, ipData.longitude);
          } catch (ipErr) {
            console.error(ipErr);
            this.showError();
          }
        },
        { timeout: 8000, maximumAge: 600000 },
      );
    } else {
      try {
        const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
        if (!ipRes.ok) throw new Error("IP Geo failed");
        const ipData = await ipRes.json();
        getFromCoords(ipData.latitude, ipData.longitude);
      } catch (ipErr) {
        this.showError();
      }
    }
  },

  showError(isPermission = false) {
    if (isPermission) {
      this.el.innerHTML = `<i class="ph ph-map-pin"></i><span>Enable Loc</span>`;
      this.el.classList.remove("hidden");
      this.el.classList.add("clickable");
      this.el.onclick = () => this.fetchWeather();
    } else {
      this.el.innerHTML = `<i class="ph ph-warning"></i>`;
      this.el.classList.remove("hidden");
      this.el.classList.remove("clickable");
      this.el.onclick = null;
    }
  },

  render(current) {
    if (!current) return;

    this.el.classList.remove("clickable");
    this.el.onclick = null;

    const getIcon = (code) => {
      const map = {
        0: "ph-sun",
        1: "ph-sun-dim",
        2: "ph-cloud-sun",
        3: "ph-cloud",
        45: "ph-cloud-fog",
        48: "ph-cloud-fog",
        51: "ph-drop-light",
        53: "ph-drop",
        55: "ph-drop-excess",
        61: "ph-cloud-rain-light",
        63: "ph-cloud-rain",
        65: "ph-cloud-rain-heavy",
        71: "ph-snowflake-light",
        73: "ph-snowflake",
        75: "ph-snowflake-heavy",
        77: "ph-snowflake",
        80: "ph-cloud-rain-light",
        81: "ph-cloud-rain",
        82: "ph-cloud-rain-heavy",
        85: "ph-snowflake-light",
        86: "ph-snowflake-heavy",
        95: "ph-lightning",
        96: "ph-lightning-slash",
        99: "ph-lightning-slash",
      };
      return map[code] || "ph-sun";
    };

    const iconClass = getIcon(current.weather_code);
    const temp = Math.round(current.temperature_2m);

    this.el.innerHTML = `<i class="ph ${iconClass}"></i><span>${temp}°C</span>`;
    this.el.classList.remove("hidden");
  },
};

const Shortcuts = {
  init() {
    this.container = $(".quick-actions");
    this.render();
  },

  render() {
    if (!this.container) return;
    this.container.innerHTML = state.shortcuts
      .map(
        (shortcut) => `
      <a
        class="action-chip"
        href="${shortcut.url}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i class="ph ph-${shortcut.icon}"></i>
        <span>${shortcut.title}</span>
      </a>
    `,
      )
      .join("");
  },
};

const Settings = {
  init() {
    this.toggle = $("#settings-toggle");
    this.panel = $("#settings-panel");
    this.backdrop = $("#settings-backdrop");
    this.close = $("#settings-close");
    this.themeOptions = $("#theme-options");
    this.fontOptions = $("#font-options");
    this.timeFormatOptions = $("#time-format-options");
    this.secondsToggle = $("#seconds-toggle");
    this.shortcutsList = $("#shortcuts-list");
    this.addShortcutBtn = $("#add-shortcut-btn");
    this.shortcutForm = $("#shortcut-form");
    this.shortcutFormContainer = $("#shortcut-form-container");
    this.cancelShortcutBtn = $("#cancel-shortcut-btn");

    this.bind();
    this.render();
    this.renderShortcutsList();
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

    this.fontOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const font = e.target.dataset.value;
        state.font = font;
        saveState();
        applyFont();
        this.render();
      });
    });

    this.timeFormatOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const format = e.target.dataset.value;
        state.timeFormat = format;
        saveState();
        Clock.update();
        this.render();
      });
    });

    this.secondsToggle?.querySelectorAll(".pill").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const value = e.target.dataset.value;
        state.showSeconds = value === "show";
        saveState();
        Clock.update();
        this.render();
      });
    });

    this.addShortcutBtn?.addEventListener("click", () => {
      this.showShortcutForm();
    });

    this.cancelShortcutBtn?.addEventListener("click", () => {
      this.hideShortcutForm();
    });

    this.shortcutForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveShortcut();
    });
  },

  render() {
    this.themeOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === state.theme);
    });

    this.fontOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === state.font);
    });

    this.timeFormatOptions?.querySelectorAll(".pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === state.timeFormat);
    });

    this.secondsToggle?.querySelectorAll(".pill").forEach((btn) => {
      const isShow = btn.dataset.value === "show";
      btn.classList.toggle("active", state.showSeconds === isShow);
    });
  },

  renderShortcutsList() {
    if (!this.shortcutsList) return;
    this.shortcutsList.innerHTML = state.shortcuts
      .map(
        (shortcut, index) => `
      <div class="shortcut-item">
        <div class="shortcut-info">
          <i class="ph ph-${shortcut.icon}"></i>
          <span>${shortcut.title}</span>
        </div>
        <div class="shortcut-actions">
          <button class="icon-button small edit-shortcut" data-index="${index}">
            <i class="ph ph-pencil-simple"></i>
          </button>
          <button class="icon-button small delete-shortcut" data-index="${index}">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `,
      )
      .join("");

    this.shortcutsList.querySelectorAll(".edit-shortcut").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = e.currentTarget.dataset.index;
        this.editShortcut(index);
      });
    });

    this.shortcutsList.querySelectorAll(".delete-shortcut").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = e.currentTarget.dataset.index;
        this.deleteShortcut(index);
      });
    });
  },

  showShortcutForm(index = null) {
    this.shortcutFormContainer.classList.remove("hidden");
    this.addShortcutBtn.classList.add("hidden");

    const titleInput = $("#shortcut-title");
    const urlInput = $("#shortcut-url");
    const iconInput = $("#shortcut-icon");
    const indexInput = $("#shortcut-index");

    if (index !== null) {
      const shortcut = state.shortcuts[index];
      titleInput.value = shortcut.title;
      urlInput.value = shortcut.url;
      iconInput.value = shortcut.icon;
      indexInput.value = index;
    } else {
      titleInput.value = "";
      urlInput.value = "";
      iconInput.value = "";
      indexInput.value = "-1";
    }

    setTimeout(() => titleInput.focus(), 50);
  },

  hideShortcutForm() {
    this.shortcutFormContainer.classList.add("hidden");
    this.addShortcutBtn.classList.remove("hidden");
  },

  saveShortcut() {
    const title = $("#shortcut-title").value.trim();
    const url = $("#shortcut-url").value.trim();
    const icon = $("#shortcut-icon").value.trim() || "link";
    const index = parseInt($("#shortcut-index").value);

    if (!title || !url) return;

    if (index >= 0) {
      state.shortcuts[index] = { title, url, icon };
    } else {
      state.shortcuts.push({ title, url, icon });
    }

    saveState();
    Shortcuts.render();
    this.renderShortcutsList();
    this.hideShortcutForm();
  },

  editShortcut(index) {
    this.showShortcutForm(index);
  },

  deleteShortcut(index) {
    state.shortcuts.splice(index, 1);
    saveState();
    Shortcuts.render();
    this.renderShortcutsList();
  },

  open() {
    this.panel?.classList.add("open");
    this.backdrop?.classList.add("open");
  },

  close_panel() {
    this.panel?.classList.remove("open");
    this.backdrop?.classList.remove("open");
    this.hideShortcutForm();
  },
};

const Focus = {
  init() {
    this.input = $("#focus-input");
    if (!this.input) return;
    if (state.focus) {
      this.input.value = state.focus;
    }
    this.bind();
  },

  bind() {
    this.input.addEventListener("change", (e) => {
      const value = e.target.value.trim();
      state.focus = value;
      saveState();
    });

    this.input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const value = e.target.value.trim();
        state.focus = value;
        saveState();
        this.input.blur();
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(null, (items) => {
    if (items && items.theme) state.theme = items.theme;
    if (items && items.font) state.font = items.font;
    if (items && items.timeFormat) state.timeFormat = items.timeFormat;
    if (items && typeof items.showSeconds === "boolean")
      state.showSeconds = items.showSeconds;
    if (items && typeof items.focus === "string") state.focus = items.focus;
    if (items && Array.isArray(items.shortcuts))
      state.shortcuts = items.shortcuts;

    applyTheme();
    applyFont();

    Clock.init();
    Quotebar.init();
    Weather.init();
    Shortcuts.init();
    Settings.init();
    Focus.init();
  });
});
