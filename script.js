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

const Weather = {
  init() {
    this.el = $("#weather-chip");
    if (!this.el) return;
    this.fetchWeather();
    setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
  },

  async fetchWeather() {
    this.el.classList.add("hidden");

    // Helper to fetch weather from lat/lon
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

    // 1. Try GPS with relaxed options
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          getFromCoords(position.coords.latitude, position.coords.longitude);
        },
        async (error) => {
          console.warn(`GPS failed (${error.code}), trying IP fallback...`);
          // If permission denied (1), don't force fallback to avoid creeping user out
          // showing "Enable Loc" allows them to choose.
          if (error.code === 1) {
            this.showError(true);
            return;
          }
          // For unavailable (2) or timeout (3), try IP
          try {
            const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
            if (!ipRes.ok) throw new Error("IP Geo failed");
            const ipData = await ipRes.json();
            getFromCoords(ipData.latitude, ipData.longitude);
          } catch (ipErr) {
            console.error(ipErr);
            this.showError(); // Generic offline error
          }
        },
        { timeout: 8000, maximumAge: 600000 },
      );
    } else {
      // No geo support, try IP directly
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
      // Show generic warning but keep it minimal
      this.el.innerHTML = `<i class="ph ph-warning"></i>`;
      this.el.classList.remove("hidden");
      this.el.classList.remove("clickable");
      this.el.onclick = null;
    }
  },

  render(current) {
    if (!current) return;

    // Remove error state styles
    this.el.classList.remove("clickable");
    this.el.onclick = null;

    // Convert WMO code to icon class
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
    Weather.init();
    Settings.init();
  });
});
