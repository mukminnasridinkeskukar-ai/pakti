/* ============================================
 * PAKTI - Petunjuk Penggunaan (Buku Read-Only)
 * ============================================
 * Format buku dengan navigasi halaman
 * Anti-download, anti-copy, anti-print
 * ============================================ */

let bookCurrentPage = 1;
let bookTotalPages = 7;

function initPetunjukBook() {
  const pages = document.querySelectorAll('.book-page-content');
  bookTotalPages = pages.length;
  bookCurrentPage = 1;
  showBookPage(1);
  generateBookDots();

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    const petunjukActive = document.getElementById('petunjukPage');
    if (!petunjukActive || !petunjukActive.classList.contains('active')) return;

    if (e.key === 'ArrowLeft') bookPrevPage();
    else if (e.key === 'ArrowRight') bookNextPage();
  });
}

function showBookPage(pageNum) {
  const pages = document.querySelectorAll('.book-page-content');
  pages.forEach((page, idx) => {
    page.classList.toggle('active', idx + 1 === pageNum);
  });

  // Update indicator
  const indicator = document.getElementById('bookPageIndicator');
  if (indicator) indicator.textContent = pageNum + ' / ' + bookTotalPages;

  // Update nav buttons
  const prevBtn = document.getElementById('bookPrevBtn');
  const nextBtn = document.getElementById('bookNextBtn');
  if (prevBtn) prevBtn.disabled = pageNum === 1;
  if (nextBtn) nextBtn.disabled = pageNum === bookTotalPages;

  // Update dots
  document.querySelectorAll('.book-page-dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx + 1 === pageNum);
  });

  // Scroll to top of book
  const bookPages = document.querySelector('.book-pages');
  if (bookPages) bookPages.scrollTop = 0;

  bookCurrentPage = pageNum;
}

function bookNextPage() {
  if (bookCurrentPage < bookTotalPages) {
    showBookPage(bookCurrentPage + 1);
  }
}

function bookPrevPage() {
  if (bookCurrentPage > 1) {
    showBookPage(bookCurrentPage - 1);
  }
}

function generateBookDots() {
  const footer = document.getElementById('bookFooter');
  if (!footer) return;
  footer.innerHTML = '';

  for (let i = 1; i <= bookTotalPages; i++) {
    const dot = document.createElement('div');
    dot.className = 'book-page-dot' + (i === 1 ? ' active' : '');
    dot.onclick = () => showBookPage(i);
    footer.appendChild(dot);
  }
}

// Override fungsi lama
function initPetunjukPage() {
  initPetunjukBook();
}

function toggleCard() { /* deprecated, pakai book */ }
function showHelpModal() { /* deprecated */ }
function checkMobilePetunjuk() { /* deprecated */ }
