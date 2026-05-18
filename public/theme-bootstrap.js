(function () {
  try {
    var k = "theme";
    var s = localStorage.getItem(k);
    var t = s === "light" || s === "dark" || s === "system" ? s : "system";
    var d =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (d) document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = d ? "dark" : "light";
  } catch {
    /* no-op */
  }
})();
