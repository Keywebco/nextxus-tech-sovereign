/* ============================================================
   NEXUS THRONE — MINI-BROWSER module (Architect's final spec).
   EVERY AI link (class="gpt-mini") on the four AI pages opens in
   a small popup window. NEVER embedded, NO iframes, no exceptions.

   - SIZE: ~1/7 of the user's screen at click time
       width  = screen.availWidth  * 0.35   (floor 360)
       height = screen.availHeight * 0.4    (floor 480)
   - RESIZABLE + SCROLLBARS: features include resizable=yes,scrollbars=yes
   - DRAGGABLE: true OS popup (width/height features) -> native title bar
   - STAGGERED CASCADE: each new window offsets +48px left/top, wraps at
     the screen edge; open handles tracked in an array per session
   - ON TOP: .focus() is called on the returned handle so every mini
     browser lands IN FRONT of the app, never behind
   - No-JS fallback: the anchors are ordinary target=_blank links, so
     screen readers / crawlers / script-less agents still reach every AI.
   ============================================================ */
(function () {
  "use strict";

  var minis = []; // open-window handles — drives the cascade offsets

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.gpt-mini");
    if (!a) return;
    e.preventDefault();

    var w = Math.max(360, Math.round(screen.availWidth * 0.35));
    var h = Math.max(480, Math.round(screen.availHeight * 0.4));

    var step = 48, baseLeft = 80, baseTop = 70;
    var maxLeft = Math.max(1, screen.availWidth - w);
    var maxTop = Math.max(1, screen.availHeight - h);
    var left = (baseLeft + minis.length * step) % maxLeft;
    var top = (baseTop + minis.length * step) % maxTop;

    var win = window.open(
      a.href,
      "_blank",
      "popup=yes,resizable=yes,scrollbars=yes,width=" + w + ",height=" + h +
        ",left=" + left + ",top=" + top
    );
    if (win) {
      minis.push(win);
      if (win.focus) win.focus(); // land IN FRONT, never behind
    }
  });
})();
