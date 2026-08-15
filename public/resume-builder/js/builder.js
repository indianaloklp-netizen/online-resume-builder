/* ==========================================================================
   builder.js — the resume builder workspace.
   Handles: repeatable sections, skills tags, photo upload, live preview,
   templates, customisation, ATS mode, drag & drop ordering, score,
   validation, autosave, load/clear/print and the dashboard.
   ========================================================================== */

(function () {
  var form = document.getElementById("builderForm");
  if (!form) return; // not on the builder page

  /* ------------------------------ helpers ------------------------------- */
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value.trim() : ""; }
  function has(v) { return String(v == null ? "" : v).trim().length > 0; }

  /* --------------------- repeatable section schemas --------------------- */
  var SCHEMAS = {
    education: {
      label: "Education",
      fields: [
        { key: "degree", label: "Degree", half: true, placeholder: "B.Tech in Computer Science" },
        { key: "institution", label: "Institution", half: true, placeholder: "Delhi University" },
        { key: "location", label: "Location", half: true, placeholder: "New Delhi, India" },
        { key: "startYear", label: "Start Year", half: true, placeholder: "2021" },
        { key: "endYear", label: "End Year", half: true, placeholder: "2025" },
        { key: "description", label: "Description", type: "textarea", placeholder: "Coursework, GPA, honours…" },
      ],
    },
    experience: {
      label: "Experience",
      fields: [
        { key: "jobTitle", label: "Job Title", half: true, placeholder: "Frontend Developer" },
        { key: "company", label: "Company", half: true, placeholder: "Acme Technologies" },
        { key: "location", label: "Location", half: true, placeholder: "Bengaluru, India" },
        { key: "startDate", label: "Start Date", half: true, type: "month" },
        { key: "endDate", label: "End Date", half: true, type: "month" },
        { key: "current", label: "I currently work here", type: "checkbox" },
        { key: "description", label: "Description", type: "textarea", placeholder: "What you built, owned and improved…" },
      ],
    },
    projects: {
      label: "Project",
      fields: [
        { key: "name", label: "Project Name", half: true, placeholder: "ResumeCraft" },
        { key: "tech", label: "Technologies Used", half: true, placeholder: "HTML, CSS, JavaScript" },
        { key: "link", label: "Project Link", placeholder: "https://github.com/you/project" },
        { key: "description", label: "Project Description", type: "textarea", placeholder: "What the project does and your role…" },
      ],
    },
    certifications: {
      label: "Certification",
      fields: [
        { key: "name", label: "Certification Name", half: true, placeholder: "AWS Cloud Practitioner" },
        { key: "organization", label: "Issuing Organization", half: true, placeholder: "Amazon Web Services" },
        { key: "date", label: "Date", half: true, placeholder: "Mar 2026" },
        { key: "link", label: "Credential Link", half: true, placeholder: "https://credly.com/…" },
      ],
    },
    achievements: {
      label: "Achievement",
      fields: [{ key: "text", label: "Achievement", placeholder: "Winner — National Hackathon 2025" }],
    },
    languages: {
      label: "Language",
      fields: [
        { key: "name", label: "Language", half: true, placeholder: "English" },
        {
          key: "level",
          label: "Proficiency",
          half: true,
          type: "select",
          options: ["Basic", "Intermediate", "Advanced", "Fluent"],
        },
      ],
    },
  };

  /** Build the markup for one repeatable entry from its schema. */
  function entryMarkup(type, index) {
    var schema = SCHEMAS[type];
    var html =
      '<div class="entry-head"><strong>' + schema.label + " " + (index + 1) + "</strong>" +
      '<button type="button" class="btn btn-danger btn-sm" data-remove-entry>Remove</button></div>';

    var open = false;
    schema.fields.forEach(function (f) {
      if (f.half && !open) { html += '<div class="two-col">'; open = true; }
      if (!f.half && open) { html += "</div>"; open = false; }

      if (f.type === "checkbox") {
        html +=
          '<label class="checkline"><input type="checkbox" data-field="' + f.key + '"><span>' + f.label + "</span></label>";
      } else if (f.type === "textarea") {
        html +=
          '<div class="field"><label>' + f.label + '</label><textarea data-field="' + f.key +
          '" rows="3" placeholder="' + (f.placeholder || "") + '"></textarea></div>';
      } else if (f.type === "select") {
        html +=
          '<div class="field"><label>' + f.label + '</label><select data-field="' + f.key + '">' +
          f.options.map(function (o) { return '<option value="' + o + '">' + o + "</option>"; }).join("") +
          "</select></div>";
      } else {
        html +=
          '<div class="field"><label>' + f.label + '</label><input type="' + (f.type || "text") +
          '" data-field="' + f.key + '" placeholder="' + (f.placeholder || "") + '"></div>';
      }
    });
    if (open) html += "</div>";
    return html;
  }

  /** Append one entry (optionally pre-filled) to its list container. */
  function addEntry(type, values) {
    var list = $(type + "List");
    if (!list) return null;
    var index = list.querySelectorAll(".entry").length;
    var wrap = document.createElement("div");
    wrap.className = "entry";
    wrap.setAttribute("data-entry", type);
    wrap.innerHTML = entryMarkup(type, index);

    if (values) {
      var inputs = wrap.querySelectorAll("[data-field]");
      for (var i = 0; i < inputs.length; i++) {
        var key = inputs[i].getAttribute("data-field");
        if (inputs[i].type === "checkbox") inputs[i].checked = !!values[key];
        else if (values[key] != null) inputs[i].value = values[key];
      }
    }

    wrap.querySelector("[data-remove-entry]").addEventListener("click", function () {
      wrap.parentNode.removeChild(wrap);
      renumber(type);
      onChange(true);
      RCToast.info(SCHEMAS[type].label + " removed.");
    });

    list.appendChild(wrap);
    updateEmptyNote(type);
    return wrap;
  }

  function renumber(type) {
    var entries = $(type + "List").querySelectorAll(".entry");
    for (var i = 0; i < entries.length; i++) {
      entries[i].querySelector(".entry-head strong").textContent = SCHEMAS[type].label + " " + (i + 1);
    }
    updateEmptyNote(type);
  }

  function updateEmptyNote(type) {
    var note = document.querySelector('[data-empty="' + type + '"]');
    if (!note) return;
    note.style.display = $(type + "List").querySelectorAll(".entry").length ? "none" : "block";
  }

  function readEntries(type) {
    var out = [];
    var entries = $(type + "List").querySelectorAll(".entry");
    for (var i = 0; i < entries.length; i++) {
      var obj = {};
      var inputs = entries[i].querySelectorAll("[data-field]");
      for (var j = 0; j < inputs.length; j++) {
        var key = inputs[j].getAttribute("data-field");
        obj[key] = inputs[j].type === "checkbox" ? inputs[j].checked : inputs[j].value.trim();
      }
      out.push(obj);
    }
    return out;
  }

  /* ------------------------------ skills ------------------------------- */
  var skills = [];

  function renderSkills() {
    var list = $("skillsList");
    list.innerHTML = "";
    skills.forEach(function (skill, i) {
      var tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = "<span></span><button type=\"button\" aria-label=\"Remove skill\">✕</button>";
      tag.querySelector("span").textContent = skill;
      tag.querySelector("button").addEventListener("click", function () {
        skills.splice(i, 1);
        renderSkills();
        onChange(true);
      });
      list.appendChild(tag);
    });
  }

  function addSkill() {
    var input = $("skillInput");
    var raw = input.value.trim();
    if (!raw) { RCToast.error("Type a skill first, e.g. JavaScript."); return; }
    raw.split(",").forEach(function (part) {
      var skill = part.trim();
      if (skill && skills.indexOf(skill) === -1) skills.push(skill);
    });
    input.value = "";
    renderSkills();
    onChange(true);
  }

  /* --------------------------- profile photo --------------------------- */
  var photoData = "";

  function paintPhoto() {
    var box = $("photoPreview");
    if (photoData) {
      box.style.backgroundImage = 'url("' + photoData + '")';
      box.textContent = "";
      box.style.borderStyle = "solid";
    } else {
      box.style.backgroundImage = "none";
      box.textContent = "No photo";
      box.style.borderStyle = "dashed";
    }
  }

  function initPhoto() {
    $("photoPickBtn").addEventListener("click", function () { $("photoInput").click(); });

    $("photoInput").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { RCToast.error("Please choose an image file."); return; }
      if (file.size > 3 * 1024 * 1024) { RCToast.error("Image is too large. Please use a file under 3 MB."); return; }
      // FileReader keeps the photo entirely in the browser — nothing is uploaded.
      var reader = new FileReader();
      reader.onload = function (ev) {
        photoData = ev.target.result;
        paintPhoto();
        onChange(true);
        RCToast.success("Profile photo added.");
      };
      reader.readAsDataURL(file);
    });

    $("photoRemoveBtn").addEventListener("click", function () {
      if (!photoData) { RCToast.info("There is no photo to remove."); return; }
      photoData = "";
      $("photoInput").value = "";
      paintPhoto();
      onChange(true);
      RCToast.info("Profile photo removed.");
    });
  }

  /* ------------------------ collect / apply data ----------------------- */
  function collectData() {
    return {
      personal: {
        fullName: val("fullName"),
        title: val("jobTitle"),
        email: val("email"),
        phone: val("phone"),
        location: val("location"),
        linkedin: val("linkedin"),
        github: val("github"),
        website: val("website"),
        photo: photoData,
      },
      summary: val("summary"),
      education: readEntries("education"),
      experience: readEntries("experience"),
      skills: skills.slice(),
      projects: readEntries("projects"),
      certifications: readEntries("certifications"),
      achievements: readEntries("achievements").map(function (a) { return a.text; }).filter(has),
      languages: readEntries("languages"),
      hobbies: val("hobbies"),
    };
  }

  function collectSettings() {
    return {
      template: currentTemplate,
      primary: val("primaryColor") || "#2563eb",
      accent: val("accentColor") || "#1e40af",
      fontSize: $("fontSize").value,
      fontFamily: $("fontFamily").value,
      spacing: $("spacing").value,
      ats: $("atsToggle").checked,
      order: readOrder(),
    };
  }

  function applyData(data) {
    var p = data.personal || {};
    $("fullName").value = p.fullName || "";
    $("jobTitle").value = p.title || "";
    $("email").value = p.email || "";
    $("phone").value = p.phone || "";
    $("location").value = p.location || "";
    $("linkedin").value = p.linkedin || "";
    $("github").value = p.github || "";
    $("website").value = p.website || "";
    photoData = p.photo || "";
    paintPhoto();

    $("summary").value = data.summary || "";
    $("hobbies").value = data.hobbies || "";

    ["education", "experience", "projects", "certifications", "achievements", "languages"].forEach(function (type) {
      $(type + "List").innerHTML = "";
      var rows = data[type] || [];
      if (type === "achievements") {
        rows = rows.map(function (text) { return { text: text }; });
      }
      rows.forEach(function (row) { addEntry(type, row); });
      updateEmptyNote(type);
    });

    skills = (data.skills || []).slice();
    renderSkills();
    updateCounter();
  }

  function applySettings(settings) {
    if (!settings) return;
    if (settings.primary) $("primaryColor").value = settings.primary;
    if (settings.accent) $("accentColor").value = settings.accent;
    if (settings.fontSize) $("fontSize").value = settings.fontSize;
    if (settings.fontFamily) $("fontFamily").value = settings.fontFamily;
    if (settings.spacing) $("spacing").value = settings.spacing;
    $("atsToggle").checked = !!settings.ats;
    if (settings.order && settings.order.length) applyOrder(settings.order);
    if (settings.template) setTemplate(settings.template, true);
  }

  /* ---------------------------- templates ------------------------------ */
  var currentTemplate = "modern";

  function setTemplate(name, silent) {
    currentTemplate = name;
    var buttons = document.querySelectorAll(".tpl-btn");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle("active", buttons[i].getAttribute("data-template") === name);
      buttons[i].setAttribute("aria-pressed", buttons[i].getAttribute("data-template") === name ? "true" : "false");
    }
    if (!silent) RCToast.info("Template changed successfully.");
    render();
  }

  /* ------------------------- customisation ----------------------------- */
  function applyStyleVars(settings) {
    var root = document.documentElement.style;
    root.setProperty("--primary-color", settings.primary);
    root.setProperty("--accent-color", settings.accent);
    root.setProperty("--resume-font-size", settings.fontSize + "px");
    root.setProperty("--resume-font", settings.fontFamily);
    root.setProperty("--resume-spacing", settings.spacing + "px");
    $("fontSizeOut").textContent = settings.fontSize + "px";
    $("spacingOut").textContent = settings.spacing + "px";
  }

  /* --------------------- drag & drop section order --------------------- */
  var dragged = null;

  function readOrder() {
    var items = $("sectionOrder").querySelectorAll(".order-item");
    var order = [];
    for (var i = 0; i < items.length; i++) order.push(items[i].getAttribute("data-key"));
    return order;
  }

  function applyOrder(order) {
    var list = $("sectionOrder");
    order.forEach(function (key) {
      var item = list.querySelector('[data-key="' + key + '"]');
      if (item) list.appendChild(item);
    });
    numberOrder();
  }

  function numberOrder() {
    var items = $("sectionOrder").querySelectorAll(".order-item");
    for (var i = 0; i < items.length; i++) items[i].querySelector(".idx").textContent = i + 1;
  }

  function initDragAndDrop() {
    var list = $("sectionOrder");
    var items = list.querySelectorAll(".order-item");

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.setAttribute("draggable", "true");

      item.addEventListener("dragstart", function (e) {
        dragged = this;
        this.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", this.getAttribute("data-key"));
      });
      item.addEventListener("dragend", function () {
        this.classList.remove("dragging");
        var targets = list.querySelectorAll(".order-item");
        for (var k = 0; k < targets.length; k++) targets[k].classList.remove("drop-target");
        dragged = null;
        numberOrder();
        onChange(true);
      });
      item.addEventListener("dragover", function (e) {
        e.preventDefault();
        if (!dragged || dragged === this) return;
        this.classList.add("drop-target");
        var box = this.getBoundingClientRect();
        var after = e.clientY > box.top + box.height / 2;
        list.insertBefore(dragged, after ? this.nextSibling : this);
      });
      item.addEventListener("dragleave", function () { this.classList.remove("drop-target"); });
      item.addEventListener("drop", function (e) { e.preventDefault(); this.classList.remove("drop-target"); });

      // keyboard fallback: move a section up/down with the arrow keys
      item.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        if (e.key === "ArrowUp" && this.previousElementSibling) list.insertBefore(this, this.previousElementSibling);
        if (e.key === "ArrowDown" && this.nextElementSibling) list.insertBefore(this.nextElementSibling, this);
        this.focus();
        numberOrder();
        onChange(true);
      });
      item.setAttribute("tabindex", "0");
    }
    numberOrder();
  }

  /* --------------------------- resume score ---------------------------- */
  var SCORE_RULES = [
    { label: "Full name", weight: 8, test: function (d) { return has(d.personal.fullName); } },
    { label: "Email address", weight: 8, test: function (d) { return RCValidate.isEmail(d.personal.email); } },
    { label: "Phone number", weight: 8, test: function (d) { return RCValidate.isPhone(d.personal.phone); } },
    { label: "Professional title", weight: 5, test: function (d) { return has(d.personal.title); } },
    { label: "Professional summary (40+ characters)", weight: 12, test: function (d) { return d.summary.length >= 40; } },
    { label: "At least one education entry", weight: 12, test: function (d) { return d.education.some(function (e) { return has(e.degree); }); } },
    { label: "At least one work experience", weight: 15, test: function (d) { return d.experience.some(function (e) { return has(e.jobTitle); }); } },
    { label: "At least 5 skills", weight: 12, test: function (d) { return d.skills.length >= 5; } },
    { label: "At least one project", weight: 8, test: function (d) { return d.projects.some(function (p) { return has(p.name); }); } },
    { label: "A certification", weight: 4, test: function (d) { return d.certifications.some(function (c) { return has(c.name); }); } },
    { label: "LinkedIn profile", weight: 4, test: function (d) { return has(d.personal.linkedin); } },
    { label: "Portfolio website", weight: 4, test: function (d) { return has(d.personal.website); } },
  ];

  /** Weighted completeness score out of 100 + the list of missing items. */
  function computeScore(data) {
    var score = 0;
    var missing = [];
    SCORE_RULES.forEach(function (rule) {
      if (rule.test(data)) score += rule.weight;
      else missing.push(rule.label);
    });
    return { score: Math.min(100, score), missing: missing };
  }

  function paintScore(data) {
    var result = computeScore(data);
    $("scoreValue").textContent = result.score + "/100";
    $("scoreBar").style.width = result.score + "%";

    var message;
    if (result.score >= 90) message = "Excellent! Your resume is highly complete.";
    else if (result.score >= 70) message = "Good resume! Add a few more details to improve it.";
    else message = "Your resume needs more information.";
    $("scoreMsg").textContent = message;

    $("scoreMissing").textContent = result.missing.length
      ? "Still missing: " + result.missing.slice(0, 3).join(", ") + (result.missing.length > 3 ? "…" : "")
      : "Every recommended section is filled in.";
    return result;
  }

  /* ---------------------------- dashboard ------------------------------ */
  var TEMPLATE_NAMES = { modern: "Modern", classic: "Classic", creative: "Creative", minimal: "Minimal" };

  function paintDashboard(data, settings, score) {
    var filled = 0;
    var groups = [
      has(data.personal.fullName), has(data.personal.email), has(data.personal.phone),
      has(data.summary),
      data.education.some(function (e) { return has(e.degree); }),
      data.experience.some(function (e) { return has(e.jobTitle); }),
      data.skills.length > 0,
      data.projects.some(function (p) { return has(p.name); }),
      data.certifications.some(function (c) { return has(c.name); }),
      data.languages.some(function (l) { return has(l.name); }),
    ];
    groups.forEach(function (ok) { if (ok) filled++; });
    var completion = Math.round((filled / groups.length) * 100);

    $("dashCompletion").textContent = completion + "%";
    $("dashScore").textContent = score.score + "/100";
    $("dashTemplate").textContent = (settings.ats ? "ATS · " : "") + (TEMPLATE_NAMES[settings.template] || "Modern");

    var meta = RCStorage.loadMeta();
    $("dashSaved").textContent = meta && meta.savedAt ? new Date(meta.savedAt).toLocaleString() : "Not saved yet";
  }

  /* ------------------------- render the preview ------------------------ */
  function scalePreview() {
    var frame = $("previewFrame");
    var resume = $("resumePreview");
    if (!frame || !resume) return;
    var available = frame.clientWidth - 32;
    var scale = Math.min(1, available / 794);
    resume.style.transform = "scale(" + scale + ")";
    resume.style.marginBottom = 1123 * scale - 1123 + "px";
  }

  function render() {
    var data = collectData();
    var settings = collectSettings();
    var resume = $("resumePreview");

    applyStyleVars(settings);
    resume.setAttribute("data-template", settings.template);
    resume.classList.toggle("ats", settings.ats);
    resume.innerHTML = RCTemplates.render(data, settings);

    var score = paintScore(data);
    paintDashboard(data, settings, score);
    scalePreview();
    return { data: data, settings: settings, score: score };
  }

  /* ------------------------------ autosave ----------------------------- */
  var saveTimer = null;

  function setStatus(state) {
    var el = $("saveStatus");
    el.className = "save-status " + state;
    el.textContent = state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Not saved yet";
  }

  /** Central change handler: re-render, then debounce-autosave. */
  function onChange(immediate) {
    render();
    setStatus("saving");
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      RCStorage.saveResume(collectData(), collectSettings());
      setStatus("saved");
      paintDashboard(collectData(), collectSettings(), computeScore(collectData()));
    }, immediate ? 250 : 700);
  }

  /* --------------------------- summary counter ------------------------- */
  function updateCounter() {
    var value = $("summary").value;
    var counter = $("summaryCounter");
    counter.textContent = value.length + " / 600 characters";
    counter.classList.toggle("warn", value.length > 600);
  }

  /* --------------------------- required fields ------------------------- */
  function requiredRules() {
    return [
      { input: $("fullName"), label: "Full name", required: true, min: 2 },
      { input: $("email"), label: "Email", required: true, type: "email" },
      { input: $("phone"), label: "Phone", required: true, type: "phone" },
    ];
  }

  /* ------------------------------ actions ------------------------------ */
  function saveResume() {
    var check = RCValidate.validateFields(requiredRules());
    if (!check.valid) {
      RCToast.error("Please complete the required fields: " + check.errors[0]);
      $("personalSection").classList.add("open");
      return false;
    }
    var ok = RCStorage.saveResume(collectData(), collectSettings());
    if (!ok) { RCToast.error("Your browser blocked local storage, so the resume could not be saved."); return false; }
    setStatus("saved");
    render();
    RCToast.success("Your resume has been saved successfully!");
    return true;
  }

  function loadResume(quiet) {
    var data = RCStorage.loadResume();
    if (!data) {
      if (!quiet) RCToast.error("No saved resume was found in this browser yet.");
      return false;
    }
    applyData(data);
    applySettings(RCStorage.loadSettings());
    render();
    setStatus("saved");
    if (!quiet) RCToast.success("Saved resume loaded.");
    return true;
  }

  function clearResume() {
    // confirm() is intentional here: destructive action needs a hard stop.
    if (!window.confirm("Delete all resume information from this browser? This cannot be undone.")) return;
    RCStorage.clearResume();
    form.reset();
    skills = [];
    photoData = "";
    renderSkills();
    paintPhoto();
    ["education", "experience", "projects", "certifications", "achievements", "languages"].forEach(function (type) {
      $(type + "List").innerHTML = "";
      updateEmptyNote(type);
    });
    var rules = requiredRules();
    rules.forEach(function (r) { RCValidate.setFieldError(r.input, ""); });
    applyOrder(RCTemplates.DEFAULT_ORDER);
    setTemplate("modern", true);
    updateCounter();
    render();
    setStatus("idle");
    RCToast.info("Resume cleared. You have a blank canvas again.");
  }

  function printResume() {
    var check = RCValidate.validateFields(requiredRules());
    if (!check.valid) {
      RCToast.error("Add your name, email and phone before printing.");
      return;
    }
    saveResume();
    RCToast.success("Your resume is ready! Good luck with your next opportunity.");
    window.setTimeout(function () { window.print(); }, 600);
  }

  /* ------------------------------- wiring ------------------------------ */
  function initAccordions() {
    var heads = document.querySelectorAll(".accordion-head");
    for (var i = 0; i < heads.length; i++) {
      heads[i].addEventListener("click", function () {
        var box = this.closest(".accordion");
        var open = box.classList.toggle("open");
        this.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function initAddButtons() {
    Object.keys(SCHEMAS).forEach(function (type) {
      var btn = document.querySelector('[data-add="' + type + '"]');
      if (!btn) return;
      btn.addEventListener("click", function () {
        addEntry(type, null);
        onChange(true);
        RCToast.info(SCHEMAS[type].label + " added.");
      });
      updateEmptyNote(type);
    });
  }

  function initInputs() {
    // any change inside the form updates the preview and autosaves
    form.addEventListener("input", function (e) {
      if (e.target && e.target.id === "summary") updateCounter();
      if (e.target && e.target.id === "skillInput") return;
      onChange(false);
    });
    form.addEventListener("change", function () { onChange(true); });

    $("skillInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addSkill(); }
    });
    $("addSkillBtn").addEventListener("click", addSkill);

    var customIds = ["primaryColor", "accentColor", "fontSize", "fontFamily", "spacing", "atsToggle"];
    customIds.forEach(function (id) {
      $(id).addEventListener("input", function () { onChange(false); });
    });
    $("atsToggle").addEventListener("change", function () {
      RCToast.info(this.checked ? "ATS-friendly mode on: clean single-column layout." : "ATS-friendly mode off.");
    });

    var tplButtons = document.querySelectorAll(".tpl-btn");
    for (var i = 0; i < tplButtons.length; i++) {
      tplButtons[i].addEventListener("click", function () {
        setTemplate(this.getAttribute("data-template"), false);
        onChange(true);
      });
    }

    $("saveBtn").addEventListener("click", saveResume);
    $("loadBtn").addEventListener("click", function () { loadResume(false); });
    $("clearBtn").addEventListener("click", clearResume);
    $("printBtn").addEventListener("click", printResume);
    $("printResumeBtn").addEventListener("click", printResume);
    $("newResumeBtn").addEventListener("click", clearResume);

    $("editResumeBtn").addEventListener("click", function () {
      $("personalSection").classList.add("open");
      $("personalSection").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("previewBtn").addEventListener("click", function () {
      $("previewFrame").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); saveResume(); });
    window.addEventListener("resize", scalePreview);

    RCValidate.attachLiveValidation(requiredRules());
  }

  /** Give first-time visitors one empty entry per repeatable section. */
  function seedEmptyEntries() {
    ["education", "experience", "projects"].forEach(function (type) { addEntry(type, null); });
  }

  function init() {
    initAccordions();
    initAddButtons();
    initPhoto();
    initDragAndDrop();
    initInputs();
    paintPhoto();

    var restored = loadResume(true);
    if (!restored) {
      var settings = RCStorage.loadSettings();
      if (settings) applySettings(settings);
      seedEmptyEntries();
      setStatus("idle");
    }
    updateCounter();
    render();
  }

  init();
})();