(function () {
  "use strict";

  function getWebroot() {
    const meta = document.querySelector('meta[name="webroot"]');
    return meta ? meta.getAttribute("content") || "" : "";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const darkIcon = document.querySelector(".theme-icon-dark");
    const lightIcon = document.querySelector(".theme-icon-light");
    if (darkIcon && lightIcon) {
      if (theme === "dark") {
        darkIcon.classList.remove("hidden");
        lightIcon.classList.add("hidden");
      } else {
        darkIcon.classList.add("hidden");
        lightIcon.classList.remove("hidden");
      }
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);

    const webroot = getWebroot();
    fetch(`${webroot}/set-theme`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(function () {});
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", toggleTheme);
    }
  });
})();
