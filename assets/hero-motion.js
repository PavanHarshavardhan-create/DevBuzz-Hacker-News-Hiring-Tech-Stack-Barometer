/* FEATURE 02 — Draw the animated ripple behind the headline.
   Why: it gives the intro section a little movement while the text remains readable.
   Beginner words: canvas is an HTML drawing area; context is the set of drawing tools;
   pointer events are mouse/pen/touch activity; requestAnimationFrame asks the browser
   to draw the next frame at a suitable time. The effect is decorative and can be removed
   without changing report data or dashboard controls. */
(() => {
  // Find the drawing area and its containing headline section. Stop safely if either is missing.
  const canvas = document.getElementById("introMotion");
  const section = canvas && canvas.closest(".intro-section");
  if (!canvas || !section) return;

  // Respect the visitor's device setting to reduce motion, which can help prevent discomfort.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  const context = canvas.getContext("2d");
  const phrase = "PYTHON · REACT · TYPESCRIPT · SQL · AWS · NODE.JS · ";
  const rippleMarks = "·.,:;~=+*#@";
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let cells = [];
  let ripples = [];
  let lastPointerRipple = 0;

  // RESIZE — Match the canvas drawing surface to its visible box and place text characters in a grid.
  // pixelRatio keeps the drawing sharp on high-resolution screens; cells are the character positions.
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.font = '9px "DM Mono", monospace';

    const cellWidth = context.measureText("M").width * 1.6;
    const cellHeight = 16;
    const columns = Math.ceil(width / cellWidth);
    const rows = Math.ceil(height / cellHeight);
    cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        cells.push({
          x: column * cellWidth,
          y: row * cellHeight + cellHeight,
          phase: Math.random() * Math.PI * 2,
          character: phrase[(column + row * columns) % phrase.length]
        });
      }
    }
  }

  // Make a ripple at the pointer position. power controls how strong its wave looks.
  function addRipple(clientX, clientY, power) {
    const bounds = canvas.getBoundingClientRect();
    ripples.push({ x: clientX - bounds.left, y: clientY - bounds.top, radius: 0, power, life: 1 });
  }

  // A gentle ripple follows mouse/pen movement; touch only creates a ripple on tap below.
  // passive tells the browser this listener will not cancel scrolling or other default gestures.
  section.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const now = performance.now();
    if (now - lastPointerRipple < 70) return;
    addRipple(event.clientX, event.clientY, 0.72);
    lastPointerRipple = now;
  }, { passive: true });

  section.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") addRipple(event.clientX, event.clientY, 1.25);
  }, { passive: true });

  // DRAW LOOP — Erase and repaint the canvas once per animation frame.
  // ripples lose life over time; the distance from each ripple changes each character's wave amount.
  function draw(now) {
    context.clearRect(0, 0, width, height);
    const frameScale = Math.min((now - (draw.previous || now)) / 16.67, 2);
    draw.previous = now;

    for (const ripple of ripples) {
      ripple.radius += 1.45 * frameScale;
      ripple.life -= 0.0032 * frameScale;
    }
    ripples = ripples.filter((ripple) => ripple.life > 0);

    for (const cell of cells) {
      let wave = 0;
      for (const ripple of ripples) {
        const distance = Math.hypot(cell.x - ripple.x, cell.y - ripple.y);
        wave += Math.sin((distance - ripple.radius) * 0.11) *
          Math.exp(-Math.pow((distance - ripple.radius) / 42, 2)) * ripple.life * ripple.power;
      }

      const shimmer = Math.sin(now * 0.0004 + cell.phase) * 0.025;
      const energy = Math.min(1, Math.abs(wave) * 0.9);
      const markIndex = Math.min(rippleMarks.length - 1, Math.floor(energy * (rippleMarks.length - 1)));
      context.globalAlpha = 0.23 + energy * 0.62 + shimmer;
      context.fillStyle = energy > 0.2 ? "#ffd278" : energy > 0.08 ? "#ff963d" : "#b89458";
      context.font = `${energy > 0.25 ? "500" : "400"} 9px "DM Mono", monospace`;
      context.fillText(energy > 0.16 ? rippleMarks[markIndex] : cell.character, cell.x + wave * 1.7, cell.y + wave * 1.5);
    }

    context.globalAlpha = 1;
    window.requestAnimationFrame(draw);
  }

  function start() {
    resize();
    window.requestAnimationFrame(draw);
  }

  // Start after the font is ready so the character grid uses the correct text size; redraw on resize.
  window.addEventListener("resize", resize, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else start();
})();
