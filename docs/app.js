// Nav: solid background once the hero scrolls past.
(function () {
  var nav = document.getElementById("nav");
  var onScroll = function () {
    nav.classList.toggle("nav--scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Footer year.
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());

  // FAQ: keep only one answer open at a time.
  var items = document.querySelectorAll(".faq details");
  items.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (!d.open) return;
      items.forEach(function (other) {
        if (other !== d) other.open = false;
      });
    });
  });
})();
