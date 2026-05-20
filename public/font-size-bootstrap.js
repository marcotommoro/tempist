(function () {
  try {
    var k = "font-size";
    var s = localStorage.getItem(k);
    var v = s === "sm" || s === "md" || s === "lg" || s === "xl" || s === "xxl" ? s : "md";
    document.documentElement.setAttribute("data-font-size", v);
  } catch {
    document.documentElement.setAttribute("data-font-size", "md");
  }
})();
