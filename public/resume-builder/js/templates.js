/* ==========================================================================
   templates.js — pure render layer.
   Turns the resume data object into HTML for one of 4 templates.
   Empty sections are skipped automatically.
   ========================================================================== */

var RCTemplates = (function () {
  /* sections that live in the Modern template's coloured sidebar */
  var SIDEBAR_SECTIONS = ["skills", "languages", "interests", "certifications"];

  var SECTION_LABELS = {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    achievements: "Achievements",
    languages: "Languages",
    interests: "Interests",
  };

  var DEFAULT_ORDER = [
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "achievements",
    "languages",
    "interests",
  ];

  /** Escape user input before injecting into the preview. */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function has(value) {
    return String(value == null ? "" : value).trim().length > 0;
  }

  function dateRange(start, end, current) {
    var from = has(start) ? esc(start) : "";
    var to = current ? "Present" : has(end) ? esc(end) : "";
    if (from && to) return from + " – " + to;
    return from || to;
  }

  function section(key, innerHtml) {
    if (!innerHtml) return "";
    return (
      '<section class="r-section" data-section="' + key + '">' +
      '<h2 class="r-section-title">' + esc(SECTION_LABELS[key] || key) + "</h2>" +
      innerHtml +
      "</section>"
    );
  }

  function itemBlock(title, sub, date, desc, link) {
    if (!has(title) && !has(sub) && !has(desc)) return "";
    var html = '<div class="r-item">';
    html += '<div class="r-item-head"><div><div class="r-item-title">' + esc(title) + "</div>";
    if (has(sub)) html += '<div class="r-item-sub">' + esc(sub) + "</div>";
    html += "</div>";
    if (has(date)) html += '<div class="r-item-date">' + esc(date) + "</div>";
    html += "</div>";
    if (has(desc)) html += '<div class="r-item-desc">' + esc(desc) + "</div>";
    if (has(link)) html += '<div class="r-item-desc"><a class="r-link" href="' + esc(link) + '">' + esc(link) + "</a></div>";
    return html + "</div>";
  }

  /* ------------------------- section renderers ------------------------- */
  var RENDERERS = {
    summary: function (d) {
      return has(d.summary) ? '<p class="r-item-desc">' + esc(d.summary) + "</p>" : "";
    },

    experience: function (d) {
      return (d.experience || [])
        .map(function (job) {
          var sub = [job.company, job.location].filter(has).join(" • ");
          return itemBlock(job.jobTitle, sub, dateRange(job.startDate, job.endDate, job.current), job.description, "");
        })
        .join("");
    },

    education: function (d) {
      return (d.education || [])
        .map(function (ed) {
          var sub = [ed.institution, ed.location].filter(has).join(" • ");
          return itemBlock(ed.degree, sub, dateRange(ed.startYear, ed.endYear, false), ed.description, "");
        })
        .join("");
    },

    skills: function (d) {
      var skills = (d.skills || []).filter(has);
      if (!skills.length) return "";
      return (
        '<div class="r-tags">' +
        skills.map(function (s) { return '<span class="r-tag">' + esc(s) + "</span>"; }).join("") +
        "</div>"
      );
    },

    projects: function (d) {
      return (d.projects || [])
        .map(function (p) {
          return itemBlock(p.name, p.tech, "", p.description, p.link);
        })
        .join("");
    },

    certifications: function (d) {
      return (d.certifications || [])
        .map(function (c) {
          return itemBlock(c.name, c.organization, c.date, "", c.link);
        })
        .join("");
    },

    achievements: function (d) {
      var list = (d.achievements || []).filter(has);
      if (!list.length) return "";
      return "<ul>" + list.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>";
    },

    languages: function (d) {
      var list = (d.languages || []).filter(function (l) { return has(l.name); });
      if (!list.length) return "";
      return (
        '<div class="r-inline-list">' +
        list
          .map(function (l) {
            return "<div>" + esc(l.name) + (has(l.level) ? " — " + esc(l.level) : "") + "</div>";
          })
          .join("") +
        "</div>"
      );
    },

    interests: function (d) {
      return has(d.hobbies) ? '<p class="r-inline-list">' + esc(d.hobbies) + "</p>" : "";
    },
  };

  function renderSections(data, keys) {
    return keys
      .map(function (key) {
        var renderer = RENDERERS[key];
        return renderer ? section(key, renderer(data)) : "";
      })
      .join("");
  }

  /* --------------------------- header pieces --------------------------- */
  function contactHtml(p) {
    var bits = [];
    if (has(p.email)) bits.push(esc(p.email));
    if (has(p.phone)) bits.push(esc(p.phone));
    if (has(p.location)) bits.push(esc(p.location));
    if (has(p.linkedin)) bits.push(esc(p.linkedin));
    if (has(p.github)) bits.push(esc(p.github));
    if (has(p.website)) bits.push(esc(p.website));
    if (!bits.length) return "";
    return '<div class="r-contact">' + bits.map(function (b) { return "<span>" + b + "</span>"; }).join("") + "</div>";
  }

  function photoHtml(p) {
    if (!has(p.photo)) return "";
    return '<img class="r-photo" src="' + esc(p.photo) + '" alt="Profile photo of ' + esc(p.fullName || "the candidate") + '">';
  }

  function nameHtml(p) {
    var name = has(p.fullName) ? esc(p.fullName) : "Your Name";
    var html = '<h1 class="r-name">' + name + "</h1>";
    if (has(p.title)) html += '<div class="r-title">' + esc(p.title) + "</div>";
    return html;
  }

  /* ---------------------------- templates ------------------------------ */
  function buildModern(data, order) {
    var p = data.personal || {};
    var sideKeys = order.filter(function (k) { return SIDEBAR_SECTIONS.indexOf(k) !== -1; });
    var mainKeys = order.filter(function (k) { return SIDEBAR_SECTIONS.indexOf(k) === -1; });

    return (
      '<aside class="r-side"><div class="r-side-head">' +
      photoHtml(p) +
      nameHtml(p) +
      "</div>" +
      (contactHtml(p) ? '<section class="r-section" data-section="contact">' + contactHtml(p) + "</section>" : "") +
      renderSections(data, sideKeys) +
      '</aside><div class="r-main">' +
      renderSections(data, mainKeys) +
      "</div>"
    );
  }

  function buildStacked(data, order, wrapBody) {
    var p = data.personal || {};
    var head =
      '<header class="r-head">' +
      photoHtml(p) +
      "<div>" + nameHtml(p) + contactHtml(p) + "</div>" +
      "</header>";
    var body = renderSections(data, order);
    return head + (wrapBody ? '<div class="r-body">' + body + "</div>" : body);
  }

  /**
   * render(data, settings) -> HTML string for the resume preview.
   */
  function render(data, settings) {
    var template = (settings && settings.template) || "modern";
    var order = (settings && settings.order && settings.order.length ? settings.order : DEFAULT_ORDER).filter(function (k) {
      return DEFAULT_ORDER.indexOf(k) !== -1;
    });

    if (settings && settings.ats) return buildStacked(data, order, false);
    if (template === "modern") return buildModern(data, order);
    if (template === "creative") return buildStacked(data, order, true);
    return buildStacked(data, order, false); // classic + minimal
  }

  return {
    render: render,
    esc: esc,
    DEFAULT_ORDER: DEFAULT_ORDER,
    SECTION_LABELS: SECTION_LABELS,
  };
})();