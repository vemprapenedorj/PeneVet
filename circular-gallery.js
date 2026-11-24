/**
 * CircularGallery - Interactive Curved Image Gallery
 * Based on React Bits CircularGallery component
 * Robust DOM-accelerated architecture that works 100% locally (file://) and online.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.createCircularGallery = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_FONT = '800 16px Manrope, sans-serif';
  const WORLD_HEIGHT = 16.57;
  const INTRO_SECONDS = 1.2;

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const wrap = (val, len) => ((val % len) + len) % len;

  function createCircularGallery(container, userOptions = {}) {
    if (!container) return null;

    const options = Object.assign(
      {
        items: [],
        bend: 2.2,
        textColor: '#24233a',
        borderRadius: 0.05,
        font: DEFAULT_FONT,
        scrollSpeed: 2,
        scrollEase: 0.05,
        itemSize: 0.88,
        itemAspect: 0.8,
        gap: 0.28,
        wave: 0.6,
        fadeEdges: 0.12,
        shadow: 0.16,
        showTitles: true,
        snap: true,
        autoScroll: 0.35,
        openOnClick: true,
        intro: true,
        onItemClick: null,
        onActiveChange: null
      },
      userOptions
    );

    const count = options.items.length;
    if (count === 0) return null;

    // Setup DOM Structure
    container.classList.add('circular-gallery');
    container.style.color = options.textColor;
    container.setAttribute('role', 'region');
    container.setAttribute('aria-roledescription', 'carousel');
    container.setAttribute('aria-label', 'Galeria de fotos da clínica');

    // Stage for card elements
    const stage = document.createElement('div');
    stage.className = 'circular-gallery-stage';
    container.appendChild(stage);

    // Caption container
    const caption = document.createElement('div');
    caption.className = 'circular-gallery-caption';
    caption.setAttribute('aria-hidden', 'true');
    const captionText = document.createElement('p');
    captionText.className = 'circular-gallery-caption-text';
    caption.appendChild(captionText);
    container.appendChild(caption);

    // Close button for opened card
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'circular-gallery-close';
    closeBtn.setAttribute('tabindex', '-1');
    closeBtn.setAttribute('aria-label', 'Fechar imagem');
    closeBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    container.appendChild(closeBtn);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    // Internal State
    const view = { width: container.clientWidth || 800, height: container.clientHeight || 500 };
    const state = {
      scroll: 0,
      target: 0,
      velocity: 0,
      open: 0,
      openTarget: 0,
      intro: options.intro && !reduce ? 0 : 1,
      hovered: null,
      hover: new Map(),
      focus: new Map(),
      drag: null,
      lastInput: performance.now(),
      active: 0,
      spacing: 1
    };

    let pool = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    let snapTimer = 0;

    const measure = () => {
      const height = 0.54 * view.height * options.itemSize;
      const width = height * options.itemAspect;
      const scale = Math.min(1, (view.width * 0.82) / width);
      const w = width * scale;
      const h = height * scale;
      const spacing = w * (1 + options.gap);
      return { w, h, spacing };
    };

    const arcOf = x => {
      if (!options.bend) return { y: 0, angle: 0 };
      const depth = (Math.abs(options.bend) * view.height) / WORLD_HEIGHT;
      const half = Math.max(view.width, view.height * 1.9) / 2;
      const radius = (half * half + depth * depth) / (2 * depth);
      const reach = Math.min(Math.abs(x), half, radius * 0.999);
      const arc = radius - Math.sqrt(radius * radius - reach * reach);
      const angle = Math.sign(x) * Math.asin(reach / radius);
      return options.bend > 0 ? { y: -arc, angle: -angle } : { y: arc, angle };
    };

    const ensurePool = needed => {
      while (pool.length < needed) {
        const cardEl = document.createElement('div');
        cardEl.className = 'circular-gallery-card';

        const inner = document.createElement('div');
        inner.className = 'circular-gallery-card-inner';

        const img = document.createElement('img');
        img.className = 'circular-gallery-img';
        img.draggable = false;
        img.alt = '';
        inner.appendChild(img);

        cardEl.appendChild(inner);

        const title = document.createElement('span');
        title.className = 'circular-gallery-card-label';
        cardEl.appendChild(title);

        stage.appendChild(cardEl);
        pool.push({ el: cardEl, inner, img, title, inUse: false });
      }
    };

    const openFrame = item => {
      const aspect = options.itemAspect || 0.8;
      const margin = Math.max(20, Math.min(view.width, view.height) * 0.08);
      const captionSpace = item.description ? 70 : 30;
      const width = Math.min(view.width - margin * 2, (view.height - margin * 2 - captionSpace) * aspect);
      const height = width / aspect;
      return { width, height, y: (view.height - height - captionSpace) / 2, titleSpace: 0 };
    };

    const nearest = (target = state.target) => Math.round(target / Math.max(state.spacing, 1));

    const setSlot = slot => {
      state.target = slot * state.spacing;
      state.velocity = 0;
      state.lastInput = performance.now();
      wake();
    };

    const openSlot = slot => {
      setSlot(slot);
      state.openTarget = 1;
      closeBtn.setAttribute('data-visible', '');
      closeBtn.tabIndex = 0;
      caption.removeAttribute('aria-hidden');
      wake();
    };

    const close = () => {
      state.openTarget = 0;
      closeBtn.removeAttribute('data-visible');
      closeBtn.tabIndex = -1;
      caption.setAttribute('aria-hidden', 'true');
      wake();
    };

    closeBtn.addEventListener('click', close);

    const layout = () => {
      const { w, h, spacing } = measure();
      state.spacing = spacing;
      const introEase = 1 - Math.pow(1 - state.intro, 3);
      const scroll = state.scroll + (1 - introEase) * spacing * 1.6;
      const verticalLift = view.height * 0.035;

      const activeItem = options.items[wrap(state.active, count)] || options.items[0];
      const activeFrame = openFrame(activeItem);
      const spread = Math.max(0, activeFrame.width / 2 - w / 2);
      const activeX = state.active * spacing - scroll;

      const first = Math.floor((scroll - view.width / 2 - spacing * 2) / spacing);
      const lastSlot = Math.ceil((scroll + view.width / 2 + spacing * 2) / spacing);
      const cards = [];

      for (let slot = first; slot <= lastSlot; slot++) {
        const index = wrap(slot, count);
        const item = options.items[index];
        const focus = ease(state.focus.get(slot) || 0);

        let x = slot * spacing - scroll;
        x += Math.sign(x - activeX) * state.open * (1 - focus) * spread;

        const arc = arcOf(x);
        const frame = focus > 0 ? openFrame(item) : activeFrame;
        const order = Math.abs(slot * spacing - state.scroll) / spacing;
        const shown = ease(clamp(state.intro * 2.2 - order * 0.22, 0, 1));
        const hover = state.hover.get(slot) || 0;
        const lift = 1 + hover * 0.04 * (1 - focus);

        const cardW = mix(w, frame.width, focus) * lift;
        const cardH = mix(h, frame.height, focus) * lift;
        const cardX = mix(x, 0, focus) + view.width / 2;
        const cardY = mix(view.height / 2 - arc.y - verticalLift, frame.y + frame.height / 2, focus) + (1 - shown) * h * 0.18;
        const angle = arc.angle * (1 - focus);
        const radius = options.borderRadius * Math.min(cardW, cardH);
        const alpha = shown * mix(1, 0.12, state.open * (1 - focus));

        cards.push({
          slot,
          index,
          item,
          x: cardX,
          y: cardY,
          w: cardW,
          h: cardH,
          angle,
          radius,
          alpha,
          focus,
          hover
        });
      }

      // Render cards to DOM pool
      ensurePool(cards.length);
      pool.forEach(p => (p.inUse = false));

      cards.forEach((card, i) => {
        const p = pool[i];
        p.inUse = true;
        p.el.style.display = 'flex';
        p.el.style.width = `${Math.round(card.w)}px`;
        p.el.style.height = `${Math.round(card.h)}px`;
        p.el.style.opacity = card.alpha.toFixed(3);
        p.el.style.transform = `translate3d(${card.x.toFixed(1)}px, ${card.y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${card.angle.toFixed(4)}rad)`;
        p.el.style.zIndex = Math.round(card.focus * 100 + (1 - Math.abs(card.x - view.width / 2) / view.width) * 20);

        p.inner.style.borderRadius = `${Math.round(card.radius)}px`;
        if (p.img.getAttribute('data-src') !== card.item.image) {
          p.img.setAttribute('data-src', card.item.image);
          p.img.src = card.item.image;
        }
        p.img.alt = card.item.alt || card.item.text || 'Foto PeneVet';

        if (card.slot === state.active && !card.focus) {
          p.el.classList.add('is-active');
        } else {
          p.el.classList.remove('is-active');
        }

        if (options.showTitles && card.item.text && !card.focus) {
          p.title.style.display = 'block';
          p.title.textContent = card.item.text;
          p.title.style.opacity = (1 - state.open).toFixed(2);
        } else {
          p.title.style.display = 'none';
        }

        p.el.onclick = e => {
          if (state.drag && state.drag.moved) return;
          e.stopPropagation();
          options.onItemClick?.(card.item, card.index);
          if (options.openOnClick) {
            if (state.open > 0.5 && card.slot === state.active) {
              close();
            } else {
              openSlot(card.slot);
            }
          } else {
            setSlot(card.slot);
          }
        };

        p.el.onpointerenter = () => {
          state.hovered = card.slot;
          wake();
        };
        p.el.onpointerleave = () => {
          if (state.hovered === card.slot) state.hovered = null;
          wake();
        };
      });

      // Hide unused pool items
      pool.forEach(p => {
        if (!p.inUse) p.el.style.display = 'none';
      });

      // Update caption if active item is open
      if (state.open > 0.05) {
        const opened = cards.find(c => c.slot === state.active) || cards[0];
        if (opened && opened.item.description) {
          captionText.textContent = opened.item.description;
          caption.style.opacity = state.open.toFixed(2);
          caption.style.transform = `translate(-50%, ${Math.round(opened.y + opened.h / 2 + 16)}px)`;
        } else {
          caption.style.opacity = '0';
        }
      } else {
        caption.style.opacity = '0';
      }
    };

    const frame = now => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;

      const idle = now - state.lastInput > 1600;
      const auto =
        options.autoScroll &&
        !reduce &&
        !state.drag &&
        state.open < 0.01 &&
        state.hovered === null &&
        idle;

      if (auto) state.target += options.autoScroll * state.spacing * 0.25 * dt;

      const follow = reduce ? 1 : 1 - Math.pow(1 - options.scrollEase, dt * 60);
      const before = state.scroll;
      state.scroll += (state.target - state.scroll) * follow;
      if (Math.abs(state.target - state.scroll) < 0.05) state.scroll = state.target;
      const velocity = (state.scroll - before) / dt;
      state.velocity += (velocity - state.velocity) * (1 - Math.exp(-dt / 0.08));
      if (Math.abs(state.velocity) < 0.5) state.velocity = 0;

      const openFollow = reduce ? 1 : 1 - Math.exp(-dt / 0.14);
      state.open += (state.openTarget - state.open) * openFollow;
      if (Math.abs(state.openTarget - state.open) < 0.001) state.open = state.openTarget;

      if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS);

      let settling = false;
      state.hover.forEach((value, slot) => {
        const goal = slot === state.hovered ? 1 : 0;
        const next = value + (goal - value) * (1 - Math.exp(-dt / 0.12));
        if (Math.abs(goal - next) < 0.002) {
          if (goal === 0) state.hover.delete(slot);
          else state.hover.set(slot, 1);
        } else {
          state.hover.set(slot, next);
          settling = true;
        }
      });

      if (state.openTarget > 0 && !state.focus.has(state.active)) state.focus.set(state.active, 0);
      state.focus.forEach((value, slot) => {
        const goal = state.openTarget > 0 && slot === state.active ? 1 : 0;
        const next = reduce ? goal : value + (goal - value) * (1 - Math.exp(-dt / 0.16));
        if (Math.abs(goal - next) < 0.001) {
          if (goal === 0) state.focus.delete(slot);
          else state.focus.set(slot, 1);
        } else {
          state.focus.set(slot, next);
          settling = true;
        }
      });

      const slot = auto ? Math.round(state.scroll / Math.max(state.spacing, 1)) : nearest();
      if (slot !== state.active && !state.drag) {
        state.active = slot;
        const index = wrap(slot, count);
        options.onActiveChange?.(index);
      }

      layout();

      const moving =
        (options.autoScroll && !reduce) ||
        Math.abs(state.scroll - state.target) > 0.05 ||
        state.velocity !== 0 ||
        state.open !== state.openTarget ||
        state.intro < 1 ||
        settling;

      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    function wake() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    const applyResize = () => {
      view.width = container.clientWidth || 800;
      view.height = container.clientHeight || 500;
      wake();
    };

    const resizeObserver = new ResizeObserver(applyResize);
    resizeObserver.observe(container);

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);

    // Pointer Interaction (Drag & Scroll)
    const onPointerDown = e => {
      if (e.target.closest('.circular-gallery-close') || state.open > 0.5) return;
      state.drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        scroll: state.scroll,
        start: performance.now(),
        moved: false
      };
      container.setAttribute('data-dragging', '');
      container.setPointerCapture?.(e.pointerId);
      clearTimeout(snapTimer);
      wake();
    };

    const onPointerMove = e => {
      if (!state.drag || state.drag.id !== e.pointerId) return;
      const dx = e.clientX - state.drag.x;
      const dy = e.clientY - state.drag.y;
      if (!state.drag.moved && Math.hypot(dx, dy) > 6) state.drag.moved = true;
      if (state.drag.moved) {
        state.target = state.drag.scroll - dx * options.scrollSpeed;
        state.lastInput = performance.now();
        wake();
      }
    };

    const onPointerUp = e => {
      if (!state.drag || state.drag.id !== e.pointerId) return;
      container.removeAttribute('data-dragging');
      try {
        container.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
      const moved = state.drag.moved;
      state.drag = null;
      if (options.snap && moved) {
        setSlot(nearest());
      }
      wake();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    // Mouse Wheel
    container.addEventListener(
      'wheel',
      e => {
        if (state.open > 0.5) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(delta) < 4) return;
        state.target += delta * 0.9 * options.scrollSpeed;
        state.lastInput = performance.now();
        clearTimeout(snapTimer);
        if (options.snap) {
          snapTimer = setTimeout(() => setSlot(nearest()), 120);
        }
        wake();
        e.preventDefault();
      },
      { passive: false }
    );

    // Keyboard support
    container.setAttribute('tabindex', '0');
    container.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setSlot(state.active + 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setSlot(state.active - 1);
        e.preventDefault();
      } else if (e.key === 'Escape' && state.open > 0.05) {
        close();
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (options.openOnClick) {
          if (state.open > 0.5) close();
          else openSlot(state.active);
          e.preventDefault();
        }
      }
    });

    // Dismiss on click outside when opened
    container.addEventListener('click', e => {
      if (state.open > 0.5 && !e.target.closest('.circular-gallery-card-inner') && !e.target.closest('.circular-gallery-caption')) {
        close();
      }
    });

    applyResize();
    wake();

    return {
      destroy: () => {
        if (raf) cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersection.disconnect();
        container.innerHTML = '';
      },
      setSlot,
      openSlot,
      close
    };
  }

  return createCircularGallery;
});
