(() => {
  "use strict";

  const SUPABASE_URL = "https://krremeahcfcheipwaoaa.supabase.co";
  const SUPABASE_KEY = "sb_publishable_r0V79Ivhdi3KurFXqYI5Ng_kNEGm6iR";
  const VAPID_PUBLIC_KEY = "BGdZucIN1773Dcj8DumQWgTXJfj9XHsrYreW9fHG0t8oUVhun6gUF1BZlKMUYouXais-H64h6F-TOPDQiNe0PCw";
  const SESSION_KEY = "dp_cloud_session";
  const TASKS_KEY = "dp_cloud_tasks";
  const DELETED_KEY = "dp_cloud_deleted";
  const LAST_KEY = "dp_cloud_last";
  const WEATHER_KEY = "dp_cloud_weather";
  const WEATHER_URL =
    "https://api.met.no/weatherapi/locationforecast/2.0/compact" +
    "?lat=56.152&lon=47.206";
  const WEATHER_CODES = {
    clearsky: ["Ясно", "☀"],
    fair: ["Малооблачно", "🌤"],
    partlycloudy: ["Переменная облачность", "⛅"],
    cloudy: ["Облачно", "☁"],
    fog: ["Туман", "🌫"],
    lightrain: ["Небольшой дождь", "🌦"],
    rain: ["Дождь", "🌧"],
    heavyrain: ["Сильный дождь", "🌧"],
    lightrainshowers: ["Небольшой ливень", "🌦"],
    rainshowers: ["Ливень", "🌧"],
    heavyrainshowers: ["Сильный ливень", "⛈"],
    lightsleet: ["Небольшой мокрый снег", "🌨"],
    sleet: ["Мокрый снег", "🌨"],
    heavysleet: ["Сильный мокрый снег", "🌨"],
    lightsnow: ["Небольшой снег", "🌨"],
    snow: ["Снег", "🌨"],
    heavysnow: ["Сильный снег", "❄"],
    lightsnowshowers: ["Небольшой снегопад", "🌨"],
    snowshowers: ["Снегопад", "❄"],
    thunderstorm: ["Гроза", "⛈"],
    lightrainandthunder: ["Гроза с дождём", "⛈"],
    rainandthunder: ["Гроза с дождём", "⛈"],
    heavyrainandthunder: ["Сильная гроза", "⛈"],
    lightsleetandthunder: ["Гроза с мокрым снегом", "⛈"],
    sleetandthunder: ["Гроза с мокрым снегом", "⛈"],
    heavysleetandthunder: ["Сильная гроза", "⛈"],
    lightsnowandthunder: ["Гроза со снегом", "⛈"],
    snowandthunder: ["Гроза со снегом", "⛈"]
  };

  const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const WEEKDAYS_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const WEEKDAYS_FULL = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
  const CATEGORIES = {
    study: { name: "Пары", color: "#7C6CFF" },
    work: { name: "Работа", color: "#FFC857" },
    doctor: { name: "Врачи", color: "#FF6B81" },
    driving: { name: "Вождение", color: "#4CC9F0" },
    personal: { name: "Личное", color: "#3DDC97" },
    other: { name: "Другое", color: "#8B92A7" }
  };
  const $ = (id) => document.getElementById(id);

  const ui = {
    connDot: $("connDot"), connLabel: $("connLabel"),
    offline: $("offlineBanner"),
    weekday: $("weekdayLabel"), dateTitle: $("dateTitle"), year: $("yearLabel"),
    todayBtn: $("todayBtn"), weekStrip: $("weekStrip"),
    prevWeek: $("prevWeek"), nextWeek: $("nextWeek"),
    count: $("countLabel"), list: $("taskList"),
    empty: $("emptyState"), allDone: $("allDoneState"),
    add: $("addBtn"), emptyAdd: $("emptyAdd"),
    overlay: $("overlay"), sheet: $("sheet"),
    sheetTitle: $("sheetTitle"), close: $("sheetClose"),
    title: $("fTitle"), date: $("fDate"), time: $("fTime"),
    duration: $("fDuration"), remind: $("fRemind"), note: $("fNote"),
    category: $("fCategory"),
    error: $("formError"), save: $("saveBtn"), cancel: $("cancelBtn"),
    del: $("deleteBtn"),
    login: $("login"), email: $("cloudEmail"), password: $("cloudPassword"),
    loginBtn: $("cloudLoginBtn"), loginError: $("cloudLoginError"),
    toast: $("toast"),
    weather: $("weatherLine"),
    notifyBtn: $("notifyBtn"),
    logoutBtn: $("logoutBtn")
  };

  const state = {
    tasks: [],
    deleted: [],
    session: null,
    selected: todayISO(),
    weather: null
  };
  let syncing = false;
  let syncTimer = null;
  let toastTimer = null;
  let editing = null;
  let notificationsBusy = false;

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function parseISO(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function iso(d) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function addDays(value, days) {
    const d = parseISO(value);
    d.setDate(d.getDate() + days);
    return iso(d);
  }
  function mondayOf(value) {
    const d = parseISO(value);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return iso(d);
  }
  function humanDate(value) {
    const d = parseISO(value);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  function weekdayFull(value) {
    const day = parseISO(value).getDay();
    return WEEKDAYS_FULL[day === 0 ? 6 : day - 1];
  }
  function endTime(task) {
    if (!task.duration) return "";
    const [h, m] = task.start.split(":").map(Number);
    const total = h * 60 + m + Number(task.duration);
    return `${pad(Math.floor((total % 1440) / 60))}:${pad(total % 60)}`;
  }
  function categoryOf(task) {
    return CATEGORIES[task.category] || CATEGORIES.other;
  }
  function nowISO() { return new Date().toISOString(); }
  function parseTime(value) {
    const t = Date.parse(value || "");
    return Number.isFinite(t) ? t : 0;
  }
  function tasksFor(value) {
    return state.tasks
      .filter((t) => t.date === value)
      .sort((a, b) => (a.start + a.title).localeCompare(b.start + b.title));
  }
  function contentKey(task) {
    return [
      task.date, task.start, Number(task.duration || 0), task.title,
      task.note || "", Number(task.remind), task.category || "other",
      Boolean(task.done)
    ].join("|");
  }

  function renderWeather() {
    if (!ui.weather) return;
    const weather = state.weather;
    if (!weather || !Number.isFinite(Number(weather.temp))) {
      ui.weather.classList.add("hidden");
      return;
    }
    const signed = (value) => {
      const number = Math.round(Number(value));
      if (!Number.isFinite(number)) return "—";
      return number > 0 ? `+${number}` : String(number);
    };
    ui.weather.textContent =
      `${weather.icon || "☁"} ${signed(weather.temp)}° · ` +
      `${String(weather.desc || "").toLowerCase()} · ` +
      `${signed(weather.tmin)}…${signed(weather.tmax)}° · ` +
      `ветер ${Math.round(Number(weather.wind || 0))} м/с · MET.no`;
    ui.weather.classList.remove("hidden");
  }

  async function loadWeather() {
    const cached = state.weather;
    if (cached && Date.now() - Number(cached.fetched || 0) < 30 * 60 * 1000) {
      renderWeather();
      return;
    }
    try {
      const response = await fetch(WEATHER_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("weather");
      const payload = await response.json();
      const series = payload.properties.timeseries;
      const details = series[0].data.instant.details;
      const temp = Math.round(Number(details.air_temperature));
      const summary =
        series[0].data.next_1_hours || series[0].data.next_6_hours || {};
      const symbol = String(summary.summary?.symbol_code || "cloudy")
        .split("_")[0].toLowerCase();
      const [desc, icon] = WEATHER_CODES[symbol] || ["Облачно", "☁"];
      const temperatures = series
        .slice(0, 25)
        .map((entry) => Number(entry.data.instant.details.air_temperature))
        .filter((value) => Number.isFinite(value));
      const tmin = temperatures.length ? Math.round(Math.min(...temperatures)) : temp;
      const tmax = temperatures.length ? Math.round(Math.max(...temperatures)) : temp;
      const wind = Math.round(Number(details.wind_speed || 0));
      state.weather = { temp, desc, icon, wind, tmin, tmax, fetched: Date.now() };
      try {
        localStorage.setItem(WEATHER_KEY, JSON.stringify(state.weather));
      } catch (e) {}
      renderWeather();
    } catch (error) {
      renderWeather();
    }
  }

  function showToast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2800);
  }

  function setStatus(text, color) {
    ui.connLabel.textContent = text;
    ui.connDot.classList.toggle("on", color === "online");
    ui.offline.classList.toggle("hidden", color !== "offline");
  }

  function cache() {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks));
      localStorage.setItem(DELETED_KEY, JSON.stringify(state.deleted));
      if (state.session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
      }
    } catch (e) {}
  }

  function restoreCache() {
    try {
      const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
      if (Array.isArray(tasks)) state.tasks = tasks;
      const deleted = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
      if (Array.isArray(deleted)) state.deleted = deleted;
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (session && session.access_token && session.refresh_token) {
        state.session = session;
      }
      const weather = JSON.parse(localStorage.getItem(WEATHER_KEY) || "null");
      if (weather && Number.isFinite(Number(weather.temp))) {
        state.weather = weather;
      }
    } catch (e) {}
  }

  function saveSession(session) {
    state.session = session;
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function showLogin(message = "") {
    ui.login.classList.remove("hidden");
    ui.loginError.textContent = message;
    ui.email.value = state.session && state.session.email ? state.session.email : "";
    setTimeout(() => ui.email.focus(), 80);
    setStatus("Вход в облако", "offline");
    ui.offline.classList.add("hidden");
  }

  function hideLogin() {
    ui.login.classList.add("hidden");
    ui.loginError.textContent = "";
  }

  async function authRequest(path, options = {}) {
    await ensureSession();
    const headers = Object.assign({}, options.headers);
    headers.apikey = SUPABASE_KEY;
    headers.Authorization = "Bearer " + state.session.access_token;
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(SUPABASE_URL + path, Object.assign({}, options, { headers }));
    if (response.status === 401) {
      await refreshSession();
      headers.Authorization = "Bearer " + state.session.access_token;
      const retried = await fetch(SUPABASE_URL + path, Object.assign({}, options, { headers }));
      return handleResponse(retried);
    }
    return handleResponse(response);
  }

  async function handleResponse(response) {
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!response.ok) {
      const message = data && (data.message || data.error_description || data.msg || data.error)
        ? (data.message || data.error_description || data.msg || data.error)
        : "Ошибка облака";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function ensureSession() {
    if (!state.session) throw new Error("Нужно войти в облако");
    const expires = Number(state.session.expires_at || 0);
    if (expires && Date.now() / 1000 > expires - 120) {
      await refreshSession();
    }
  }

  async function refreshSession() {
    if (!state.session || !state.session.refresh_token) {
      throw new Error("Сессия истекла");
    }
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: state.session.refresh_token })
      }
    );
    const data = await handleResponse(response);
    state.session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || state.session.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      email: state.session.email,
      user_id: (data.user && data.user.id) || state.session.user_id
    };
    saveSession(state.session);
  }

  async function login() {
    const email = ui.email.value.trim();
    const password = ui.password.value;
    if (!email || !password) {
      ui.loginError.textContent = "Введите email и пароль";
      return;
    }
    ui.loginBtn.disabled = true;
    ui.loginBtn.textContent = "Вход…";
    ui.loginError.textContent = "";
    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        }
      );
      const data = await handleResponse(response);
      if (!data.access_token || !data.user) {
        throw new Error("Облако не вернуло сессию");
      }
      state.session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
        email: email,
        user_id: data.user.id
      };
      saveSession(state.session);
      ui.password.value = "";
      hideLogin();
      await syncCloud(true);
      updateNotifyButton();
    } catch (error) {
      const message = String(error.message || error);
      ui.loginError.textContent = message.toLowerCase().includes("invalid")
        ? "Неверный email или пароль"
        : message;
    } finally {
      ui.loginBtn.disabled = false;
      ui.loginBtn.textContent = "Войти";
    }
  }

  function taskFromRow(row) {
    return {
      id: row.id,
      date: row.task_date,
      start: row.start_time,
      duration: Number(row.duration || 0),
      title: row.title || "Без названия",
      note: row.note || "",
      remind: Number(row.remind),
      category: CATEGORIES[row.category] ? row.category : "other",
      done: Boolean(row.done),
      created: row.created_at || nowISO(),
      updated_at: row.updated_at || nowISO()
    };
  }

  function taskToRow(task, deleted) {
    return {
      id: task.id,
      user_id: state.session.user_id,
      task_date: task.date,
      start_time: task.start,
      duration: Number(task.duration || 0),
      title: task.title,
      note: task.note || "",
      remind: Number(task.remind),
      category: task.category || "other",
      done: Boolean(task.done),
      deleted: Boolean(deleted),
      created_at: task.created || nowISO(),
      updated_at: task.updated_at || nowISO()
    };
  }

  function mergeCloud(rows) {
    const local = new Map(state.tasks.map((t) => [t.id, t]));
    const cloud = new Map(rows.map((r) => [r.id, r]));
    const pushes = new Map();
    let changed = false;

    rows.forEach((row) => {
      const current = local.get(row.id);
      const cloudTime = parseTime(row.updated_at);
      const localTime = current ? parseTime(current.updated_at) : 0;
      if (row.deleted) {
        if (current) {
          if (localTime <= cloudTime) {
            state.tasks = state.tasks.filter((t) => t.id !== row.id);
            local.delete(row.id);
            changed = true;
          } else {
            pushes.set(row.id, current);
          }
        }
        return;
      }
      if (!current) {
        const task = taskFromRow(row);
        state.tasks.push(task);
        local.set(task.id, task);
        changed = true;
        return;
      }
      if (cloudTime > localTime) {
        const incoming = taskFromRow(row);
        Object.assign(current, {
          date: incoming.date,
          start: incoming.start,
          duration: incoming.duration,
          title: incoming.title,
          note: incoming.note,
          remind: incoming.remind,
          category: incoming.category,
          done: incoming.done,
          updated_at: incoming.updated_at
        });
        changed = true;
      } else if (localTime > cloudTime) {
        pushes.set(current.id, current);
      } else if (contentKey(current) !== [
        row.task_date, row.start_time, Number(row.duration || 0), row.title,
        row.note || "", Number(row.remind), row.category || "other", Boolean(row.done)
      ].join("|")) {
        pushes.set(current.id, current);
      }
    });

    state.tasks.forEach((task) => {
      if (!cloud.has(task.id)) pushes.set(task.id, task);
    });

    const keep = [];
    const tombstones = [];
    state.deleted.forEach((tombstone) => {
      const row = cloud.get(tombstone.id);
      if (!row) {
        changed = true;
        return;
      }
      const tombTime = parseTime(tombstone.updated_at);
      const cloudTime = parseTime(row.updated_at);
      if (row.deleted) {
        if (cloudTime >= tombTime) {
          changed = true;
          return;
        }
      } else if (cloudTime > tombTime) {
        changed = true;
        return;
      }
      pushes.delete(tombstone.id);
      tombstones.push(tombstone);
      keep.push(tombstone);
    });
    if (keep.length !== state.deleted.length) state.deleted = keep;

    return { pushes: [...pushes.values()], tombstones, changed };
  }

  async function pushRows(pushes, tombstones) {
    const rows = pushes.map((task) => taskToRow(task, false))
      .concat(tombstones.map((task) => taskToRow(task, true)));
    if (!rows.length) return;
    await authRequest("/rest/v1/planner_tasks?on_conflict=id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(rows)
    });
    const pushedIds = new Set(tombstones.map((t) => t.id));
    state.deleted = state.deleted.filter((t) => !pushedIds.has(t.id));
  }

  async function syncCloud(manual = false) {
    if (!state.session || syncing) return;
    syncing = true;
    setStatus("Синхронизация…", "syncing");
    try {
      const rows = await authRequest("/rest/v1/planner_tasks?select=*");
      const result = mergeCloud(rows || []);
      if (result.changed) {
        cache();
        render();
      }
      if (result.pushes.length || result.tombstones.length) {
        await pushRows(result.pushes, result.tombstones);
      }
      localStorage.setItem(LAST_KEY, new Date().toISOString());
      cache();
      setStatus("Синхронизировано", "online");
    } catch (error) {
      if (error.status === 401) {
        saveSession(null);
        showLogin("Нужно войти в облако заново");
      } else {
        setStatus("Офлайн · изменения сохранены", "offline");
        ui.offline.classList.remove("hidden");
      }
    } finally {
      syncing = false;
    }
  }

  function queueSync() {
    cache();
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncCloud(), 1500);
  }

  // -- отрисовка ----------------------------------------------------------
  function render() {
    const dayTasks = tasksFor(state.selected);
    const done = dayTasks.filter((t) => t.done).length;
    const isToday = state.selected === todayISO();
    ui.weekday.textContent = (isToday ? "Сегодня · " : "") + weekdayFull(state.selected).toUpperCase();
    ui.dateTitle.textContent = humanDate(state.selected);
    ui.year.textContent = parseISO(state.selected).getFullYear();
    ui.count.textContent = dayTasks.length ? `${done} из ${dayTasks.length} выполнено` : "пусто";
    renderWeek();
    renderTasks(dayTasks);
  }

  function renderWeek() {
    ui.weekStrip.innerHTML = "";
    const monday = mondayOf(state.selected);
    for (let i = 0; i < 7; i++) {
      const value = addDays(monday, i);
      const tasks = tasksFor(value);
      const button = document.createElement("button");
      button.className = "day";
      if (value === state.selected) button.classList.add("active");
      if (value === todayISO()) button.classList.add("today");
      const dow = document.createElement("span");
      dow.className = "dow";
      dow.textContent = WEEKDAYS_SHORT[i];
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = parseISO(value).getDate();
      const marks = document.createElement("span");
      marks.className = "marks";
      const colors = [];
      tasks.forEach((task) => {
        const color = categoryOf(task).color;
        if (!colors.includes(color) && colors.length < 3) colors.push(color);
      });
      colors.forEach((color) => {
        const mark = document.createElement("span");
        mark.className = "mark";
        mark.style.background = color;
        marks.appendChild(mark);
      });
      button.append(dow, num, marks);
      button.addEventListener("click", () => {
        state.selected = value;
        render();
      });
      ui.weekStrip.appendChild(button);
    }
  }

  function renderTasks(tasks) {
    ui.list.innerHTML = "";
    const visible = tasks.length > 0;
    ui.empty.classList.toggle("hidden", visible);
    ui.allDone.classList.toggle("hidden", !(visible && tasks.every((t) => t.done)));
    if (!visible) return;
    tasks.forEach((task) => {
      const card = document.createElement("article");
      card.className = "task" + (task.done ? " done" : "");
      card.addEventListener("click", () => openSheet(task));

      const time = document.createElement("div");
      time.className = "task-time";
      const start = document.createElement("span");
      start.className = "start";
      start.textContent = task.start;
      time.appendChild(start);
      const end = endTime(task);
      if (end) {
        const endEl = document.createElement("span");
        endEl.className = "end";
        endEl.textContent = "до " + end;
        time.appendChild(endEl);
      }

      const body = document.createElement("div");
      body.className = "task-body";
      const cat = categoryOf(task);
      const titleRow = document.createElement("div");
      titleRow.className = "task-title-row";
      const catDot = document.createElement("span");
      catDot.className = "cat-dot";
      catDot.style.background = cat.color;
      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;
      titleRow.append(catDot, title);
      body.appendChild(titleRow);
      if (task.note) {
        const note = document.createElement("div");
        note.className = "task-note";
        note.textContent = task.note;
        body.appendChild(note);
      }
      const meta = document.createElement("div");
      meta.className = "task-meta";
      const catLabel = document.createElement("span");
      catLabel.textContent = cat.name;
      catLabel.style.color = cat.color;
      meta.appendChild(catLabel);
      if (task.done) {
        const doneLabel = document.createElement("span");
        doneLabel.textContent = " · Выполнено";
        doneLabel.style.color = "var(--green)";
        meta.appendChild(doneLabel);
      } else if (Number(task.remind) >= 0) {
        const mins = Number(task.remind);
        const reminder = document.createElement("span");
        reminder.textContent = " · 🔔 " + (mins === 0 ? "в момент начала"
          : mins % 60 === 0 ? `за ${mins / 60} ч`
          : `за ${mins} мин`);
        meta.appendChild(reminder);
      }
      body.appendChild(meta);

      const check = document.createElement("button");
      check.className = "check";
      check.type = "button";
      check.setAttribute("aria-label", "Выполнено");
      check.textContent = "✓";
      check.addEventListener("click", (event) => {
        event.stopPropagation();
        task.done = !task.done;
        task.updated_at = nowISO();
        cache();
        render();
        queueSync();
      });
      card.append(time, body, check);
      ui.list.appendChild(card);
    });
  }

  function defaultStartFor(value) {
    if (value !== todayISO()) return "09:00";
    const d = new Date();
    const rounded = (Math.floor((d.getHours() * 60 + d.getMinutes()) / 30) + 1) * 30;
    if (rounded >= 1440) return "23:30";
    return `${pad(Math.floor(rounded / 60))}:${pad(rounded % 60)}`;
  }

  function ensureOption(select, value, label) {
    if ([...select.options].some((o) => Number(o.value) === Number(value))) return;
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    select.appendChild(option);
  }

  function openSheet(task = null) {
    editing = task;
    ui.sheetTitle.textContent = task ? "Изменить задачу" : "Новая задача";
    ui.del.classList.toggle("hidden", !task);
    ui.error.textContent = "";
    ui.title.value = task ? task.title : "";
    ui.date.value = task ? task.date : state.selected;
    ui.time.value = task ? task.start : defaultStartFor(state.selected);
    const duration = task ? Number(task.duration) : 60;
    ensureOption(ui.duration, duration, duration ? `${duration} минут` : "Без окончания");
    ui.duration.value = String(duration);
    const remind = task ? Number(task.remind) : 10;
    ensureOption(ui.remind, remind, remind < 0 ? "Без напоминания" : `За ${remind} мин`);
    ui.remind.value = String(remind);
    ui.category.value = task && CATEGORIES[task.category] ? task.category : "other";
    ui.note.value = task ? (task.note || "") : "";
    ui.overlay.classList.add("open");
    ui.sheet.classList.add("open");
    document.body.classList.add("locked");
    setTimeout(() => ui.title.focus(), 180);
  }

  function closeSheet() {
    ui.overlay.classList.remove("open");
    ui.sheet.classList.remove("open");
    document.body.classList.remove("locked");
    editing = null;
  }

  function saveTask() {
    const title = ui.title.value.trim();
    const dateValue = ui.date.value;
    const timeValue = ui.time.value;
    if (!title) {
      ui.error.textContent = "Введите название задачи";
      return;
    }
    if (!dateValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
      ui.error.textContent = "Укажите дату и время";
      return;
    }
    const payload = {
      date: dateValue,
      start: timeValue,
      duration: Number(ui.duration.value) || 0,
      title: title,
      note: ui.note.value.trim(),
      remind: Number(ui.remind.value),
      category: ui.category.value,
      updated_at: nowISO()
    };
    if (editing) {
      Object.assign(editing, payload);
    } else {
      state.tasks.push(Object.assign({
        id: crypto.randomUUID(),
        created: nowISO(),
        done: false
      }, payload));
    }
    state.selected = dateValue;
    cache();
    render();
    closeSheet();
    queueSync();
  }

  function deleteTask() {
    if (!editing) return;
    if (!confirm(`Удалить задачу «${editing.title}»?`)) return;
    const tombstone = Object.assign({}, editing, { updated_at: nowISO() });
    state.deleted.push(tombstone);
    state.tasks = state.tasks.filter((t) => t.id !== editing.id);
    cache();
    render();
    closeSheet();
    queueSync();
  }

  function urlBase64ToUint8Array(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
  }

  async function enableNotifications() {
    if (notificationsBusy) return;
    if (!state.session) {
      showLogin("Сначала войдите в облако");
      return;
    }
    if (!("Notification" in window) || !("PushManager" in window)) {
      showToast("Этот браузер не поддерживает push-уведомления");
      return;
    }
    notificationsBusy = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("Разрешение на уведомления не выдано");
        updateNotifyButton();
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }
      const data = subscription.toJSON();
      await authRequest(
        "/rest/v1/push_subscriptions?on_conflict=endpoint",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify({
            user_id: state.session.user_id,
            endpoint: data.endpoint,
            p256dh: data.keys.p256dh,
            auth: data.keys.auth,
            updated_at: nowISO()
          })
        }
      );
      showToast("Уведомления на телефоне включены");
      updateNotifyButton();
    } catch (error) {
      showToast("Не удалось включить уведомления: " + error.message);
    } finally {
      notificationsBusy = false;
    }
  }

  async function updateNotifyButton() {
    if (!ui.notifyBtn) return;
    if (!("Notification" in window)) {
      ui.notifyBtn.textContent = "Уведомления не поддерживаются";
      ui.notifyBtn.disabled = true;
      return;
    }
    if (Notification.permission === "denied") {
      ui.notifyBtn.textContent = "🔕 Уведомления запрещены в браузере";
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription && Notification.permission === "granted") {
        ui.notifyBtn.textContent = "🔔 Уведомления включены";
      } else {
        ui.notifyBtn.textContent = "🔔 Включить уведомления";
      }
    } catch (error) {
      ui.notifyBtn.textContent = "🔔 Включить уведомления";
    }
  }

  async function logout() {
    if (!confirm("Выйти из облака на этом устройстве? Локальная копия задач будет удалена.")) {
      return;
    }
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe().catch(() => {});
          if (state.session) {
            try {
              await authRequest(
                `/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
                { method: "DELETE" }
              );
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
    saveSession(null);
    state.tasks = [];
    state.deleted = [];
    try {
      localStorage.removeItem(TASKS_KEY);
      localStorage.removeItem(DELETED_KEY);
      localStorage.removeItem(LAST_KEY);
    } catch (e) {}
    render();
    showLogin();
    updateNotifyButton();
  }

  function bind() {
    ui.add.addEventListener("click", () => openSheet());
    ui.emptyAdd.addEventListener("click", () => openSheet());
    ui.close.addEventListener("click", closeSheet);
    ui.cancel.addEventListener("click", closeSheet);
    ui.overlay.addEventListener("click", closeSheet);
    ui.save.addEventListener("click", saveTask);
    ui.del.addEventListener("click", deleteTask);
    ui.todayBtn.addEventListener("click", () => {
      state.selected = todayISO();
      render();
    });
    ui.prevWeek.addEventListener("click", () => {
      state.selected = addDays(state.selected, -7);
      render();
    });
    ui.nextWeek.addEventListener("click", () => {
      state.selected = addDays(state.selected, 7);
      render();
    });
    ui.loginBtn.addEventListener("click", login);
    if (ui.notifyBtn) ui.notifyBtn.addEventListener("click", enableNotifications);
    if (ui.logoutBtn) ui.logoutBtn.addEventListener("click", logout);
    ui.password.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
    ui.email.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ui.password.focus();
    });
    window.addEventListener("online", () => syncCloud());
    window.addEventListener("focus", () => syncCloud());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        syncCloud();
        loadWeather();
      }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    if (location.protocol !== "https:" && !local) return;
    const scope = new URL("./", location.href);
    const script = new URL("sw.js", scope);
    navigator.serviceWorker.register(script.href, { scope: scope.href }).catch(() => {});
  }

  async function start() {
    bind();
    restoreCache();
    render();
    renderWeather();
    loadWeather();
    ui.offline.textContent =
      "Нет связи с облаком. Изменения сохранены и отправятся позже.";
    if (state.session) {
      hideLogin();
      syncCloud(true);
    } else {
      showLogin();
    }
    registerServiceWorker();
    updateNotifyButton();
    setInterval(() => {
      if (!document.hidden && state.session) syncCloud();
    }, 10000);
    setInterval(loadWeather, 30 * 60 * 1000);
  }

  start();
})();
