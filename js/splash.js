/* ============================================
 * PAKTI - Splash Screen
 * ============================================ */
(function () {
  const SPLASH_DURATION = 3500; // 3.5 detik (lebih cepat dari aslinya)
  let splashScreen = null;
  let progressFill = null;
  let percentText = null;
  let particlesContainer = null;
  let startTime = null;
  let animationFrame = null;

  function createParticles() {
    if (!particlesContainer) return;
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 8 + 4;
      const left = Math.random() * 100;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 15;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = left + '%';
      particle.style.animationDuration = duration + 's';
      particle.style.animationDelay = delay + 's';
      particlesContainer.appendChild(particle);
    }
  }

  function updateProgress(progress) {
    if (progressFill) progressFill.style.width = progress + '%';
    if (percentText) percentText.textContent = Math.round(progress) + '%';
  }

  function animateSplash(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min((elapsed / SPLASH_DURATION) * 100, 100);
    updateProgress(progress);

    if (elapsed < SPLASH_DURATION) {
      animationFrame = requestAnimationFrame(animateSplash);
    } else {
      completeSplash();
    }
  }

  function completeSplash() {
    updateProgress(100);
    setTimeout(function () {
      if (splashScreen) {
        splashScreen.classList.add('hidden');
        setTimeout(function () {
          if (splashScreen) splashScreen.style.display = 'none';
        }, 600);
      }
      if (typeof initApp === 'function') {
        initApp();
      }
    }, 300);
  }

  function initSplash() {
    splashScreen = document.getElementById('splashScreen');
    progressFill = document.getElementById('splashProgressFill');
    percentText = document.getElementById('splashPercent');
    particlesContainer = document.getElementById('splashParticles');

    if (!splashScreen) {
      // Fallback jika splash tidak ada, langsung init app
      if (typeof initApp === 'function') initApp();
      return;
    }

    createParticles();
    animationFrame = requestAnimationFrame(animateSplash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSplash);
  } else {
    initSplash();
  }

  // Expose skip function for debugging
  window.skipSplash = function () {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    startTime = 0;
    animateSplash(SPLASH_DURATION);
  };
})();
