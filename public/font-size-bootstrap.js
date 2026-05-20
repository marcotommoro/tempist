(function () {
  var valid = function (s) {
    return (
      s === "sm" ||
      s === "smd" ||
      s === "md" ||
      s === "lg" ||
      s === "xl" ||
      s === "xxl"
    );
  };
  try {
    var chrome = localStorage.getItem("font-size");
    var content = localStorage.getItem("content-font-size");
    document.documentElement.setAttribute(
      "data-font-size",
      valid(chrome) ? chrome : "md",
    );
    document.documentElement.setAttribute(
      "data-content-size",
      valid(content) ? content : "md",
    );
  } catch {
    document.documentElement.setAttribute("data-font-size", "md");
    document.documentElement.setAttribute("data-content-size", "md");
  }
})();
