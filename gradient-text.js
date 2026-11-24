/**
 * GradientText - Vanilla JS engine for React Bits GradientText component
 * Faithful implementation of the React Bits algorithm with interactive physics,
 * variable variants (linear, flow, conic), pointer follow, and intersection observer.
 */
(function () {
  'use strict';

  const VARIANTS = ['linear', 'flow', 'conic'];
  const ANGLES = { horizontal: 90, vertical: 180, diagonal: 135 };
  const TAU = Math.PI * 2;
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  function initGradientText(root, userOptions = {}) {
    if (!root || root._gradientTextInstance) return;

    // Parse options from attributes or userOptions
    const attrColors = root.dataset.colors ? root.dataset.colors.split(',').map(c => c.trim()) : null;
    const colors = userOptions.colors || attrColors || ['#5227FF', '#FF9FFC', '#B497CF'];
    const palette = colors.length > 1 ? colors : [colors[0] || '#ffffff', colors[0] || '#ffffff'];
    const animationSpeed = parseFloat(userOptions.animationSpeed || root.dataset.speed || 8);
    const variant = userOptions.variant || root.dataset.variant || 'linear';
    const angle = parseFloat(userOptions.angle || root.dataset.angle || 90);
    const direction = userOptions.direction || root.dataset.direction;
    const scale = parseFloat(userOptions.scale || root.dataset.scale || 3);
    const yoyo = userOptions.yoyo !== undefined ? userOptions.yoyo : (root.dataset.yoyo !== 'false');
    const glow = parseFloat(userOptions.glow !== undefined ? userOptions.glow : (root.dataset.glow !== undefined ? root.dataset.glow : 0.3));
    const pauseOnHover = userOptions.pauseOnHover || root.dataset.pauseOnHover === 'true';
    const followPointer = userOptions.followPointer !== undefined ? userOptions.followPointer : (root.dataset.followPointer !== 'false');
    const borderWidth = parseFloat(userOptions.borderWidth || root.dataset.borderWidth || 1.5);

    const settings = {
      colors: palette,
      speed: Math.max(0.2, animationSpeed),
      variant: VARIANTS.includes(variant) ? variant : 'linear',
      angle: direction ? (ANGLES[direction] ?? angle) : angle,
      scale: clamp(scale, 1, 6),
      yoyo,
      glow: clamp(glow, 0, 1),
      pauseOnHover,
      followPointer
    };

    // Ensure DOM structure matches React Bits: .gradient-text__inner -> .gradient-text__content + .gradient-text__glow
    let inner = root.querySelector('.gradient-text__inner');
    let content = root.querySelector('.gradient-text__content');
    let glowEl = root.querySelector('.gradient-text__glow');

    if (!inner || !content) {
      const originalHtml = root.innerHTML;
      root.innerHTML = '';
      inner = document.createElement('span');
      inner.className = 'gradient-text__inner';
      content = document.createElement('span');
      content.className = 'gradient-text__content';
      content.innerHTML = originalHtml;
      inner.appendChild(content);

      if (settings.glow > 0) {
        glowEl = document.createElement('span');
        glowEl.className = 'gradient-text__glow';
        glowEl.setAttribute('aria-hidden', 'true');
        glowEl.innerHTML = originalHtml;
        inner.appendChild(glowEl);
      }
      root.appendChild(inner);
    } else if (settings.glow > 0 && !glowEl) {
      glowEl = document.createElement('span');
      glowEl.className = 'gradient-text__glow';
      glowEl.setAttribute('aria-hidden', 'true');
      glowEl.innerHTML = content.innerHTML;
      inner.appendChild(glowEl);
    }

    const loop = [...palette, palette[0]];
    root.style.setProperty('--gt-gradient', `linear-gradient(${settings.angle}deg, ${loop.join(', ')})`);
    root.style.setProperty('--gt-border', `${borderWidth}px`);
    root.style.setProperty('--gt-glow', settings.glow);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const state = { time: 0, inside: false, visible: true, x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, pull: 0 };
    let raf = 0;
    let last = 0;
    let alive = true;

    const paint = () => {
      const list = settings.colors;
      const cycle = state.time / settings.speed;
      let image;

      if (settings.variant === 'flow') {
        const blobs = list.map((color, i) => {
          const spin = cycle * TAU;
          const rate = 0.55 + ((i * 0.618) % 1) * 0.5;
          let x = 50 + 44 * Math.sin(spin * rate + i * 2.1);
          let y = 50 + 40 * Math.sin(spin * (rate * 0.83 + 0.21) + i * 1.3);
          if (i === 0) {
            x += (state.px * 100 - x) * state.pull;
            y += (state.py * 100 - y) * state.pull;
          }
          return `radial-gradient(ellipse ${(22 + 12 * settings.scale).toFixed(1)}% ${(60 + 30 * settings.scale).toFixed(1)}% at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${color} 0%, transparent 100%)`;
        });
        image = `${blobs.join(', ')}, linear-gradient(${settings.angle}deg, ${list.join(', ')})`;
      } else if (settings.variant === 'conic') {
        const sway = settings.yoyo ? Math.sin(cycle * Math.PI) * 50 : cycle * 360;
        const cx = 50 + (state.px * 100 - 50) * state.pull;
        const cy = 260 + (state.py * 100 - 260) * state.pull;
        image = `repeating-conic-gradient(from ${(sway - 30).toFixed(2)}deg at ${cx.toFixed(2)}% ${cy.toFixed(2)}%, ${[...list, list[0]].map((color, i) => `${color} ${((i / list.length) * 60 * (3 / settings.scale)).toFixed(2)}deg`).join(', ')})`;
      } else {
        const fullLoop = [...list, list[0]];
        const period = 100 * settings.scale;
        let offset;
        if (settings.yoyo) {
          const swing = cycle % 2;
          const t = swing < 1 ? swing : 2 - swing;
          offset = (0.5 - Math.cos(Math.PI * t) / 2) * (period - 100);
        } else {
          offset = (cycle % 1) * period;
        }
        offset += (state.px - 0.5) * period * 0.5 * state.pull;
        const stops = fullLoop.map((color, i) => `${color} ${((i / (fullLoop.length - 1)) * period - offset).toFixed(2)}%`);
        image = `repeating-linear-gradient(${settings.angle}deg, ${stops.join(', ')})`;
      }
      root.style.setProperty('--gt-gradient', image);
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const paused = reduce || (settings.pauseOnHover && state.inside);
      if (!paused) state.time += dt;
      const target = settings.followPointer && state.inside ? 1 : 0;
      state.pull += (target - state.pull) * (1 - Math.exp(-dt * 6));
      const stiffness = 160;
      state.vx += ((state.x - state.px) * stiffness - state.vx * 2 * Math.sqrt(stiffness)) * dt;
      state.vy += ((state.y - state.py) * stiffness - state.vy * 2 * Math.sqrt(stiffness)) * dt;
      state.px += state.vx * dt;
      state.py += state.vy * dt;
      paint();
      const settling = Math.abs(state.pull - target) > 0.001 || Math.abs(state.vx) + Math.abs(state.vy) > 0.001;
      if (!state.visible || (paused && !settling)) return;
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const locate = event => {
      const rect = root.getBoundingClientRect();
      state.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      state.y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    };
    const onEnter = event => {
      locate(event);
      if (!state.inside) {
        state.px = state.x;
        state.py = state.y;
      }
      state.inside = true;
      wake();
    };
    const onMove = event => {
      locate(event);
      wake();
    };
    const onLeave = () => {
      state.inside = false;
      wake();
    };

    const observer = new IntersectionObserver(entries => {
      state.visible = entries.some(entry => entry.isIntersecting);
      if (state.visible) wake();
    });
    observer.observe(root);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    paint();
    wake();

    root._gradientTextInstance = {
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        observer.disconnect();
        root.removeEventListener('pointerenter', onEnter);
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerleave', onLeave);
        delete root._gradientTextInstance;
      }
    };
  }

  // Auto-initialize all .gradient-text elements
  function autoInit() {
    const elements = document.querySelectorAll('.gradient-text');
    elements.forEach(el => initGradientText(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  window.initGradientText = initGradientText;
})();
