// The index page's search box: filter the page list by title, keywords and headings.
const q = document.getElementById("q");
if (q) q.addEventListener("input", () => {
  const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = new Set(window.HELP_INDEX
    .filter(p => words.every(w => (p.t.toLowerCase() + " " + p.k).includes(w))).map(p => p.u));
  document.querySelectorAll("ul.pages li").forEach(li => { li.hidden = !hit.has(li.dataset.u); });
  document.querySelectorAll("main h2, main h3").forEach(h => { h.hidden = words.length > 0; });
  document.getElementById("none").hidden = hit.size > 0;
});
