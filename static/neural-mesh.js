/* ============================================================
   AUTONOMOUS EVOLUTION T-002 — "Cognitive Circuitry" Neural Mesh
   Admin Throne background (command.html, dispatch.html).

   Spec: 50 drifting gold (#d4af37) nodes; links within 130px at
   rgba(212,175,55,0.2); canvas opacity 0.35 (Global Neural Mesh
   standard); fixed, inset 0, z-index -1, pointer-events none.

   Progressive enhancement ONLY — if this file is absent or throws,
   the page renders completely (content never depends on it).

   Accessibility:
   - prefers-reduced-motion: reduce  -> single static frame, no loop
   - visibilitychange               -> animation pauses in hidden tabs

   Note: body background is set transparent (html stays black) so the
   z-index:-1 canvas is not painted over by the body's own background.
   ============================================================ */
(function () {
  "use strict";

  var NODE_COUNT = 50;
  var LINK_DIST = 130;
  var NODE_COLOR = "#d4af37";
  var LINK_COLOR = "rgba(212, 175, 55, 0.2)";
  var CANVAS_OPACITY = "0.35";

  function start() {
    try {
      // Let the html (black) show through so the -1 canvas is visible.
      document.body.style.background = "transparent";

      var canvas = document.createElement("canvas");
      canvas.id = "neural-mesh";
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText =
        "position:fixed;inset:0;top:0;left:0;z-index:-1;pointer-events:none;opacity:" +
        CANVAS_OPACITY + ";";
      document.body.appendChild(canvas);

      var ctx = canvas.getContext("2d");
      if (!ctx) { window.__NEURAL_MESH = "off"; return; }

      var W = 0, H = 0, nodes = [], raf = null;

      function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
      }

      function seed() {
        nodes = [];
        for (var i = 0; i < NODE_COUNT; i++) {
          nodes.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.7,
            vy: (Math.random() - 0.5) * 0.7,
          });
        }
      }

      function draw(move) {
        ctx.clearRect(0, 0, W, H);
        var i, j, a, b, dx, dy;
        if (move) {
          for (i = 0; i < NODE_COUNT; i++) {
            a = nodes[i];
            a.x += a.vx; a.y += a.vy;
            if (a.x < 0 || a.x > W) a.vx = -a.vx;
            if (a.y < 0 || a.y > H) a.vy = -a.vy;
          }
        }
        ctx.strokeStyle = LINK_COLOR;
        ctx.lineWidth = 1;
        for (i = 0; i < NODE_COUNT; i++) {
          for (j = i + 1; j < NODE_COUNT; j++) {
            a = nodes[i]; b = nodes[j];
            dx = a.x - b.x; dy = a.y - b.y;
            if (dx * dx + dy * dy < LINK_DIST * LINK_DIST) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.fillStyle = NODE_COLOR;
        for (i = 0; i < NODE_COUNT; i++) {
          a = nodes[i];
          ctx.beginPath();
          ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function frame() {
        draw(true);
        raf = window.requestAnimationFrame(frame);
      }

      resize();
      seed();
      window.addEventListener("resize", resize);

      var reduced = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        draw(false);                       // one dignified static frame
        window.__NEURAL_MESH = "static-reduced-motion";
        return;
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (raf) window.cancelAnimationFrame(raf);
          raf = null;
          window.__NEURAL_MESH = "paused";
        } else if (!raf) {
          window.__NEURAL_MESH = "animating";
          frame();
        }
      });

      window.__NEURAL_MESH = "animating";
      frame();
    } catch (e) {
      // The mesh is decoration. The Throne never depends on it.
      window.__NEURAL_MESH = "off";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
