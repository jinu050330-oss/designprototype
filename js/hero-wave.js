(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("wave");
  const ctx = canvas.getContext("2d");
  const lamp = $("hero-lamp");

  const INTENSITY = 1;
  const FREQUENCY = 1.5;
  const RESPONSE = 0.25;
  const INTRO_RESPONSE = 0.035;
  const START_ANGLE = 45;

  const styles = getComputedStyle(document.documentElement);
  const hex = (name) => {
    const value = styles.getPropertyValue(name).trim().slice(1);
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  };
  const stops = [
    [0, hex("--wave-0")],
    [0.4, hex("--wave-1")],
    [0.7, hex("--wave-2")],
    [1, hex("--wave-3")],
  ];

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const color = (t, shade) => {
    let low = stops[0];
    let high = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        low = stops[s];
        high = stops[s + 1];
        break;
      }
    }
    const p = (t - low[0]) / (high[0] - low[0] || 1);
    const rgb = [0, 1, 2].map((i) => Math.round((low[1][i] + (high[1][i] - low[1][i]) * p) * shade));
    return `rgb(${rgb.join(" ")})`;
  };

  let target = START_ANGLE;
  let shown = still ? START_ANGLE : 0;
  let intro = !still;
  let phase = 0;
  let last = performance.now();
  let frame = 0;
  let drag = null;
  let W = 0;
  let H = 0;
  let visible = true;

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.width;
    H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const setTarget = (angle) => {
    intro = false;
    target = Math.round(clamp(angle, 0, 90));
  };

  const face = (a, b, c, d, fill) => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const render = (level) => {
    ctx.clearRect(0, 0, W, H);
    const u = Math.min(W / 21, H / 23.5);
    const v = u * 0.54;
    const scale = u * 12;
    const cx = W / 2;
    const y0 = (H - 22.8 * u) / 2 + scale;
    const size = 0.82;
    const P = (i, j, z) => [cx + (i - j) * u, y0 + (i + j) * v - z];

    for (let sum = 0; sum <= 18; sum++) {
      for (let i = Math.max(0, sum - 9); i <= Math.min(9, sum); i++) {
        const j = sum - i;
        const x = i + 0.09;
        const y = j + 0.09;
        const d = Math.hypot(i - 4.5, j - 4.5) / 6.364;
        const wave = 0.5 + 0.5 * Math.sin(phase - 2 * Math.PI * FREQUENCY * d);
        const height = clamp(0.12 + 0.28 * level + (0.08 + 0.52 * level) * INTENSITY * wave, 0, 1) * scale;
        const tone = clamp(0.7 * level + 0.3 * wave * (0.35 + 0.65 * level), 0, 1);
        const a = P(x, y, height);
        const b = P(x + size, y, height);
        const c = P(x + size, y + size, height);
        const e = P(x, y + size, height);
        const b0 = P(x + size, y, 0);
        const c0 = P(x + size, y + size, 0);
        const e0 = P(x, y + size, 0);
        face(e, c, c0, e0, color(tone * 0.72, 0.72));
        face(b, c, c0, b0, color(tone * 0.55, 0.55));
        face(a, b, c, e, color(tone, 1));
      }
    }
  };

  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    frame++;

    const response = intro ? INTRO_RESPONSE : RESPONSE;
    shown = still ? target : shown + (target - shown) * (1 - Math.pow(1 - response, dt * 60));
    if (Math.abs(target - shown) < 0.05) {
      shown = target;
      intro = false;
    }

    const level = shown / 90;
    if (!still) phase = (phase + 2 * Math.PI * (0.25 + 1.25 * level) * dt) % (2 * Math.PI);
    render(level);

    const angle = Math.round(shown);
    lamp.style.setProperty("--level", level.toFixed(3));
    $("level").textContent = level.toFixed(2);
    $("angle").textContent = `${angle}°`;
    if (frame % 6 === 0) {
      const noise = still ? 0 : Math.random() * 6 - 3;
      $("raw").textContent = clamp(Math.round(250 + shown * 500 / 90 + noise), 250, 750);
    }
    canvas.setAttribute("aria-valuenow", String(angle));
    canvas.setAttribute("aria-valuetext", `${angle}도, 레벨 ${level.toFixed(2)}`);
  };

  canvas.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, angle: target };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const moved = (event.clientX - drag.x) - (event.clientY - drag.y);
    setTarget(drag.angle + moved / (W * 0.6) * 90);
  });
  ["pointerup", "pointercancel"].forEach((type) => {
    canvas.addEventListener(type, () => { drag = null; });
  });
  canvas.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 5 : 1;
    const next = {
      ArrowRight: target + step,
      ArrowUp: target + step,
      ArrowLeft: target - step,
      ArrowDown: target - step,
      Home: 0,
      End: 90,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setTarget(next);
  });

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
  resize();
  requestAnimationFrame(tick);
})();
