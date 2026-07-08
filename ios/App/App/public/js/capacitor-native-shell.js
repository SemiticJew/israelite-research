(() => {
  const isNativeShell =
    Boolean(window.Capacitor) ||
    location.protocol === "capacitor:" ||
    location.hostname === "localhost";

  if (!isNativeShell) return;

  function allowed(href) {
    if (!href || href.startsWith("#")) return true;

    const value = href.trim().toLowerCase();

    if (
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("sms:")
    ) {
      return true;
    }

    try {
      const url = new URL(href, location.href);

      return (
        url.protocol === "capacitor:" ||
        url.protocol === "file:" ||
        url.hostname === location.hostname ||
        url.hostname === "localhost"
      );
    } catch {
      return false;
    }
  }

  function showNotice() {
    let notice = document.querySelector("[data-native-shell-notice]");

    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("data-native-shell-notice", "true");
      notice.setAttribute("role", "status");
      notice.textContent =
        "External browsing is disabled in the Semitic Jew Institute app.";

      Object.assign(notice.style, {
        position: "fixed",
        left: "16px",
        right: "16px",
        bottom: "18px",
        zIndex: "2147483647",
        padding: "12px 14px",
        borderRadius: "14px",
        background: "rgba(5, 74, 145, 0.96)",
        color: "#fff",
        font: "600 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        boxShadow: "0 16px 40px rgba(0,0,0,.25)"
      });

      document.body.appendChild(notice);
    }

    clearTimeout(window.__sjNativeNoticeTimer);
    window.__sjNativeNoticeTimer = setTimeout(() => notice.remove(), 3200);
  }

  const originalOpen = window.open;

  window.open = function guardedWindowOpen(url, target, features) {
    if (url && !allowed(String(url))) {
      showNotice();
      return null;
    }

    return originalOpen.call(window, url, target, features);
  };

  document.addEventListener(
    "click",
    event => {
      const anchor = event.target.closest && event.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");

      if (allowed(href)) {
        if (anchor.target === "_blank") {
          event.preventDefault();
          location.href = new URL(href, location.href).href;
        }

        return;
      }

      event.preventDefault();
      event.stopPropagation();
      showNotice();
    },
    true
  );
})();
