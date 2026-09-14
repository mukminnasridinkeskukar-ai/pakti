/* ============================================
 * PAKTI - Petunjuk Penggunaan Logic
 * ============================================ */

/**
 * Toggle card expand/collapse
 */
function toggleCard(button) {
  const card = button.closest('.petunjuk-card');
  if (!card) return;

  const isExpanded = card.classList.contains('expanded');

  if (isExpanded) {
    card.classList.remove('expanded');
    const spanEl = button.querySelector('span');
    if (spanEl) spanEl.textContent = 'Lihat Detail';
  } else {
    card.classList.add('expanded');
    const spanEl = button.querySelector('span');
    if (spanEl) spanEl.textContent = 'Tutup Detail';

    // Scroll to show full content
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
  }
}

/**
 * Show help modal/action
 */
function showHelpModal(type) {
  switch (type) {
    case 'faq':
      toastInfo('FAQ akan segera tersedia');
      break;
    case 'video':
      toastInfo('Video Tutorial akan segera tersedia');
      break;
    case 'download':
      toastInfo('Panduan PDF sedang disiapkan');
      break;
    default:
      toastInfo('Fitur dalam pengembangan');
  }
}

/**
 * Initialize petunjuk page animations
 */
function initPetunjukPage() {
  const cards = document.querySelectorAll('.petunjuk-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';

    setTimeout(() => {
      card.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 150 * index);
  });

  // Auto-expand first card on mobile for better UX
  if (window.innerWidth <= 768) {
    const firstCard = document.querySelector('.petunjuk-card');
    if (firstCard && !firstCard.classList.contains('expanded')) {
      const btn = firstCard.querySelector('.btn-card-action');
      if (btn) toggleCard(btn);
    }
  }
}
