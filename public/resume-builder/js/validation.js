/* ==========================================================================
   validation.js — reusable client-side validation helpers.
   ========================================================================== */

var RCValidate = (function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  var PHONE_RE = /^[+]?[\d\s()-]{7,18}$/;
  var URL_RE = /^(https?:\/\/)?[\w.-]+\.[a-zA-Z]{2,}(\/\S*)?$/;

  function isEmail(value) {
    return EMAIL_RE.test(String(value || "").trim());
  }
  function isPhone(value) {
    return PHONE_RE.test(String(value || "").trim());
  }
  function isUrl(value) {
    return URL_RE.test(String(value || "").trim());
  }
  function isFilled(value) {
    return String(value || "").trim().length > 0;
  }

  /** Paint / clear the error message for a single input. */
  function setFieldError(input, message) {
    if (!input) return;
    var field = input.closest(".field");
    if (!field) return;
    var slot = field.querySelector(".error-msg");
    if (message) {
      field.classList.add("invalid");
      input.setAttribute("aria-invalid", "true");
      if (slot) slot.textContent = message;
    } else {
      field.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
      if (slot) slot.textContent = "";
    }
  }

  /**
   * Validate a set of rules.
   * rules: [{ input, label, required, type: 'email'|'phone'|'url'|'text', min }]
   * Returns { valid: Boolean, errors: [String] }
   */
  function validateFields(rules) {
    var errors = [];
    rules.forEach(function (rule) {
      var input = rule.input;
      if (!input) return;
      var value = String(input.value || "").trim();
      var message = "";

      if (rule.required && !isFilled(value)) {
        message = rule.label + " is required.";
      } else if (value && rule.type === "email" && !isEmail(value)) {
        message = "Please enter a valid email address.";
      } else if (value && rule.type === "phone" && !isPhone(value)) {
        message = "Please enter a valid phone number (7-18 digits).";
      } else if (value && rule.type === "url" && !isUrl(value)) {
        message = "Please enter a valid link (e.g. https://example.com).";
      } else if (value && rule.min && value.length < rule.min) {
        message = rule.label + " must be at least " + rule.min + " characters.";
      } else if (rule.match && value !== String(rule.match.value || "")) {
        message = rule.matchMessage || "Values do not match.";
      }

      setFieldError(input, message);
      if (message) errors.push(message);
    });

    return { valid: errors.length === 0, errors: errors };
  }

  /** Live-validate on blur/input so errors clear as the user types. */
  function attachLiveValidation(rules) {
    rules.forEach(function (rule) {
      if (!rule.input) return;
      var run = function () {
        validateFields([rule]);
      };
      rule.input.addEventListener("blur", run);
      rule.input.addEventListener("input", function () {
        var field = rule.input.closest(".field");
        if (field && field.classList.contains("invalid")) run();
      });
    });
  }

  return {
    isEmail: isEmail,
    isPhone: isPhone,
    isUrl: isUrl,
    isFilled: isFilled,
    setFieldError: setFieldError,
    validateFields: validateFields,
    attachLiveValidation: attachLiveValidation,
  };
})();