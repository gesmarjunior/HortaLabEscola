(function () {
  "use strict";
  const links = Array.from(document.querySelectorAll(".guide-nav a"));
  const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  document.getElementById("printGuide")?.addEventListener("click", () => window.print());
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.toggleAttribute("aria-current", link.getAttribute("href") === `#${visible.target.id}`));
    }, { rootMargin: "-20% 0px -65%", threshold: [0, .2, .6] });
    sections.forEach((section) => observer.observe(section));
  }
}());
