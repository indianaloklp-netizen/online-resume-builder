/* ==========================================================================
   storage.js — every localStorage read/write in the app goes through here.
   Frontend-only persistence: nothing ever leaves the browser.
   ========================================================================== */

var RC_KEYS = {
  resume: "resumecraft.resume",
  settings: "resumecraft.settings",
  meta: "resumecraft.meta",
  theme: "resumecraft.theme",
  users: "resumecraft.users",
  session: "resumecraft.session",
};

var RCStorage = (function () {
  /** Safe JSON write. Returns true on success. */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("[ResumeCraft] could not write " + key, err);
      return false;
    }
  }

  /** Safe JSON read with fallback. */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  /* ----- resume data ----- */
  function saveResume(data, settings) {
    var ok = write(RC_KEYS.resume, data) && write(RC_KEYS.settings, settings);
    if (ok) write(RC_KEYS.meta, { savedAt: new Date().toISOString() });
    return ok;
  }
  function loadResume() {
    return read(RC_KEYS.resume, null);
  }
  function loadSettings() {
    return read(RC_KEYS.settings, null);
  }
  function loadMeta() {
    return read(RC_KEYS.meta, null);
  }
  function clearResume() {
    remove(RC_KEYS.resume);
    remove(RC_KEYS.settings);
    remove(RC_KEYS.meta);
  }

  /* ----- theme ----- */
  function saveTheme(theme) {
    write(RC_KEYS.theme, theme);
  }
  function loadTheme() {
    return read(RC_KEYS.theme, "light");
  }

  /* ----- demo-only accounts (NOT secure, no backend) ----- */
  function getUsers() {
    return read(RC_KEYS.users, []);
  }
  function addUser(user) {
    var users = getUsers();
    users.push(user);
    write(RC_KEYS.users, users);
  }
  function findUser(email) {
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email.toLowerCase() === String(email).toLowerCase()) return users[i];
    }
    return null;
  }
  function setSession(session) {
    write(RC_KEYS.session, session);
  }
  function getSession() {
    return read(RC_KEYS.session, null);
  }
  function clearSession() {
    remove(RC_KEYS.session);
  }

  return {
    write: write,
    read: read,
    remove: remove,
    saveResume: saveResume,
    loadResume: loadResume,
    loadSettings: loadSettings,
    loadMeta: loadMeta,
    clearResume: clearResume,
    saveTheme: saveTheme,
    loadTheme: loadTheme,
    getUsers: getUsers,
    addUser: addUser,
    findUser: findUser,
    setSession: setSession,
    getSession: getSession,
    clearSession: clearSession,
  };
})();