/* ==========================================================================
   main.js — shared site behaviour: toasts, theme, nav, FAQ, auth demo.
   ========================================================================== */

/* ------------------------------ toasts ---------------------------------- */
var RCToast = (function () {
  function stack() {
    var el = document.querySelector(".toast-stack");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast-stack";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  var ICONS = { success: "✓", error: "!", info: "i" };

  /** show(message, type, title) — custom toast, never uses alert(). */
  function show(message, type, title) {
    type = type || "info";
    var el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML =
      '<div class="card-icon" style="width:26px;height:26px;border-radius:8px;margin:0;font-weight:800">' +
      (ICONS[type] || "i") +
      "</div><div><div class=\"toast-title\"></div><div class=\"toast-msg\"></div></div>";
    el.querySelector(".toast-title").textContent =
      title || (type === "success" ? "Success" : type === "error" ? "Error" : "Info");
    el.querySelector(".toast-msg").textContent = message;
    stack().appendChild(el);

    window.setTimeout(function () {
      el.classList.add("hide");
      window.setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }, 3600);
  }

  return {
    show: show,
    success: function (m, t) { show(m, "success", t); },
    error: function (m, t) { show(m, "error", t); },
    info: function (m, t) { show(m, "info", t); },
  };
})();

/* ------------------------------ theme ----------------------------------- */
var RCTheme = (function () {
  function apply(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    var labels = document.querySelectorAll("[data-theme-icon]");
    for (var i = 0; i < labels.length; i++) {
      labels[i].textContent = theme === "dark" ? "☀" : "☾";
    }
  }
  function init() {
    apply(RCStorage.loadTheme());
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var next = document.body.classList.contains("dark") ? "light" : "dark";
        apply(next);
        RCStorage.saveTheme(next);
        RCToast.info(next === "dark" ? "Dark mode enabled." : "Light mode enabled.");
      });
    }
  }
  return { init: init, apply: apply };
})();

/* ------------------------------ nav ------------------------------------- */
function initNav() {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector("[data-nav-toggle]");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      header.classList.toggle("menu-open");
    });
    header.addEventListener("click", function (e) {
      if (e.target.closest(".nav-links a")) header.classList.remove("menu-open");
    });
  }

  // reflect signed-in demo session in the navbar
  var session = RCStorage.getSession();
  var slot = document.querySelector("[data-auth-slot]");
  if (slot && session) {
    slot.innerHTML =
      '<span class="chip" style="margin-right:6px"></span><button class="btn btn-ghost btn-sm" type="button" data-logout>Log out</button>';
    slot.querySelector(".chip").textContent = "Hi, " + (session.name || "there").split(" ")[0];
    slot.querySelector("[data-logout]").addEventListener("click", function () {
      RCStorage.clearSession();
      RCToast.info("You have been logged out.");
      window.setTimeout(function () { window.location.reload(); }, 700);
    });
  }
}

/* ------------------------------ FAQ ------------------------------------- */
function initFaq() {
  var items = document.querySelectorAll(".faq-item");
  for (var i = 0; i < items.length; i++) {
    (function (item) {
      var btn = item.querySelector(".faq-q");
      var answer = item.querySelector(".faq-a");
      if (!btn || !answer) return;
      btn.addEventListener("click", function () {
        var open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        answer.style.maxHeight = open ? answer.scrollHeight + 40 + "px" : "0px";
      });
    })(items[i]);
  }
}

/* --------------------- auth (frontend demo only) ------------------------ */
function initAuthForms() {
  var signup = document.getElementById("signupForm");
  if (signup) {
    var sName = document.getElementById("suName");
    var sEmail = document.getElementById("suEmail");
    var sPass = document.getElementById("suPassword");
    var sConfirm = document.getElementById("suConfirm");

    var rules = [
      { input: sName, label: "Full name", required: true, min: 2 },
      { input: sEmail, label: "Email", required: true, type: "email" },
      { input: sPass, label: "Password", required: true, min: 6 },
      { input: sConfirm, label: "Confirm password", required: true },
    ];
    RCValidate.attachLiveValidation(rules);

    signup.addEventListener("submit", function (e) {
      e.preventDefault();
      rules[3].match = sPass;
      rules[3].matchMessage = "Passwords do not match.";
      var result = RCValidate.validateFields(rules);
      if (!result.valid) {
        RCToast.error(result.errors[0]);
        return;
      }
      if (RCStorage.findUser(sEmail.value)) {
        RCValidate.setFieldError(sEmail, "An account already exists with this email.");
        RCToast.error("An account already exists with this email.");
        return;
      }
      RCStorage.addUser({
        name: sName.value.trim(),
        email: sEmail.value.trim(),
        // Demo only: this is NOT secure storage and NOT real authentication.
        passwordDemo: sPass.value,
        createdAt: new Date().toISOString(),
      });
      RCStorage.setSession({ name: sName.value.trim(), email: sEmail.value.trim() });
      RCToast.success("Account created successfully! Welcome to ResumeCraft.");
      window.setTimeout(function () { window.location.href = "builder.html"; }, 1200);
    });
  }

  var login = document.getElementById("loginForm");
  if (login) {
    var lEmail = document.getElementById("liEmail");
    var lPass = document.getElementById("liPassword");
    var lRules = [
      { input: lEmail, label: "Email", required: true, type: "email" },
      { input: lPass, label: "Password", required: true, min: 6 },
    ];
    RCValidate.attachLiveValidation(lRules);

    login.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = RCValidate.validateFields(lRules);
      if (!result.valid) {
        RCToast.error(result.errors[0]);
        return;
      }
      var user = RCStorage.findUser(lEmail.value);
      if (!user || user.passwordDemo !== lPass.value) {
        RCToast.error("We couldn't match those details. Try again or create an account.");
        RCValidate.setFieldError(lPass, "Incorrect email or password.");
        return;
      }
      RCStorage.setSession({ name: user.name, email: user.email });
      RCToast.success("Login successful! Welcome back.");
      window.setTimeout(function () { window.location.href = "builder.html"; }, 1100);
    });
  }
}

/* --------------------------- misc helpers ------------------------------- */
function initYear() {
  var slots = document.querySelectorAll("[data-year]");
  for (var i = 0; i < slots.length; i++) slots[i].textContent = "2026";
}

/** Template cards on the home page jump straight into the builder. */
function initTemplateLinks() {
  var links = document.querySelectorAll("[data-use-template]");
  for (var i = 0; i < links.length; i++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        var settings = RCStorage.loadSettings() || {};
        settings.template = btn.getAttribute("data-use-template");
        RCStorage.write(RC_KEYS.settings, settings);
        RCToast.info("Template selected. Opening the builder…");
        window.setTimeout(function () { window.location.href = "builder.html"; }, 700);
      });
    })(links[i]);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  RCTheme.init();
  initNav();
  initFaq();
  initAuthForms();
  initYear();
  initTemplateLinks();
});