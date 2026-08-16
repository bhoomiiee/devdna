(function () {
  'use strict';

  /* ── DOM queries ─────────────────────────────────────────────────────────── */
  const section        = document.querySelector('.cinema-scroll');
  const root           = document.documentElement;
  const reduceMotion   = matchMedia('(prefers-reduced-motion: reduce)');
  const track          = document.querySelector('.sights-track');
  const sightsControls = document.querySelector('.sights-controls');
  const prevBtn        = document.querySelector('.sight-prev');
  const nextBtn        = document.querySelector('.sight-next');
  const originalCards  = Array.from(document.querySelectorAll('.sight-card'));

  /* ── State ───────────────────────────────────────────────────────────────── */
  let targetMouseX = 0, targetMouseY = 0;
  let mouseX       = 0, mouseY       = 0;
  let targetScroll = 0, smoothScroll = 0;
  let initialized  = false;
  let rafPending   = false;
  let sightCards         = [];
  const originalSightCount = originalCards.length;
  let activeSight          = originalSightCount; // start in middle set

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function clamp(v, min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    return Math.min(max, Math.max(min, v));
  }

  function smoothstep(e0, e1, v) {
    const x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function segmentInOut(s, a, b, c, d) {
    const enter = smoothstep(a, b, s);
    const exit  = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  }

  function getScrollDistance() {
    return clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);
  }

  function set(name, value) {
    root.style.setProperty(name, String(value));
  }

  /* ── Per-frame update ────────────────────────────────────────────────────── */
  function update() {
    rafPending = false;

    targetScroll = getScrollDistance();

    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized  = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;

    mouseX = lerp(mouseX, targetMouseX, 0.12);
    mouseY = lerp(mouseY, targetMouseY, 0.12);

    const s = smoothScroll;

    const frame2 = segmentInOut(s, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(s, 1760, 2140, 2540, 2700);

    const progress            = clamp(s / 2700);
    const introExit           = smoothstep(90, 650, s);
    const sightsEnterRaw      = smoothstep(2760, 3560, s);
    const sightsEnter         = Math.pow(sightsEnterRaw, 1.55);
    const sightsControlsEnter = smoothstep(3360, 3660, s);
    const blurActive          = clamp(frame2.active + frame3.active);
    const frame2Opacity       = frame2.active * (1 - frame3.enter);
    const splitDrift          = Math.pow(frame2.enter, 1.5);
    const panel2Opacity       = frame2.active * (1 - frame2.exit);
    const panel3Opacity       = frame3.active * (1 - frame3.exit);
    const backScale           = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    const sharedHeroY         = progress * -74;
    const sharedHeroScale     = progress * 0.23;
    const sightsScreenTop     = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    const sightsParentTop     = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

    const mx = reduceMotion.matches ? 0 : mouseX;
    const my = reduceMotion.matches ? 0 : mouseY;

    /* mouse */
    set('--mx', mx.toFixed(4));
    set('--my', my.toFixed(4));

    /* back-stack */
    set('--back-opacity',    (1 - frame2.active * 0.06));
    set('--back-x',          `${mx * -12}px`);
    set('--back-y',          `${my * -4}px`);
    set('--back-scale',      backScale);
    set('--four-y',          `${10 + progress * 10}vh`);
    set('--four-scale',      0.78 + progress * 0.16);
    set('--bazaar-y',        `${20 - progress * 8}vh`);

    /* blur / brightness */
    set('--blur-px',          `${blurActive * 14}px`);
    set('--back-brightness',  1 - blurActive * 0.255);
    set('--bazaar-blur-px',   `${frame2.active * 14}px`);
    set('--bazaar-brightness', 1 - frame2.active * 0.255 - frame3.active * 0.06);
    set('--bazaar-saturation', 1 + frame3.active * 0.18);

    /* shade */
    set('--shade-opacity',      '1');
    set('--shade-z',            frame2.active > 0.02 ? '2' : '0');
    set('--shade-top-alpha',    blurActive * 0.465);
    set('--shade-mid-alpha',    blurActive * 0.42);
    set('--shade-bottom-alpha', blurActive * 0.51);

    /* title */
    set('--title-y',       `${introExit * -210}px`);
    set('--title-scale',   1 - introExit * 0.08);
    set('--title-opacity', 1 - introExit);

    /* bridge */
    set('--bridge-x',     `calc(-50% + ${mx * 18}px)`);
    set('--bridge-y',     `${my * 8 + sharedHeroY - frame2.exit * 760}px`);
    set('--bridge-bottom', `${5 - frame2.enter * 13}vh`);
    set('--bridge-width',  `${67.2 + frame2.enter * 37.8}vw`);
    set('--bridge-scale',  1.02 + sharedHeroScale + frame2.exit * 0.46);

    /* splitframes */
    set('--split-left-x',     `calc(-50% + ${-splitDrift * 46}vw + ${mx * 22}px)`);
    set('--split-left-y',     `${my * 10 + sharedHeroY - splitDrift * 180}px`);
    set('--split-left-scale', 1 + sharedHeroScale + frame2.enter * 0.74);
    set('--split-right-x',    `calc(-50% + ${splitDrift * 46}vw + ${mx * 22}px)`);
    set('--split-right-y',    `${my * 10 + sharedHeroY - splitDrift * 180}px`);
    set('--split-right-scale', 1 + sharedHeroScale + frame2.enter * 0.74);

    /* frame two */
    set('--frame2-opacity', frame2Opacity);
    set('--frame2-x',       `calc(-50% + ${mx * 10}px)`);
    set('--frame2-y',       `calc(-50% + ${my * 8 - frame2.exit * 150}px)`);
    set('--frame2-scale',   1.06 + frame2.enter * 0.08 + frame2.exit * 0.08);

    /* intro copy */
    set('--intro-copy-y',       `${introExit * 90}px`);
    set('--intro-copy-opacity', 1 - introExit);

    /* story panels */
    set('--panel2-opacity', panel2Opacity);
    set('--panel2-y',       `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`);
    set('--panel3-opacity', panel3Opacity);
    set('--panel3-y',       `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`);

    /* sights slider */
    set('--sights-opacity',          sightsEnter);
    set('--sights-controls-opacity', sightsControlsEnter);
    sightsControls.classList.toggle('is-ready', sightsControlsEnter > 0.98);
    set('--sights-visibility',  sightsEnter > 0.01 ? 'visible' : 'hidden');
    set('--sights-y',           '0px');
    set('--sights-enter-x',     `${(1 - sightsEnter) * 420}vw`);
    set('--sights-scale',       1 / backScale);
    set('--sights-top',         `${sightsParentTop}px`);
    set('--sights-screen-top',  `${sightsScreenTop}px`);

    /* re-schedule if still animating */
    const needMore =
      Math.abs(smoothScroll - targetScroll) > 0.08 ||
      Math.abs(mouseX - targetMouseX)       > 0.001 ||
      Math.abs(mouseY - targetMouseY)       > 0.001;

    if (needMore) requestTick();
  }

  function requestTick() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  /* ── Slider helpers ──────────────────────────────────────────────────────── */
  function updateSightSlider() {
    if (!sightCards.length) return;
    const cardWidth = sightCards[0].offsetWidth;
    const gap       = parseFloat(getComputedStyle(track).columnGap || '0');
    set('--sights-shift', `${-(cardWidth + gap) * activeSight}px`);
    sightCards.forEach(function (card) {
      card.classList.toggle('is-active', Number(card.dataset.sightIndex) === activeSight);
    });
  }

  function moveSightSlider(dir) {
    activeSight += dir;
    updateSightSlider();
  }

  function selectSightCard(card) {
    const idx = Number(card.dataset.sightIndex);
    if (isFinite(idx)) {
      activeSight = idx;
      updateSightSlider();
    }
  }

  function jumpSightSlider(i) {
    track.classList.add('is-jumping');
    activeSight = i;
    updateSightSlider();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        track.classList.remove('is-jumping');
      });
    });
  }

  function normalizeSightSlider() {
    if (activeSight >= originalSightCount * 2) {
      jumpSightSlider(activeSight - originalSightCount);
    } else if (activeSight < originalSightCount) {
      jumpSightSlider(activeSight + originalSightCount);
    }
  }

  function setupSightSlider() {
    track.replaceChildren();

    for (var setIndex = 0; setIndex < 3; setIndex++) {
      originalCards.forEach(function (card, cardIndex) {
        var clone = card.cloneNode(true);
        clone.dataset.sightIndex = setIndex * originalSightCount + cardIndex;

        clone.addEventListener('click', (function (c) {
          return function () { selectSightCard(c); };
        }(clone)));

        clone.addEventListener('keydown', (function (c) {
          return function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectSightCard(c);
            }
          };
        }(clone)));

        track.appendChild(clone);
      });
    }

    sightCards  = Array.from(track.querySelectorAll('.sight-card'));
    activeSight = originalSightCount; // middle set

    track.addEventListener('transitionend', normalizeSightSlider);
    updateSightSlider();
  }

  /* ── Event listeners ─────────────────────────────────────────────────────── */
  window.addEventListener('scroll', requestTick, { passive: true });

  window.addEventListener('resize', function () {
    updateSightSlider();
    requestTick();
  });

  window.addEventListener('pointermove', function (e) {
    targetMouseX = e.clientX / window.innerWidth  - 0.5;
    targetMouseY = e.clientY / window.innerHeight - 0.5;
    requestTick();
  }, { passive: true });

  prevBtn.addEventListener('click', function () { moveSightSlider(-1); });
  nextBtn.addEventListener('click', function () { moveSightSlider(1);  });

  window.addEventListener('load', function () {
    setupSightSlider();
    requestTick();
  });

}());
