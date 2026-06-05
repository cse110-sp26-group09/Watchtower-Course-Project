/**
 * Prototype 3 monitored demo application.
 *
 * Mirrors the prototype testing software so the prototype_3 dashboard
 * has a realistic app to observe.
 *
 * @module prototype_3/demo/app
 */
(function () {
  "use strict";

  let versionSelect = document.getElementById("version-select");

  // Same-origin bridge: the dashboard's auth-guard stores the signed-in Clerk
  // user id in localStorage. Tagging demo events with it lets them show up on
  // that user's scoped Prototype 3 dashboard. Falls back to null (anonymous)
  // when no one is signed in, which mirrors true external SDK ingestion.
  let dashboardClerkUserId = null;
  try {
    dashboardClerkUserId = localStorage.getItem("watchtower_clerk_user_id") || null;
  } catch (_error) {
    dashboardClerkUserId = null;
  }

  let watchTower = new WatchTower({
    endpoint: "/api/events",
    deployVersion: versionSelect.value,
    appName: "shopdemo",
    userId: dashboardClerkUserId,
  });

  let appContainer = document.getElementById("app");
  let userBadge = document.getElementById("user-badge");
  let loggedInUser = null;
  let cartItems = [];
  let selectedFeedbackRating = 4;

  let PRODUCTS = [
    { id: 1, name: "Synthetic Monitor", price: 79.99, desc: "Automated checks, route coverage" },
    { id: 2, name: "Latency Probe", price: 129.99, desc: "TTFB and page-load diagnostics" },
    { id: 3, name: "Build Overlay", price: 49.99, desc: "Commit and deploy correlation" },
    { id: 4, name: "Error Digest", price: 59.99, desc: "Stack traces with assignment" },
  ];

  function buildFeedbackModal() {
    let modal = document.createElement("div");
    modal.id = "feedback-modal";
    modal.className = "feedback-modal hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "feedback-title");
    modal.innerHTML =
      '<div class="feedback-dialog">' +
      '<h3 id="feedback-title">Send feedback</h3>' +
      '<p>Rate the current experience.</p>' +
      '<div class="star-rating" role="radiogroup" aria-label="Feedback rating">' +
      '<button type="button" class="feedback-star" data-rating="1" role="radio" aria-label="1 star">&#9733;</button>' +
      '<button type="button" class="feedback-star" data-rating="2" role="radio" aria-label="2 stars">&#9733;</button>' +
      '<button type="button" class="feedback-star" data-rating="3" role="radio" aria-label="3 stars">&#9733;</button>' +
      '<button type="button" class="feedback-star" data-rating="4" role="radio" aria-label="4 stars">&#9733;</button>' +
      '<button type="button" class="feedback-star" data-rating="5" role="radio" aria-label="5 stars">&#9733;</button>' +
      "</div>" +
      '<div class="feedback-actions">' +
      '<button type="button" class="btn outline" onclick="window.__closeFeedback()">Cancel</button>' +
      '<button type="button" class="btn" onclick="window.__sendFeedback()">Send</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(modal);

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        window.__closeFeedback();
        return;
      }

      if (event.target.classList.contains("feedback-star")) {
        selectedFeedbackRating = Number(event.target.getAttribute("data-rating"));
        updateFeedbackStars();
      }
    });
  }

  function updateFeedbackStars() {
    document.querySelectorAll(".feedback-star").forEach(function (starButton) {
      let rating = Number(starButton.getAttribute("data-rating"));
      let isSelected = rating <= selectedFeedbackRating;
      starButton.classList.toggle("selected", isSelected);
      starButton.setAttribute("aria-checked", String(rating === selectedFeedbackRating));
    });
  }

  versionSelect.addEventListener("change", function () {
    watchTower.deployVersion = versionSelect.value;
    watchTower.trackEvent("version-switch", { version: versionSelect.value });
  });

  function trackClick(clickedElement) {
    let clickedText = clickedElement.textContent || clickedElement.innerText || "";
    let selectorHint = clickedElement.tagName + (clickedElement.className ? "." + clickedElement.className.split(" ")[0] : "");
    watchTower.trackClick(selectorHint, clickedText.trim().substring(0, 60));
  }

  document.addEventListener("click", function (event) {
    let clickableElement = event.target.closest(".btn, .card, .nav-links a");
    if (clickableElement) trackClick(clickableElement);
  });

  document.querySelectorAll(".nav-links a").forEach(function (navLink) {
    navLink.addEventListener("click", function (event) {
      event.preventDefault();
      renderPage(navLink.getAttribute("data-page"));
    });
  });

  function renderPage(pageName) {
    document.querySelectorAll(".nav-links a").forEach(function (navLink) {
      navLink.classList.toggle("active", navLink.getAttribute("data-page") === pageName);
    });

    switch (pageName) {
      case "products":
        renderProducts();
        break;
      case "cart":
        renderCart();
        break;
      case "account":
        renderAccount();
        break;
      default:
        renderHome();
        break;
    }
  }

  function renderHome() {
    appContainer.innerHTML =
      "<h2>Monitored test surface</h2>" +
      '<div class="alert info">This app is connected to Prototype 3. Use it to generate clicks, custom events, latency samples, and failures.</div>' +
      '<div class="action-group">' +
      '<button class="btn" onclick="window.__triggerSlowLoad()">Simulate Slow Load</button>' +
      '<button class="btn danger" onclick="window.__triggerError()">Trigger JS Error</button>' +
      '<button class="btn danger" onclick="window.__triggerPromiseError()">Trigger Promise Rejection</button>' +
      '<button class="btn outline" onclick="window.__triggerCustomEvent()">Send Custom Event</button>' +
      '<button class="btn outline" onclick="window.__triggerFeedback()">Send Feedback</button>' +
      "</div>";
  }

  function renderProducts() {
    let productsHtml = "<h2>Testing tools</h2><div class='card-grid'>";
    PRODUCTS.forEach(function (product) {
      productsHtml +=
        '<div class="card" onclick="window.__addToCart(' + product.id + ')">' +
        "<h3>" + product.name + "</h3>" +
        "<p>" + product.desc + "</p>" +
        '<div class="price">$' + product.price.toFixed(2) + "</div>" +
        "</div>";
    });
    productsHtml += "</div>";
    appContainer.innerHTML = productsHtml;
  }

  function renderCart() {
    let cartHtml = "<h2>Cart (" + cartItems.length + " items)</h2>";

    if (cartItems.length === 0) {
      cartHtml += '<div class="empty-state">Your cart is empty. Add testing tools to generate more telemetry.</div>';
    } else {
      let totalPrice = 0;
      cartItems.forEach(function (item, index) {
        totalPrice += item.price;
        cartHtml +=
          '<div class="cart-item">' +
          "<span>" + item.name + " - $" + item.price.toFixed(2) + "</span>" +
          '<button class="btn outline" onclick="window.__removeFromCart(' + index + ')">Remove</button>' +
          "</div>";
      });
      cartHtml +=
        '<div style="margin-top:16px;font-size:18px;font-weight:700">Total: $' + totalPrice.toFixed(2) + "</div>" +
        '<div class="action-group">' +
        '<button class="btn" onclick="window.__checkout()">Checkout</button>' +
        '<button class="btn danger" onclick="window.__checkoutError()">Checkout (buggy build)</button>' +
        "</div>";
    }

    appContainer.innerHTML = cartHtml;
  }

  function renderAccount() {
    if (loggedInUser) {
      appContainer.innerHTML =
        "<h2>Account</h2>" +
        '<div class="alert success">Logged in as <strong id="account-username"></strong></div>' +
        '<div class="action-group"><button class="btn outline" onclick="window.__logout()">Log Out</button></div>';
      document.getElementById("account-username").textContent = loggedInUser;
      return;
    }

    appContainer.innerHTML =
      "<h2>Account</h2>" +
      '<div class="login-box">' +
      '<div class="form-group"><label for="username">Username</label><input type="text" id="username" placeholder="Enter any username"></div>' +
      '<div class="form-group"><label for="password">Password</label><input type="password" id="password" placeholder="Any password works"></div>' +
      '<button class="btn" onclick="window.__login()">Log In</button>' +
      "</div>";
  }

  window.__triggerError = function () {
    let brokenObject = null;
    brokenObject.thisWillThrow();
  };

  window.__triggerPromiseError = function () {
    Promise.reject(new Error("Unhandled checkout promise failed at payment gateway"));
  };

  window.__triggerSlowLoad = function () {
    watchTower._enqueue("pageload", {
      duration: 800 + Math.floor(Math.random() * 3200),
      ttfb: 200 + Math.floor(Math.random() * 600),
      domContentLoaded: 400 + Math.floor(Math.random() * 1000),
      loadComplete: 600 + Math.floor(Math.random() * 2000),
      transferSize: 50000 + Math.floor(Math.random() * 200000),
    });
    alert("Simulated a slow page load event. Check the Prototype 3 dashboard.");
  };

  window.__triggerCustomEvent = function () {
    watchTower.trackEvent("test-suite-signal", {
      suite: "checkout-smoke",
      status: "warning",
      scenario: "shopdemo",
    });
    alert("Custom event sent to Prototype 3.");
  };

  window.__triggerFeedback = function () {
    document.getElementById("feedback-modal").classList.remove("hidden");
    updateFeedbackStars();
    document.querySelector(".feedback-star.selected").focus();
  };

  window.__closeFeedback = function () {
    document.getElementById("feedback-modal").classList.add("hidden");
  };

  window.__sendFeedback = function () {
    watchTower._enqueue("feedback", {
      rating: selectedFeedbackRating,
      message: "Checkout feels slow after the latest deploy.",
      category: "ux",
    });
    window.__closeFeedback();
    alert("Feedback event sent to Prototype 3.");
  };

  window.__addToCart = function (productId) {
    let selectedProduct = PRODUCTS.find(function (product) { return product.id === productId; });
    if (!selectedProduct) return;
    cartItems.push(selectedProduct);
    watchTower.trackEvent("add-to-cart", {
      productId: productId,
      productName: selectedProduct.name,
      price: selectedProduct.price,
    });
    renderProducts();
  };

  window.__removeFromCart = function (itemIndex) {
    let removedItem = cartItems[itemIndex];
    cartItems.splice(itemIndex, 1);
    watchTower.trackEvent("remove-from-cart", { productName: removedItem.name });
    renderCart();
  };

  window.__checkout = function () {
    watchTower.trackEvent("checkout", {
      itemCount: cartItems.length,
      total: cartItems.reduce(function (runningTotal, item) { return runningTotal + item.price; }, 0),
    });
    cartItems = [];
    alert("Order placed successfully.");
    renderCart();
  };

  window.__checkoutError = function () {
    try {
      let paymentGateway = undefined;
      paymentGateway.processPayment(cartItems);
    } catch (error) {
      watchTower.trackError(error);
      alert("Checkout failed. Error sent to Prototype 3.");
      renderCart();
    }
  };

  window.__login = function () {
    let usernameInput = document.getElementById("username");
    let username = usernameInput.value.trim();
    if (!username) {
      alert("Please enter a username");
      return;
    }

    loggedInUser = username;
    watchTower.trackLogin(username, "password");
    userBadge.textContent = username;
    userBadge.classList.remove("hidden");
    renderAccount();
  };

  window.__logout = function () {
    watchTower.trackEvent("logout", { userId: loggedInUser });
    loggedInUser = null;
    watchTower.userId = null;
    userBadge.classList.add("hidden");
    renderAccount();
  };

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      window.__closeFeedback();
    }
  });

  buildFeedbackModal();
  renderPage("home");
})();
