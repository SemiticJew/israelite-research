(function(){
  const PRODUCT = {
    item_id: "genesis-1-study-guide",
    item_name: "Genesis 1: Creation, Order & the Beginning of All Things",
    item_category: "Digital Study Guide",
    price: 9.99,
    currency: "USD",
    product_slug: "genesis-1"
  };

  function qs(selector){
    return document.querySelector(selector);
  }

  function show(selector){
    const node = qs(selector);
    if (node) node.hidden = false;
  }

  function hide(selector){
    const node = qs(selector);
    if (node) node.hidden = true;
  }

  function setText(selector, text){
    const node = qs(selector);
    if (node) node.textContent = text;
  }

  function endpoint(){
    return document.body?.dataset?.fulfillmentEndpoint || window.SEMITIC_JEW_FULFILLMENT_ENDPOINT || "";
  }

  function checkoutSessionId(){
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id") || params.get("checkout_session_id") || "";
  }

  function fireVerifiedPurchase(sessionId){
    if (typeof window.gtag !== "function" || !sessionId) return;

    const storageKey = "sj_purchase_" + sessionId;
    try {
      if (window.localStorage.getItem(storageKey)) return;
      window.localStorage.setItem(storageKey, "1");
    } catch (_) {}

    window.gtag("event", "purchase", {
      transaction_id: sessionId,
      value: PRODUCT.price,
      currency: PRODUCT.currency,
      items: [{
        item_id: PRODUCT.item_id,
        item_name: PRODUCT.item_name,
        item_category: PRODUCT.item_category,
        price: PRODUCT.price,
        quantity: 1
      }]
    });
  }

  function showUnverified(message){
    setText("[data-order-heading]", "Order Not Verified");
    hide("[data-order-checking]");
    hide("[data-order-complete]");
    show("[data-order-unverified]");
    setText("[data-order-unverified-message]", message || "We could not verify this purchase. Please contact Semitic Jew support if you completed checkout.");
  }

  function showProcessing(){
    setText("[data-order-heading]", "Confirming Your Order");
    hide("[data-order-complete]");
    hide("[data-order-unverified]");
    show("[data-order-checking]");
  }

  function showComplete(data, sessionId){
    if (!data || data.product_slug !== PRODUCT.product_slug || !data.download_url) {
      showUnverified();
      return;
    }

    const download = qs("[data-order-download]");
    if (download) download.href = data.download_url;

    setText("[data-order-heading]", "Purchase Confirmed");
    hide("[data-order-checking]");
    hide("[data-order-unverified]");
    show("[data-order-complete]");
    fireVerifiedPurchase(data.checkout_session_id || sessionId);
  }

  function verify(){
    const sessionId = checkoutSessionId();
    const verifier = endpoint();

    if (!sessionId) {
      showUnverified("We could not verify this purchase. Return to the Genesis 1 page or contact Semitic Jew support if you completed checkout.");
      return;
    }

    if (!verifier) {
      showUnverified("We could not verify this purchase yet. Please contact Semitic Jew support if you completed checkout.");
      return;
    }

    showProcessing();

    const url = new URL(verifier, window.location.origin);
    url.searchParams.set("session_id", sessionId);

    fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "omit",
      cache: "no-store"
    })
      .then(function(response){
        if (response.status === 202) return { status: "processing" };
        if (!response.ok) throw new Error("Unable to verify order.");
        return response.json();
      })
      .then(function(data){
        if (data.status === "processing") {
          showProcessing();
          return;
        }

        if (data.verified === true) {
          showComplete(data, sessionId);
          return;
        }

        showUnverified();
      })
      .catch(function(){
        showUnverified();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verify);
  } else {
    verify();
  }
})();
