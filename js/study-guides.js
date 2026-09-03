(function(){
  const GENESIS_ONE = {
    item_id: "genesis-1-study-guide",
    item_name: "Genesis 1: Creation, Order & the Beginning of All Things",
    item_category: "Digital Study Guide",
    price: 9.99,
    currency: "USD"
  };

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

  function setup(){
    if (document.body?.dataset?.studyGuide === "genesis-1") {
      sendGuideEvent("view_item");
    }

    document.addEventListener("click", function(event){
      const itemLink = event.target.closest("[data-study-guide-event='select_item']");
      if (itemLink) {
        sendGuideEvent("select_item", { item_list_name: itemLink.dataset.itemListName || "Study Guides" });
      }

      const checkout = event.target.closest("[data-study-guide-checkout]");
      if (!checkout) return;

      sendGuideEvent("begin_checkout", { checkout_context: checkout.dataset.checkoutContext || "study_guides_placeholder" });

      const noticeId = checkout.getAttribute("aria-describedby");
      const notice = noticeId ? document.getElementById(noticeId) : null;
      if (notice) {
        notice.hidden = false;
        notice.focus({ preventScroll: true });
      }

      announce("Online checkout is being finalized. Genesis 1 will be available for purchase here shortly.");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
