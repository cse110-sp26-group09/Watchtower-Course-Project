(function () {
  "use strict";

  var versionSelect = document.getElementById("version-select");
  var wt = new WatchTower({
    endpoint: "/api/events",
    deployVersion: versionSelect.value,
  });

  versionSelect.addEventListener("change", function () {
    wt.deployVersion = this.value;
    wt.trackEvent("version-switch", { version: this.value });
  });

  var $app = document.getElementById("app");
  var $userBadge = document.getElementById("user-badge");
  var loggedInUser = null;
  var cart = [];

  var PRODUCTS = [
    { id: 1, name: "Wireless Headphones", price: 79.99, desc: "Noise-canceling, 20hr battery" },
    { id: 2, name: "Mechanical Keyboard", price: 129.99, desc: "Cherry MX switches, RGB" },
    { id: 3, name: "USB-C Hub", price: 49.99, desc: "7-in-1, 4K HDMI output" },
    { id: 4, name: "Webcam HD", price: 59.99, desc: "1080p, auto-focus, mic" },
    { id: 5, name: "Monitor Light Bar", price: 39.99, desc: "LED, adjustable color temp" },
    { id: 6, name: "Laptop Stand", price: 34.99, desc: "Aluminum, ergonomic angle" },
  ];

  function trackClick(el) {
    var text = el.textContent || el.innerText || "";
    var target = el.tagName + (el.className ? "." + el.className.split(" ")[0] : "");
    wt.trackClick(target, text.trim().substring(0, 60));
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn, .card, .nav-links a");
    if (btn) trackClick(btn);
  });

  document.querySelectorAll(".nav-links a").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var page = this.getAttribute("data-page");
      navigate(page);
    });
  });

  function navigate(page) {
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === page);
    });

    switch (page) {
      case "home": renderHome(); break;
      case "products": renderProducts(); break;
      case "cart": renderCart(); break;
      case "account": renderAccount(); break;
      default: renderHome();
    }
  }

  function renderHome() {
    $app.innerHTML =
      "<h2>Welcome to ShopDemo</h2>" +
      '<div class="alert info">This app is monitored by WatchTower. Every click, error, and page load is tracked. Try the buttons below!</div>' +
      '<div class="action-group">' +
      '<button class="btn" onclick="window.__triggerSlowLoad()">Simulate Slow Load</button>' +
      '<button class="btn danger" onclick="window.__triggerError()">Trigger JS Error</button>' +
      '<button class="btn danger" onclick="window.__triggerPromiseError()">Trigger Promise Rejection</button>' +
      '<button class="btn outline" onclick="window.__triggerCustomEvent()">Send Custom Event</button>' +
      "</div>";
  }

  function renderProducts() {
    var html = "<h2>Products</h2><div class='card-grid'>";
    PRODUCTS.forEach(function (p) {
      html +=
        '<div class="card" onclick="window.__addToCart(' + p.id + ')">' +
        "<h3>" + p.name + "</h3>" +
        "<p>" + p.desc + "</p>" +
        '<div class="price">$' + p.price.toFixed(2) + "</div>" +
        "</div>";
    });
    html += "</div>";
    $app.innerHTML = html;
  }

  function renderCart() {
    var html = "<h2>Cart (" + cart.length + " items)</h2>";

    if (cart.length === 0) {
      html += '<div class="empty-state">Your cart is empty. Browse products to add items.</div>';
    } else {
      var total = 0;
      cart.forEach(function (item, i) {
        total += item.price;
        html +=
          '<div class="cart-item">' +
          "<span>" + item.name + " - $" + item.price.toFixed(2) + "</span>" +
          '<button class="btn outline" onclick="window.__removeFromCart(' + i + ')">Remove</button>' +
          "</div>";
      });
      html +=
        '<div style="margin-top:16px;font-size:18px;font-weight:700">Total: $' + total.toFixed(2) + "</div>" +
        '<div class="action-group">' +
        '<button class="btn" onclick="window.__checkout()">Checkout</button>' +
        '<button class="btn danger" onclick="window.__checkoutError()">Checkout (buggy v2)</button>' +
        "</div>";
    }
    $app.innerHTML = html;
  }

  function renderAccount() {
    if (loggedInUser) {
      $app.innerHTML =
        "<h2>Account</h2>" +
        '<div class="alert success">Logged in as <strong>' + loggedInUser + "</strong></div>" +
        '<div class="action-group">' +
        '<button class="btn outline" onclick="window.__logout()">Log Out</button>' +
        "</div>";
      return;
    }

    $app.innerHTML =
      "<h2>Account</h2>" +
      '<div class="login-box">' +
      '<div class="form-group">' +
      '<label for="username">Username</label>' +
      '<input type="text" id="username" placeholder="Enter any username" />' +
      "</div>" +
      '<div class="form-group">' +
      '<label for="password">Password</label>' +
      '<input type="password" id="password" placeholder="Any password works" />' +
      "</div>" +
      '<button class="btn" onclick="window.__login()">Log In</button>' +
      "</div>";
  }

  window.__triggerError = function () {
    var fakeObj = null;
    fakeObj.thisWillThrow();
  };

  window.__triggerPromiseError = function () {
    Promise.reject(new Error("Unhandled checkout promise failed at payment gateway"));
  };

  window.__triggerSlowLoad = function () {
    wt._enqueue("pageload", {
      duration: 800 + Math.floor(Math.random() * 3200),
      ttfb: 200 + Math.floor(Math.random() * 600),
      domContentLoaded: 400 + Math.floor(Math.random() * 1000),
      loadComplete: 600 + Math.floor(Math.random() * 2000),
      transferSize: 50000 + Math.floor(Math.random() * 200000),
    });
    alert("Simulated a slow page load event! Check the dashboard.");
  };

  window.__triggerCustomEvent = function () {
    wt.trackEvent("promo-banner-seen", {
      campaign: "summer-sale-2026",
      position: "hero",
    });
    alert("Custom event sent! Check the dashboard.");
  };

  window.__addToCart = function (id) {
    var product = PRODUCTS.find(function (p) { return p.id === id; });
    if (!product) return;
    cart.push(product);
    wt.trackEvent("add-to-cart", { productId: id, productName: product.name, price: product.price });
    renderProducts();
  };

  window.__removeFromCart = function (index) {
    var item = cart[index];
    cart.splice(index, 1);
    wt.trackEvent("remove-from-cart", { productName: item.name });
    renderCart();
  };

  window.__checkout = function () {
    wt.trackEvent("checkout", { itemCount: cart.length, total: cart.reduce(function (s, i) { return s + i.price; }, 0) });
    cart = [];
    alert("Order placed successfully!");
    renderCart();
  };

  window.__checkoutError = function () {
    try {
      var paymentGateway = undefined;
      paymentGateway.processPayment(cart);
    } catch (e) {
      wt.trackError(e);
      alert("Checkout failed! Error sent to WatchTower.");
      renderCart();
    }
  };

  window.__login = function () {
    var username = document.getElementById("username").value.trim();
    if (!username) {
      alert("Please enter a username");
      return;
    }
    loggedInUser = username;
    wt.trackLogin(username, "password");
    $userBadge.textContent = username;
    $userBadge.classList.remove("hidden");
    renderAccount();
  };

  window.__logout = function () {
    wt.trackEvent("logout", { userId: loggedInUser });
    loggedInUser = null;
    wt.userId = null;
    $userBadge.classList.add("hidden");
    renderAccount();
  };

  navigate("home");
})();
