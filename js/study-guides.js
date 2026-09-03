(function(){
  const GENESIS_ONE = {
    item_id: "genesis-1-study-guide",
    item_name: "Genesis 1: Creation, Order & the Beginning of All Things",
    item_category: "Digital Study Guide",
    price: 9.99,
    currency: "USD"
  };

  const CHECKOUT_URL = "https://donate.semiticjew.org/b/bJe9AN8Wq8s1biZ8oscbC01";

  function sendGuideEvent(name, extra){
    if (typeof window.gtag !== "function") return;

    window.gtag("event", name, Object.assign({
      currency: GENESIS_ONE.currency,
      value: GENESIS_ONE.price,
      items: [GENESIS_ONE]
    }, extra || {}));
  }

  function announce(message){
    let live = document.getElementById("study-guide-live-region");
    if (!live) {
      live = document.createElement("div");
      live.id = "study-guide-live-region";
      live.className = "visually-hidden";
      live.setAttribute("aria-live", "polite");
      document.body.appendChild(live);
    }
    live.textContent = message;
  }

  function assetExists(url){
    return fetch(url, { method: "HEAD", cache: "no-store" })
      .then(response => response.ok)
      .catch(() => false);
  }

  function setupCoverImages(){
    document.querySelectorAll("[data-study-guide-cover]").forEach(function(img){
      const src = img.dataset.coverSrc;
      const fallbackId = img.dataset.coverFallback;
      const fallback = fallbackId ? document.getElementById(fallbackId) : null;
      if (!src) return;

      img.addEventListener("load", function(){
        img.hidden = false;
        if (fallback) fallback.hidden = true;
      });

      img.addEventListener("error", function(){
        img.hidden = true;
        if (fallback) fallback.hidden = false;
      });

      assetExists(src).then(function(exists){
        if (!exists) return;
        img.src = src;
      });
    });
  }

  function setupSamplePdf(){
    const sample = document.querySelector("[data-study-guide-sample]");
    if (!sample) return;

    sendGuideEvent("view_study_guide_sample", { item_list_name: "Genesis 1 Sample" });

    const src = sample.dataset.sampleSrc;
    const available = document.querySelector("[data-sample-available]");
    const pending = document.querySelector("[data-sample-pending]");
    const frame = document.querySelector("[data-sample-frame]");
    const links = document.querySelectorAll("[data-sample-link]");
    if (!src) return;

    assetExists(src).then(function(exists){
      if (!exists) return;

      if (pending) pending.hidden = true;
      if (available) available.hidden = false;
      if (frame) {
        frame.src = src;
        frame.hidden = false;
      }
      links.forEach(function(link){
        link.href = src;
        link.removeAttribute("aria-disabled");
        link.hidden = false;
      });
    });

    document.addEventListener("click", function(event){
      const download = event.target.closest("[data-sample-download]");
      if (!download || download.getAttribute("aria-disabled") === "true") return;
      sendGuideEvent("download_study_guide_sample", { sample_format: "pdf" });
    });
  }

  function setup(){
    if (document.body?.dataset?.studyGuide === "genesis-1") {
      sendGuideEvent("view_item");
    }

    setupCoverImages();
    setupSamplePdf();

    document.addEventListener("click", function(event){
      const itemLink = event.target.closest("[data-study-guide-event='select_item']");
      if (itemLink) {
        sendGuideEvent("select_item", { item_list_name: itemLink.dataset.itemListName || "Study Guides" });
      }

      const checkout = event.target.closest("[data-study-guide-checkout]");
      if (!checkout) return;

      event.preventDefault();
      sendGuideEvent("begin_checkout", { checkout_context: checkout.dataset.checkoutContext || "study_guides_placeholder" });

      const checkoutUrl = checkout.dataset.checkoutUrl || checkout.getAttribute("href") || CHECKOUT_URL;
      announce("Opening secure checkout for Genesis 1.");

      window.setTimeout(function(){
        window.location.assign(checkoutUrl);
      }, 180);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
